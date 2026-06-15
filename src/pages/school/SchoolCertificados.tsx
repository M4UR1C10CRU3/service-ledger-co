import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Award, Trash2, ExternalLink, Plus, AlertTriangle, CheckCircle2, FileText, Loader2, Download, PackageOpen } from 'lucide-react';
import { useSchoolCertificados, SchoolCertificadoInput } from '@/hooks/useSchoolCertificados';
import { useSchoolAlunos } from '@/hooks/useSchoolAlunos';
import { useSchoolTurmas } from '@/hooks/useSchoolTurmas';
import { useSchoolDocentes } from '@/hooks/useSchoolDocentes';
import { useSchoolCursos } from '@/hooks/useSchoolCursos';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { format, addMonths, isPast } from 'date-fns';
import { pt } from 'date-fns/locale';
import { generateCertificadoPDF } from '@/lib/generateCertificadoPDF';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';

const EMPTY: Omit<SchoolCertificadoInput, 'codigo'> & { sigla?: string } = {
  aluno_id: '', turma_id: '', docente_id: null,
  emitido_em: new Date().toISOString().split('T')[0],
  validade_em: null, url_pdf: null, sigla: '',
};

export default function SchoolCertificados() {
  const [searchParams] = useSearchParams();
  const turmaFiltro = searchParams.get('turma');
  const { certificados, isLoading, emitirCertificado, deleteCertificado, gerarCodigo } = useSchoolCertificados();
  const { alunos } = useSchoolAlunos();
  const { turmas } = useSchoolTurmas();
  const { docentes } = useSchoolDocentes();
  const { cursos } = useSchoolCursos();
  const { empresa } = useEmpresa();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, turma_id: turmaFiltro ?? '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  // Emissão em lote
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchTurmaId, setBatchTurmaId] = useState(turmaFiltro ?? '');
  const [batchDocenteId, setBatchDocenteId] = useState<string>('');
  const [batchDataEmissao, setBatchDataEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; label: string } | null>(null);

  const filtered = useMemo(() => {
    let list = certificados;
    if (turmaFiltro) list = list.filter(c => c.turma_id === turmaFiltro);
    if (search) list = list.filter(c =>
      (c.aluno_nome ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.curso_nome ?? '').toLowerCase().includes(search.toLowerCase()) ||
      c.codigo.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [certificados, search, turmaFiltro]);

  const turmaAtual = turmaFiltro ? turmas.find(t => t.id === turmaFiltro) : null;

  const getCurso = (turmaId: string) => {
    const turma = turmas.find(t => t.id === turmaId);
    return turma ? cursos.find(c => c.id === turma.curso_id) : undefined;
  };

  const getDocenteSignedUrl = async (docente_id: string | null): Promise<string | null> => {
    if (!docente_id) return null;
    const docente = docentes.find(d => d.id === docente_id);
    if (!docente?.assinatura_path) return null;
    const { data } = await supabase.storage.from('school-documentos').createSignedUrl(docente.assinatura_path, 3600);
    return data?.signedUrl ?? null;
  };

  const handleEmitir = () => {
    if (!form.aluno_id || !form.turma_id) return;
    const curso = getCurso(form.turma_id);
    const validadeMeses = curso?.validade_meses ?? null;
    const validade_em = validadeMeses
      ? addMonths(new Date(form.emitido_em + 'T00:00:00'), validadeMeses).toISOString().split('T')[0]
      : form.validade_em;
    emitirCertificado.mutate({ ...form, validade_em });
    setFormOpen(false);
  };

  const buildPDFData = async (cert: typeof certificados[0], docenteId?: string | null) => {
    const turma = turmas.find(t => t.id === cert.turma_id);
    const curso = cursos.find(cu => cu.id === turma?.curso_id);
    const docId = docenteId !== undefined ? docenteId : cert.docente_id;
    const docente = docentes.find(d => d.id === docId);
    const assinaturaUrl = await getDocenteSignedUrl(docId ?? null);
    const aluno = alunos.find(a => a.id === cert.aluno_id);

    return {
      aluno_nome: cert.aluno_nome ?? cert.aluno_id,
      aluno_cpf: aluno?.cpf ?? null,
      curso_nome: cert.curso_nome ?? curso?.nome ?? '—',
      curso_categoria: curso?.categoria ?? null,
      carga_horaria: curso?.carga_horaria ?? null,
      horas_teoricas: curso?.horas_teoricas ?? null,
      horas_praticas: curso?.horas_praticas ?? null,
      data_inicio: turma?.inicio ?? null,
      emitido_em: cert.emitido_em,
      validade_em: cert.validade_em,
      docente_nome: docente?.nome ?? cert.docente_nome ?? null,
      docente_assinatura_url: assinaturaUrl,
      codigo: cert.codigo,
      empresa_nome: empresa?.nome ?? 'ITC',
      empresa_aplicacao: null,
      conteudo_programatico: Array.isArray(curso?.conteudo_programatico)
        ? (curso!.conteudo_programatico as { modulo: string; horas: number }[])
        : [],
      objetivo: curso?.objetivo ?? null,
      reconhecimento: curso?.reconhecimento ?? null,
      aprovacao_minima: curso?.aprovacao_minima ?? null,
      validade_anos: curso?.validade_meses ? Math.round(curso.validade_meses / 12) : null,
      modulos_count: Array.isArray(curso?.conteudo_programatico)
        ? (curso!.conteudo_programatico as any[]).length
        : null,
    };
  };

  const uploadAndSavePDF = async (certId: string, codigo: string, blob: Blob): Promise<string | null> => {
    const path = `${empresa?.id}/certificados/${new Date().getFullYear()}/${codigo}.pdf`;
    const { error } = await supabase.storage
      .from('school-certificados')
      .upload(path, blob, { contentType: 'application/pdf', upsert: true });
    if (error) return null;
    const { data: urlData } = supabase.storage.from('school-certificados').getPublicUrl(path);
    await (supabase as any).from('school_certificados').update({ url_pdf: urlData.publicUrl }).eq('id', certId);
    return urlData.publicUrl;
  };

  const handleGerarPDF = async (cert: typeof certificados[0]) => {
    setGeneratingPdf(cert.id);
    try {
      const pdfData = await buildPDFData(cert);
      const blob = await generateCertificadoPDF(pdfData);
      await uploadAndSavePDF(cert.id, cert.codigo, blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${cert.codigo}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'PDF gerado', description: cert.codigo });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleEmissaoEmLote = async () => {
    if (!batchTurmaId) return;

    const turma = turmas.find(t => t.id === batchTurmaId);
    const curso = cursos.find(c => c.id === turma?.curso_id);
    const validadeMeses = curso?.validade_meses ?? 24;

    // Alunos da turma (via matrículas) — buscar certificados existentes para não duplicar
    const { data: matriculas } = await (supabase as any)
      .from('school_matriculas')
      .select('aluno_id')
      .eq('turma_id', batchTurmaId)
      .eq('status', 'concluido');

    if (!matriculas?.length) {
      toast({ title: 'Nenhum aluno concluído nesta turma', variant: 'destructive' });
      return;
    }

    const jaEmitidos = new Set(
      certificados.filter(c => c.turma_id === batchTurmaId).map(c => c.aluno_id)
    );
    const pendentes = matriculas.filter((m: any) => !jaEmitidos.has(m.aluno_id));

    if (!pendentes.length) {
      toast({ title: 'Todos os alunos já têm certificado nesta turma' });
      return;
    }

    const sigla = curso?.sigla_certificado ?? 'CERT';
    const zip = new JSZip();
    setBatchProgress({ done: 0, total: pendentes.length, label: 'A preparar...' });

    for (let i = 0; i < pendentes.length; i++) {
      const alunoId = pendentes[i].aluno_id;
      const aluno = alunos.find(a => a.id === alunoId);
      const nomeAluno = aluno?.nome ?? alunoId;

      setBatchProgress({ done: i, total: pendentes.length, label: nomeAluno });

      try {
        const emitido_em = batchDataEmissao;
        const validade_em = addMonths(new Date(emitido_em + 'T00:00:00'), validadeMeses)
          .toISOString().split('T')[0];

        // Criar registo de certificado
        const codigo = gerarCodigo(sigla);
        const { data: novoCert, error: insertErr } = await (supabase as any)
          .from('school_certificados')
          .insert({
            empresa_id: empresa!.id,
            aluno_id: alunoId,
            turma_id: batchTurmaId,
            docente_id: batchDocenteId || null,
            codigo,
            emitido_em,
            validade_em,
            url_pdf: null,
          })
          .select('id')
          .single();

        if (insertErr) continue;

        // Gerar PDF
        const docente = docentes.find(d => d.id === batchDocenteId);
        const assinaturaUrl = await getDocenteSignedUrl(batchDocenteId || null);

        const blob = await generateCertificadoPDF({
          aluno_nome: nomeAluno,
          aluno_cpf: aluno?.cpf ?? null,
          curso_nome: curso?.nome ?? '—',
          curso_categoria: (curso as any)?.categoria ?? null,
          carga_horaria: curso?.carga_horaria ?? null,
          horas_teoricas: curso?.horas_teoricas ?? null,
          horas_praticas: curso?.horas_praticas ?? null,
          data_inicio: turma?.inicio ?? null,
          emitido_em,
          validade_em,
          docente_nome: docente?.nome ?? null,
          docente_assinatura_url: assinaturaUrl,
          codigo,
          empresa_nome: empresa?.nome ?? 'ITC',
          empresa_aplicacao: null,
          conteudo_programatico: Array.isArray(curso?.conteudo_programatico)
            ? (curso!.conteudo_programatico as { modulo: string; horas: number }[])
            : [],
          objetivo: curso?.objetivo ?? null,
          reconhecimento: curso?.reconhecimento ?? null,
          aprovacao_minima: curso?.aprovacao_minima ?? null,
          validade_anos: Math.round(validadeMeses / 12),
          modulos_count: Array.isArray(curso?.conteudo_programatico)
            ? (curso!.conteudo_programatico as any[]).length
            : null,
        });

        // Upload para Storage
        await uploadAndSavePDF(novoCert.id, codigo, blob);

        // Adicionar ao ZIP
        const arrayBuf = await blob.arrayBuffer();
        zip.file(`${codigo}_${nomeAluno.replace(/\s+/g, '_')}.pdf`, arrayBuf);
      } catch (e) {
        // Continuar com próximo aluno
        console.error('Erro ao gerar cert para', alunoId, e);
      }
    }

    setBatchProgress({ done: pendentes.length, total: pendentes.length, label: 'A gerar ZIP...' });

    // Gerar e descarregar ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = `certificados_${turma?.titulo?.replace(/\s+/g, '_') ?? batchTurmaId}.zip`;
    a.click();
    URL.revokeObjectURL(zipUrl);

    setBatchProgress(null);
    setBatchOpen(false);
    toast({ title: 'Emissão em lote concluída', description: `${pendentes.length} certificado(s) gerado(s)` });
  };

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try {
      const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d);
      if (isNaN(dt.getTime())) return '—';
      return format(dt, 'dd/MM/yyyy', { locale: pt });
    } catch { return '—'; }
  };

  const vencimentoBadge = (validade: string | null) => {
    if (!validade) return null;
    const dt = new Date(validade + 'T23:59:59');
    if (isNaN(dt.getTime())) return null;
    const vencido = isPast(dt);
    return vencido
      ? <Badge variant="outline" className="border-red-500/40 text-red-600 bg-red-500/10 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>
      : <Badge variant="outline" className="border-green-500/40 text-green-600 bg-green-500/10 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Válido</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Certificados{turmaAtual ? ` — ${turmaAtual.titulo}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} certificado{filtered.length !== 1 ? 's' : ''} emitido{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setBatchTurmaId(turmaFiltro ?? ''); setBatchOpen(true); }}>
            <PackageOpen className="h-4 w-4 mr-2" />Emissão em Lote
          </Button>
          <Button onClick={() => { setForm({ ...EMPTY, turma_id: turmaFiltro ?? '' }); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Emitir Certificado
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Aluno, curso, código..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Emitido em</TableHead>
                <TableHead>Válido até</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? 'Nenhum certificado encontrado' : 'Nenhum certificado emitido'}
                </TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{c.codigo}</code></TableCell>
                  <TableCell className="font-medium">{c.aluno_nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.curso_nome}</TableCell>
                  <TableCell className="text-sm">{fmtDate(c.emitido_em)}</TableCell>
                  <TableCell className="text-sm">{fmtDate(c.validade_em)}</TableCell>
                  <TableCell>{vencimentoBadge(c.validade_em)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Gerar PDF" onClick={() => handleGerarPDF(c)} disabled={generatingPdf === c.id}>
                        {generatingPdf === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                      </Button>
                      {c.url_pdf && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Ver PDF" onClick={() => window.open(c.url_pdf!, '_blank')}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog — Emitir individual */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Emitir Certificado</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Aluno *</Label>
              <Select value={form.aluno_id} onValueChange={v => setForm(p => ({ ...p, aluno_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar aluno" /></SelectTrigger>
                <SelectContent>{alunos.filter(a => a.ativo).map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Turma *</Label>
              <Select value={form.turma_id} onValueChange={v => setForm(p => ({ ...p, turma_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar turma" /></SelectTrigger>
                <SelectContent>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Instrutor Responsável</Label>
              <Select value={form.docente_id ?? ''} onValueChange={v => setForm(p => ({ ...p, docente_id: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar instrutor" /></SelectTrigger>
                <SelectContent>{docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data de Emissão</Label>
              <Input type="date" value={form.emitido_em} onChange={e => setForm(p => ({ ...p, emitido_em: e.target.value }))} />
            </div>
            {form.turma_id && !getCurso(form.turma_id)?.validade_meses && (
              <div className="space-y-1">
                <Label>Válido até (manual)</Label>
                <Input type="date" value={form.validade_em ?? ''} onChange={e => setForm(p => ({ ...p, validade_em: e.target.value || null }))} />
              </div>
            )}
            {form.turma_id && getCurso(form.turma_id)?.validade_meses && (
              <p className="text-xs text-muted-foreground">
                Validade calculada automaticamente: {getCurso(form.turma_id)!.validade_meses} meses a partir da emissão.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleEmitir} disabled={!form.aluno_id || !form.turma_id || emitirCertificado.isPending}>
              <Award className="h-4 w-4 mr-2" />Emitir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Emissão em Lote */}
      <Dialog open={batchOpen} onOpenChange={o => { if (!batchProgress) setBatchOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Emissão em Lote</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Emite certificados para todos os alunos com status <strong>concluído</strong> na turma seleccionada. Alunos já com certificado são ignorados.
            </p>
            <div className="space-y-1">
              <Label>Turma *</Label>
              <Select value={batchTurmaId} onValueChange={setBatchTurmaId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar turma" /></SelectTrigger>
                <SelectContent>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Instrutor Responsável</Label>
              <Select value={batchDocenteId} onValueChange={setBatchDocenteId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar instrutor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Nenhum —</SelectItem>
                  {docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data de Emissão</Label>
              <Input type="date" value={batchDataEmissao} onChange={e => setBatchDataEmissao(e.target.value)} />
            </div>

            {batchProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{batchProgress.label}</span>
                  <span>{batchProgress.done}/{batchProgress.total}</span>
                </div>
                <Progress value={(batchProgress.done / batchProgress.total) * 100} className="h-2" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)} disabled={!!batchProgress}>Cancelar</Button>
            <Button onClick={handleEmissaoEmLote} disabled={!batchTurmaId || !!batchProgress}>
              {batchProgress
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar...</>
                : <><Download className="h-4 w-4 mr-2" />Emitir e Descarregar ZIP</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar remoção */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover certificado?</AlertDialogTitle>
            <AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteCertificado.mutate(deleteId); setDeleteId(null); }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
