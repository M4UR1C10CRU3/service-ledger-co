export type OsEstado = 'nova' | 'aprovada' | 'em_execucao' | 'concluida' | 'faturada' | 'cancelada';

export type OsPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente';

export interface OrdemServico {
  id: string;
  empresaId: string;
  numero: string;
  titulo: string;
  descricao?: string;
  estado: OsEstado;
  prioridade: OsPrioridade;
  clienteId?: string;
  clienteNome: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  propostaId?: string;
  propostaNumero?: string;
  colaboradorId?: string;
  colaboradorNome?: string;
  valorEstimado: number;
  valorFinal: number;
  dataCriacao: string;
  dataPrevistaInicio?: string;
  dataPrevistaConclusao?: string;
  dataInicioReal?: string;
  dataConclusaoReal?: string;
  serviceId?: string;
  observacoes?: string;
  notasInternas?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OsChecklistItem {
  id: string;
  osId: string;
  titulo: string;
  responsavelNome?: string;
  prazo?: string;
  concluido: boolean;
  concluidoEm?: string;
  ordem: number;
}

export interface OsFormData {
  titulo: string;
  descricao: string;
  estado: OsEstado;
  prioridade: OsPrioridade;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  clienteEmail: string;
  propostaId: string;
  propostaNumero: string;
  colaboradorId: string;
  colaboradorNome: string;
  valorEstimado: string;
  dataPrevistaInicio: string;
  dataPrevistaConclusao: string;
  observacoes: string;
  notasInternas: string;
}

export const OS_ESTADOS: Record<OsEstado, { label: string; textColor: string; bgColor: string; borderColor: string }> = {
  nova:        { label: 'Nova',        textColor: 'text-blue-700',    bgColor: 'bg-blue-50',    borderColor: 'border-blue-200' },
  aprovada:    { label: 'Aprovada',    textColor: 'text-green-700',   bgColor: 'bg-green-50',   borderColor: 'border-green-200' },
  em_execucao: { label: 'Em Execução', textColor: 'text-amber-700',   bgColor: 'bg-amber-50',   borderColor: 'border-amber-200' },
  concluida:   { label: 'Concluída',   textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  faturada:    { label: 'Faturada',    textColor: 'text-purple-700',  bgColor: 'bg-purple-50',  borderColor: 'border-purple-200' },
  cancelada:   { label: 'Cancelada',   textColor: 'text-red-700',     bgColor: 'bg-red-50',     borderColor: 'border-red-200' },
};

export const OS_ESTADOS_ORDEM: OsEstado[] = ['nova', 'aprovada', 'em_execucao', 'concluida', 'faturada', 'cancelada'];

export const OS_PRIORIDADES: Record<OsPrioridade, { label: string; color: string }> = {
  baixa:   { label: 'Baixa',   color: 'text-gray-500' },
  normal:  { label: 'Normal',  color: 'text-blue-500' },
  alta:    { label: 'Alta',    color: 'text-amber-600' },
  urgente: { label: 'Urgente', color: 'text-red-600' },
};

export const emptyOsForm: OsFormData = {
  titulo: '', descricao: '', estado: 'nova', prioridade: 'normal',
  clienteId: '', clienteNome: '', clienteTelefone: '', clienteEmail: '',
  propostaId: '', propostaNumero: '', colaboradorId: '', colaboradorNome: '',
  valorEstimado: '', dataPrevistaInicio: '', dataPrevistaConclusao: '',
  observacoes: '', notasInternas: '',
};
