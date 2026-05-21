export type TeEstado = 'pendente_aprovacao' | 'aprovado' | 'rejeitado' | 'faturado';

export interface TrabalhoExtra {
  id: string;
  empresaId: string;
  osId: string;
  descricao: string;
  quantidade: number;
  precoUnit: number;
  total: number;
  estado: TeEstado;
  aprovadoPor: string | null;
  dataAprovacao: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeFormData {
  descricao: string;
  quantidade: string;
  precoUnit: string;
  aprovadoPor: string;
  observacoes: string;
}

export const TE_ESTADOS: Record<TeEstado, { label: string; color: string; bg: string }> = {
  pendente_aprovacao: { label: 'Pendente Aprovação', color: 'text-amber-600',  bg: 'bg-amber-50'  },
  aprovado:           { label: 'Aprovado pelo Cliente', color: 'text-green-600', bg: 'bg-green-50' },
  rejeitado:          { label: 'Rejeitado',           color: 'text-red-600',    bg: 'bg-red-50'    },
  faturado:           { label: 'Faturado',            color: 'text-purple-600', bg: 'bg-purple-50' },
};

export const emptyTeForm: TeFormData = {
  descricao: '', quantidade: '1', precoUnit: '', aprovadoPor: '', observacoes: '',
};
