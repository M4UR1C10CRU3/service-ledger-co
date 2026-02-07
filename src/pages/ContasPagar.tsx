import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useAccountsPayable } from '@/hooks/useAccountsPayable';
import { useSuppliers } from '@/hooks/useSuppliers';
import {
  AccountPayable, AccountPayableFormData, emptyAccountPayableForm,
  TIPO_LANCAMENTO_LABELS, STATUS_LABELS, CATEGORIAS_POR_TIPO,
} from '@/types/accountPayable';
import { AccountPayableFormDialog } from '@/components/AccountPayableFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Plus, Search, Pencil, Trash2, Receipt, LogOut,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 10;

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'liquidado': return 'default';
    case 'pendente': return 'secondary';
    case 'vencido': return 'destructive';
    case 'cancelado': return 'outline';
    default: return 'secondary';
  }
}

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function getCategoriaLabel(tipo: string, cat: string): string {
  const list = CATEGORIAS_POR_TIPO[tipo];
  if (!list) return cat;
  const found = list.find(c => c.value === cat);
  return found?.label || cat;
}

export default function ContasPagar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { empresa, getLogo } = useEmpresa();
  const { accounts, isLoading, addAccount, updateAccount, deleteAccount } = useAccountsPayable();
  const { suppliers } = useSuppliers();

  const logo = getLogo();
  const empresaNome = empresa?.nome || 'Sistema';

  useEffect(() => {
    if (!empresa) {
      const saved = localStorage.getItem('selectedEmpresa');
      if (!saved) navigate('/empresa');
    }
  }, [empresa, navigate]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountPayable | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<AccountPayable | null>(null);
  const [formData, setFormData] = useState<AccountPayableFormData>({ ...emptyAccountPayableForm });

  const filtered = useMemo(() => {
    let result = accounts;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.supplierName?.toLowerCase().includes(q) ||
        a.descricao?.toLowerCase().includes(q) ||
        a.numeroDocumento?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') result = result.filter(a => a.status === filterStatus);
    if (filterTipo !== 'all') result = result.filter(a => a.tipoLancamento === filterTipo);
    return result;
  }, [accounts, searchTerm, filterStatus, filterTipo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchTerm, filterStatus, filterTipo]);

  const resetForm = () => { setFormData({ ...emptyAccountPayableForm }); setEditingAccount(null); };

  const handleOpenForm = (account?: AccountPayable) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        supplierId: account.supplierId,
        tipoLancamento: account.tipoLancamento,
        categoria: account.categoria,
        descricao: account.descricao || '',
        numeroDocumento: account.numeroDocumento || '',
        dataEmissao: new Date(account.dataEmissao),
        valorBruto: String(account.valorBruto),
        desconto: String(account.desconto),
        acrescimo: String(account.acrescimo),
        formaPagamento: account.formaPagamento,
        dataPagamento: account.dataPagamento ? new Date(account.dataPagamento) : new Date(),
        dataVencimento: account.dataVencimento ? new Date(account.dataVencimento) : new Date(),
        metodoPagamento: account.metodoPagamento || 'transferencia',
        centroCusto: account.centroCusto || '',
        projeto: account.projeto || '',
        observacoes: account.observacoes || '',
        vincularEstoque: account.vincularEstoque,
      });
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.supplierId) {
      toast({ title: 'Erro', description: 'Selecione um fornecedor.', variant: 'destructive' });
      return;
    }
    if (!formData.categoria) {
      toast({ title: 'Erro', description: 'Selecione uma categoria.', variant: 'destructive' });
      return;
    }
    if (!formData.valorBruto || parseFloat(formData.valorBruto) <= 0) {
      toast({ title: 'Erro', description: 'Informe o valor bruto.', variant: 'destructive' });
      return;
    }

    const ok = editingAccount
      ? await updateAccount(editingAccount.id, formData)
      : await addAccount(formData);

    toast(ok
      ? { title: editingAccount ? 'Conta atualizada' : 'Conta cadastrada', description: 'Operação realizada com sucesso.' }
      : { title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' }
    );
    if (ok) { setIsFormOpen(false); resetForm(); }
  };

  const handleConfirmDelete = async () => {
    if (accountToDelete) {
      const ok = await deleteAccount(accountToDelete.id);
      toast(ok
        ? { title: 'Conta removida', description: 'Registro removido com sucesso.' }
        : { title: 'Erro', description: 'Não foi possível remover.', variant: 'destructive' }
      );
    }
    setIsDeleteOpen(false);
    setAccountToDelete(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Summary totals
  const totalPendente = filtered.filter(a => a.status === 'pendente').reduce((s, a) => s + a.valorLiquido, 0);
  const totalLiquidado = filtered.filter(a => a.status === 'liquidado').reduce((s, a) => s + a.valorLiquido, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={logo} alt={`${empresaNome} Logo`} className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{empresaNome}</h1>
              <p className="text-sm text-muted-foreground">Contas a Pagar</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Lançamentos</p>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Pendente</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalPendente)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Liquidado</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalLiquidado)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <Receipt className="w-6 h-6 text-primary" />
                <CardTitle>Lançamentos</CardTitle>
                <span className="text-sm text-muted-foreground">({filtered.length})</span>
              </div>
              <Button onClick={() => handleOpenForm()} size="sm">
                <Plus className="w-4 h-4 mr-2" /> Nova Conta
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Pesquisar por fornecedor, descrição ou nº documento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  {Object.entries(TIPO_LANCAMENTO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || filterStatus !== 'all' || filterTipo !== 'all' ? 'Nenhum lançamento encontrado.' : 'Nenhum lançamento cadastrado.'}
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Emissão</TableHead>
                        <TableHead className="text-right">Valor Líq.</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.supplierName || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{TIPO_LANCAMENTO_LABELS[a.tipoLancamento]}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{getCategoriaLabel(a.tipoLancamento, a.categoria)}</TableCell>
                          <TableCell className="text-sm">{format(new Date(a.dataEmissao), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(a.valorLiquido)}</TableCell>
                          <TableCell className="text-sm">
                            {a.dataVencimento ? format(new Date(a.dataVencimento), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(a.status)}>{STATUS_LABELS[a.status]}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenForm(a)} title="Editar">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setAccountToDelete(a); setIsDeleteOpen(true); }} title="Remover">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Form Dialog */}
      <AccountPayableFormDialog
        open={isFormOpen}
        onOpenChange={(o) => { setIsFormOpen(o); if (!o) resetForm(); }}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isEditing={!!editingAccount}
        suppliers={suppliers}
      />

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Conta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
