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
  
  // Novos campos para contratos e faturas
  tipoServico: 'contrato' | 'fatura';
  contratoId?: string; // ID do contrato pai (quando for fatura)
  valorFaturado: number; // Para contratos: valor já faturado
  numeroFatura?: string; // Para faturas: número da fatura
  
  // Campos de contacto do cliente
  telefone?: string;
  email?: string;
  
  // ID da empresa
  empresaId?: string;
}

export type FormaPagamento = 'cheque' | 'multibanco' | 'numerario' | 'transferencia';

export interface Liquidacao {
  id: string;
  serviceId: string;
  valor: number;
  dataPagamento: string; // Data in DD/MM/YYYY format
  formaPagamento?: FormaPagamento;
  observacoes?: string;
  createdAt: Date;
}

export interface ServiceCalculations {
  executadoEmDebito: number; // Para faturas: valorComIVA - liquidado; Para contratos: 0
  diasEmAtraso: number;
  percentualLiquidado: number; // (liquidado / valorFaturado) * 100
  percentualFaturado: number; // (valorFaturado / valorComIVA) * 100 - progresso da faturação
  valorARealizar: number; // Para contratos: valorComIVA - valorFaturado; Para faturas: 0
  statusContrato?: 'nao_iniciado' | 'em_andamento' | 'concluido'; // Para contratos
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
  // Métricas de faturas (débitos reais)
  totalFaturado: number;
  totalLiquidado: number;
  totalEmDebito: number;
  percentualLiquidado: number;
  servicosEmAtraso: number;
  
  // Métricas de contratos (projeções)
  totalContratado: number;
  totalARealizar: number;
  totalJaFaturado: number;
  percentualFaturado: number;
}