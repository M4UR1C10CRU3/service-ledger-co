import { useNavigate } from 'react-router-dom';
import { useServices } from '@/hooks/useServices';
import { useClientes } from '@/hooks/useClientes';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAccountsPayable } from '@/hooks/useAccountsPayable';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { segmentoVertical } from '@/lib/verticais';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServiceChart } from '@/components/ServiceChart';
import {
  Euro, TrendingUp, AlertTriangle, Briefcase,
  ShoppingCart, Factory, UsersRound, ArrowRight,
  Receipt, CreditCard, Clock, Users, Truck,
  TrendingDown, BarChart3, AlertCircle, ChevronRight,
  PieChart,
} from 'lucide-react';
import { useEffect } from 'react';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k€`;
  return fmt(v);
};

// ── Clariza brand colors ──────────────────────────────────────────────────────
const TEAL   = '#1E939C';
const PURPLE = '#5B4598';
const ORANGE = '#F3B247';
const CORAL  = '#C45E58';

// ── Page ──────────────────────────────────────────────────────────────────────

const DashboardGeral = () => {
  const navigate          = useNavigate();
  const { empresa, isLoading: empresaLoading } = useEmpresa();
  /** Segmento da empresa, só para o eyebrow do cabeçalho. */
  const segmento = segmentoVertical(empresa?.vertical);

  useEffect(() => {
    if (empresaLoading) return;
    if (!empresa) {
      const saved = localStorage.getItem('selectedEmpresa');
      if (!saved) navigate('/empresa');
    }
  }, [empresa, empresaLoading, navigate]);

  const { services, dashboardMetrics, isInitialized } = useServices(empresa?.id);
  const { clientes }  = useClientes();
  const { suppliers } = useSuppliers();
  const { accounts }  = useAccountsPayable();

  const contasVencidas = accounts.filter(a => {
    if (a.status === 'liquidado' || !a.dataVencimento) return false;
    return new Date(a.dataVencimento) < new Date(new Date().toDateString());
  });

  const contasHoje = accounts.filter(a => {
    if (a.status === 'liquidado' || !a.dataVencimento) return false;
    const d     = new Date(a.dataVencimento);
    const today = new Date(new Date().toDateString());
    return d.getTime() === today.getTime();
  });

  const totalAPagar    = accounts
    .filter(a => a.status !== 'liquidado')
    .reduce((s, a) => s + a.valorLiquido, 0);
  const servicosAtivos = services.filter(s => !s.aRealizar).length;
  const alertCount     = contasVencidas.length + contasHoje.length;

  if (!isInitialized) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground text-sm">A carregar dados…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-page space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          {/* Eyebrow com o segmento da empresa, na cor do vertical — diz de
              que negócio se está a falar antes de dizer o número. */}
          {segmento && <p className="ds-eyebrow mb-2">{segmento}</p>}
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-foreground leading-tight">
            Visão geral
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {empresa?.nome} · Resumo consolidado
          </p>
        </div>
        {alertCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/8 shrink-0"
            onClick={() => navigate('/despesas?filter=critico')}
          >
            <AlertCircle className="h-4 w-4" />
            {alertCount} alerta{alertCount > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="ds-metric-grid">
        <KpiCard
          label="Total Liquidado"
          value={fmtShort(dashboardMetrics.totalLiquidado)}
          sub={fmt(dashboardMetrics.totalLiquidado)}
          icon={Euro}
          from={TEAL}
          to="#12636a"
          onClick={() => navigate('/receitas')}
        />
        <KpiCard
          label="Total Faturado"
          value={fmtShort(dashboardMetrics.totalFaturado)}
          sub={fmt(dashboardMetrics.totalFaturado)}
          icon={TrendingUp}
          from={PURPLE}
          to="#3d2f6b"
          onClick={() => navigate('/receitas')}
        />
        <KpiCard
          label="Em Débito"
          value={fmtShort(dashboardMetrics.totalEmDebito)}
          sub={fmt(dashboardMetrics.totalEmDebito)}
          icon={AlertTriangle}
          from={ORANGE}
          to={CORAL}
          onClick={() => navigate('/debitos')}
        />
        <KpiCard
          label="Contas Vencidas"
          value={String(alertCount)}
          sub={`${contasVencidas.length} vencidas · ${contasHoje.length} hoje`}
          icon={Receipt}
          from={alertCount > 0 ? '#be123c' : '#475569'}
          to={alertCount > 0 ? '#7f1d1d' : '#1e293b'}
          onClick={() => navigate('/despesas?filter=critico')}
        />
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left col (2/3) ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Stat mini-cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatMini
              icon={Briefcase}
              label="Clientes"
              value={String(clientes.length)}
              accent={TEAL}
              onClick={() => navigate('/clientes')}
            />
            <StatMini
              icon={Truck}
              label="Fornecedores"
              value={String(suppliers.length)}
              accent={PURPLE}
              onClick={() => navigate('/fornecedores')}
            />
            <StatMini
              icon={Factory}
              label="Serviços Activos"
              value={String(servicosAtivos)}
              accent={ORANGE}
              onClick={() => navigate('/vendas')}
            />
            <StatMini
              icon={CreditCard}
              label="A Pagar"
              value={fmtShort(totalAPagar)}
              accent={CORAL}
              onClick={() => navigate('/contas-pagar')}
            />
          </div>

          {/* Actividade recente */}
          <Card className="border-border/50">
            <CardHeader className="pb-3 px-5 pt-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Atividade Recente
                </CardTitle>
                <button
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  onClick={() => navigate('/receitas')}
                >
                  Ver tudo <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhuma atividade registada
                </p>
              ) : (
                services.slice(0, 6).map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-3 border-b border-border/40 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground leading-tight">
                          {s.cliente}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {s.servico}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-mono font-semibold text-foreground">
                        {fmt(s.valorComIVA)}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: s.aRealizar ? ORANGE : TEAL }}
                      >
                        {s.aRealizar ? 'Pendente' : 'Concluído'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right col (1/3) ───────────────────────────────────── */}
        <div className="space-y-5">

          {/* Resumo financeiro */}
          <Card className="border-border/50">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="text-sm font-semibold text-foreground">
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <ResumoBar
                label="Liquidado"
                value={dashboardMetrics.totalLiquidado}
                total={dashboardMetrics.totalFaturado}
                color={TEAL}
              />
              <ResumoBar
                label="Em Débito"
                value={dashboardMetrics.totalEmDebito}
                total={dashboardMetrics.totalFaturado}
                color={CORAL}
              />
              <div className="pt-1 border-t border-border/40">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total Faturado</span>
                  <span className="font-semibold text-foreground">
                    {fmtShort(dashboardMetrics.totalFaturado)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Atalhos */}
          <Card className="border-border/50">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold text-foreground">
                Atalhos Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 space-y-0.5">
              <QuickLink
                icon={TrendingDown}
                label="Gestão de Débitos"
                onClick={() => navigate('/debitos')}
              />
              <QuickLink
                icon={Users}
                label="Clientes"
                onClick={() => navigate('/clientes')}
              />
              <QuickLink
                icon={PieChart}
                label="Relatório Gerencial"
                onClick={() => navigate('/relatorio-gerencial')}
              />
              <QuickLink
                icon={UsersRound}
                label="Recursos Humanos"
                onClick={() => navigate('/colaboradores')}
              />
              <QuickLink
                icon={CreditCard}
                label="Configurações"
                onClick={() => navigate('/configuracoes')}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Gráficos full-width ─────────────────────────────────────── */}
      <ServiceChart services={services} />
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, from, to, onClick,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  from: string;
  to: string;
  onClick: () => void;
}) {
  return (
    /* Superfície escura com a cor apenas no ícone.
       Eram quatro blocos de cor saturada lado a lado — bonito à distância,
       mas a cor não queria dizer nada e os números, que são o assunto,
       competiam com o fundo. Agora o dado é que é o protagonista.
       As cores recebidas em `from` continuam a distinguir cada indicador,
       agora no ícone e no seu fundo suave. */
    <div
      className="ds-metric cursor-pointer select-none transition-colors hover:border-vertical-border group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-[8px]" style={{ background: `${from}22` }}>
          <Icon className="h-4 w-4" style={{ color: from }} />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="ds-metric-label mt-4 mb-1">{label}</p>
      <p className="ds-metric-value">{value}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-1.5 truncate">{sub}</p>
    </div>
  );
}

function StatMini({
  icon: Icon, label, value, accent, onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    /* Cartão de indicador no desenho do protótipo: ícone em cima à esquerda,
       rótulo por baixo e o valor em destaque. A cor do ícone continua a ser a
       que a página passa em `accent` — não se alterou nenhum indicador nem
       nenhuma fonte de dados. */
    <div
      className="ds-metric cursor-pointer transition-colors hover:border-vertical-border group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-[8px]" style={{ backgroundColor: `${accent}1A` }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="ds-metric-label mt-4 mb-1">{label}</p>
      <p className="ds-metric-value">{value}</p>
    </div>
  );
}

function QuickLink({
  icon: Icon, label, onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-muted/70 transition-colors group"
      onClick={onClick}
    >
      <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
        <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <span className="text-sm font-medium text-foreground flex-1">{label}</span>
      <ChevronRight
        className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </button>
  );
}

function ResumoBar({
  label, value, total, color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{fmtShort(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right">{pct.toFixed(1)}% do faturado</p>
    </div>
  );
}

export default DashboardGeral;
