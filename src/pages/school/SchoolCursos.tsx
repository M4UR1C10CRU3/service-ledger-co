import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, BookOpen, Pencil, Trash2, Globe, Clock } from 'lucide-react';
import { useSchoolCursos, SchoolCurso, SchoolCursoInput } from '@/hooks/useSchoolCursos';

const EMPTY: SchoolCursoInput = {
  nome: '', categoria: null, descricao: null, carga_horaria: null,
  sigla_certificado: null, validade_meses: null, horas_teoricas: null, horas_praticas: null,
  conteudo_programatico: [], objetivo: null, metodologia: null, reconhecimento: null,
  aprovacao_minima: 70, url_site: null, ativo: true,
};

export default function SchoolCursos() {
  const { cursos, isLoading, createCurso, updateCurso, deleteCurso } = useSchoolCursos();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolCurso | null>(null);
  const [form, setForm] = useState<SchoolCursoInput>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    cursos.filter(c =>
      !search ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.categoria ?? '').toLowerCase().includes(search.toLowerCase())
    ), [cursos, search]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setFormOpen(true); };
  const openEdit = (c: SchoolCurso) => { setEditing(c); setForm({ ...c }); setFormOpen(true); };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    if (editing) updateCurso.mutate({ id: editing.id, ...form });
    else createCurso.mutate(form);
    setFormOpen(false);
  };

  const f = (field: keyof SchoolCursoInput, value: any) => setForm(p => ({ ...p, [field]: value || null }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cursos</h1>
          <p className="text-sm text-muted-foreground">{cursos.length} curso{cursos.length !== 1 ? 's' : ''} cadastrado{cursos.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Curso</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar curso..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Carga Horária</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Sigla Cert.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? 'Nenhum curso encontrado' : 'Nenhum curso cadastrado'}
                </TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {c.nome}
                      {c.url_site && <a href={c.url_site} target="_blank" rel="noopener noreferrer"><Globe className="h-3 w-3 text-muted-foreground hover:text-primary" /></a>}
                    </div>
                  </TableCell>
                  <TableCell><span className="text-muted-foreground text-sm">{c.categoria ?? '—'}</span></TableCell>
                  <TableCell>
                    {c.carga_horaria ? (
                      <div className="flex items-center gap-1 text-sm"><Clock className="h-3 w-3 text-muted-foreground" />{c.carga_horaria}h</div>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{c.validade_meses ? `${c.validade_meses} meses` : '—'}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.sigla_certificado ?? '—'}</code></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={c.ativo ? 'border-green-500/40 text-green-600 bg-green-500/10' : 'text-muted-foreground'}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? 'Editar Curso' : 'Novo Curso'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Nome do Curso *</Label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Input value={form.categoria ?? ''} onChange={e => f('categoria', e.target.value)} placeholder="ex: NR-35, Primeiros Socorros" />
            </div>
            <div className="space-y-1">
              <Label>Sigla do Certificado</Label>
              <Input value={form.sigla_certificado ?? ''} onChange={e => f('sigla_certificado', e.target.value)} placeholder="ex: NR35" />
            </div>
            <div className="space-y-1">
              <Label>Carga Horária Total (h)</Label>
              <Input type="number" value={form.carga_horaria ?? ''} onChange={e => f('carga_horaria', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Validade do Certificado (meses)</Label>
              <Input type="number" value={form.validade_meses ?? ''} onChange={e => f('validade_meses', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Horas Teóricas</Label>
              <Input type="number" value={form.horas_teoricas ?? ''} onChange={e => f('horas_teoricas', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Horas Práticas</Label>
              <Input type="number" value={form.horas_praticas ?? ''} onChange={e => f('horas_praticas', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Aprovação Mínima (%)</Label>
              <Input type="number" value={form.aprovacao_minima ?? 70} onChange={e => f('aprovacao_minima', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>URL do Curso (site)</Label>
              <Input value={form.url_site ?? ''} onChange={e => f('url_site', e.target.value)} placeholder="https://..." />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.descricao ?? ''} onChange={e => f('descricao', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Objetivo</Label>
              <Textarea rows={2} value={form.objetivo ?? ''} onChange={e => f('objetivo', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Metodologia</Label>
              <Textarea rows={2} value={form.metodologia ?? ''} onChange={e => f('metodologia', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Reconhecimento (CEE-AP, IRATA, etc.)</Label>
              <Textarea rows={2} value={form.reconhecimento ?? ''} onChange={e => f('reconhecimento', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome.trim() || createCurso.isPending || updateCurso.isPending}>
              {editing ? 'Guardar' : 'Criar Curso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover curso?</AlertDialogTitle>
            <AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteCurso.mutate(deleteId); setDeleteId(null); }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
