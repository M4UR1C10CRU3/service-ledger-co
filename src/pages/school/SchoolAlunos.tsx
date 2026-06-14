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
import { Plus, Search, Users, Pencil, Trash2, GraduationCap, UserCheck } from 'lucide-react';
import { useSchoolAlunos, SchoolAluno, SchoolAlunoInput } from '@/hooks/useSchoolAlunos';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ativo:   { label: 'Ativo',   className: 'border-green-500/40 text-green-600 bg-green-500/10' },
  egresso: { label: 'Egresso', className: 'border-blue-500/40 text-blue-600 bg-blue-500/10'   },
  inativo: { label: 'Inativo', className: 'text-muted-foreground'                              },
};

const EMPTY: SchoolAlunoInput = {
  nome: '', email: null, cpf: null, telefone: null, data_nascimento: null,
  status: 'ativo', empresa_trabalho: null, foto_url: null, ativo: true,
};

export default function SchoolAlunos() {
  const { alunos, isLoading, createAluno, updateAluno, deleteAluno } = useSchoolAlunos();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolAluno | null>(null);
  const [form, setForm] = useState<SchoolAlunoInput>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    alunos.filter(a => {
      const matchSearch = !search ||
        a.nome.toLowerCase().includes(search.toLowerCase()) ||
        (a.cpf ?? '').includes(search) ||
        (a.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.empresa_trabalho ?? '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchSearch && matchStatus;
    }), [alunos, search, statusFilter]);

  const stats = useMemo(() => ({
    total: alunos.length,
    ativos: alunos.filter(a => a.status === 'ativo').length,
    egressos: alunos.filter(a => a.status === 'egresso').length,
  }), [alunos]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setFormOpen(true); };
  const openEdit = (a: SchoolAluno) => { setEditing(a); setForm({ ...a }); setFormOpen(true); };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    if (editing) updateAluno.mutate({ id: editing.id, ...form });
    else createAluno.mutate(form);
    setFormOpen(false);
  };

  const f = (field: keyof SchoolAlunoInput, value: any) => setForm(p => ({ ...p, [field]: value || null }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Alunos</h1>
          <p className="text-sm text-muted-foreground">{stats.total} aluno{stats.total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Aluno</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-foreground' },
          { label: 'Ativos', value: stats.ativos, icon: UserCheck, color: 'text-green-600' },
          { label: 'Egressos', value: stats.egressos, icon: GraduationCap, color: 'text-blue-600' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`h-8 w-8 ${kpi.color} opacity-70`} />
              <div><p className="text-2xl font-bold">{kpi.value}</p><p className="text-xs text-muted-foreground">{kpi.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Nome, CPF, email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="egresso">Egressos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
                </TableCell></TableRow>
              ) : filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell className="text-sm font-mono">{a.cpf ?? '—'}</TableCell>
                  <TableCell className="text-sm">{a.telefone ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.empresa_trabalho ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_CONFIG[a.status]?.className ?? ''}>
                      {STATUS_CONFIG[a.status]?.label ?? a.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Nome Completo *</Label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input value={form.cpf ?? ''} onChange={e => f('cpf', e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.telefone ?? ''} onChange={e => f('telefone', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>E-mail</Label>
              <Input type="email" value={form.email ?? ''} onChange={e => f('email', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data de Nascimento</Label>
              <Input type="date" value={form.data_nascimento ?? ''} onChange={e => f('data_nascimento', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="egresso">Egresso</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Empresa onde trabalha</Label>
              <Input value={form.empresa_trabalho ?? ''} onChange={e => f('empresa_trabalho', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome.trim() || createAluno.isPending || updateAluno.isPending}>
              {editing ? 'Guardar' : 'Criar Aluno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover aluno?</AlertDialogTitle><AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteAluno.mutate(deleteId); setDeleteId(null); }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
