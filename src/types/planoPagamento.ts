export type PpFase = 'adjudicacao' | 'inicio_trabalhos' | 'entrega' | 'outros';

export type PpEstado = 'pendente' | 'aguarda_comprovativo' | 'pago';

export interface PlanoPagamento {
  id: string;
  empresaId: string;
  propostaId: string | null;
  osId: string | null;
  descricao: string;
  percentagem: number | null;
  valor: number;
  fase: PpFase;
  estado: PpEstado;
  dataPrevista: string | null;
  dataPagamento: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PpFormRow {
  tempId: string;
  descricao: string;
  percentagem: string;
  valor: string;
  fase: PpFase;
  dataPrevista: string;
}

export const PP_FASES: Record<PpFase, { label: string; color: string }> = {
  adjudicacao:      { label: 'Adjudicação',      color: 'text-blue-600'  },
  inicio_trabalhos: { label: 'Início Trabalhos', color: 'text-amber-600' },
  entrega:          { label: 'Entrega',           color: 'text-green-600' },
  outros:           { label: 'Outros',            color: 'text-gray-500'  },
};

export const PP_ESTADOS: Record<PpEstado, { label: string; color: string; bg: string }> = {
  pendente:             { label: 'Pendente',             color: 'text-gray-600',  bg: 'bg-gray-50'  },
  aguarda_comprovativo: { label: 'Aguarda Comprovativo', color: 'text-amber-600', bg: 'bg-amber-50' },
  pago:                 { label: 'Pago',                 color: 'text-green-600', bg: 'bg-green-50' },
};

export function defaultPpRows(totalComIva: number): PpFormRow[] {
  const v = (pct: number) => ((totalComIva * pct) / 100).toFixed(2);
  return [
    { tempId: '1', descricao: 'Adjudicação',          percentagem: '60', valor: v(60), fase: 'adjudicacao',      dataPrevista: '' },
    { tempId: '2', descricao: 'Início dos trabalhos', percentagem: '35', valor: v(35), fase: 'inicio_trabalhos', dataPrevista: '' },
    { tempId: '3', descricao: 'Entrega / Conclusão',  percentagem: '5',  valor: v(5),  fase: 'entrega',          dataPrevista: '' },
  ];
}

export interface PpModeloLinha {
  descricao: string;
  percentagem: number;
  fase: PpFase;
}

export interface PpModelo {
  id: string;
  empresaId: string;
  nome: string;
  descricao: string | null;
  isDefault: boolean;
  linhas: PpModeloLinha[];
  createdAt: string;
}

// Modelos de sistema — sempre disponíveis, não guardados na BD
export const PP_MODELOS_SISTEMA: Array<{ id: string; nome: string; linhas: PpModeloLinha[] }> = [
  {
    id: 'sistema_60_35_5',
    nome: 'Padrão (60% / 35% / 5%)',
    linhas: [
      { descricao: 'Adjudicação',          percentagem: 60, fase: 'adjudicacao' },
      { descricao: 'Início dos trabalhos', percentagem: 35, fase: 'inicio_trabalhos' },
      { descricao: 'Entrega / Conclusão',  percentagem: 5,  fase: 'entrega' },
    ],
  },
  {
    id: 'sistema_50_50',
    nome: 'Duas Prestações (50% / 50%)',
    linhas: [
      { descricao: 'Adjudicação',   percentagem: 50, fase: 'adjudicacao' },
      { descricao: 'Entrega Final', percentagem: 50, fase: 'entrega' },
    ],
  },
  {
    id: 'sistema_30_40_30',
    nome: 'Três Prestações (30% / 40% / 30%)',
    linhas: [
      { descricao: 'Adjudicação',          percentagem: 30, fase: 'adjudicacao' },
      { descricao: 'Início dos trabalhos', percentagem: 40, fase: 'inicio_trabalhos' },
      { descricao: 'Entrega / Conclusão',  percentagem: 30, fase: 'entrega' },
    ],
  },
  {
    id: 'sistema_100',
    nome: 'Pagamento Único (100%)',
    linhas: [
      { descricao: 'Pagamento Total', percentagem: 100, fase: 'adjudicacao' },
    ],
  },
];
