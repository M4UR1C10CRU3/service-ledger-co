import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, subMonths, startOfMonth, endOfMonth, addDays, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useAccountsPayable } from '@/hooks/useAccountsPayable';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCostCenters } from '@/hooks/useCostCenters';

import {
  AccountPayable, AccountPayableFormData, emptyAccountPayableForm,
  CATEGORIAS_POR_TIPO,
} from '@/types/accountPayable';
import { AccountPayableFormDialog } from '@/components/AccountPayableFormDialog';
import { AccountsPayableFilters, FiltersState, initialFilters } from '@/components/contas-pagar/AccountsPayableFilters';
import { AccountsPayableTable, SortField, SortDir } from '@/components/contas-pagar/AccountsPayableTable';
import { AccountDetailDialog } from '@/components/contas-pagar/AccountDetailDialog';
import { LiquidarContaDialog } from '@/components/contas-pagar/LiquidarContaDialog';
import { ContasPagarReportsDialog } from '@/components/contas-pagar/ContasPagarReportsDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Receipt, ChevronLeft, ChevronRight, BarChart3,
  CalendarDays, AlertTriangle, Clock, AlertCircle, CheckCircle2, Building2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';

const PAGE_SIZE = 10;
const PIE_COLORS = [
  'hsl(211, 100%, 40%)', 'hsl(152, 69%, 40%)', 'hsl(38, 92%, 50%)',
  'hsl(280, 60%, 55%)', 'hsl(22, 89%, 54%)', 'hsl(190, 80%, 42%)',
  'hsl(340, 75%, 50%)', 'hsl(120, 50%, 45%)',
];

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function getCatLabel(cat: string): string {
  for (const cats of Object.values(CATEGORIAS_POR_TIPO)) {
    const found = cats.find(c => c.value === cat);
    if (found) return found.label;
  }
  return cat;
}

export default function Despesas() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { empresa, isLoading: empresaLoading } = useEmpresa();
  const { accounts, isLoading, addAccount, updateAccount, deleteAccount, liquidarAccount } = useAccountsPayable();
  const { suppliers, addSupplier } = useSuppliers();
  const { costCenters, addCostCenter } = useCostCenters();
  

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
  const [sortField, setSortField] = useState<SortField>('dataVencimento');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [activeTab, setActiveTab] = useState('visao-geral');

  // Handle URL filter param (from notification bell)
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'criticas') {
      setFilters(prev => ({ ...prev, filterStatus: 'vencido' }));
      setActiveTab('lista');
      setSortField('dataVencimento');
      setSortDir('asc');
      // Clean up URL param
      searchParams.delete('filter');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  // Date helpers
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);
  const monthStart = useMemo(() => startOfMonth(today).toISOString().split('T')[0], [today]);
  const monthEnd = useMemo(() => endOfMonth(today).toISOString().split('T')[0], [today]);
  const next7Str = useMemo(() => addDays(today, 7).toISOString().split('T')[0], [today]);

  // Filter to only despesa-type accounts
  const despesaAccounts = useMemo(() => {
    return accounts.filter(a =>
      a.tipoLancamento === 'despesa' || a.tipoLancamento === 'despesa_fixa' || a.tipoLancamento === 'custo_investimento'
    );
  }, [accounts]);

  // KPIs
  const kpis = useMemo(() => {
    const monthAccounts = despesaAccounts.filter(a =>
      (a.status === 'pendente' || a.status === 'parcial' || a.status === 'vencido') &&
      a.dataVencimento && a.dataVencimento >= monthStart && a.dataVencimento <= monthEnd
    );
    const todayAccounts = despesaAccounts.filter(a =>
      (a.status === 'pendente' || a.status === 'parcial') && a.dataVencimento === todayStr
    );
    const next7Accounts = despesaAccounts.filter(a =>
      (a.status === 'pendente' || a.status === 'parcial') &&
      a.dataVencimento && a.dataVencimento > todayStr && a.dataVencimento <= next7Str
    );
    const overdueAccounts = despesaAccounts.filter(a =>
      (a.status === 'pendente' || a.status === 'parcial' || a.status === 'vencido') &&
      a.dataVencimento && a.dataVencimento < todayStr
    );
    const paidAccounts = despesaAccounts.filter(a =>
      a.status === 'liquidado' && a.dataPagamento && a.dataPagamento >= monthStart && a.dataPagamento <= monthEnd
    );
    return {
      totalMes: monthAccounts.reduce((s, a) => s + a.valorLiquido, 0), monthCount: monthAccounts.length,
      totalHoje: todayAccounts.reduce((s, a) => s + a.valorLiquido, 0), hojCount: todayAccounts.length,
      totalNext7: next7Accounts.reduce((s, a) => s + a.valorLiquido, 0), next7Count: next7Accounts.length,
      totalOverdue: overdueAccounts.reduce((s, a) => s + a.valorLiquido, 0), overdueCount: overdueAccounts.length,
      totalPago: paidAccounts.reduce((s, a) => s + a.valorLiquido, 0), pagoCount: paidAccounts.length,
    };
  }, [despesaAccounts, monthStart, monthEnd, todayStr, next7Str]);

  // Line chart — last 6 months
  const lineData = useMemo(() => {
    const months: { label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(today, i);
      const ms = startOfMonth(d).toISOString().split('T')[0];
      const me = endOfMonth(d).toISOString().split('T')[0];
      const total = despesaAccounts.filter(a => a.dataEmissao >= ms && a.dataEmissao <= me).reduce((s, a) => s + a.valorLiquido, 0);
      months.push({ label: format(d, 'MMM yy', { locale: pt }), total });
    }
    return months;
  }, [despesaAccounts, today]);

  // Pie by category
  const pieData = useMemo(() => {
    const catMap: Record<string, number> = {};
    despesaAccounts.forEach(a => { catMap[a.categoria] = (catMap[a.categoria] || 0) + a.valorLiquido; });
    return Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([cat, value]) => ({ name: getCatLabel(cat), value }));
  }, [despesaAccounts]);

  // Cost center distribution
  const costCenterData = useMemo(() => {
    const ccMap: Record<string, { name: string; total: number; count: number }> = {};
    despesaAccounts.forEach(a => {
      const ccId = a.costCenterId || 'sem_centro';
      if (!ccMap[ccId]) {
        const cc = costCenters.find(c => c.id === ccId);
        ccMap[ccId] = { name: cc?.name || 'Sem Centro de Custo', total: 0, count: 0 };
      }
      ccMap[ccId].total += a.valorLiquido;
      ccMap[ccId].count += 1;
    });
    return Object.values(ccMap).sort((a, b) => b.total - a.total);
  }, [despesaAccounts, costCenters]);

  // Filtering + sorting (for list tab)
  const filtered = useMemo(() => {
    let result = despesaAccounts;
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
      result = result.filter(a => (a.dataVencimento || a.dataEmissao) >= from);
    }
    if (filters.dateTo) {
      const to = filters.dateTo.toISOString().split('T')[0];
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
  }, [despesaAccounts, filters, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filters, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const resetForm = () => { setFormData({ ...emptyAccountPayableForm, tipoLancamento: 'despesa' }); setEditingAccount(null); };

  const handleDuplicate = (account: AccountPayable) => {
    setEditingAccount(null);
    setFormData({
      supplierId: account.supplierId,
      tipoLancamento: 'despesa',
      categoria: account.categoria,
      descricao: account.descricao || '',
      numeroDocumento: '',
      dataEmissao: new Date(),
      valorBruto: String(account.valorBruto),
      ivaRate: String(account.ivaRate || 0),
      ivaValue: String(account.ivaValue || 0),
      valorLiquido: String(account.valorLiquido),
      formaPagamento: 'a_credito',
      dataPagamento: new Date(),
      dataVencimento: new Date(),
      metodoPagamento: account.metodoPagamento || 'transferencia',
      observacoes: account.observacoes || '',
      costCenterId: account.costCenterId || '',
      articleId: '',
      quantity: '',
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
      setFormData({
        supplierId: account.supplierId,
        tipoLancamento: 'despesa',
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
        articleId: '',
        quantity: '',
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
    const hasItems = formData.items && formData.items.length > 0;
    if (!hasItems && (!formData.valorBruto || parseFloat(formData.valorBruto) <= 0)) {
      toast({ title: 'Erro', description: 'Informe o valor ilíquido.', variant: 'destructive' });
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
        ? { title: 'Despesa removida', description: 'Registro removido com sucesso.' }
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
      ? { title: 'Despesa liquidada', description: 'Pagamento registrado com sucesso.' }
      : { title: 'Erro', description: 'Não foi possível liquidar.', variant: 'destructive' }
    );
    return ok;
  };

  // Summary totals for list tab
  const totalPendente = filtered.filter(a => a.status === 'pendente' || a.status === 'parcial').reduce((s, a) => s + a.valorLiquido, 0);
  const totalLiquidado = filtered.filter(a => a.status === 'liquidado').reduce((s, a) => s + a.valorLiquido, 0);
  const totalVencido = filtered.filter(a => a.status === 'vencido').reduce((s, a) => s + a.valorLiquido, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-sm text-muted-foreground">Gestão completa de despesas e contas a pagar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsReportsOpen(true)}>
            <BarChart3 className="w-4 h-4 mr-2" /> Relatórios
          </Button>
          <Button onClick={() => handleOpenForm()} size="sm">
            <Plus className="w-4 h-4 mr-2" /> Nova Despesa
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="visao-geral">📈 Visão Geral</TabsTrigger>
          <TabsTrigger value="lista">📋 Todas</TabsTrigger>
          <TabsTrigger value="centro-custo">🏢 Centro de Custo</TabsTrigger>
        </TabsList>

        {/* ====== TAB: Visão Geral ====== */}
        <TabsContent value="visao-geral" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10"><CalendarDays className="w-5 h-5 text-primary" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total a Pagar (Mês)</p>
                        <p className="text-xl font-bold">{formatCurrency(kpis.totalMes)}</p>
                        <p className="text-xs text-muted-foreground">{kpis.monthCount} conta(s)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${kpis.hojCount > 0 ? 'bg-danger/10' : 'bg-muted'}`}>
                        <AlertTriangle className={`w-5 h-5 ${kpis.hojCount > 0 ? 'text-danger' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vencimentos Hoje</p>
                        <p className={`text-xl font-bold ${kpis.hojCount > 0 ? 'text-danger' : ''}`}>{formatCurrency(kpis.totalHoje)}</p>
                        <p className="text-xs text-muted-foreground">{kpis.hojCount} conta(s)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${kpis.next7Count > 0 ? 'bg-warning/10' : 'bg-muted'}`}>
                        <Clock className={`w-5 h-5 ${kpis.next7Count > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Próximos 7 Dias</p>
                        <p className={`text-xl font-bold ${kpis.next7Count > 0 ? 'text-warning' : ''}`}>{formatCurrency(kpis.totalNext7)}</p>
                        <p className="text-xs text-muted-foreground">{kpis.next7Count} conta(s)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${kpis.overdueCount > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                        <AlertCircle className={`w-5 h-5 ${kpis.overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vencidas</p>
                        <p className={`text-xl font-bold ${kpis.overdueCount > 0 ? 'text-destructive' : ''}`}>{formatCurrency(kpis.totalOverdue)}</p>
                        <p className="text-xs text-muted-foreground">{kpis.overdueCount} conta(s)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="w-5 h-5 text-success" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pago no Mês</p>
                        <p className="text-xl font-bold text-success">{formatCurrency(kpis.totalPago)}</p>
                        <p className="text-xs text-muted-foreground">{kpis.pagoCount} conta(s)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Evolução de Despesas</CardTitle></CardHeader>
                  <CardContent>
                    {lineData.some(d => d.total > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="label" className="text-xs" />
                          <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <Tooltip formatter={(value: number) => [formatCurrency(value), 'Total']}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">Sem dados</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Distribuição por Categoria</CardTitle></CardHeader>
                  <CardContent>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">Sem dados</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ====== TAB: Lista ====== */}
        <TabsContent value="lista" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Lançamentos</p><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Pendente</p><p className="text-2xl font-bold text-warning">{formatCurrency(totalPendente)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Vencido</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalVencido)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Liquidado</p><p className="text-2xl font-bold text-success">{formatCurrency(totalLiquidado)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-3">
                  <Receipt className="w-6 h-6 text-primary" />
                  <CardTitle>Lançamentos</CardTitle>
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
                    {filters.searchTerm || filters.filterStatus !== 'all' || filters.filterTipo !== 'all'
                      ? 'Nenhum lançamento encontrado.' : 'Nenhum lançamento cadastrado.'}
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
        </TabsContent>

        {/* ====== TAB: Por Centro de Custo ====== */}
        <TabsContent value="centro-custo" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-primary" />
                <CardTitle>Despesas por Centro de Custo</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {costCenterData.length > 0 ? (
                <div className="space-y-6">
                  {/* Bar Chart */}
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={costCenterData.slice(0, 10)} layout="vertical" margin={{ left: 140 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`} className="text-xs" />
                      <YAxis type="category" dataKey="name" className="text-xs" width={130} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Total']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Centro de Custo</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Qtd.</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">% do Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {costCenterData.map((cc, i) => {
                          const grandTotal = costCenterData.reduce((s, c) => s + c.total, 0);
                          const pct = grandTotal > 0 ? (cc.total / grandTotal * 100) : 0;
                          return (
                            <tr key={i} className="hover:bg-muted/30">
                              <td className="px-4 py-3 text-sm font-medium">{cc.name}</td>
                              <td className="px-4 py-3 text-sm text-right">{cc.count}</td>
                              <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(cc.total)}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-muted-foreground">{pct.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted/30">
                        <tr>
                          <td className="px-4 py-3 text-sm font-bold">Total</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">{costCenterData.reduce((s, c) => s + c.count, 0)}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold font-mono">{formatCurrency(costCenterData.reduce((s, c) => s + c.total, 0))}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma despesa cadastrada ainda.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* All Dialogs (preserved from ContasPagar) */}
      <AccountPayableFormDialog
        open={isFormOpen}
        onOpenChange={(o) => { setIsFormOpen(o); if (!o) resetForm(); }}
        formData={formData} setFormData={setFormData}
        onSubmit={handleSubmit} isEditing={!!editingAccount}
        suppliers={suppliers} costCenters={costCenters}
        onAddCostCenter={addCostCenter}
        onAddSupplier={addSupplier}
        mode="despesa"
      />
      <AccountDetailDialog account={viewingAccount} open={isDetailOpen} onOpenChange={setIsDetailOpen} />
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Despesa</AlertDialogTitle>
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
      <ContasPagarReportsDialog open={isReportsOpen} onOpenChange={setIsReportsOpen} accounts={despesaAccounts} />
    </div>
  );
}
