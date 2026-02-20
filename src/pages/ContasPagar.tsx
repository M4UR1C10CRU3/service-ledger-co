import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseISO } from 'date-fns';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useAccountsPayable } from '@/hooks/useAccountsPayable';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useArticles } from '@/hooks/useArticles';
import {
  AccountPayable, AccountPayableFormData, emptyAccountPayableForm,
} from '@/types/accountPayable';
import { AccountPayableFormDialog } from '@/components/AccountPayableFormDialog';
import { AccountsPayableFilters, FiltersState, initialFilters } from '@/components/contas-pagar/AccountsPayableFilters';
import { AccountsPayableTable, SortField, SortDir } from '@/components/contas-pagar/AccountsPayableTable';
import { AccountDetailDialog } from '@/components/contas-pagar/AccountDetailDialog';
import { LiquidarContaDialog } from '@/components/contas-pagar/LiquidarContaDialog';
import { ContasPagarReportsDialog } from '@/components/contas-pagar/ContasPagarReportsDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Plus, Receipt, LogOut, ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';

const PAGE_SIZE = 10;

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

export default function ContasPagar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { empresa, getLogo, isLoading: empresaLoading } = useEmpresa();
  const { accounts, isLoading, addAccount, updateAccount, deleteAccount, liquidarAccount } = useAccountsPayable();
  const { suppliers, addSupplier } = useSuppliers();
  const { costCenters, addCostCenter } = useCostCenters();
  const { articles, updateArticleStock } = useArticles();

  const logo = getLogo();
  const empresaNome = empresa?.nome || 'Sistema';

  useEffect(() => {
    if (empresaLoading) return;
    if (!empresa) {
      const saved = localStorage.getItem('selectedEmpresa');
      if (!saved) navigate('/empresa');
    }
  }, [empresa, empresaLoading, navigate]);

  // Filters
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [page, setPage] = useState(1);

  // Sort
  const [sortField, setSortField] = useState<SortField>('dataVencimento');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLiquidarOpen, setIsLiquidarOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountPayable | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<AccountPayable | null>(null);
  const [viewingAccount, setViewingAccount] = useState<AccountPayable | null>(null);
  const [liquidarAccount_, setLiquidarAccount] = useState<AccountPayable | null>(null);
  const [formData, setFormData] = useState<AccountPayableFormData>({ ...emptyAccountPayableForm });

  // Filtering + sorting
  const filtered = useMemo(() => {
    let result = accounts;

    if (filters.searchTerm) {
      const q = filters.searchTerm.toLowerCase();
      result = result.filter(a =>
        a.supplierName?.toLowerCase().includes(q) ||
        a.descricao?.toLowerCase().includes(q) ||
        a.numeroDocumento?.toLowerCase().includes(q)
      );
    }
    if (filters.filterStatus !== 'all') result = result.filter(a => a.status === filters.filterStatus);
    if (filters.filterTipo !== 'all') result = result.filter(a => a.tipoLancamento === filters.filterTipo);
    if (filters.filterSupplier !== 'all') result = result.filter(a => a.supplierId === filters.filterSupplier);
    if (filters.filterCategoria !== 'all') result = result.filter(a => a.categoria === filters.filterCategoria);

    if (filters.dateFrom) {
      const from = filters.dateFrom.toISOString().split('T')[0];
      result = result.filter(a => {
        const d = a.dataVencimento || a.dataEmissao;
        return d >= from;
      });
    }
    if (filters.dateTo) {
      const to = filters.dateTo.toISOString().split('T')[0];
      result = result.filter(a => {
        const d = a.dataVencimento || a.dataEmissao;
        return d <= to;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'supplierName':
          cmp = (a.supplierName || '').localeCompare(b.supplierName || '');
          break;
        case 'dataEmissao':
          cmp = a.dataEmissao.localeCompare(b.dataEmissao);
          break;
        case 'valorLiquido':
          cmp = a.valorLiquido - b.valorLiquido;
          break;
        case 'dataVencimento': {
          const da = a.dataVencimento || a.dataEmissao;
          const db = b.dataVencimento || b.dataEmissao;
          cmp = da.localeCompare(db);
          break;
        }
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [accounts, filters, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filters, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Form handlers
  const resetForm = () => { setFormData({ ...emptyAccountPayableForm }); setEditingAccount(null); };

  const handleOpenForm = (account?: AccountPayable) => {
    if (account) {
      setEditingAccount(account);
      // Map legacy types to new types
      const tipoMap: Record<string, 'compra_revenda' | 'despesa'> = {
        compra: 'compra_revenda', compra_revenda: 'compra_revenda',
        despesa: 'despesa', despesa_fixa: 'despesa', custo_investimento: 'despesa',
      };
      const fpMap: Record<string, 'imediato' | 'a_credito'> = {
        a_vista: 'imediato', imediato: 'imediato',
        a_prazo: 'a_credito', a_credito: 'a_credito',
      };
      setFormData({
        supplierId: account.supplierId,
        tipoLancamento: tipoMap[account.tipoLancamento] || 'despesa',
        categoria: account.categoria,
        descricao: account.descricao || '',
        numeroDocumento: account.numeroDocumento || '',
        dataEmissao: new Date(account.dataEmissao),
        valorBruto: String(account.valorBruto),
        ivaRate: String(account.ivaRate || 0),
        ivaValue: String(account.ivaValue || 0),
        valorLiquido: String(account.valorLiquido),
        formaPagamento: fpMap[account.formaPagamento] || 'imediato',
        dataPagamento: account.dataPagamento ? new Date(account.dataPagamento) : new Date(),
        dataVencimento: account.dataVencimento ? new Date(account.dataVencimento) : new Date(),
        metodoPagamento: account.metodoPagamento || 'transferencia',
        observacoes: account.observacoes || '',
        costCenterId: account.costCenterId || '',
        articleId: account.articleId || '',
        quantity: account.quantity ? String(account.quantity) : '',
        items: account.items || [],
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
      toast({ title: 'Erro', description: 'Informe o valor ilíquido.', variant: 'destructive' });
      return;
    }
    if (formData.tipoLancamento === 'compra_revenda' && (!formData.quantity || parseFloat(formData.quantity) <= 0)) {
      toast({ title: 'Erro', description: 'Informe a quantidade.', variant: 'destructive' });
      return;
    }

    if (editingAccount) {
      const ok = await updateAccount(editingAccount.id, formData);
      toast(ok
        ? { title: 'Registo atualizado', description: 'Operação realizada com sucesso.' }
        : { title: 'Erro', description: 'Não foi possível guardar.', variant: 'destructive' }
      );
      if (ok) { setIsFormOpen(false); resetForm(); }
    } else {
      const newId = await addAccount(formData);
      if (newId) {
        // Stock logic for compra_revenda
        if (formData.tipoLancamento === 'compra_revenda' && formData.articleId) {
          const qty = parseFloat(formData.quantity) || 0;
          const bruto = parseFloat(formData.valorBruto) || 0;
          const unitCost = qty > 0 ? bruto / qty : 0;
          await updateArticleStock(formData.articleId, qty, unitCost, formData.supplierId, newId);
        }
        toast({ title: 'Registo guardado', description: 'Operação realizada com sucesso.' });
        setIsFormOpen(false);
        resetForm();
      } else {
        toast({ title: 'Erro', description: 'Não foi possível guardar.', variant: 'destructive' });
      }
    }
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

  const handleLiquidar = (account: AccountPayable) => {
    setLiquidarAccount(account);
    setIsLiquidarOpen(true);
  };

  const handleConfirmLiquidar = async (data: import('@/components/contas-pagar/LiquidarContaDialog').LiquidacaoData): Promise<boolean> => {
    const ok = await liquidarAccount(data);
    toast(ok
      ? { title: 'Conta liquidada', description: 'Pagamento registrado com sucesso.' }
      : { title: 'Erro', description: 'Não foi possível liquidar.', variant: 'destructive' }
    );
    return ok;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Summary totals
  const totalPendente = filtered.filter(a => a.status === 'pendente' || a.status === 'parcial').reduce((s, a) => s + a.valorLiquido, 0);
  const totalLiquidado = filtered.filter(a => a.status === 'liquidado').reduce((s, a) => s + a.valorLiquido, 0);
  const totalVencido = filtered.filter(a => a.status === 'vencido').reduce((s, a) => s + a.valorLiquido, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Gestão de lançamentos</p>
        </div>
      </div>

      {/* Content */}
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <p className="text-sm text-muted-foreground">Total Vencido</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalVencido)}</p>
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
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsReportsOpen(true)}>
                  <BarChart3 className="w-4 h-4 mr-2" /> Relatórios
                </Button>
                <Button onClick={() => handleOpenForm()} size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Nova Conta
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <AccountsPayableFilters filters={filters} onFiltersChange={setFilters} suppliers={suppliers} />

            {/* Table */}
            <div className="mt-6">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : paginated.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {filters.searchTerm || filters.filterStatus !== 'all' || filters.filterTipo !== 'all'
                    ? 'Nenhum lançamento encontrado.' : 'Nenhum lançamento cadastrado.'}
                </div>
              ) : (
                <>
                  <AccountsPayableTable
                    accounts={paginated}
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                    onView={(a) => { setViewingAccount(a); setIsDetailOpen(true); }}
                    onLiquidar={handleLiquidar}
                    onEdit={(a) => handleOpenForm(a)}
                    onDelete={(a) => { setAccountToDelete(a); setIsDeleteOpen(true); }}
                  />

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
            </div>
          </CardContent>
        </Card>
      

      {/* Form Dialog */}
      <AccountPayableFormDialog
        open={isFormOpen}
        onOpenChange={(o) => { setIsFormOpen(o); if (!o) resetForm(); }}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isEditing={!!editingAccount}
        suppliers={suppliers}
        costCenters={costCenters}
        articles={articles}
        onAddCostCenter={addCostCenter}
        onAddSupplier={addSupplier}
      />

      {/* Detail Dialog */}
      <AccountDetailDialog
        account={viewingAccount}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
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

      {/* Liquidar Dialog */}
      <LiquidarContaDialog
        account={liquidarAccount_}
        open={isLiquidarOpen}
        onOpenChange={(o) => { setIsLiquidarOpen(o); if (!o) setLiquidarAccount(null); }}
        onConfirm={handleConfirmLiquidar}
      />

      {/* Reports Dialog */}
      <ContasPagarReportsDialog
        open={isReportsOpen}
        onOpenChange={setIsReportsOpen}
        accounts={accounts}
      />
    </div>
  );
}
