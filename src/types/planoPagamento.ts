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
