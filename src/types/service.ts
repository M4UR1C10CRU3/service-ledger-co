export interface Service {
  id: string;
  data: string; // Data in DD/MM/YYYY format
  servico: string;
  cliente: string;
  resumo: string; // Max 40 characters
  proposta?: string; // Optional - pode ser vazia
  fatura: string;
  valorComIVA: number;
  valorSemIVA: number;
  liquidado: number; // Calculado automaticamente pela soma das liquidações
  aRealizar: boolean;
  createdAt: Date;
}

export interface Liquidacao {
  id: string;
  serviceId: string;
  valor: number;
  dataPagamento: string; // Data in DD/MM/YYYY format
  observacoes?: string;
  createdAt: Date;
}

export interface ServiceCalculations {
  executadoEmDebito: number; // valorComIVA - liquidado
  diasEmAtraso: number;
  percentualLiquidado: number; // (liquidado / valorComIVA) * 100
}

export interface ServiceWithCalculations extends Service, ServiceCalculations {
  liquidacoes: Liquidacao[];
}

export interface ReportFilters {
  faturados?: boolean;
  naoFaturados?: boolean;
  cliente?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

export interface DashboardMetrics {
  totalFaturado: number;
  totalLiquidado: number;
  totalEmDebito: number;
  percentualLiquidado: number;
  totalNaoFaturado: number;
  servicosEmAtraso: number;
}