export type NeEstado = 'rascunho' | 'enviada' | 'cotacao_recebida' | 'aprovada' | 'encomendada' | 'recebida' | 'faturada' | 'cancelada';

export type NePrioridade = 'baixa' | 'normal' | 'alta' | 'urgente';

export interface NotaEncomenda {
  id: string; empresaId: string; numero: string;
  propostaId: string | null; osId: string | null;
  fornecedorId: string | null; fornecedorNome: string | null;
  estado: NeEstado; prioridade: NePrioridade; titulo: string;
  descricao: string | null; observacoes: string | null;
  dataCriacao: string; dataNecessidade: string | null;
  dataEnvio: string | null; dataRecepcao: string | null;
  valorEstimado: number | null; valorFinal: number | null;
  createdAt: string; updatedAt: string;
}

export interface NeItem {
  id: string; neId: string; descricao: string; referencia: string | null;
  quantidade: number; unidade: string; precoUnit: number | null;
  total: number | null; observacoes: string | null; ordem: number; createdAt: string;
}

export interface NeChecklistItem {
  id: string; neId: string; descricao: string;
  concluido: boolean; ordem: number; createdAt: string;
}

export interface NeFormData {
  fornecedorId: string; fornecedorNome: string;
  propostaId: string; osId: string;
  prioridade: NePrioridade; titulo: string;
  descricao: string; observacoes: string;
  dataCriacao: string; dataNecessidade: string; valorEstimado: string;
}

export interface NeItemForm {
  tempId: string; descricao: string; referencia: string;
  quantidade: string; unidade: string; precoUnit: string;
}

export const NE_ESTADOS: Record<NeEstado, { label: string; color: string; bg: string; border: string }> = {
  rascunho:         { label: 'Rascunho',        color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200'   },
  enviada:          { label: 'Enviada',          color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  cotacao_recebida: { label: 'Cotação Recebida', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  aprovada:         { label: 'Aprovada',         color: 'text-cyan-600',   bg: 'bg-cyan-50',   border: 'border-cyan-200'   },
  encomendada:      { label: 'Encomendada',      color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
  recebida:         { label: 'Recebida',         color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200'  },
  faturada:         { label: 'Faturada',         color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  cancelada:        { label: 'Cancelada',        color: 'text-red-400',    bg: 'bg-red-50',    border: 'border-red-200'    },
};

export const NE_ESTADOS_ORDEM: NeEstado[] = [
  'rascunho', 'enviada', 'cotacao_recebida', 'aprovada', 'encomendada', 'recebida', 'faturada', 'cancelada'
];

export const NE_PRIORIDADES: Record<NePrioridade, { label: string; color: string }> = {
  baixa:   { label: 'Baixa',   color: 'text-gray-500'  },
  normal:  { label: 'Normal',  color: 'text-blue-500'  },
  alta:    { label: 'Alta',    color: 'text-amber-500' },
  urgente: { label: 'Urgente', color: 'text-red-500'   },
};

export const NE_CHECKLIST_DEFAULT: string[] = [
  'Abertura da nota de encomenda ao fornecedor',
  'Pedido de cotação / encomenda do material',
  'Validação do pedido com o Diretor',
  'Solicitado pagamento ao Dep. Financeiro',
  'Monitorar o pagamento junto ao Dep. Financeiro',
  'Enviar comprovativo ao fornecedor',
  'Contactar fornecedor',
  'Aguardando chegada da encomenda',
  'Informar ao Diretor a chegada do material',
  'Lançamento de fatura no sistema',
  'Arquivar toda a documentação adequadamente',
];

export const emptyNeForm: NeFormData = {
  fornecedorId: '', fornecedorNome: '', propostaId: '', osId: '',
  prioridade: 'normal', titulo: '', descricao: '', observacoes: '',
  dataCriacao: new Date().toISOString().split('T')[0],
  dataNecessidade: '', valorEstimado: '',
};
