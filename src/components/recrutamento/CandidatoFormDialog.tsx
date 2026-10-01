import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Bot, AlertTriangle } from 'lucide-react';
import { useCandidatos, type Vaga } from '@/hooks/useRecrutamento';
import { useRhFuncoes } from '@/hooks/useRhFuncoes';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { supabase } from '@/integrations/supabase/client';
import { cvPath } from '@/lib/storagePaths';
import { AnaliseCV, chamarIA, contextoVaga, textoDoPdf } from '@/lib/rhIA';
import { AnaliseCVView } from './AnaliseCVView';

const fontes = ['LinkedIn', 'Indicação', 'Espontânea', 'Site', 'Outro'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaga: Vaga;
}

/** Os campos antigos (ia_*) continuam preenchidos para os ecrãs e relatórios que já os usam. */
export function camposAntigosIA(a: AnaliseCV) {
  return {
    ia_resumo_perfil: a.resumo || null,
    ia_pontos_fortes: a.mais_valias || null,
    ia_pontos_atencao: a.pontos_atencao || null,
    ia_adequacao_vaga: a.classificacao || null,
    ia_justificacao: a.justificacao || null,
    ia_anos_experiencia: a.experiencia_anos ?? null,
    ia_formacao: a.formacao || null,
    ia_idiomas: a.idiomas || null,
    ia_analise: a,
    ia_aderencia: Math.round(a.aderencia ?? 0),
    ia_processado_em: new Date().toISOString(),
    ia_erro: null,
  };
}

export function CandidatoFormDialog({ open, onOpenChange, vaga }: Props) {
  const { createCandidato } = useCandidatos(vaga.id);
  const { funcoes } = useRhFuncoes();
  const funcao = funcoes.find(f => f.id === vaga.funcao_id) ?? null;
  const { empresa } = useEmpresa();
  const fileRef = useRef<HTMLInputElement>(null);
  const vazio = { nome: '', email: '', telefone: '', data_nascimento: '', localidade: '', fonte: '', notas_iniciais: '' };
  const [form, setForm] = useState(vazio);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnaliseCV | null>(null);
  const [iaError, setIaError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvFile(file);
    setAnalysis(null);
    setIaError('');
    try {
      const text = await textoDoPdf(file);
      if (text.trim().length < 100) {
        setIaError('O CV parece ser uma imagem digitalizada: não há texto para analisar. O candidato pode ser guardado na mesma.');
        return;
      }
      setAnalyzing(true);
      setAnalysis(await chamarIA<AnaliseCV>('analisar_cv', { cvText: text, vaga: contextoVaga(vaga, funcao) }));
    } catch (err: any) {
      setIaError(err.message || 'A análise falhou. O candidato pode ser guardado e analisado depois.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.nome || !empresa) return;
    setUploading(true);
    try {
      let cv_path: string | null = null;
      let cv_url: string | null = null;
      if (cvFile) {
        const path = cvPath(empresa.id, vaga.id, cvFile.name);
        const { error: uploadError } = await supabase.storage.from('cvs').upload(path, cvFile);
        if (!uploadError) {
          cv_path = path;
          // Também no campo antigo: é dele que se tira o caminho se a coluna cv_path ainda não existir.
          cv_url = supabase.storage.from('cvs').getPublicUrl(path).data.publicUrl;
        }
      }
      createCandidato.mutate({
        vaga_id: vaga.id,
        nome: form.nome,
        email: form.email || null,
        telefone: form.telefone || null,
        data_nascimento: form.data_nascimento || null,
        localidade: form.localidade || null,
        fonte: form.fonte || null,
        cv_path,
        cv_url,
        notas_iniciais: form.notas_iniciais || null,
        estado: analysis ? 'em_analise' : 'recebido',
        ...(analysis ? camposAntigosIA(analysis) : { ia_erro: iaError || null }),
      } as any, {
        onSuccess: () => {
          onOpenChange(false);
          setForm(vazio);
          setCvFile(null);
          setAnalysis(null);
          setIaError('');
          if (fileRef.current) fileRef.current.value = '';
        },
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar candidato — {vaga.cargo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="cand-nome">Nome completo *</Label><Input id="cand-nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="cand-email">Email</Label><Input id="cand-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label htmlFor="cand-tel">Telefone / WhatsApp</Label><Input id="cand-tel" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="cand-nasc">Data de nascimento</Label><Input id="cand-nasc" type="date" value={form.data_nascimento} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="cand-loc">Localidade</Label><Input id="cand-loc" value={form.localidade} onChange={e => setForm(f => ({ ...f, localidade: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fonte da candidatura</Label>
              <Select value={form.fonte} onValueChange={v => setForm(f => ({ ...f, fonte: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{fontes.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cand-cv">Currículo (PDF)</Label>
              <Input id="cand-cv" ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} />
            </div>
          </div>
          <div className="space-y-2"><Label htmlFor="cand-notas">Notas iniciais</Label><Textarea id="cand-notas" value={form.notas_iniciais} onChange={e => setForm(f => ({ ...f, notas_iniciais: e.target.value }))} rows={2} /></div>

          {!funcao && (
            <p className="text-xs text-muted-foreground">Esta vaga não tem Função escolhida: a análise usa só o que está escrito na vaga. Para uma análise mais fina, edite a vaga e escolha a Função.</p>
          )}

          {analyzing && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-primary">A ler o CV e a cruzá-lo com os requisitos da vaga…</span>
              </CardContent>
            </Card>
          )}

          {iaError && !analyzing && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-800">{iaError}</span>
              </CardContent>
            </Card>
          )}

          {analysis && !analyzing && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Análise do CV contra a vaga</CardTitle>
              </CardHeader>
              <CardContent><AnaliseCVView a={analysis} /></CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.nome || uploading || analyzing || createCandidato.isPending}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar candidato{analysis ? ' e análise' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
