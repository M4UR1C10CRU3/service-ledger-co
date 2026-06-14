import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, Bot, AlertTriangle } from 'lucide-react';
import { useCandidatos } from '@/hooks/useRecrutamento';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { supabase } from '@/integrations/supabase/client';
import { cvPath } from '@/lib/storagePaths';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const fontes = ['LinkedIn', 'Indicação', 'Espontânea', 'Site', 'Outro'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vagaId: string;
  cargo: string;
}

interface IAAnalysis {
  resumo_perfil?: string;
  experiencia_relevante?: string[];
  competencias_tecnicas?: string[];
  competencias_transversais?: string[];
  formacao?: string;
  pontos_fortes?: string[];
  pontos_atencao?: string[];
  adequacao_vaga?: string;
  justificacao_adequacao?: string;
  anos_experiencia_estimados?: number;
  idiomas?: string[];
}

export function CandidatoFormDialog({ open, onOpenChange, vagaId, cargo }: Props) {
  const { createCandidato } = useCandidatos(vagaId);
  const { empresa } = useEmpresa();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', data_nascimento: '', localidade: '', fonte: '', notas_iniciais: '',
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<IAAnalysis | null>(null);
  const [iaError, setIaError] = useState('');
  const [uploading, setUploading] = useState(false);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvFile(file);
    setAnalysis(null);
    setIaError('');

    try {
      const text = await extractTextFromPdf(file);
      setCvText(text);

      if (text.trim().length < 100) {
        setIaError('CV em formato de imagem — análise IA não disponível. O candidato será guardado sem análise automática.');
        return;
      }

      // Call AI analysis
      setAnalyzing(true);
      const { data, error } = await supabase.functions.invoke('analyze-cv', {
        body: { cvText: text, cargo },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.analysis) {
        setAnalysis(data.analysis);
      }
    } catch (err: any) {
      console.error('CV analysis error:', err);
      setIaError(err.message || 'Erro na análise de IA. O candidato pode ser guardado sem análise.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.nome || !empresa) return;
    setUploading(true);

    try {
      let cv_url = null;
      if (cvFile) {
        const path = cvPath(empresa.id, vagaId, cvFile.name);
        const { error: uploadError } = await supabase.storage.from('cvs').upload(path, cvFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(path);
          cv_url = urlData.publicUrl;
        }
      }

      createCandidato.mutate({
        vaga_id: vagaId,
        nome: form.nome,
        email: form.email || null,
        telefone: form.telefone || null,
        data_nascimento: form.data_nascimento || null,
        localidade: form.localidade || null,
        fonte: form.fonte || null,
        cv_url,
        notas_iniciais: form.notas_iniciais || null,
        ia_resumo_perfil: analysis?.resumo_perfil || null,
        ia_experiencia: analysis?.experiencia_relevante || null,
        ia_competencias_tec: analysis?.competencias_tecnicas || null,
        ia_competencias_trans: analysis?.competencias_transversais || null,
        ia_formacao: analysis?.formacao || null,
        ia_pontos_fortes: analysis?.pontos_fortes || null,
        ia_pontos_atencao: analysis?.pontos_atencao || null,
        ia_adequacao_vaga: analysis?.adequacao_vaga || null,
        ia_justificacao: analysis?.justificacao_adequacao || null,
        ia_anos_experiencia: analysis?.anos_experiencia_estimados || null,
        ia_idiomas: analysis?.idiomas || null,
        ia_processado_em: analysis ? new Date().toISOString() : null,
        ia_erro: iaError || null,
      } as any, {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ nome: '', email: '', telefone: '', data_nascimento: '', localidade: '', fonte: '', notas_iniciais: '' });
          setCvFile(null);
          setAnalysis(null);
          setIaError('');
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Candidato</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome Completo *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Telefone / WhatsApp</Label><Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Data de Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Localidade</Label><Input value={form.localidade} onChange={e => setForm(f => ({ ...f, localidade: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fonte da Candidatura</Label>
              <Select value={form.fonte} onValueChange={v => setForm(f => ({ ...f, fonte: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{fontes.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Upload do CV (PDF) *</Label>
              <div className="flex gap-2">
                <Input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} className="flex-1" />
              </div>
            </div>
          </div>
          <div className="space-y-2"><Label>Notas iniciais</Label><Textarea value={form.notas_iniciais} onChange={e => setForm(f => ({ ...f, notas_iniciais: e.target.value }))} rows={2} /></div>

          {/* AI Loading */}
          {analyzing && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-primary">A analisar CV com IA...</span>
              </CardContent>
            </Card>
          )}

          {/* AI Error */}
          {iaError && !analyzing && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-800">{iaError}</span>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis Result */}
          {analysis && !analyzing && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Análise IA do CV</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resumo */}
                {analysis.resumo_perfil && (
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">🤖 Resumo do Perfil</p><p className="text-sm">{analysis.resumo_perfil}</p></div>
                )}
                {/* Experiência */}
                {analysis.experiencia_relevante?.length ? (
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">💼 Experiência Relevante</p><ul className="text-sm list-disc pl-4">{analysis.experiencia_relevante.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
                ) : null}
                {/* Competências */}
                <div className="grid grid-cols-2 gap-4">
                  {analysis.competencias_tecnicas?.length ? (
                    <div><p className="text-xs font-semibold text-muted-foreground mb-1">🔧 Competências Técnicas</p><div className="flex flex-wrap gap-1">{analysis.competencias_tecnicas.map((c, i) => <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>)}</div></div>
                  ) : null}
                  {analysis.competencias_transversais?.length ? (
                    <div><p className="text-xs font-semibold text-muted-foreground mb-1">🧠 Competências Transversais</p><div className="flex flex-wrap gap-1">{analysis.competencias_transversais.map((c, i) => <Badge key={i} variant="outline" className="text-xs">{c}</Badge>)}</div></div>
                  ) : null}
                </div>
                {/* Formação */}
                {analysis.formacao && <div><p className="text-xs font-semibold text-muted-foreground mb-1">🎓 Formação</p><p className="text-sm">{analysis.formacao}</p></div>}
                {/* Pontos */}
                <div className="grid grid-cols-2 gap-4">
                  {analysis.pontos_fortes?.length ? (
                    <div><p className="text-xs font-semibold text-muted-foreground mb-1">✅ Pontos Fortes</p><ul className="text-sm list-disc pl-4 text-emerald-700">{analysis.pontos_fortes.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                  ) : null}
                  {analysis.pontos_atencao?.length ? (
                    <div><p className="text-xs font-semibold text-muted-foreground mb-1">⚠️ Pontos de Atenção</p><ul className="text-sm list-disc pl-4 text-amber-700">{analysis.pontos_atencao.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                  ) : null}
                </div>
                {/* Adequação */}
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">📊 Adequação à Vaga</p>
                    <Badge className={`text-sm px-3 py-1 ${analysis.adequacao_vaga === 'Alta' ? 'bg-emerald-100 text-emerald-800' : analysis.adequacao_vaga === 'Média' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      {analysis.adequacao_vaga}
                    </Badge>
                  </div>
                  {analysis.anos_experiencia_estimados != null && (
                    <div><p className="text-xs font-semibold text-muted-foreground mb-1">⏱️ Experiência Estimada</p><p className="text-sm font-semibold">{analysis.anos_experiencia_estimados} anos</p></div>
                  )}
                </div>
                {analysis.justificacao_adequacao && <p className="text-xs text-muted-foreground italic">{analysis.justificacao_adequacao}</p>}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.nome || uploading || analyzing || createCandidato.isPending}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Candidato {analysis ? '+ Análise' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
