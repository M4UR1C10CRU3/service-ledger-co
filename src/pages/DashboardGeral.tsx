import { useNavigate } from 'react-router-dom';
import { useServices } from '@/hooks/useServices';
import { useClientes } from '@/hooks/useClientes';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAccountsPayable } from '@/hooks/useAccountsPayable';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServiceChart } from '@/components/ServiceChart';
import {
  Euro, TrendingUp, AlertTriangle, Briefcase,
  ShoppingCart, Factory, UsersRound, ArrowRight,
  Receipt, CreditCard, Clock, Users, Truck,
} from 'lucide-react';
import { useEffect } from 'react';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const DashboardGeral = () => {
  const navigate = useNavigate();
  const { empresa, isLoading: empresaLoading } = useEmpresa();

  useEffect(() => {
    if (empresaLoading) return;
    if (!empresa) {
      const saved = localStorage.getItem('selectedEmpresa');
      if (!saved) navigate('/empresa');
    }
  }, [empresa, empresaLoading, navigate]);

  const { services, dashboardMetrics, isInitialized } = useServices(empresa?.id);
  const { clientes } = useClientes();
  const { suppliers } = useSuppliers();
  const { accounts } = useAccountsPayable();

  const contasVencidas = accounts.filter(a => {
    if (a.status === 'liquidado') return false;
    if (!a.dataVencimento) return false;
    return new Date(a.dataVencimento) < new Date(new Date().toDateString());
  });

  const contasHoje = accounts.filter(a => {
    if (a.status === 'liquidado') return false;
    if (!a.dataVencimento) return false;
    const d = new Date(a.dataVencimento);
    const today = new Date(new Date().toDateString());
    return d.getTime() === today.getTime();
  });

  const totalAPagar = accounts
    .filter(a => a.status !== 'liquidado')
    .reduce((s, a) => s + a.valorLiquido, 0);

  const servicosAtivos = services.filter(s => !s.aRealizar).length;

  if (!isInitialized) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">A carregar dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumo consolidado da empresa</p>
      </div>

      {/* KPIs - Gradient Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Faturado - Green */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Euro className="h-5 w-5" />
            </div>
          </div>
          <p className="text-sm font-medium text-white/80 mb-1">Total em Débito</p>
          <p className="text-3xl font-bold tracking-tight">{fmt(dashboardMetrics.totalEmDebito)}</p>
        </div>

        {/* Vendas / Serviços - Blue */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-sm font-medium text-white/80 mb-1">Clientes</p>
          <p className="text-3xl font-bold tracking-tight">{clientes.length}</p>
        </div>

        {/* Em Débito - Yellow/Orange */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-amber-400 to-amber-500 hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-sm font-medium text-white/80 mb-1">Vencido</p>
          <p className="text-3xl font-bold tracking-tight">{fmt(dashboardMetrics.totalFaturado - dashboardMetrics.totalLiquidado - dashboardMetrics.totalEmDebito > 0 ? dashboardMetrics.totalFaturado - dashboardMetrics.totalLiquidado - dashboardMetrics.totalEmDebito : 0)}</p>
        </div>

        {/* Alertas - Red/Orange */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-orange-500 to-red-500 hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="text-sm font-medium text-white/80 mb-1">Faturas Pendentes</p>
          <p className="text-3xl font-bold tracking-tight">{contasVencidas.length + contasHoje.length}</p>
        </div>
      </div>

      {/* Alert banner */}
      {(contasVencidas.length > 0 || contasHoje.length > 0) && (
        <Card className="border-warning/30 bg-warning-lighter">
          <CardContent className="py-3 px-4">
            <p className="text-sm font-semibold text-warning-foreground mb-2">⚠️ Ações Necessárias</p>
            <div className="space-y-1 text-sm">
              {contasVencidas.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-danger">🔴 {contasVencidas.length} conta(s) vencida(s) — Total: {fmt(contasVencidas.reduce((s, a) => s + a.valorLiquido, 0))}</span>
                  <Button variant="link" size="sm" className="text-danger p-0 h-auto" onClick={() => navigate('/despesas?filter=critico')}>Ver →</Button>
                </div>
              )}
              {contasHoje.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-warning-foreground">🟡 {contasHoje.length} conta(s) vence(m) hoje — Total: {fmt(contasHoje.reduce((s, a) => s + a.valorLiquido, 0))}</span>
                  <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate('/despesas?filter=critico')}>Ver →</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Access Cards */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Atalhos Rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickCard
            icon={AlertTriangle}
            title="Gestão de Débitos"
            onClick={() => navigate('/debitos')}
          />
          <QuickCard
            icon={Users}
            title="Novo Cliente"
            onClick={() => navigate('/clientes')}
          />
          <QuickCard
            icon={Receipt}
            title="Relatórios"
            onClick={() => navigate('/receitas')}
          />
          <QuickCard
            icon={CreditCard}
            title="Configurações"
            onClick={() => navigate('/configuracoes')}
          />
        </div>
      </div>

      {/* Area cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AreaCard
          icon={Briefcase}
          title="Comercial"
          stats={[`${clientes.length} Clientes`]}
          color="text-primary"
          bgColor="bg-primary-lighter"
          onClick={() => navigate('/clientes')}
        />
        <AreaCard
          icon={ShoppingCart}
          title="Compras"
          stats={[`${suppliers.length} Fornecedores`, `${fmt(totalAPagar)} a pagar`]}
          color="text-danger"
          bgColor="bg-danger-lighter"
          onClick={() => navigate('/fornecedores')}
        />
        <AreaCard
          icon={Factory}
          title="Produção"
          stats={[`${servicosAtivos} Serviços ativos`, `${fmt(dashboardMetrics.totalFaturado)} faturado`]}
          color="text-success"
          bgColor="bg-success-lighter"
          onClick={() => navigate('/vendas')}
        />
        <AreaCard
          icon={UsersRound}
          title="Financeiro"
          stats={[`${fmt(dashboardMetrics.totalLiquidado)} liquidado`, `${fmt(dashboardMetrics.totalEmDebito)} em débito`]}
          color="text-warning"
          bgColor="bg-warning-lighter"
          onClick={() => navigate('/contas-pagar')}
        />
      </div>

      {/* Two Column Layout: Activity + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            {services.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-foreground">{s.cliente}</span>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{s.servico}</p>
                  </div>
                </div>
                <span className="text-sm font-mono text-muted-foreground">{fmt(s.valorComIVA)}</span>
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma atividade recente</p>
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Distribuição</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceChart services={services} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function QuickCard({ icon: Icon, title, onClick }: {
  icon: React.ElementType;
  title: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 group border-border/50"
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-muted group-hover:bg-primary-lighter transition-colors">
          <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </CardContent>
    </Card>
  );
}

function AreaCard({ icon: Icon, title, stats, color, bgColor, onClick }: {
  icon: React.ElementType;
  title: string;
  stats: string[];
  color: string;
  bgColor: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 group border-border/50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        <div className="mt-1 space-y-0.5">
          {stats.map((s, i) => (
            <p key={i} className="text-xs text-muted-foreground">{s}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default DashboardGeral;
