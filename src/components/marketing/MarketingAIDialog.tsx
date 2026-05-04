import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { useMarketing } from '@/hooks/useMarketing';
import { useToast } from '@/hooks/use-toast';
import { CANAL_CONFIG, TIPO_CONTEUDO_CONFIG, PRIORIDADE_CONFIG, type MarketingCanal } from '@/types/marketing';
import type { MarketingTarefaInput } from '@/hooks/useMarketing';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (count: number) => void;
}

const ALL_CANAIS: MarketingCanal[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'site', 'email'];

export function MarketingAIDialog({ open, onOpenChange, onCreated }: Props) {
  const { generateWithAI, createTarefasBulk } = useMarketing();
  const { toast } = useToast();

  const [briefing, setBriefing] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [qtd, setQtd] = useState(8);
  const [tom, setTom] = useState('profissional e próximo');
  const [canais, setCanais] = useState<MarketingCanal[]>(['instagram', 'facebook']);

  const [loading, setLoading] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [sugestoes, setSugestoes] = useState<MarketingTarefaInput[] | null>(null);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());

  const reset = () => {
    setSugestoes(null);
    setSelecionadas(new Set());
  };

  const toggleCanal = (c: MarketingCanal) => {
    setCanais(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const handleGerar = async () => {
    if (briefing.trim().length < 10) {
      toast({ title: 'Briefing demasiado curto', description: 'Descreva a campanha com pelo menos 10 caracteres.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { tarefas, error } = await generateWithAI({
      briefing,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      canais,
      qtdPublicacoes: qtd,
      tom,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro na geração', description: error, variant: 'destructive' });
      return;
    }
    setSugestoes(tarefas);
    setSelecionadas(new Set(tarefas.map((_, i) => i)));
    toast({ title: `${tarefas.length} sugestões geradas`, description: 'Reveja e selecione as que pretende criar.' });
  };

  const toggleSelect = (i: number) => {
    const next = new Set(selecionadas);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelecionadas(next);
  };

  const handleCriar = async () => {
    if (!sugestoes) return;
    const escolhidas = sugestoes.filter((_, i) => selecionadas.has(i));
    if (escolhidas.length === 0) {
      toast({ title: 'Nada selecionado', variant: 'destructive' });
      return;
    }
    setSavingBulk(true);
    const n = await createTarefasBulk(escolhidas);
    setSavingBulk(false);
    if (n > 0) {
      toast({ title: `${n} tarefa(s) criada(s)`, description: 'Estão no Kanban com status "Agendado".' });
      onCreated?.(n);
      reset();
      onOpenChange(false);
    } else {
      toast({ title: 'Erro a criar tarefas', variant: 'destructive' });
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: '#E8561A' }} />
            Gerar Calendário com IA
          </DialogTitle>
        </DialogHeader>

        {!sugestoes ? (
          <div className="space-y-4 py-2">
            <div>
              <Label>Briefing da campanha *</Label>
              <Textarea
                rows={5}
                placeholder="Ex.: Campanha de Black Friday para loja de mobiliário, com foco em descontos até 40% e novas coleções de outono. Público-alvo: famílias 30-55 anos. Mensagem-chave: qualidade e preços únicos."
                value={briefing}
                onChange={e => setBriefing(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Quanto mais contexto fornecer, melhores serão as sugestões.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data início</Label>
                <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              </div>
              <div>
                <Label>Data fim</Label>
                <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade de publicações</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={qtd}
                  onChange={e => setQtd(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>
              <div>
                <Label>Tom de voz</Label>
                <Input value={tom} onChange={e => setTom(e.target.value)} placeholder="profissional, descontraído, divertido..." />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Canais</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_CANAIS.map(c => {
                  const cfg = CANAL_CONFIG[c];
                  const active = canais.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCanal(c)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        active ? 'bg-[#E8561A] text-white border-[#E8561A]' : 'bg-muted/30 hover:bg-muted'
                      }`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selecionadas.size} de {sugestoes.length} selecionadas
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelecionadas(new Set(sugestoes.map((_, i) => i)))}>Todas</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelecionadas(new Set())}>Nenhuma</Button>
                <Button size="sm" variant="outline" onClick={reset}>↺ Regenerar</Button>
              </div>
            </div>
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {sugestoes.map((s, i) => {
                const tipo = s.tipoConteudo ? (TIPO_CONTEUDO_CONFIG as any)[s.tipoConteudo] : null;
                const canal = s.canal ? (CANAL_CONFIG as any)[s.canal] : null;
                const prio = s.prioridade ? PRIORIDADE_CONFIG[s.prioridade] : null;
                const checked = selecionadas.has(i);
                return (
                  <Card key={i} className={`p-3 border-l-4 ${checked ? '' : 'opacity-60'}`} style={{ borderLeftColor: prio?.color || '#94A3B8' }}>
                    <div className="flex items-start gap-2">
                      <Checkbox checked={checked} onCheckedChange={() => toggleSelect(i)} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{s.titulo}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tipo && <Badge variant="secondary" className="text-[10px]">{tipo.icon} {tipo.label}</Badge>}
                          {canal && <Badge variant="secondary" className="text-[10px]">{canal.icon} {canal.label}</Badge>}
                          {prio && <Badge className={`${prio.badgeClass} text-[10px]`}>{prio.label}</Badge>}
                          {s.dataPublicacao && (
                            <Badge variant="outline" className="text-[10px]">📅 {s.dataPublicacao}{s.horaPublicacao ? ` ${s.horaPublicacao}` : ''}</Badge>
                          )}
                        </div>
                        {s.briefing && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.briefing}</p>}
                        {s.copyLegenda && (
                          <div className="bg-muted/30 rounded p-2 mt-1.5 text-xs whitespace-pre-wrap line-clamp-3">
                            {s.copyLegenda}
                          </div>
                        )}
                        {s.hashtags && <p className="text-xs text-blue-600 mt-1">{s.hashtags}</p>}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          {!sugestoes ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
              <Button onClick={handleGerar} disabled={loading} style={{ backgroundColor: '#E8561A' }}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> A gerar com Claude...</>
                ) : (
                  <><Wand2 className="h-4 w-4 mr-1" /> Gerar Sugestões</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={savingBulk}>Cancelar</Button>
              <Button onClick={handleCriar} disabled={savingBulk || selecionadas.size === 0} style={{ backgroundColor: '#E8561A' }}>
                {savingBulk ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> A criar...</> : `Criar ${selecionadas.size} tarefa(s)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
