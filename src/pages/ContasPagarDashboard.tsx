import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, addDays, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useAccountsPayable } from '@/hooks/useAccountsPayable';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CATEGORIAS_POR_TIPO } from '@/types/accountPayable';
import {
  ArrowLeft, LogOut, CalendarDays, AlertTriangle, Clock, AlertCircle, CheckCircle2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = [
  'hsl(219, 96%, 43%)',
  'hsl(74, 75%, 54%)',
  'hsl(49, 100%, 50%)',
  'hsl(22, 89%, 54%)',
  'hsl(280, 60%, 55%)',
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

export default function ContasPagarDashboard() {
  const navigate = useNavigate();
  const { empresa, getLogo } = useEmpresa();
  const { accounts, isLoading } = useAccountsPayable();

  const logo = getLogo();
  const empresaNome = empresa?.nome || 'Sistema';

  useEffect(() => {
    if (!empresa) {
      const saved = localStorage.getItem('selectedEmpresa');
      if (!saved) navigate('/empresa');
    }
  }, [empresa, navigate]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);
  const monthStart = useMemo(() => startOfMonth(today).toISOString().split('T')[0], [today]);
  const monthEnd = useMemo(() => endOfMonth(today).toISOString().split('T')[0], [today]);
  const next7Str = useMemo(() => addDays(today, 7).toISOString().split('T')[0], [today]);

  // KPI calculations
  const kpis = useMemo(() => {
    // Total a pagar no mês (pendentes + parciais com vencimento no mês)
    const monthAccounts = accounts.filter(a =>
      (a.status === 'pendente' || a.status === 'parcial' || a.status === 'vencido') &&
      a.dataVencimento && a.dataVencimento >= monthStart && a.dataVencimento <= monthEnd
    );
    const totalMes = monthAccounts.reduce((s, a) => s + a.valorLiquido, 0);

    // Vencimentos hoje
    const todayAccounts = accounts.filter(a =>
      (a.status === 'pendente' || a.status === 'parcial') &&
      a.dataVencimento === todayStr
    );
    const totalHoje = todayAccounts.reduce((s, a) => s + a.valorLiquido, 0);

    // Próximos 7 dias (excluindo hoje)
    const next7Accounts = accounts.filter(a =>
      (a.status === 'pendente' || a.status === 'parcial') &&
      a.dataVencimento && a.dataVencimento > todayStr && a.dataVencimento <= next7Str
    );
    const totalNext7 = next7Accounts.reduce((s, a) => s + a.valorLiquido, 0);

    // Vencidas
    const overdueAccounts = accounts.filter(a =>
      (a.status === 'pendente' || a.status === 'parcial' || a.status === 'vencido') &&
      a.dataVencimento && a.dataVencimento < todayStr
    );
    const totalOverdue = overdueAccounts.reduce((s, a) => s + a.valorLiquido, 0);

    // Pago no mês
    const paidAccounts = accounts.filter(a =>
      a.status === 'liquidado' &&
      a.dataPagamento && a.dataPagamento >= monthStart && a.dataPagamento <= monthEnd
    );
    const totalPago = paidAccounts.reduce((s, a) => s + a.valorLiquido, 0);

    return {
      totalMes, monthCount: monthAccounts.length,
      totalHoje, hojCount: todayAccounts.length,
      totalNext7, next7Count: next7Accounts.length,
      totalOverdue, overdueCount: overdueAccounts.length,
      totalPago, pagoCount: paidAccounts.length,
    };
  }, [accounts, monthStart, monthEnd, todayStr, next7Str]);

  // Line chart — last 6 months
  const lineData = useMemo(() => {
    const months: { month: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(today, i);
      const ms = startOfMonth(d).toISOString().split('T')[0];
      const me = endOfMonth(d).toISOString().split('T')[0];
      const label = format(d, 'MMM yy', { locale: pt });
      const total = accounts
        .filter(a => a.dataEmissao >= ms && a.dataEmissao <= me)
        .reduce((s, a) => s + a.valorLiquido, 0);
      months.push({ month: ms, label, total });
    }
    return months;
  }, [accounts, today]);

  // Pie chart — top 5 categories
  const pieData = useMemo(() => {
    const catMap: Record<string, number> = {};
    accounts.forEach(a => {
      const key = a.categoria;
      catMap[key] = (catMap[key] || 0) + a.valorLiquido;
    });
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, value]) => ({ name: getCatLabel(cat), value }));
  }, [accounts]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard — Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Visão geral financeira</p>
        </div>
      </div>

      {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CalendarDays className="w-5 h-5 text-primary" />
                    </div>
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
                    <div className="p-2 rounded-lg bg-success/10">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    </div>
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
              {/* Line Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Evolução de Despesas</CardTitle>
                </CardHeader>
                <CardContent>
                  {lineData.some(d => d.total > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={lineData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" className="text-xs" />
                        <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} className="text-xs" />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), 'Total']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Sem dados para exibir
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Sem dados para exibir
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      
    </div>
  );
}
