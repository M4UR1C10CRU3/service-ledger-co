import { useState, useMemo, useEffect, useCallback } from 'react';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { supabase } from '@/integrations/supabase/client';
import { formatEUR } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Banknote, CreditCard, Building2, ArrowUpRight, ArrowDownRight,
  Plus, ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown,
  Wallet, Filter, BarChart3, Pencil,
} from 'lucide-react';

// --- Types ---
type FlowType = 'numerario' | 'multibanco' | 'transferencia';
type MovementType = 'entrada' | 'saida';
type SourceType = 'venda' | 'recebimento' | 'pagamento_fornecedor' | 'pagamento_despesa' | 'ajuste_manual' | 'sangria' | 'reforco' | 'transferencia_interna';
type PeriodType = 'dia' | 'semana' | 'mes_atual' | 'mes_anterior' | 'personalizado';

interface CashFlow {
  id: string;
  empresa_id: string;
  flow_type: FlowType;
  movement_type: MovementType;
  amount: number;
  source_type: SourceType;
  source_id: string | null;
  description: string;
  reference: string | null;
  transaction_date: string;
  notes: string | null;
  balance_after: number;
  created_at: string;
}

// --- Config ---
const flowConfig = {
  numerario: {
    name: 'Numerário',
    icon: Banknote,
    emoji: '💵',
    borderClass: 'border-l-emerald-500',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  multibanco: {
    name: 'Multibanco',
    icon: CreditCard,
    emoji: '💳',
    borderClass: 'border-l-blue-500',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  transferencia: {
    name: 'Transferência',
    icon: Building2,
    emoji: '🏦',
    borderClass: 'border-l-purple-500',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
};

const sourceLabels: Record<SourceType, string> = {
  venda: 'Venda',
  recebimento: 'Recebimento',
  pagamento_fornecedor: 'Pgt. Fornecedor',
  pagamento_despesa: 'Pgt. Despesa',
  ajuste_manual: 'Ajuste Manual',
  sangria: 'Sangria',
  reforco: 'Reforço',
  transferencia_interna: 'Transf. Interna',
};

const periodLabels: Record<PeriodType, string> = {
  dia: 'Dia',
  semana: 'Última Semana',
  mes_atual: 'Mês Atual',
  mes_anterior: 'Mês Anterior',
  personalizado: 'Personalizado',
};

// --- Helpers ---
function formatDatePT(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getDateRange(period: PeriodType, refDate: string): { from: string; to: string } {
  const today = todayISO();
  switch (period) {
    case 'dia':
      return { from: refDate, to: refDate };
    case 'semana': {
      const to = refDate;
      const from = addDays(refDate, -6);
      return { from, to };
    }
    case 'mes_atual': {
      const [y, m] = today.split('-');
      const from = `${y}-${m}-01`;
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const to = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      return { from, to };
    }
    case 'mes_anterior': {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const from = `${y}-${m}-01`;
      const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
      const to = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      return { from, to };
    }
    case 'personalizado':
      return { from: refDate, to: refDate };
    default:
      return { from: refDate, to: refDate };
  }
}

function formatPeriodLabel(period: PeriodType, from: string, to: string): string {
  if (period === 'dia') return formatDatePT(from);
  return `${formatDatePT(from)} — ${formatDatePT(to)}`;
}

// --- Component ---
const FluxoCaixa = () => {
  const { empresa } = useEmpresa();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState('');
  const [period, setPeriod] = useState<PeriodType>('dia');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [movements, setMovements] = useState<CashFlow[]>([]);
  const [balances, setBalances] = useState<Record<FlowType, number>>({ numerario: 0, multibanco: 0, transferencia: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [flowFilter, setFlowFilter] = useState<string>('all');
  const [recentByFlow, setRecentByFlow] = useState<Record<FlowType, CashFlow[]>>({
    numerario: [], multibanco: [], transferencia: [],
  });

  // New/Edit movement dialog state
  const [newDialog, setNewDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    flow_type: 'numerario' as FlowType,
    movement_type: 'entrada' as MovementType,
    amount: '',
    source_type: 'ajuste_manual' as SourceType,
    description: '',
    reference: '',
    transaction_date: todayISO(),
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Compute effective date range
  const dateRange = useMemo(() => {
    if (!selectedDate) return { from: todayISO(), to: todayISO() };
    if (period === 'personalizado') {
      return { from: customFrom || selectedDate, to: customTo || selectedDate };
    }
    return getDateRange(period, selectedDate);
  }, [period, selectedDate, customFrom, customTo]);

  // On mount: find last date with movements
  useEffect(() => {
    if (!empresa?.id || isInitialized) return;

    const findLastDate = async () => {
      const { data } = await supabase
        .from('cash_flows')
        .select('transaction_date')
        .eq('empresa_id', empresa.id)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .limit(1);

      const lastDate = data?.[0]?.transaction_date || todayISO();
      setSelectedDate(lastDate);
      setIsInitialized(true);
    };

    findLastDate();
  }, [empresa?.id, isInitialized]);

  // Load data when date range changes
  const loadData = useCallback(async () => {
    if (!empresa?.id || !selectedDate) return;
    setIsLoading(true);

    try {
      const { from, to } = dateRange;

      // Load movements for the period
      const { data: movs, error: movErr } = await supabase
        .from('cash_flows')
        .select('*')
        .eq('empresa_id', empresa.id)
        .gte('transaction_date', from)
        .lte('transaction_date', to)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (movErr) console.error('Error loading movements:', movErr);
      setMovements((movs as CashFlow[]) || []);

      // Calculate balances up to the end of the period
      const flows: FlowType[] = ['numerario', 'multibanco', 'transferencia'];
      const newBalances: Record<FlowType, number> = { numerario: 0, multibanco: 0, transferencia: 0 };
      const newRecent: Record<FlowType, CashFlow[]> = { numerario: [], multibanco: [], transferencia: [] };

      for (const ft of flows) {
        const [{ data: allMovs }, { data: recentMovs }] = await Promise.all([
          supabase
            .from('cash_flows')
            .select('movement_type, amount')
            .eq('empresa_id', empresa.id)
            .eq('flow_type', ft)
            .lte('transaction_date', to)
            .is('deleted_at', null),
          supabase
            .from('cash_flows')
            .select('*')
            .eq('empresa_id', empresa.id)
            .eq('flow_type', ft)
            .is('deleted_at', null)
            .order('transaction_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(15),
        ]);

        if (allMovs) {
          newBalances[ft] = allMovs.reduce((sum, m) => {
            return sum + (m.movement_type === 'entrada' ? Number(m.amount) : -Number(m.amount));
          }, 0);
        }
        newRecent[ft] = (recentMovs as CashFlow[]) || [];
      }
      setBalances(newBalances);
      setRecentByFlow(newRecent);
    } catch (err) {
      console.error('Error loading cash flow data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [empresa?.id, dateRange, selectedDate]);

  useEffect(() => {
    if (isInitialized) loadData();
  }, [loadData, isInitialized]);

  // Day/period totals per flow
  const dayStats = useMemo(() => {
    const stats: Record<FlowType, { entradas: number; saidas: number }> = {
      numerario: { entradas: 0, saidas: 0 },
      multibanco: { entradas: 0, saidas: 0 },
      transferencia: { entradas: 0, saidas: 0 },
    };
    for (const m of movements) {
      const ft = m.flow_type as FlowType;
      if (m.movement_type === 'entrada') stats[ft].entradas += Number(m.amount);
      else stats[ft].saidas += Number(m.amount);
    }
    return stats;
  }, [movements]);

  const totalEntradas = Object.values(dayStats).reduce((s, v) => s + v.entradas, 0);
  const totalSaidas = Object.values(dayStats).reduce((s, v) => s + v.saidas, 0);
  const saldoGeral = balances.numerario + balances.multibanco + balances.transferencia;
  const variacao = totalEntradas - totalSaidas;

  const filteredMovements = useMemo(() => {
    if (flowFilter === 'all') return movements;
    return movements.filter(m => m.flow_type === flowFilter);
  }, [movements, flowFilter]);

  // Group movements by date for multi-day periods
  const groupedMovements = useMemo(() => {
    if (period === 'dia') return null; // No grouping needed for single day
    const groups: Record<string, CashFlow[]> = {};
    for (const m of filteredMovements) {
      if (!groups[m.transaction_date]) groups[m.transaction_date] = [];
      groups[m.transaction_date].push(m);
    }
    // Sort dates descending
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredMovements, period]);

  // Open new movement dialog
  const openNewDialog = (ft?: FlowType) => {
    setEditingId(null);
    setFormData({
      flow_type: ft || 'numerario',
      movement_type: 'entrada',
      amount: '',
      source_type: 'ajuste_manual',
      description: '',
      reference: '',
      transaction_date: selectedDate || todayISO(),
      notes: '',
    });
    setNewDialog(true);
  };

  // Open edit dialog for a manual movement
  const openEditDialog = (m: CashFlow) => {
    setEditingId(m.id);
    setFormData({
      flow_type: m.flow_type,
      movement_type: m.movement_type,
      amount: String(m.amount),
      source_type: m.source_type,
      description: m.description,
      reference: m.reference || '',
      transaction_date: m.transaction_date,
      notes: m.notes || '',
    });
    setNewDialog(true);
  };

  const handleSave = async () => {
    if (!empresa?.id || !formData.description || !formData.amount) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        flow_type: formData.flow_type,
        movement_type: formData.movement_type,
        amount: parseFloat(formData.amount.replace(',', '.')),
        source_type: formData.source_type,
        description: formData.description,
        reference: formData.reference || null,
        transaction_date: formData.transaction_date,
        notes: formData.notes || null,
      };

      if (editingId) {
        const { error } = await supabase.from('cash_flows').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Lançamento atualizado com sucesso' });
      } else {
        const { error } = await supabase.from('cash_flows').insert({ ...payload, empresa_id: empresa.id });
        if (error) throw error;
        toast({ title: 'Lançamento registado com sucesso' });
      }

      setNewDialog(false);
      setEditingId(null);
      loadData();
    } catch (err) {
      console.error('Error saving movement:', err);
      toast({ title: 'Erro ao registar lançamento', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Period navigation
  const navigatePeriod = (direction: -1 | 1) => {
    if (period === 'dia') {
      setSelectedDate(addDays(selectedDate, direction));
    } else if (period === 'semana') {
      setSelectedDate(addDays(selectedDate, direction * 7));
    } else if (period === 'mes_atual' || period === 'mes_anterior') {
      const d = new Date(selectedDate);
      d.setMonth(d.getMonth() + direction);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    if (newPeriod === 'mes_atual') {
      setSelectedDate(todayISO());
    } else if (newPeriod === 'mes_anterior') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else if (newPeriod === 'personalizado') {
      setCustomFrom(dateRange.from);
      setCustomTo(dateRange.to);
    }
  };

  if (!isInitialized || (isLoading && movements.length === 0)) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">A carregar fluxo de caixa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Fluxo de Caixa
          </h1>
          <p className="text-sm text-muted-foreground">Controlo de movimentações financeiras</p>
        </div>
        <Button size="sm" onClick={() => openNewDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          Lançamento
        </Button>
      </div>

      {/* Period & Date Controls */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={period} onValueChange={(v) => handlePeriodChange(v as PeriodType)}>
                <SelectTrigger className="w-[170px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">📅 Dia</SelectItem>
                  <SelectItem value="semana">📆 Última Semana</SelectItem>
                  <SelectItem value="mes_atual">🗓️ Mês Atual</SelectItem>
                  <SelectItem value="mes_anterior">🗓️ Mês Anterior</SelectItem>
                  <SelectItem value="personalizado">🔧 Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Navigation arrows + date */}
            {period !== 'personalizado' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigatePeriod(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {period === 'dia' && (
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-[160px] h-9"
                  />
                )}

                {period !== 'dia' && (
                  <span className="text-sm font-medium text-foreground px-2">
                    {formatPeriodLabel(period, dateRange.from, dateRange.to)}
                  </span>
                )}

                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigatePeriod(1)} disabled={dateRange.to >= todayISO()}>
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {period === 'dia' && selectedDate !== todayISO() && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(todayISO())}>
                    Hoje
                  </Button>
                )}
              </div>
            )}

            {/* Custom date range */}
            {period === 'personalizado' && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">De:</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-[150px] h-9"
                />
                <Label className="text-sm text-muted-foreground">Até:</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-[150px] h-9"
                />
              </div>
            )}

            {/* Movement count */}
            <Badge variant="secondary" className="ml-auto">
              {filteredMovements.length} movimentação{filteredMovements.length !== 1 ? 'ões' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Flow cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['numerario', 'multibanco', 'transferencia'] as FlowType[]).map(ft => {
          const cfg = flowConfig[ft];
          const Icon = cfg.icon;
          const ds = dayStats[ft];
          return (
            <Card key={ft} className={`border-l-4 ${cfg.borderClass}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${cfg.iconBg}`}>
                      <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
                    </div>
                    <h3 className="font-semibold text-foreground">{cfg.name}</h3>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
                <p className="text-2xl font-bold text-foreground mb-3">{formatEUR(balances[ft])}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <ArrowUpRight className="h-3.5 w-3.5" /> Entradas
                    </span>
                    <span className="font-medium text-emerald-600">{formatEUR(ds.entradas)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-destructive">
                      <ArrowDownRight className="h-3.5 w-3.5" /> Saídas
                    </span>
                    <span className="font-medium text-destructive">{formatEUR(ds.saidas)}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setFlowFilter(flowFilter === ft ? 'all' : ft)}>
                    {flowFilter === ft ? 'Mostrar Todos' : 'Ver Movimentos'}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => openNewDialog(ft)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent 15 movements per flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['numerario', 'multibanco', 'transferencia'] as FlowType[]).map(ft => {
          const cfg = flowConfig[ft];
          const Icon = cfg.icon;
          const recent = recentByFlow[ft];
          const projectedBalance = recent.reduce((sum, m) => {
            return sum + (m.movement_type === 'entrada' ? Number(m.amount) : -Number(m.amount));
          }, 0);
          // Use actual full balance for the projected display
          const fullBalance = balances[ft];
          return (
            <Card key={`recent-${ft}`} className={`border-l-4 ${cfg.borderClass}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${cfg.iconBg}`}>
                      <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                    </div>
                    <CardTitle className="text-sm font-semibold">{cfg.name}</CardTitle>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo Projetado</p>
                    <p className={`text-lg font-bold ${fullBalance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {formatEUR(fullBalance)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-xs text-muted-foreground mb-2">Últimos 15 movimentos</p>
                {recent.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem movimentos registados</p>
                ) : (
                  <div className="space-y-1 max-h-[360px] overflow-y-auto">
                    {recent.map(m => {
                      const isEntry = m.movement_type === 'entrada';
                      const mainDesc = m.description.split(' | ')[0];
                      return (
                        <div key={m.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 text-xs border-b border-border/50 last:border-0">
                          <span className={`shrink-0 ${isEntry ? 'text-emerald-600' : 'text-destructive'}`}>
                            {isEntry ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{mainDesc}</p>
                            <p className="text-muted-foreground text-[10px]">{formatDatePT(m.transaction_date)}</p>
                          </div>
                          <span className={`shrink-0 font-mono font-bold ${isEntry ? 'text-emerald-600' : 'text-destructive'}`}>
                            {isEntry ? '+' : '-'}{formatEUR(Number(m.amount))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Consolidated summary */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-muted-foreground">Entradas:</span>
              <span className="font-bold text-emerald-600">{formatEUR(totalEntradas)}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground">Saídas:</span>
              <span className="font-bold text-destructive">{formatEUR(totalSaidas)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Saldo Geral:</span>
              <span className="font-bold text-foreground">{formatEUR(saldoGeral)}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Variação:</span>
              <span className={`font-bold ${variacao >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {variacao >= 0 ? '+' : ''}{formatEUR(variacao)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter indicator */}
      {flowFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtrado por:</span>
          <Badge variant="outline">{flowConfig[flowFilter as FlowType].emoji} {flowConfig[flowFilter as FlowType].name}</Badge>
          <Button variant="ghost" size="sm" onClick={() => setFlowFilter('all')}>Limpar</Button>
        </div>
      )}

      {/* Movements table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Movimentações — {formatPeriodLabel(period, dateRange.from, dateRange.to)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {period !== 'dia' && <TableHead>Data</TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead>Fluxo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={period !== 'dia' ? 7 : 6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Wallet className="h-8 w-8" />
                      <p className="font-medium">Sem movimentações</p>
                      <p className="text-sm">Nenhuma movimentação registada para este período.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {period !== 'dia' && groupedMovements ? (
                    // Multi-day: grouped by date with subtotals
                    groupedMovements.map(([date, dayMovs]) => {
                      const dayTotal = dayMovs.reduce((sum, m) => {
                        return sum + (m.movement_type === 'entrada' ? Number(m.amount) : -Number(m.amount));
                      }, 0);
                      return (
                        <MovementDateGroup
                          key={date}
                          date={date}
                          movements={dayMovs}
                          dayTotal={dayTotal}
                          showDate
                        />
                      );
                    })
                  ) : (
                    // Single day: flat list
                    filteredMovements.map(m => (
                      <MovementRow key={m.id} movement={m} showDate={false} />
                    ))
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Movement Dialog */}
      <Dialog open={newDialog} onOpenChange={o => !isSaving && setNewDialog(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Novo Lançamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fluxo de Caixa</Label>
                <Select value={formData.flow_type} onValueChange={v => setFormData(p => ({ ...p, flow_type: v as FlowType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numerario">💵 Numerário</SelectItem>
                    <SelectItem value="multibanco">💳 Multibanco</SelectItem>
                    <SelectItem value="transferencia">🏦 Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formData.movement_type} onValueChange={v => setFormData(p => ({ ...p, movement_type: v as MovementType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">↗️ Entrada</SelectItem>
                    <SelectItem value="saida">↘️ Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Origem</Label>
                <Select value={formData.source_type} onValueChange={v => setFormData(p => ({ ...p, source_type: v as SourceType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ajuste_manual">Ajuste Manual</SelectItem>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="recebimento">Recebimento</SelectItem>
                    <SelectItem value="pagamento_fornecedor">Pgt. Fornecedor</SelectItem>
                    <SelectItem value="pagamento_despesa">Pgt. Despesa</SelectItem>
                    <SelectItem value="sangria">Sangria</SelectItem>
                    <SelectItem value="reforco">Reforço</SelectItem>
                    <SelectItem value="transferencia_interna">Transf. Interna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={e => setFormData(p => ({ ...p, transaction_date: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Valor (€) *</Label>
              <Input
                placeholder="0,00"
                value={formData.amount}
                onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
              />
            </div>

            <div>
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: Reforço de caixa, Sangria, Pagamento..."
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div>
              <Label>Referência (opcional)</Label>
              <Input
                placeholder="Nº documento, referência bancária..."
                value={formData.reference}
                onChange={e => setFormData(p => ({ ...p, reference: e.target.value }))}
              />
            </div>

            <div>
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Informações adicionais..."
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'A registar...' : 'Registar Lançamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// --- Sub-components ---

function MovementRow({ movement: m, showDate }: { movement: CashFlow; showDate: boolean }) {
  const cfg = flowConfig[m.flow_type as FlowType];
  const isEntry = m.movement_type === 'entrada';
  const parts = m.description.split(' | ');
  const mainDesc = parts[0] || m.description;
  const details = parts.slice(1);

  return (
    <TableRow>
      {showDate && (
        <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">
          {formatDatePT(m.transaction_date)}
        </TableCell>
      )}
      <TableCell>
        <Badge variant="outline" className={isEntry
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-red-50 text-red-700 border-red-200'
        }>
          {isEntry ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
          {isEntry ? 'Entrada' : 'Saída'}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-1.5 text-sm">
          <cfg.icon className={`h-4 w-4 ${cfg.iconColor}`} />
          {cfg.name}
        </span>
      </TableCell>
      <TableCell className="max-w-[350px]">
        <p className="text-sm font-medium text-foreground">{mainDesc}</p>
        {details.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {details.map((d, i) => (
              <span key={i} className="text-xs text-muted-foreground">{d.trim()}</span>
            ))}
          </div>
        )}
        {m.notes && <p className="text-xs text-muted-foreground/70 italic mt-0.5">{m.notes}</p>}
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">{sourceLabels[m.source_type as SourceType] || m.source_type}</span>
      </TableCell>
      <TableCell>
        <span className="text-xs font-mono text-muted-foreground">{m.reference || '—'}</span>
      </TableCell>
      <TableCell className="text-right">
        <span className={`font-mono font-bold ${isEntry ? 'text-emerald-600' : 'text-destructive'}`}>
          {isEntry ? '+' : '-'}{formatEUR(Number(m.amount))}
        </span>
      </TableCell>
    </TableRow>
  );
}

function MovementDateGroup({ date, movements, dayTotal, showDate }: {
  date: string;
  movements: CashFlow[];
  dayTotal: number;
  showDate: boolean;
}) {
  return (
    <>
      {/* Date header row */}
      <TableRow className="bg-muted/50">
        <TableCell colSpan={7} className="py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              📅 {formatDatePT(date)}
            </span>
            <span className={`text-sm font-bold ${dayTotal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {dayTotal >= 0 ? '+' : ''}{formatEUR(dayTotal)}
            </span>
          </div>
        </TableCell>
      </TableRow>
      {movements.map(m => (
        <MovementRow key={m.id} movement={m} showDate={false} />
      ))}
    </>
  );
}

export default FluxoCaixa;
