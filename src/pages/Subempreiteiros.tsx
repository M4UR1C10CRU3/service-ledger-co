import { useState, useMemo } from 'react';
import { useSubempreiteiros } from '@/hooks/useSubempreiteiros';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SubempreiteiroFormDialog } from '@/components/subempreiteiros/SubempreiteiroFormDialog';
import { SubempreiteiroDetailDialog } from '@/components/subempreiteiros/SubempreiteiroDetailDialog';
import type { Subempreiteiro } from '@/types/subempreiteiro';
import {
  Plus, Search, Eye, Pencil, Trash2,
  User, Building2, ToggleLeft, ToggleRight, Handshake,
} from 'lucide-react';

export default function Subempreiteiros() {
  const { subempreiteiros, isLoading, remove, toggleAtivo } = useSubempreiteiros();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [estadoFilter, setEstadoFilter] = useState<string>('ativos');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subempreiteiro | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailing, setDetailing] = useState<Subempreiteiro | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return subempreiteiros.filter(s => {
      if (tipoFilter !== 'todos' && s.tipo !== tipoFilter) return false;
      if (estadoFilter === 'ativos' && !s.ativo) return false;
      if (estadoFilter === 'inativos' && s.ativo) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          s.nome.toLowerCase().includes(q) ||
          (s.especialidade || '').toLowerCase().includes(q) ||
          (s.nif || '').toLowerCase().includes(q) ||
          (s.nipc || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [subempreiteiros, search, tipoFilter, estadoFilter]);

  const stats = useMemo(() => ({
    total: subempreiteiros.length,
    individuais: subempreiteiros.filter(s => s.tipo === 'individual').length,
    coletivas: subempreiteiros.filter(s => s.tipo === 'coletiva').length,
    inativos: subempreiteiros.filter(s => !s.ativo).length,
  }), [subempreiteiros]);

  const handleEdit = (s: Subempreiteiro) => {
    setEditing(s);
    setFormOpen(true);
    setDetailOpen(false);
  };

  const handleView = (s: Subempreiteiro) => {
    setDetailing(s);
    setDetailOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const ok = await remove(deleteId);
    if (ok) toast({ title: 'Subempreiteiro eliminado' });
    else toast({ title: 'Erro ao eliminar', variant: 'destructive' });
    setDeleteId(null);
  };

  const handleToggle = async (s: Subempreiteiro) => {
    const ok = await toggleAtivo(s.id, !s.ativo);
    if (ok) toast({ title: s.ativo ? 'Subempreiteiro desativado' : 'Subempreiteiro ativado' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" />
            Subempreiteiros
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de subcontratados — Pessoas Individuais e Coletivas
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Subempreiteiro
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Handshake className="h-3.5 w-3.5" /> Total
            </p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Individuais
            </p>
            <p className="text-2xl font-bold mt-1">{stats.individuais}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Coletivas
            </p>
            <p className="text-2xl font-bold mt-1">{stats.coletivas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Inativos</p>
            <p className="text-2xl font-bold mt-1">{stats.inativos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar por nome, NIF/NIPC, especialidade, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="individual">Pessoa Individual</SelectItem>
            <SelectItem value="coletiva">Pessoa Coletiva</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>NIF / NIPC</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    A carregar...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum subempreiteiro encontrado
                  </TableCell>
                </TableRow>
              ) : filtered.map(s => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => handleView(s)}
                >
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {s.tipo === 'individual'
                        ? <><User className="h-3 w-3" /> Individual</>
                        : <><Building2 className="h-3 w-3" /> Coletiva</>}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {s.tipo === 'individual' ? (s.nif || '—') : (s.nipc || '—')}
                  </TableCell>
                  <TableCell>{s.especialidade || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.email || s.telefone || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.ativo ? 'default' : 'outline'}>
                      {s.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleView(s)} title="Ver ficha">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(s)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleToggle(s)} title={s.ativo ? 'Desativar' : 'Ativar'}>
                        {s.ativo
                          ? <ToggleRight className="h-4 w-4 text-emerald-600" />
                          : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)} title="Eliminar">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SubempreiteiroFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        subempreiteiro={editing}
      />

      <SubempreiteiroDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        subempreiteiro={detailing}
        onEdit={handleEdit}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar subempreiteiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O cadastro e todos os documentos associados serão eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
