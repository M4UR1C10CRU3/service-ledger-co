import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, CalendarDays, Pencil, Trash2, Users, Award } from 'lucide-react';
import { useSchoolTurmas, SchoolTurma, SchoolTurmaInput } from '@/hooks/useSchoolTurmas';
import { useSchoolCursos } from '@/hooks/useSchoolCursos';
import { useSchoolDocentes } from '@/hooks/useSchoolDocentes';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  aberta:       { label: 'Aberta',       className: 'border-blue-500/40 text-blue-600 bg-blue-500/10'    },
  em_andamento: { label: 'Em Andamento', className: 'border-yellow-500/40 text-yellow-600 bg-yellow-500/10' },
  concluida:    { label: 'Concluída',    className: 'border-green-500/40 text-green-600 bg-green-500/10' },
  cancelada:    { label: 'Cancelada',    className: 'text-muted-foreground'                               },
};

const EMPTY: SchoolTurmaInput = {
  titulo: '', curso_id: null, docente_id: null, status: 'aberta',
  modalidade: 'presencial', inicio: null, fim: null, vagas: null, local: null,
};

export default function SchoolTurmas() {
  const { turmas, isLoading, createTurma, updateTurma, deleteTurma } = useSchoolTurmas();
  const { cursos } = useSchoolCursos();
  const { docentes } = useSchoolDocentes();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolTurma | null>(null);
  const [form, setForm] = useState<SchoolTurmaInput>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    turmas.filter(t => {
      const matchSearch = !search ||
        t.titulo.toLowerCase().includes(search.toLowerCase()) ||
        (t.curso_nome ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (t.docente_nome ?? '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchStatus;
    }), [turmas, search, statusFilter]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setFormOpen(true); };
  const openEdit = (t: SchoolTurma) => { setEditing(t); setForm({ ...t }); setFormOpen(true); };

  const handleSave = () => {
    if (!form.titulo.trim()) return;
    if (editing) updateTurma.mutate({ id: editing.id, ...form });
    else createTurma.mutate(form);
    setFormOpen(false);
  };

  const f = (field: keyof SchoolTurmaInput, value: any) => setForm(p => ({ ...p, [field]: value || null }));

  const fmtDate = (d: string | null) => d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt }) : '—';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Turmas</h1>
          <p className="text-sm text-muted-foreground">{turmas.length} turma{turmas.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Turma</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar turma, curso, instrutor..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <TableHead>Turma</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Instrutor</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Alunos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? 'Nenhuma turma encontrada' : 'Nenhuma turma cadastrada'}
                </TableCell></TableRow>
              ) : filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.titulo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.curso_nome ?? '—'}</TableCell>
                  <TableCell className="text-sm">{t.docente_nome ?? '—'}</TableCell>
                  <TableCell className="text-sm">{fmtDate(t.inicio)}{t.inicio && t.fim ? ' → ' : ''}{fmtDate(t.fim)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm"><Users className="h-3.5 w-3.5 text-muted-foreground" />{t.total_matriculas ?? 0}{t.vagas ? `/${t.vagas}` : ''}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_CONFIG[t.status]?.className ?? ''}>
                      {STATUS_CONFIG[t.status]?.label ?? t.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {t.status === 'concluida' && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" title="Emitir Certificados" onClick={() => navigate(`/school/certificados?turma=${t.id}`)}>
                          <Award className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar Turma' : 'Nova Turma'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Título da Turma *</Label>
              <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="ex: Supervisor NR-35 — Maio 2026" />
            </div>
            <div className="space-y-1">
              <Label>Curso</Label>
              <Select value={form.curso_id ?? ''} onValueChange={v => setForm(p => ({ ...p, curso_id: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar curso" /></SelectTrigger>
                <SelectContent>{cursos.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Instrutor Responsável</Label>
              <Select value={form.docente_id ?? ''} onValueChange={v => setForm(p => ({ ...p, docente_id: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar instrutor" /></SelectTrigger>
                <SelectContent>{docentes.filter(d => d.ativo).map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Modalidade</Label>
              <Select value={form.modalidade ?? 'presencial'} onValueChange={v => setForm(p => ({ ...p, modalidade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
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
              <Label>Data de Início</Label>
              <Input type="date" value={form.inicio ?? ''} onChange={e => f('inicio', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data de Término</Label>
              <Input type="date" value={form.fim ?? ''} onChange={e => f('fim', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Vagas</Label>
              <Input type="number" value={form.vagas ?? ''} onChange={e => f('vagas', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Local</Label>
              <Input value={form.local ?? ''} onChange={e => f('local', e.target.value)} placeholder="ex: CTA ITC" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.titulo.trim() || createTurma.isPending || updateTurma.isPending}>
              {editing ? 'Guardar' : 'Criar Turma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover turma?</AlertDialogTitle><AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteTurma.mutate(deleteId); setDeleteId(null); }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
