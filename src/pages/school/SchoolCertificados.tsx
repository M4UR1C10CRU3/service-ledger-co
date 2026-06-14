import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Award, Trash2, ExternalLink, Plus, AlertTriangle, CheckCircle2, FileText, Loader2 } from 'lucide-react';
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

const EMPTY: Omit<SchoolCertificadoInput, 'codigo'> & { sigla?: string } = {
  aluno_id: '', turma_id: '', docente_id: null,
  emitido_em: new Date().toISOString().split('T')[0],
  validade_em: null, url_pdf: null, sigla: '',
};

export default function SchoolCertificados() {
  const [searchParams] = useSearchParams();
  const turmaFiltro = searchParams.get('turma');
  const { certificados, isLoading, emitirCertificado, deleteCertificado } = useSchoolCertificados();
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

  const getCursoValidade = (turmaId: string) => {
    const turma = turmas.find(t => t.id === turmaId);
    const curso = cursos.find(c => c.id === turma?.curso_id);
    return curso?.validade_meses ?? null;
  };

  const handleEmitir = () => {
    if (!form.aluno_id || !form.turma_id) return;
    const validadeMeses = getCursoValidade(form.turma_id);
    const validade_em = validadeMeses
      ? addMonths(new Date(form.emitido_em + 'T00:00:00'), validadeMeses).toISOString().split('T')[0]
      : form.validade_em;
    emitirCertificado.mutate({ ...form, validade_em });
    setFormOpen(false);
  };

  const fmtDate = (d: string | null) => d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt }) : '—';

  const handleGerarPDF = async (c: typeof certificados[0]) => {
    setGeneratingPdf(c.id);
    try {
      const turma = turmas.find(t => t.id === c.turma_id);
      const curso = cursos.find(cu => cu.id === turma?.curso_id);
      const docente = docentes.find(d => d.id === c.docente_id);
      const blob = await generateCertificadoPDF({
        aluno_nome: c.aluno_nome ?? c.aluno_id,
        curso_nome: c.curso_nome ?? curso?.nome ?? '—',
        carga_horaria: curso?.carga_horaria ?? null,
        horas_teoricas: curso?.horas_teoricas ?? null,
        horas_praticas: curso?.horas_praticas ?? null,
        emitido_em: c.emitido_em,
        validade_em: c.validade_em,
        docente_nome: docente?.nome ?? c.docente_nome ?? null,
        codigo: c.codigo,
        empresa_nome: empresa?.nome ?? 'ITC',
        conteudo_programatico: Array.isArray(curso?.conteudo_programatico) ? curso!.conteudo_programatico as string[] : [],
        objetivo: curso?.objetivo ?? null,
        reconhecimento: curso?.reconhecimento ?? null,
        aprovacao_minima: curso?.aprovacao_minima ?? null,
      });
      // Upload para Storage e actualizar url_pdf
      const path = `${empresa?.id}/certificados/${new Date().getFullYear()}/${c.codigo}.pdf`;
      const { error: upErr } = await supabase.storage.from('school-certificados').upload(path, blob, { contentType: 'application/pdf', upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('school-certificados').getPublicUrl(path);
        await (supabase as any).from('school_certificados').update({ url_pdf: urlData.publicUrl }).eq('id', c.id);
      }
      // Download local
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${c.codigo}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'PDF gerado', description: c.codigo });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    } finally {
      setGeneratingPdf(null);
    }
  };

  const vencimentoBadge = (validade: string | null) => {
    if (!validade) return null;
    const vencido = isPast(new Date(validade + 'T23:59:59'));
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
          <p className="text-sm text-muted-foreground">{filtered.length} certificado{filtered.length !== 1 ? 's' : ''} emitido{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY, turma_id: turmaFiltro ?? '' }); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Emitir Certificado
        </Button>
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
                <TableHead className="w-24" />
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

      {/* Emitir Dialog */}
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
            {form.turma_id && !getCursoValidade(form.turma_id) && (
              <div className="space-y-1">
                <Label>Válido até (manual)</Label>
                <Input type="date" value={form.validade_em ?? ''} onChange={e => setForm(p => ({ ...p, validade_em: e.target.value || null }))} />
              </div>
            )}
            {form.turma_id && getCursoValidade(form.turma_id) && (
              <p className="text-xs text-muted-foreground">
                Validade calculada automaticamente: {getCursoValidade(form.turma_id)} meses a partir da emissão.
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

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover certificado?</AlertDialogTitle><AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteCertificado.mutate(deleteId); setDeleteId(null); }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
