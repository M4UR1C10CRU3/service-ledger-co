import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, UserRound, Pencil, Trash2, FileText, Upload, Eye, X, Clock, BookOpen, Download } from 'lucide-react';
import { useSchoolDocentes, SchoolDocente, SchoolDocenteInput, SchoolDocumentoDocente } from '@/hooks/useSchoolDocentes';
import { useSchoolCursos } from '@/hooks/useSchoolCursos';

const EMPTY: SchoolDocenteInput = {
  nome: '', email: null, telefone: null, foto_path: null, formacao: null,
  area_especializacao: null, tempo_experiencia: null, resumo: null, cursos_ids: [], ativo: true,
};

const TIPO_DOC_LABELS: Record<string, string> = {
  diploma: 'Diploma', cv: 'Currículo', certificado: 'Certificado',
  pos_graduacao: 'Pós-Graduação', outros: 'Outros',
};

function Initials({ nome, size = 'lg' }: { nome: string; size?: 'lg' | 'xl' }) {
  const letters = nome.split(' ').filter(Boolean).map(n => n[0].toUpperCase()).slice(0, 2).join('');
  return (
    <div className={`rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold shrink-0 ${size === 'xl' ? 'w-20 h-20 text-2xl' : 'w-14 h-14 text-lg'}`}>
      {letters || <UserRound className="w-7 h-7" />}
    </div>
  );
}

function DocenteCard({ d, cursos, onEdit, onDocs, onDelete }: {
  d: SchoolDocente;
  cursos: { id: string; nome: string }[];
  onEdit: () => void;
  onDocs: () => void;
  onDelete: () => void;
}) {
  const cursoNome = (id: string) => cursos.find(c => c.id === id)?.nome ?? '';

  return (
    <Card className={`flex flex-col transition-shadow hover:shadow-md ${!d.ativo ? 'opacity-60' : ''}`}>
      <CardContent className="p-6 flex flex-col gap-5 h-full">

        {/* Header: avatar + nome + formação */}
        <div className="flex flex-col items-center text-center gap-3">
          <Initials nome={d.nome} size="xl" />
          <div>
            <h3 className="font-semibold text-base text-foreground leading-tight">{d.nome}</h3>
            {d.formacao && (
              <p className="text-sm text-muted-foreground mt-1">{d.formacao}</p>
            )}
          </div>
        </div>

        {/* Badges: especialização + experiência */}
        <div className="flex flex-wrap justify-center gap-2">
          {d.tempo_experiencia && (
            <span className="inline-flex items-center gap-1 text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
              <Clock className="h-3 w-3" />{d.tempo_experiencia}
            </span>
          )}
          {d.area_especializacao && (
            <Badge className="bg-primary/10 text-primary border-0 font-normal text-xs hover:bg-primary/20">
              {d.area_especializacao}
            </Badge>
          )}
        </div>

        {/* Resumo profissional */}
        {d.resumo && (
          <p className="text-sm text-muted-foreground leading-relaxed">{d.resumo}</p>
        )}

        {/* Cursos que aplica */}
        {(d.cursos_ids?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />Cursos que aplica
            </p>
            <div className="flex flex-wrap gap-1.5">
              {d.cursos_ids.map(id => {
                const nome = cursoNome(id);
                return nome ? (
                  <Badge key={id} variant="outline" className="text-xs font-normal px-2 py-0.5 border-primary/25 text-primary bg-primary/5 hover:bg-primary/10">
                    {nome}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Acções */}
        <div className="mt-auto pt-4 border-t border-border/50 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar Instrutor
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" title="Documentos" onClick={onDocs}>
            <FileText className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:text-destructive hover:border-destructive/40" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SchoolDocentes() {
  const { docentes, isLoading, createDocente, updateDocente, deleteDocente, fetchDocumentos, uploadDocumento, deleteDocumento, getDocUrl } = useSchoolDocentes();
  const { cursos } = useSchoolCursos();
  const [search, setSearch] = useState('');

  // Panel de edição (full-width, não modal)
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolDocente | null>(null);
  const [form, setForm] = useState<SchoolDocenteInput>(EMPTY);

  // Modal documentos
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsDocente, setDocsDocente] = useState<SchoolDocente | null>(null);
  const [docs, setDocs] = useState<SchoolDocumentoDocente[]>([]);
  const [uploadTipo, setUploadTipo] = useState('diploma');
  const [uploading, setUploading] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    docentes.filter(d =>
      !search ||
      d.nome.toLowerCase().includes(search.toLowerCase()) ||
      (d.area_especializacao ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (d.formacao ?? '').toLowerCase().includes(search.toLowerCase())
    ), [docentes, search]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setPanelOpen(true); };
  const openEdit = (d: SchoolDocente) => { setEditing(d); setForm({ ...d }); setPanelOpen(true); };

  const openDocs = async (d: SchoolDocente) => {
    setDocsDocente(d);
    setDocs(await fetchDocumentos(d.id));
    setDocsOpen(true);
  };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    if (editing) updateDocente.mutate({ id: editing.id, ...form });
    else createDocente.mutate(form);
    setPanelOpen(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docsDocente) return;
    setUploading(true);
    const ok = await uploadDocumento(docsDocente.id, file, uploadTipo);
    if (ok) setDocs(await fetchDocumentos(docsDocente.id));
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
    cursos_ids: p.cursos_ids.includes(id) ? p.cursos_ids.filter(c => c !== id) : [...p.cursos_ids, id],
  }));

  const f = (field: keyof SchoolDocenteInput, value: any) =>
    setForm(p => ({ ...p, [field]: value || null }));

  // ─── Painel de edição lateral / full ────────────────────────────────────────
  if (panelOpen) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{editing ? 'Editar Instrutor' : 'Cadastro de Instrutor'}</h1>
          <Button variant="ghost" onClick={() => setPanelOpen(false)}>Cancelar</Button>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            {/* Foto placeholder */}
            <div>
              <p className="text-sm font-medium mb-2">Foto do Instrutor</p>
              <div className="flex items-center gap-4">
                <Initials nome={form.nome || 'IN'} size="xl" />
                <Button variant="outline" size="sm" disabled className="text-xs opacity-50">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />Alterar foto
                </Button>
              </div>
            </div>

            {/* Dados pessoais */}
            <div>
              <p className="text-sm font-semibold mb-3 text-foreground/80">Dados Pessoais</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label>Nome completo *</Label>
                  <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>E-mail *</Label>
                  <Input type="email" value={form.email ?? ''} onChange={e => f('email', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input value={form.telefone ?? ''} onChange={e => f('telefone', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Dados académicos */}
            <div>
              <p className="text-sm font-semibold mb-3 text-foreground/80">Dados Académicos</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Formação académica *</Label>
                  <Input value={form.formacao ?? ''} onChange={e => f('formacao', e.target.value)} placeholder="ex: Enfermeiro e Bombeiro Civil Resgatista" />
                </div>
                <div className="space-y-1">
                  <Label>Área de especialização *</Label>
                  <Input value={form.area_especializacao ?? ''} onChange={e => f('area_especializacao', e.target.value)} placeholder="ex: Saúde, Resgate e Segurança do Trabalho" />
                </div>
                <div className="space-y-1">
                  <Label>Tempo de experiência</Label>
                  <Input value={form.tempo_experiencia ?? ''} onChange={e => f('tempo_experiencia', e.target.value)} placeholder="ex: 5 anos, 2 anos e 6 meses" />
                </div>
                <div className="space-y-1">
                  <Label>Resumo profissional</Label>
                  <Textarea
                    rows={5}
                    value={form.resumo ?? ''}
                    onChange={e => f('resumo', e.target.value)}
                    placeholder="Descreva a experiência, formação e competências do instrutor..."
                  />
                  <p className="text-xs text-right text-muted-foreground">{(form.resumo ?? '').length}/400</p>
                </div>
              </div>
            </div>

            {/* Cursos */}
            {cursos.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-3 text-foreground/80">Cursos que pode ministrar</p>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto border rounded-md p-3 bg-muted/30">
                  {cursos.filter(c => c.ativo).map(c => (
                    <label key={c.id} className="flex items-start gap-2 text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                      <input
                        type="checkbox"
                        className="rounded mt-0.5 shrink-0"
                        checked={form.cursos_ids.includes(c.id)}
                        onChange={() => toggleCurso(c.id)}
                      />
                      <span className="leading-snug">{c.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setPanelOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={!form.nome.trim() || createDocente.isPending || updateDocente.isPending}
          >
            {editing ? 'Guardar Alterações' : 'Registar Instrutor'}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Lista principal ─────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nossa Equipa de Instrutores</h1>
          <p className="text-sm text-muted-foreground">{docentes.filter(d => d.ativo).length} instrutor{docentes.filter(d => d.ativo).length !== 1 ? 'es' : ''} activos</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Cadastrar Instrutor</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Pesquisar por nome, especialização ou formação..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse h-80"><CardContent className="h-full bg-muted/20" /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <UserRound className="h-14 w-14 mb-4 opacity-15" />
          <p className="text-base">{search ? 'Nenhum instrutor encontrado' : 'Nenhum instrutor cadastrado'}</p>
          {!search && <Button className="mt-4" onClick={openNew}><Plus className="h-4 w-4 mr-2" />Cadastrar primeiro instrutor</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(d => (
            <DocenteCard
              key={d.id}
              d={d}
              cursos={cursos}
              onEdit={() => openEdit(d)}
              onDocs={() => openDocs(d)}
              onDelete={() => setDeleteId(d.id)}
            />
          ))}
        </div>
      )}

      {/* Modal documentos */}
      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Documentos do Instrutor — {docsDocente?.nome}</DialogTitle></DialogHeader>
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
                  <span><Upload className="h-4 w-4 mr-2" />{uploading ? 'A enviar...' : 'Anexar documento'}</span>
                </Button>
                <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
              </label>
            </div>
            {docs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum documento anexado</p>
            ) : (
              <div className="space-y-2">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.nome_ficheiro}</p>
                      <p className="text-xs text-muted-foreground">
                        {TIPO_DOC_LABELS[doc.tipo_documento] ?? doc.tipo_documento}
                        {doc.tamanho_bytes ? ` · ${(doc.tamanho_bytes / 1024 / 1024).toFixed(2)} MB` : ''}
                        {doc.validade ? ` · válido até ${doc.validade}` : ''}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" title="Visualizar" onClick={() => handleViewDoc(doc)}><Eye className="h-3.5 w-3.5" /></Button>
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
          <AlertDialogHeader>
            <AlertDialogTitle>Remover instrutor?</AlertDialogTitle>
            <AlertDialogDescription>Esta acção não pode ser desfeita. Os documentos associados serão também removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteDocente.mutate(deleteId); setDeleteId(null); }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
