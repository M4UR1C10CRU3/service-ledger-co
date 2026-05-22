import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

type PostType = 'carrossel' | 'produto' | 'dica' | 'data' | 'eng' | 'inst' | 'bastidores';

interface PostGerado {
  dia: number;
  tipo: PostType;
  titulo: string;
  plataforma: string;
  horarioFB: string;
  horarioIG: string;
  holiday: string | null;
  copy: string;
  notaCriativa: string;
  hashtags: string;
  numSlides: number | null;
}

const TIPO_LABEL: Record<PostType, string> = {
  carrossel: 'CARROSSEL PROMO',
  produto: 'Produto',
  dica: 'Dica',
  data: 'Data especial',
  eng: 'Interação',
  inst: 'Institucional',
  bastidores: 'Bastidores',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultYear: number;
  defaultMonth: number;
  defaultResponsavel?: string;
  onComplete?: (year: number, month: number, count: number) => void;
}

export function MarketingFullMonthAIDialog({
  open, onOpenChange, defaultYear, defaultMonth,
  defaultResponsavel = 'Hugo Dias',
  onComplete,
}: Props) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();

  const [mes, setMes] = useState(defaultMonth);
  const [ano, setAno] = useState(defaultYear);
  const [categoriaDestaque, setCategoriaDestaque] = useState('');
  const [promocao, setPromocao] = useState('');
  const [notas, setNotas] = useState('');

  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setCategoriaDestaque(''); setPromocao(''); setNotas('');
    setLoading(false); setPhase(''); setProgress(0);
  };

  const handleClose = (v: boolean) => {
    if (!v && !loading) reset();
    onOpenChange(v);
  };

  const handleGerar = async () => {
    if (!empresa?.id) {
      toast({ title: 'Empresa não seleccionada', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setPhase(`A gerar calendário de ${MESES[mes - 1]} ${ano} com IA…`);
    setProgress(10);

    const { data, error } = await supabase.functions.invoke('marketing-ai-tudocasa-month', {
      body: {
        ano, mes,
        categoriaDestaque: categoriaDestaque || undefined,
        promocao: promocao || undefined,
        notas: notas || undefined,
      },
    });

    if (error || data?.error) {
      setLoading(false); setPhase(''); setProgress(0);
      toast({
        title: 'Erro na geração',
        description: data?.error || error?.message || 'Não foi possível gerar o calendário.',
        variant: 'destructive',
      });
      return;
    }

    const posts: PostGerado[] = Array.isArray(data?.posts) ? data.posts : [];
    if (posts.length === 0) {
      setLoading(false); setPhase(''); setProgress(0);
      toast({ title: 'A IA não devolveu posts', variant: 'destructive' });
      return;
    }

    setPhase(`A guardar ${posts.length} posts no calendário…`);
    setProgress(50);

    // 1) Editorial calendar storage
    const { data: u } = await supabase.auth.getUser();
    const editorialRows = posts.map(p => ({
      empresa_id: empresa.id,
      ano, mes, dia: p.dia,
      post: {
        type: p.tipo,
        plat: p.plataforma,
        title: p.titulo,
        copy: p.copy,
        tip: p.notaCriativa,
        tags: p.hashtags,
        holiday: p.holiday || undefined,
        hfb: p.horarioFB,
        hig: p.horarioIG,
      },
      updated_by: u?.user?.id || null,
      updated_by_nome: u?.user?.email || null,
    }));

    const { error: editorialErr } = await supabase
      .from('marketing_editorial_posts')
      .upsert(editorialRows, { onConflict: 'empresa_id,ano,mes,dia' });

    if (editorialErr) {
      console.error('[full-month] editorial upsert:', editorialErr);
      setLoading(false); setPhase(''); setProgress(0);
      toast({ title: 'Erro a guardar calendário', description: editorialErr.message, variant: 'destructive' });
      return;
    }

    setPhase(`A criar ${posts.length} tarefas no Kanban…`);
    setProgress(80);

    // 2) Kanban tarefas (status agendado)
    const monthStr = String(mes).padStart(2, '0');
    const tarefasRows = posts.map(p => {
      const platLower = (p.plataforma || '').toLowerCase();
      const hasIG = platLower.includes('ig') || platLower.includes('instagram');
      const hasFB = platLower.includes('fb') || platLower.includes('facebook');
      const canal = hasIG && hasFB ? 'instagram' : hasIG ? 'instagram' : hasFB ? 'facebook' : 'instagram';
      const horaPub = hasIG ? p.horarioIG : p.horarioFB;
      const tituloComTag = `${TIPO_LABEL[p.tipo]} — ${p.titulo}`;
      return {
        empresa_id: empresa.id,
        titulo: tituloComTag.slice(0, 200),
        tipo_conteudo: p.tipo === 'carrossel' ? 'post' : 'post',
        canal,
        status: 'agendado',
        prioridade: 'media',
        responsavel_nome: defaultResponsavel || null,
        data_publicacao: `${ano}-${monthStr}-${String(p.dia).padStart(2, '0')}`,
        hora_publicacao: horaPub || null,
        hashtags: p.hashtags || null,
        copy_legenda: p.copy || null,
        briefing: [
          p.notaCriativa,
          p.plataforma ? `Plataforma: ${p.plataforma}` : '',
          p.holiday ? `Data: ${p.holiday}` : '',
          p.numSlides ? `Slides: ${p.numSlides}` : '',
        ].filter(Boolean).join('\n'),
        created_by: u?.user?.id || null,
      };
    });

    const { error: tarefasErr } = await supabase
      .from('marketing_tarefas')
      .insert(tarefasRows);

    if (tarefasErr) {
      console.error('[full-month] tarefas insert:', tarefasErr);
      toast({
        title: 'Calendário gerado, mas erro a criar tarefas Kanban',
        description: tarefasErr.message,
        variant: 'destructive',
      });
    }

    setProgress(100);
    setPhase('Concluído!');
    toast({
      title: `✓ ${posts.length} posts gerados para ${MESES[mes - 1]} ${ano}`,
      description: 'Calendário e Kanban actualizados.',
    });

    onComplete?.(ano, mes, posts.length);
    setTimeout(() => { reset(); onOpenChange(false); }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: '#E8561A' }} />
            Gerar Mês Completo com IA
          </DialogTitle>
        </DialogHeader>

        {!loading ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mês a gerar</Label>
                <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano</Label>
                <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2025, 2026, 2027, 2028].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Produto/Categoria em destaque este mês <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                value={categoriaDestaque}
                onChange={e => setCategoriaDestaque(e.target.value)}
                placeholder="Ex.: Ar condicionado, casa de banho, jardim…"
              />
            </div>

            <div>
              <Label>Promoção ou campanha especial <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                value={promocao}
                onChange={e => setPromocao(e.target.value)}
                placeholder="Ex.: Saldos de verão, campanha pais & filhos…"
              />
            </div>

            <div>
              <Label>Notas adicionais <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea
                rows={3}
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Indicações específicas, eventos locais, lançamentos…"
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              A IA usa o contexto fixo da Tudo Casa (pilares semanais, horários por dia, tom Trás-os-Montes)
              e gera 4-5 posts por semana com carrossel obrigatório às quintas. Cada post entra no
              Calendário Editorial e no Kanban no estado <strong>Agendado</strong> com responsável padrão.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-6">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#E8561A' }} />
              <span className="text-sm">{phase}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <DialogFooter>
          {!loading && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleGerar} style={{ backgroundColor: '#E8561A' }}>
                <Wand2 className="h-4 w-4 mr-1" /> Gerar Calendário Completo
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
