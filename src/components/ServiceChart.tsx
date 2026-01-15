import { ServiceWithCalculations } from '@/types/service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ServiceChartProps {
  services: ServiceWithCalculations[];
}

export const ServiceChart = ({ services }: ServiceChartProps) => {
  // If no services, show empty state
  if (!services || services.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Valores por Cliente</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">Nenhum serviço encontrado para o período selecionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Geral</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">Nenhum serviço encontrado para o período selecionado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare data for bar chart (by client)
  const clientData = services.reduce((acc, service) => {
    const existing = acc.find(item => item.cliente === service.cliente);
    
    if (existing) {
      existing.faturado += service.valorComIVA;
      existing.liquidado += service.liquidado;
      existing.debito += service.executadoEmDebito;
    } else {
      acc.push({
        cliente: service.cliente,
        faturado: service.valorComIVA,
        liquidado: service.liquidado,
        debito: service.executadoEmDebito,
      });
    }
    
    return acc;
  }, [] as Array<{ cliente: string; faturado: number; liquidado: number; debito: number }>);

  // Prepare data for pie chart
  const totalLiquidado = services.reduce((sum, s) => sum + s.liquidado, 0);
  const totalDebito = services.reduce((sum, s) => sum + s.executadoEmDebito, 0);
  
  const pieData = [
    { name: 'Liquidado', value: totalLiquidado, color: '#16a34a' },
    { name: 'Em Débito', value: totalDebito, color: '#ea580c' },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Valores por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clientData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="cliente" 
                className="text-muted-foreground text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-muted-foreground text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="faturado" fill="hsl(var(--chart-invoiced))" name="Faturado" />
              <Bar dataKey="liquidado" fill="hsl(var(--chart-paid))" name="Liquidado" />
              <Bar dataKey="debito" fill="hsl(var(--chart-pending))" name="Em Débito" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};