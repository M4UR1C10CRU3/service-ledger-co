export type OsEstado = 'nova' | 'aprovada' | 'em_execucao' | 'concluida' | 'faturada' | 'cancelada';

export type OsPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente';

export interface OrdemServico {
  id: string;
  empresaId: string;
  numero: string;
  clienteId: string | null;
  clienteNome: string;
  propostaId: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  estado: OsEstado;
  prioridade: OsPrioridade;
  titulo: string;
  descricao: string | null;
  observacoes: string | null;
  dataAbertura: string;
  dataPrevista: string | null;
  dataInicio: string | null;
  dataConclusao: string | null;
  valorEstimado: number | null;
  valorFinal: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OsChecklistItem {
  id: string;
  osId: string;
  descricao: string;
  concluido: boolean;
  ordem: number;
  createdAt: string;
}

export interface OsFormData {
  clienteId: string;
  clienteNome: string;
  propostaId: string;
  responsavelId: string;
  responsavelNome: string;
  estado: OsEstado;
  prioridade: OsPrioridade;
  titulo: string;
  descricao: string;
  observacoes: string;
  dataAbertura: string;
  dataPrevista: string;
  valorEstimado: string;
}

export const OS_ESTADOS: Record<OsEstado, { label: string; color: string; bg: string; border: string }> = {
  nova:        { label: 'Nova',         color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  aprovada:    { label: 'Aprovada',     color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  em_execucao: { label: 'Em Execução',  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  concluida:   { label: 'Concluída',    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  faturada:    { label: 'Faturada',     color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  cancelada:   { label: 'Cancelada',    color: 'text-gray-400',   bg: 'bg-gray-50',   border: 'border-gray-200' },
};

export const OS_ESTADOS_ORDEM: OsEstado[] = [
  'nova', 'aprovada', 'em_execucao', 'concluida', 'faturada', 'cancelada'
];

export const OS_PRIORIDADES: Record<OsPrioridade, { label: string; color: string }> = {
  baixa:   { label: 'Baixa',   color: 'text-gray-500' },
  normal:  { label: 'Normal',  color: 'text-blue-500' },
  alta:    { label: 'Alta',    color: 'text-amber-500' },
  urgente: { label: 'Urgente', color: 'text-red-500' },
};

export const emptyOsForm: OsFormData = {
  clienteId: '',
  clienteNome: '',
  propostaId: '',
  responsavelId: '',
  responsavelNome: '',
  estado: 'nova',
  prioridade: 'normal',
  titulo: '',
  descricao: '',
  observacoes: '',
  dataAbertura: new Date().toISOString().split('T')[0],
  dataPrevista: '',
  valorEstimado: '',
};
