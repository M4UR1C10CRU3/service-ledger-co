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
  const { empresa } = useEmpresa();

  useEffect(() => {
    if (!empresa) {
      const saved = localStorage.getItem('selectedEmpresa');
      if (!saved) navigate('/empresa');
    }
  }, [empresa, navigate]);

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
        <h1 className="text-2xl font-bold text-foreground">Visão Geral</h1>
        <p className="text-sm text-muted-foreground">Resumo consolidado da empresa</p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Faturado</CardTitle>
            <Euro className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(dashboardMetrics.totalFaturado)}</div>
            <p className="text-xs text-muted-foreground mt-1">Faturas emitidas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas / Serviços</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{servicosAtivos} ativos</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Débito</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(dashboardMetrics.totalEmDebito)}</div>
            <p className="text-xs text-muted-foreground mt-1">{dashboardMetrics.servicosEmAtraso} em atraso</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-danger">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas</CardTitle>
            <Clock className="h-4 w-4 text-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contasVencidas.length + contasHoje.length}</div>
            <div className="text-xs space-y-0.5 mt-1">
              {contasVencidas.length > 0 && (
                <p className="text-danger">{contasVencidas.length} conta(s) vencida(s)</p>
              )}
              {contasHoje.length > 0 && (
                <p className="text-warning">{contasHoje.length} vence(m) hoje</p>
              )}
              {contasVencidas.length === 0 && contasHoje.length === 0 && (
                <p className="text-success">Tudo em dia</p>
              )}
            </div>
          </CardContent>
        </Card>
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
                  <Button variant="link" size="sm" className="text-danger p-0 h-auto" onClick={() => navigate('/contas-pagar')}>Ver →</Button>
                </div>
              )}
              {contasHoje.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-warning-foreground">🟡 {contasHoje.length} conta(s) vence(m) hoje — Total: {fmt(contasHoje.reduce((s, a) => s + a.valorLiquido, 0))}</span>
                  <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate('/contas-pagar')}>Ver →</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
          color="text-chart-overdue"
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

      {/* Chart */}
      <ServiceChart services={services} />

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🕐 Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {services.slice(0, 5).map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="text-sm">
                <span className="font-medium">{s.cliente}</span>
                <span className="text-muted-foreground"> — {s.servico}</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">{fmt(s.valorComIVA)}</span>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma atividade recente</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

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
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${bgColor}`}>
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
