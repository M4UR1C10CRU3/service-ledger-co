import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { parseLocalDate, formatDateToISO, getEffectiveStatus } from '@/lib/utils';
import { useAccountsPayable } from '@/hooks/useAccountsPayable';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProdutos } from '@/hooks/useProdutos';
import { useStockAtual } from '@/hooks/useStockAtual';
import {
  AccountPayable, AccountPayableFormData, AccountPayableItem, emptyAccountPayableForm,
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
import {
  Plus, Receipt, ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';

const PAGE_SIZE = 10;

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

export default function Compras() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { empresa, isLoading: empresaLoading } = useEmpresa();
  const { accounts, isLoading, addAccount, updateAccount, deleteAccount, liquidarAccount, refreshAccounts } = useAccountsPayable();
  const { suppliers, addSupplier } = useSuppliers();
  const { costCenters, addCostCenter } = useCostCenters();
  // Stock único: tudo passa por produtos + stock_atual/stock_movimentos. As
  // tabelas antigas articles/stock_movements estavam vazias e ficam na base,
  // intactas, só deixam de ser usadas.
  const { produtos } = useProdutos();
  const { registarEntrada } = useStockAtual();

  useEffect(() => {
    if (empresaLoading) return;
    if (!empresa) {
      const saved = localStorage.getItem('selectedEmpresa');
      if (!saved) navigate('/empresa');
    }
  }, [empresa, empresaLoading, navigate]);

  // Filter to only compra-type accounts
  const compraAccounts = useMemo(() => {
    return accounts.filter(a =>
      a.tipoLancamento === 'compra_revenda' || a.tipoLancamento === 'compra'
    );
  }, [accounts]);

  // Filters
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [page, setPage] = useState(1);
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
  const [formData, setFormData] = useState<AccountPayableFormData>({ ...emptyAccountPayableForm, tipoLancamento: 'compra_revenda' });

  // Filtering + sorting
  const filtered = useMemo(() => {
    let result = compraAccounts;
    if (filters.searchTerm) {
      const q = filters.searchTerm.toLowerCase();
      result = result.filter(a =>
        a.supplierName?.toLowerCase().includes(q) ||
        a.descricao?.toLowerCase().includes(q) ||
        a.numeroDocumento?.toLowerCase().includes(q)
      );
    }
    if (filters.filterStatus === 'critico') {
      const todayStr = formatDateToISO(new Date());
      result = result.filter(a => {
        const eff = getEffectiveStatus(a.status, a.dataVencimento);
        return eff === 'vencido' || ((eff === 'pendente' || eff === 'parcial') && a.dataVencimento && a.dataVencimento <= todayStr);
      });
    } else if (filters.filterStatus === 'pendente') {
      const todayStr = formatDateToISO(new Date());
      result = result.filter(a => {
        const eff = getEffectiveStatus(a.status, a.dataVencimento);
        return eff === 'pendente' || eff === 'parcial';
      });
    } else if (filters.filterStatus === 'vencido') {
      result = result.filter(a => getEffectiveStatus(a.status, a.dataVencimento) === 'vencido');
    } else if (filters.filterStatus === 'liquidado') {
      result = result.filter(a => a.status === 'liquidado');
    } else if (filters.filterStatus !== 'all') {
      result = result.filter(a => a.status === filters.filterStatus);
    }
    if (filters.filterSupplier !== 'all') result = result.filter(a => a.supplierId === filters.filterSupplier);
    if (filters.filterCategoria !== 'all') result = result.filter(a => a.categoria === filters.filterCategoria);
    // Emissão Year/Month filter
    if (filters.emissaoYear !== 'all') {
      result = result.filter(a => a.dataEmissao.substring(0, 4) === filters.emissaoYear);
    }
    if (filters.emissaoMonth !== 'all') {
      result = result.filter(a => a.dataEmissao.substring(5, 7) === filters.emissaoMonth);
    }
    // Vencimento Year/Month filter
    if (filters.vencimentoYear !== 'all') {
      result = result.filter(a => (a.dataVencimento || '').substring(0, 4) === filters.vencimentoYear);
    }
    if (filters.vencimentoMonth !== 'all') {
      result = result.filter(a => (a.dataVencimento || '').substring(5, 7) === filters.vencimentoMonth);
    }
    if (filters.dateFrom) {
      const from = formatDateToISO(filters.dateFrom);
      result = result.filter(a => (a.dataVencimento || a.dataEmissao) >= from);
    }
    if (filters.dateTo) {
      const to = formatDateToISO(filters.dateTo);
      result = result.filter(a => (a.dataVencimento || a.dataEmissao) <= to);
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'supplierName': cmp = (a.supplierName || '').localeCompare(b.supplierName || ''); break;
        case 'dataEmissao': cmp = a.dataEmissao.localeCompare(b.dataEmissao); break;
        case 'valorLiquido': cmp = a.valorLiquido - b.valorLiquido; break;
        case 'dataVencimento': cmp = (a.dataVencimento || a.dataEmissao).localeCompare(b.dataVencimento || b.dataEmissao); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [compraAccounts, filters, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filters, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const resetForm = () => { setFormData({ ...emptyAccountPayableForm, tipoLancamento: 'compra_revenda' }); setEditingAccount(null); setNeOrigem(null); };

  // «Registar compra do fornecedor» numa Nota de Encomenda recebida abre aqui
  // (/compras?ne=<id>) o formulário já preenchido com o fornecedor e os artigos.
  const [searchParams, setSearchParams] = useSearchParams();
  const [neOrigem, setNeOrigem] = useState<{ id: string; numero: string } | null>(null);
  useEffect(() => {
    const neId = searchParams.get('ne');
    if (!neId || !empresa) return;
    setSearchParams(p => { p.delete('ne'); return p; }, { replace: true });
    (async () => {
      const [{ data: ne }, { data: itens }] = await Promise.all([
        (supabase as any).from('notas_encomenda').select('id, numero, titulo, estado, fornecedor_id').eq('id', neId).eq('empresa_id', empresa.id).maybeSingle(),
        (supabase as any).from('notas_encomenda_items').select('descricao, referencia, quantidade, preco_unit, ordem').eq('ne_id', neId).order('ordem'),
      ]);
      if (!ne) { toast({ title: 'Nota de encomenda não encontrada', variant: 'destructive' }); return; }
      if (ne.estado !== 'recebida') {
        toast({ title: `A nota ${ne.numero} não está «Recebida»`, description: 'Só se regista a compra de uma nota recebida e ainda por faturar.', variant: 'destructive' });
        return;
      }
      const items: AccountPayableItem[] = (itens ?? []).map((it: any) => ({
        id: crypto.randomUUID(),
        descricao: it.descricao || '',
        quantidade: String(it.quantidade ?? 1),
        valorBruto: it.preco_unit != null ? String(it.preco_unit) : '',
        ivaRate: '23',
        produtoRef: it.referencia || undefined,
      }));
      const vencimento = new Date(); vencimento.setDate(vencimento.getDate() + 30);
      setEditingAccount(null);
      setFormData({
        ...emptyAccountPayableForm,
        tipoLancamento: 'compra_revenda',
        categoria: 'artigos_revenda',
        supplierId: ne.fornecedor_id || '',
        descricao: `${ne.numero} — ${ne.titulo}`,
        formaPagamento: 'a_credito',
        dataPagamento: null,
        dataVencimento: vencimento,
        observacoes: `Origem: Nota de Encomenda ${ne.numero}`,
        items,
      });
      setNeOrigem({ id: ne.id, numero: ne.numero });
      setIsFormOpen(true);
      toast({ title: `Compra da nota ${ne.numero}`, description: 'Confira os valores, indique o nº da fatura do fornecedor e guarde.' });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, empresa?.id]);

  const handleDuplicate = (account: AccountPayable) => {
    setEditingAccount(null);
    setFormData({
      supplierId: account.supplierId,
      tipoLancamento: 'compra_revenda',
      categoria: account.categoria,
      descricao: account.descricao || '',
      numeroDocumento: '',
      dataEmissao: new Date(),
      valorBruto: String(account.valorBruto),
      ivaRate: String(account.ivaRate || 0),
      ivaValue: String(account.ivaValue || 0),
      valorLiquido: String(account.valorLiquido),
      formaPagamento: 'a_credito',
      dataPagamento: null,
      dataVencimento: new Date(),
      metodoPagamento: account.metodoPagamento || 'transferencia',
      observacoes: account.observacoes || '',
      costCenterId: account.costCenterId || '',
      articleId: account.articleId || '',
      quantity: account.quantity ? String(account.quantity) : '',
      items: account.items || [],
    });
    setIsFormOpen(true);
    toast({ title: 'Lançamento duplicado', description: 'Ajuste os dados necessários e guarde.' });
  };

  const handleOpenForm = (account?: AccountPayable) => {
    if (account) {
      setEditingAccount(account);
      const fpMap: Record<string, 'imediato' | 'a_credito'> = {
        a_vista: 'imediato', imediato: 'imediato',
        a_prazo: 'a_credito', a_credito: 'a_credito',
      };
      // Show stored net values as-is (no reconversion to avoid rounding drift)
      const storedItems = (account.items || []) as AccountPayableItem[];
      const hasItems = storedItems.length > 0;
      const storedValorBruto = hasItems
        ? String(account.valorBruto)
        : String(account.valorBruto);

      setFormData({
        supplierId: account.supplierId,
        tipoLancamento: 'compra_revenda',
        categoria: account.categoria,
        descricao: account.descricao || '',
        numeroDocumento: account.numeroDocumento || '',
        dataEmissao: parseLocalDate(account.dataEmissao),
        valorBruto: storedValorBruto,
        ivaRate: String(account.ivaRate || 0),
        ivaValue: String(account.ivaValue || 0),
        valorLiquido: String(account.valorLiquido),
        formaPagamento: fpMap[account.formaPagamento] || 'imediato',
        dataPagamento: account.dataPagamento ? parseLocalDate(account.dataPagamento) : null,
        dataVencimento: account.dataVencimento ? parseLocalDate(account.dataVencimento) : new Date(),
        metodoPagamento: account.metodoPagamento || 'transferencia',
        observacoes: account.observacoes || '',
        costCenterId: account.costCenterId || '',
        articleId: account.articleId || '',
        quantity: account.quantity ? String(account.quantity) : '',
        items: storedItems,
        ivaIncluido: false,
      });
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (submissionData: AccountPayableFormData) => {
    if (!submissionData.supplierId) {
      toast({ title: 'Erro', description: 'Selecione um fornecedor.', variant: 'destructive' });
      return;
    }
    if (!submissionData.categoria) {
      toast({ title: 'Erro', description: 'Selecione uma categoria.', variant: 'destructive' });
      return;
    }
    const hasItems = submissionData.items && submissionData.items.length > 0;
    if (!hasItems && (!submissionData.valorBruto || parseFloat(submissionData.valorBruto) <= 0)) {
      toast({ title: 'Erro', description: 'Informe o valor.', variant: 'destructive' });
      return;
    }

    if (editingAccount) {
      const ok = await updateAccount(editingAccount.id, submissionData);
      if (ok) {
        const items = submissionData.items || [];
        if (items.length > 0) {
          const { data: existingMovs } = await supabase
            .from('stock_movimentos')
            .select('produto_ref')
            .eq('compra_id', editingAccount.id)
            .eq('tipo', 'entrada');
          const existingRefs = new Set((existingMovs || []).map((m: any) => m.produto_ref));

          for (const item of items) {
            const ref = item.produtoRef || '';
            if (!ref || existingRefs.has(ref)) continue;
            const qty = parseFloat(item.quantidade) || 0;
            const unitCost = parseFloat(item.valorBruto) || 0;
            if (qty <= 0) continue;
            await registarEntrada({
              produtoRef: ref,
              produtoDesc: item.descricao,
              quantidade: qty,
              custoUnitario: unitCost,
              origem: 'compra',
              referenciaDoc: submissionData.numeroDocumento || editingAccount.id,
              compraId: editingAccount.id,
            });
          }
        }
        toast({ title: 'Registo atualizado', description: 'Operação realizada com sucesso.' });
        setIsFormOpen(false); resetForm();
      } else {
        toast({ title: 'Erro', description: 'Não foi possível guardar.', variant: 'destructive' });
      }
    } else {
      const newId = await addAccount(submissionData);
      if (newId) {
        const items = submissionData.items || [];
        if (items.length > 0) {
          for (const item of items) {
            const ref = item.produtoRef || '';
            if (!ref) continue;
            const qty = parseFloat(item.quantidade) || 0;
            const unitCost = parseFloat(item.valorBruto) || 0;
            if (qty <= 0) continue;
            await registarEntrada({
              produtoRef: ref,
              produtoDesc: item.descricao,
              quantidade: qty,
              custoUnitario: unitCost,
              origem: 'compra',
              referenciaDoc: submissionData.numeroDocumento || newId,
              compraId: newId,
            });
          }
        }
        // Compra nascida de uma Nota de Encomenda recebida: a nota fica «Faturada»
        // e com o valor final, para não se registar a mesma fatura duas vezes.
        if (neOrigem) {
          const { data: neGravada } = await (supabase as any).from('notas_encomenda')
            .update({ estado: 'faturada', valor_final: parseFloat(submissionData.valorLiquido) || null })
            .eq('id', neOrigem.id).eq('estado', 'recebida').select('id');
          if (!neGravada?.length) {
            toast({ title: `Nota ${neOrigem.numero} não foi atualizada`, description: 'A compra ficou gravada; marque a nota como faturada à mão.', variant: 'destructive' });
          }
        }
        toast({ title: 'Compra guardada', description: neOrigem ? `Stock atualizado e nota ${neOrigem.numero} faturada.` : 'Stock atualizado com sucesso.' });
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
        ? { title: 'Compra removida', description: 'Registro removido com sucesso.' }
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
      ? { title: 'Compra liquidada', description: 'Pagamento registrado com sucesso.' }
      : { title: 'Erro', description: 'Não foi possível liquidar.', variant: 'destructive' }
    );
    return ok;
  };

  // Summary totals — use effective status (date-aware)
  const totalPendente = filtered.filter(a => { const e = getEffectiveStatus(a.status, a.dataVencimento); return e === 'pendente' || e === 'parcial'; }).reduce((s, a) => s + a.valorLiquido, 0);
  const totalLiquidado = filtered.filter(a => a.status === 'liquidado').reduce((s, a) => s + a.valorLiquido, 0);
  const totalVencido = filtered.filter(a => getEffectiveStatus(a.status, a.dataVencimento) === 'vencido').reduce((s, a) => s + a.valorLiquido, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compras</h1>
          <p className="text-sm text-muted-foreground">Gestão de compras de artigos para revenda</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsReportsOpen(true)}>
            <BarChart3 className="w-4 h-4 mr-2" /> Relatórios
          </Button>
          <Button onClick={() => handleOpenForm()} size="sm">
            <Plus className="w-4 h-4 mr-2" /> Nova Compra
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Lançamentos</p><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Pendente</p><p className="text-2xl font-bold text-warning">{formatCurrency(totalPendente)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Vencido</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalVencido)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Liquidado</p><p className="text-2xl font-bold text-success">{formatCurrency(totalLiquidado)}</p></CardContent></Card>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <Receipt className="w-6 h-6 text-primary" />
              <CardTitle>Compras</CardTitle>
              <span className="text-sm text-muted-foreground">({filtered.length})</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AccountsPayableFilters filters={filters} onFiltersChange={setFilters} suppliers={suppliers} />
          <div className="mt-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {filters.searchTerm || filters.filterStatus !== 'all'
                  ? 'Nenhuma compra encontrada.' : 'Nenhuma compra cadastrada.'}
              </div>
            ) : (
              <>
                <AccountsPayableTable
                  accounts={paginated}
                  sortField={sortField} sortDir={sortDir} onSort={handleSort}
                  onView={(a) => { setViewingAccount(a); setIsDetailOpen(true); }}
                  onLiquidar={handleLiquidar}
                  onEdit={(a) => handleOpenForm(a)}
                  onDelete={(a) => { setAccountToDelete(a); setIsDeleteOpen(true); }}
                  onDuplicate={handleDuplicate}
                />
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
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
        formData={formData} setFormData={setFormData}
        onSubmit={handleSubmit} isEditing={!!editingAccount}
        suppliers={suppliers} costCenters={costCenters}
        produtos={produtos} onAddCostCenter={addCostCenter}
        onAddSupplier={addSupplier}
        mode="compra"
      />

      <AccountDetailDialog account={viewingAccount} open={isDetailOpen} onOpenChange={setIsDetailOpen} onMoved={refreshAccounts} />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Compra</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover este lançamento? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LiquidarContaDialog
        account={liquidarAccount_} open={isLiquidarOpen}
        onOpenChange={(o) => { setIsLiquidarOpen(o); if (!o) setLiquidarAccount(null); }}
        onConfirm={handleConfirmLiquidar}
      />

      <ContasPagarReportsDialog open={isReportsOpen} onOpenChange={setIsReportsOpen} accounts={compraAccounts} />
    </div>
  );
}
