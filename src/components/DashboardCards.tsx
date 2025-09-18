import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardMetrics } from '@/types/service';
import { Euro, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

interface DashboardCardsProps {
  metrics: DashboardMetrics;
}

export const DashboardCards = ({ metrics }: DashboardCardsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card className="border-l-4 border-l-chart-invoiced">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Faturado
          </CardTitle>
          <Euro className="h-4 w-4 text-chart-invoiced" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(metrics.totalFaturado)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Valores com fatura emitida
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-chart-paid">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Liquidado
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-chart-paid" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(metrics.totalLiquidado)}
          </div>
          <p className="text-xs text-success-light mt-1">
            {formatPercentage(metrics.percentualLiquidado)} do total
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-chart-pending">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Em Débito
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-chart-pending" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(metrics.totalEmDebito)}
          </div>
          <p className="text-xs text-warning-light mt-1">
            Valores pendentes
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-chart-overdue">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Serviços em Atraso
          </CardTitle>
          <Clock className="h-4 w-4 text-chart-overdue" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {metrics.servicosEmAtraso}
          </div>
          <p className="text-xs text-danger-light mt-1">
            Requer atenção
          </p>
        </CardContent>
      </Card>
    </div>
  );
};