import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, UserRound, Pencil, Trash2, FileText, Upload, Eye, X } from 'lucide-react';
import { useSchoolDocentes, SchoolDocente, SchoolDocenteInput, SchoolDocumentoDocente } from '@/hooks/useSchoolDocentes';
import { useSchoolCursos } from '@/hooks/useSchoolCursos';

const EMPTY: SchoolDocenteInput = {
  nome: '', email: null, telefone: null, foto_url: null, formacao: null,
  especializacao: null, tempo_experiencia: null, resumo_ia: null, cursos_ids: [], ativo: true,
};

const TIPO_DOC_LABELS: Record<string, string> = {
  diploma: 'Diploma', cv: 'Currículo', certificado: 'Certificado',
  pos_graduacao: 'Pós-Graduação', outros: 'Outros',
};

export default function SchoolDocentes() {
  const { docentes, isLoading, createDocente, updateDocente, deleteDocente, fetchDocumentos, uploadDocumento, deleteDocumento, getDocUrl } = useSchoolDocentes();
  const { cursos } = useSchoolCursos();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolDocente | null>(null);
  const [docsDocente, setDocsDocente] = useState<SchoolDocente | null>(null);
  const [docs, setDocs] = useState<SchoolDocumentoDocente[]>([]);
  const [form, setForm] = useState<SchoolDocenteInput>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadTipo, setUploadTipo] = useState('diploma');
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(() =>
    docentes.filter(d =>
      !search ||
      d.nome.toLowerCase().includes(search.toLowerCase()) ||
      (d.especializacao ?? '').toLowerCase().includes(search.toLowerCase())
    ), [docentes, search]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setFormOpen(true); };
  const openEdit = (d: SchoolDocente) => { setEditing(d); setForm({ ...d }); setFormOpen(true); };

  const openDocs = async (d: SchoolDocente) => {
    setDocsDocente(d);
    const data = await fetchDocumentos(d.id);
    setDocs(data);
    setDocsOpen(true);
  };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    if (editing) updateDocente.mutate({ id: editing.id, ...form });
    else createDocente.mutate(form);
    setFormOpen(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docsDocente) return;
    setUploading(true);
    const ok = await uploadDocumento(docsDocente.id, file, uploadTipo);
    if (ok) {
      const data = await fetchDocumentos(docsDocente.id);
      setDocs(data);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteDoc = async (doc: SchoolDocumentoDocente) => {
    await deleteDocumento(doc);
    setDocs(d => d.filter(x => x.id !== doc.id));
  };

  const handleViewDoc = async (doc: SchoolDocumentoDocente) => {
    const url = await getDocUrl(doc.storage_path);
    if (url) window.open(url, '_blank');
  };

  const toggleCurso = (id: string) => setForm(p => ({
    ...p,
    cursos_ids: p.cursos_ids.includes(id)
      ? p.cursos_ids.filter(c => c !== id)
      : [...p.cursos_ids, id],
  }));

  const f = (field: keyof SchoolDocenteInput, value: any) => setForm(p => ({ ...p, [field]: value || null }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instrutores</h1>
          <p className="text-sm text-muted-foreground">{docentes.length} instrutor{docentes.length !== 1 ? 'es' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Instrutor</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Pesquisar instrutor..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Especialização</TableHead>
                <TableHead>Experiência</TableHead>
                <TableHead>Cursos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <UserRound className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? 'Nenhum instrutor encontrado' : 'Nenhum instrutor cadastrado'}
                </TableCell></TableRow>
              ) : filtered.map(d => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="font-medium">{d.nome}</div>
                    {d.email && <div className="text-xs text-muted-foreground">{d.email}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.especializacao ?? '—'}</TableCell>
                  <TableCell className="text-sm">{d.tempo_experiencia ?? '—'}</TableCell>
                  <TableCell><span className="text-sm">{d.cursos_ids?.length ?? 0} curso{(d.cursos_ids?.length ?? 0) !== 1 ? 's' : ''}</span></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={d.ativo ? 'border-green-500/40 text-green-600 bg-green-500/10' : 'text-muted-foreground'}>
                      {d.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Documentos" onClick={() => openDocs(d)}><FileText className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Instrutor' : 'Novo Instrutor'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Nome Completo *</Label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" value={form.email ?? ''} onChange={e => f('email', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.telefone ?? ''} onChange={e => f('telefone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Formação</Label>
              <Input value={form.formacao ?? ''} onChange={e => f('formacao', e.target.value)} placeholder="ex: Enfermagem, Eng. Segurança" />
            </div>
            <div className="space-y-1">
              <Label>Especialização</Label>
              <Input value={form.especializacao ?? ''} onChange={e => f('especializacao', e.target.value)} placeholder="ex: NR-35, Trabalho em Altura" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Tempo de Experiência</Label>
              <Input value={form.tempo_experiencia ?? ''} onChange={e => f('tempo_experiencia', e.target.value)} placeholder="ex: 10 anos" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Resumo Profissional</Label>
              <Textarea rows={3} value={form.resumo_ia ?? ''} onChange={e => f('resumo_ia', e.target.value)} />
            </div>
            {cursos.length > 0 && (
              <div className="col-span-2 space-y-2">
                <Label>Cursos que pode ministrar</Label>
                <div className="grid grid-cols-2 gap-2">
                  {cursos.filter(c => c.ativo).map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="rounded" checked={form.cursos_ids.includes(c.id)} onChange={() => toggleCurso(c.id)} />
                      {c.nome}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome.trim() || createDocente.isPending || updateDocente.isPending}>
              {editing ? 'Guardar' : 'Criar Instrutor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Documentos Dialog */}
      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Documentos — {docsDocente?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={uploadTipo} onValueChange={setUploadTipo}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_DOC_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <label className="flex-1">
                <Button asChild variant="outline" disabled={uploading} className="w-full cursor-pointer">
                  <span><Upload className="h-4 w-4 mr-2" />{uploading ? 'A enviar...' : 'Enviar documento'}</span>
                </Button>
                <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
              </label>
            </div>

            {docs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhum documento enviado</p>
            ) : (
              <div className="space-y-2">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.nome_ficheiro}</p>
                      <p className="text-xs text-muted-foreground">{TIPO_DOC_LABELS[doc.tipo_documento] ?? doc.tipo_documento}{doc.validade ? ` · válido até ${doc.validade}` : ''}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleViewDoc(doc)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => handleDeleteDoc(doc)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover instrutor?</AlertDialogTitle><AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteDocente.mutate(deleteId); setDeleteId(null); }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
