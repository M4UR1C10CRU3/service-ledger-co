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
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, ClipboardList, Pencil, Trash2 } from 'lucide-react';
import { useSchoolMatriculas, SchoolMatricula, SchoolMatriculaInput } from '@/hooks/useSchoolMatriculas';
import { useSchoolAlunos } from '@/hooks/useSchoolAlunos';
import { useSchoolTurmas } from '@/hooks/useSchoolTurmas';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  confirmada:    { label: 'Confirmada',    className: 'border-blue-500/40 text-blue-600 bg-blue-500/10'    },
  em_andamento:  { label: 'Em Andamento',  className: 'border-yellow-500/40 text-yellow-600 bg-yellow-500/10' },
  concluida:     { label: 'Concluída',     className: 'border-green-500/40 text-green-600 bg-green-500/10' },
  reprovada:     { label: 'Reprovada',     className: 'border-red-500/40 text-red-600 bg-red-500/10'       },
  cancelada:     { label: 'Cancelada',     className: 'text-muted-foreground'                               },
};

const EMPTY: SchoolMatriculaInput = {
  aluno_id: '', turma_id: '', status: 'confirmada',
  data_matricula: new Date().toISOString().split('T')[0],
  nota_final: null, observacoes: null,
};

export default function SchoolMatriculas() {
  const [searchParams] = useSearchParams();
  const turmaFiltro = searchParams.get('turma') ?? undefined;
  const { matriculas, isLoading, createMatricula, updateMatricula, deleteMatricula } = useSchoolMatriculas(turmaFiltro);
  const { alunos } = useSchoolAlunos();
  const { turmas } = useSchoolTurmas();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolMatricula | null>(null);
  const [form, setForm] = useState<SchoolMatriculaInput>({ ...EMPTY, turma_id: turmaFiltro ?? '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    matriculas.filter(m => {
      const matchSearch = !search ||
        (m.aluno_nome ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (m.turma_titulo ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (m.curso_nome ?? '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchSearch && matchStatus;
    }), [matriculas, search, statusFilter]);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, turma_id: turmaFiltro ?? '' }); setFormOpen(true); };
  const openEdit = (m: SchoolMatricula) => { setEditing(m); setForm({ ...m }); setFormOpen(true); };

  const handleSave = () => {
    if (!form.aluno_id || !form.turma_id) return;
    if (editing) updateMatricula.mutate({ id: editing.id, ...form });
    else createMatricula.mutate(form);
    setFormOpen(false);
  };

  const fmtDate = (d: string | null) => d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt }) : '—';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Matrículas</h1>
          <p className="text-sm text-muted-foreground">{matriculas.length} matrícula{matriculas.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Matrícula</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Aluno, turma, curso..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? 'Nenhuma matrícula encontrada' : 'Nenhuma matrícula registada'}
                </TableCell></TableRow>
              ) : filtered.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.aluno_nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.curso_nome}</TableCell>
                  <TableCell className="text-sm">{m.turma_titulo}</TableCell>
                  <TableCell className="text-sm">{fmtDate(m.data_matricula)}</TableCell>
                  <TableCell className="text-sm">{m.nota_final != null ? `${m.nota_final}` : '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_CONFIG[m.status]?.className ?? ''}>
                      {STATUS_CONFIG[m.status]?.label ?? m.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Matrícula' : 'Nova Matrícula'}</DialogTitle></DialogHeader>
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
                <SelectContent>{turmas.filter(t => t.status !== 'cancelada').map(t => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data da Matrícula</Label>
              <Input type="date" value={form.data_matricula} onChange={e => setForm(p => ({ ...p, data_matricula: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Nota Final</Label>
              <Input type="number" min="0" max="100" step="0.1" value={form.nota_final ?? ''} onChange={e => setForm(p => ({ ...p, nota_final: e.target.value ? Number(e.target.value) : null }))} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes ?? ''} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value || null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.aluno_id || !form.turma_id || createMatricula.isPending || updateMatricula.isPending}>
              {editing ? 'Guardar' : 'Registar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover matrícula?</AlertDialogTitle><AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteMatricula.mutate(deleteId); setDeleteId(null); }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
