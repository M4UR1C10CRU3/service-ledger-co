import { useState, useMemo } from 'react';
import { usePropostas } from '@/hooks/usePropostas';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useClientes } from '@/hooks/useClientes';
import { useProdutos } from '@/hooks/useProdutos';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatEUR } from '@/lib/formatters';
import { FileText, Plus, Download, Eye, Pencil, Copy, FileDown, Trash2, Search, Filter } from 'lucide-react';
import { PropostaFormDialog } from '@/components/propostas/PropostaFormDialog';
import { PropostaDetailDialog } from '@/components/propostas/PropostaDetailDialog';
import { exportPropostaExcelList } from '@/components/propostas/propostaExcelExport';
import type { Proposta, PropostaEstado } from '@/types/proposta';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const estadoBadge: Record<PropostaEstado, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  enviada: { label: 'Enviada', variant: 'default' },
  aceite: { label: 'Aceite', variant: 'default' },
  recusada: { label: 'Recusada', variant: 'destructive' },
  expirada: { label: 'Expirada', variant: 'outline' },
};

const estadoColor: Record<PropostaEstado, string> = {
  rascunho: 'bg-gray-100 text-gray-700 border-gray-300',
  enviada: 'bg-blue-100 text-blue-700 border-blue-300',
  aceite: 'bg-green-100 text-green-700 border-green-300',
  recusada: 'bg-red-100 text-red-700 border-red-300',
  expirada: 'bg-orange-100 text-orange-700 border-orange-300',
};

export default function Propostas() {
  const { propostas, isLoading, deleteProposta, duplicateProposta, fetchLinhas } = usePropostas();
  const { clientes } = useClientes();
  const { produtos } = useProdutos();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [clienteFilter, setClienteFilter] = useState<string>('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProposta, setEditingProposta] = useState<Proposta | null>(null);
  const [detailProposta, setDetailProposta] = useState<Proposta | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Check expired proposals
  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    return propostas.filter(p => {
      // Auto-mark expired
      const isExpired = p.dataValidade && p.dataValidade < today && p.estado === 'enviada';
      const estado = isExpired ? 'expirada' : p.estado;

      if (estadoFilter !== 'todos' && estado !== estadoFilter) return false;
      if (clienteFilter !== 'todos' && p.clienteId !== clienteFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const match = p.numeroProposta.toLowerCase().includes(s)
          || (p.clienteNome || '').toLowerCase().includes(s)
          || (p.titulo || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      return true;
    });
  }, [propostas, search, estadoFilter, clienteFilter, today]);

  const stats = useMemo(() => {
    const total = propostas.length;
    const pendentes = propostas.filter(p => p.estado === 'enviada' || p.estado === 'rascunho').length;
    const aceites = propostas.filter(p => p.estado === 'aceite').length;
    const valorAberto = propostas
      .filter(p => p.estado === 'enviada' || p.estado === 'rascunho')
      .reduce((sum, p) => sum + p.totalComIva, 0);
    return { total, pendentes, aceites, valorAberto };
  }, [propostas]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const ok = await deleteProposta(deleteId);
    if (ok) toast({ title: 'Proposta eliminada com sucesso' });
    else toast({ title: 'Erro ao eliminar proposta', variant: 'destructive' });
    setDeleteId(null);
  };

  const handleDuplicate = async (id: string) => {
    const newId = await duplicateProposta(id);
    if (newId) toast({ title: 'Proposta duplicada com sucesso' });
    else toast({ title: 'Erro ao duplicar', variant: 'destructive' });
  };

  const handleView = (p: Proposta) => {
    setDetailProposta(p);
    setDetailOpen(true);
  };

  const handleEdit = (p: Proposta) => {
    setEditingProposta(p);
    setFormOpen(true);
  };

  const handleExportList = () => {
    exportPropostaExcelList(filtered);
  };

  const getEstado = (p: Proposta): PropostaEstado => {
    if (p.dataValidade && p.dataValidade < today && p.estado === 'enviada') return 'expirada';
    return p.estado;
  };

  const uniqueClientes = useMemo(() => {
    const ids = new Set(propostas.map(p => p.clienteId).filter(Boolean));
    return Array.from(ids).map(id => {
      const p = propostas.find(pr => pr.clienteId === id);
      return { id: id!, nome: p?.clienteNome || 'Desconhecido' };
    });
  }, [propostas]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propostas Comerciais</h1>
          <p className="text-sm text-muted-foreground">Gerencie e emita propostas para clientes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportList}>
            <Download className="h-4 w-4 mr-2" /> Exportar Lista
          </Button>
          <Button onClick={() => { setEditingProposta(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Proposta
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total de Propostas</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-blue-600">{stats.pendentes}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Aceites</p>
          <p className="text-2xl font-bold text-green-600">{stats.aceites}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Valor Total em Aberto</p>
          <p className="text-2xl font-bold text-primary">{formatEUR(stats.valorAberto)}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar nº proposta, cliente..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="enviada">Enviada</SelectItem>
            <SelectItem value="aceite">Aceite</SelectItem>
            <SelectItem value="recusada">Recusada</SelectItem>
            <SelectItem value="expirada">Expirada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clienteFilter} onValueChange={setClienteFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clientes</SelectItem>
            {uniqueClientes.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Proposta</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data Emissão</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Total (c/ IVA)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma proposta encontrada</TableCell></TableRow>
              ) : filtered.map(p => {
                const estado = getEstado(p);
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleView(p)}>
                    <TableCell className="font-medium">{p.numeroProposta}</TableCell>
                    <TableCell>{p.clienteNome || '—'}</TableCell>
                    <TableCell>{new Date(p.dataEmissao).toLocaleDateString('pt-PT')}</TableCell>
                    <TableCell>{p.dataValidade ? new Date(p.dataValidade).toLocaleDateString('pt-PT') : '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatEUR(p.totalComIva)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${estadoColor[estado]}`}>
                        {estadoBadge[estado].label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => handleView(p)} title="Ver"><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(p)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDuplicate(p.id)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)} title="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <PropostaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        proposta={editingProposta}
      />

      {/* Detail Dialog */}
      <PropostaDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        proposta={detailProposta}
        onEdit={handleEdit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proposta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser revertida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
