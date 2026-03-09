export interface AccountPayableItem {
  id: string;
  descricao: string;
  quantidade: string;
  valorBruto: string;
  ivaRate: string;
  produtoRef?: string;
}

export interface AccountPayable {
  id: string;
  empresaId: string;
  supplierId: string;
  supplierName?: string;
  tipoLancamento: 'compra_revenda' | 'despesa' | 'compra' | 'despesa_fixa' | 'custo_investimento';
  categoria: string;
  descricao: string | null;
  numeroDocumento: string | null;
  dataEmissao: string;
  valorBruto: number;
  desconto: number;
  acrescimo: number;
  valorLiquido: number;
  ivaRate: number;
  ivaValue: number;
  formaPagamento: 'imediato' | 'a_credito' | 'a_vista' | 'a_prazo';
  dataPagamento: string | null;
  dataVencimento: string | null;
  metodoPagamento: string | null;
  comprovanteUrl: string | null;
  status: 'pendente' | 'liquidado' | 'vencido' | 'parcial' | 'cancelado';
  centroCusto: string | null;
  projeto: string | null;
  observacoes: string | null;
  vincularEstoque: boolean;
  costCenterId: string | null;
  articleId: string | null;
  quantity: number;
  items: AccountPayableItem[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountPayableFormData {
  supplierId: string;
  tipoLancamento: 'compra_revenda' | 'despesa';
  categoria: string;
  descricao: string;
  numeroDocumento: string;
  dataEmissao: Date;
  /** null = not yet paid (for a_credito) */
  valorBruto: string; // Valor Ilíquido
  ivaRate: string; // '0' | '6' | '13' | '23'
  ivaValue: string; // calculated
  valorLiquido: string; // calculated total
  formaPagamento: 'imediato' | 'a_credito';
  dataPagamento: Date;
  dataVencimento: Date;
  metodoPagamento: string;
  observacoes: string;
  costCenterId: string;
  articleId: string;
  quantity: string;
  items: AccountPayableItem[];
}

export const TIPO_LANCAMENTO_LABELS: Record<string, string> = {
  compra_revenda: 'Compra de Artigos para Revenda',
  despesa: 'Despesa',
  // Legacy
  compra: 'Compra',
  despesa_fixa: 'Despesa Fixa',
  custo_investimento: 'Custo/Investimento',
};

export const CATEGORIAS: { value: string; label: string }[] = [
  { value: 'artigos_revenda', label: 'Artigos para Revenda' },
  { value: 'outros', label: 'Outros' },
];

// Legacy categories kept for backward compatibility in reports/filters
export const CATEGORIAS_POR_TIPO: Record<string, { value: string; label: string }[]> = {
  compra_revenda: [
    { value: 'artigos_revenda', label: 'Artigos para Revenda' },
    { value: 'outros', label: 'Outros' },
  ],
  despesa: [
    { value: 'artigos_revenda', label: 'Artigos para Revenda' },
    { value: 'outros', label: 'Outros' },
  ],
  compra: [
    { value: 'produtos_revenda', label: 'Produtos para Revenda' },
    { value: 'mercadorias', label: 'Mercadorias' },
  ],
  despesa_fixa: [
    { value: 'agua', label: 'Água' },
    { value: 'luz', label: 'Luz' },
    { value: 'internet', label: 'Internet' },
    { value: 'telecomunicacoes', label: 'Telecomunicações' },
    { value: 'arrendamento', label: 'Arrendamento' },
  ],
  custo_investimento: [
    { value: 'manutencao', label: 'Manutenção' },
    { value: 'equipamentos', label: 'Equipamentos' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'reformas', label: 'Reformas' },
  ],
};

export const IVA_OPTIONS = [
  { value: '0', label: 'Isento (0%)' },
  { value: '6', label: '6%' },
  { value: '13', label: '13%' },
  { value: '23', label: '23%' },
];

export const METODOS_PAGAMENTO = [
  { value: 'numerario', label: 'Numerário' },
  { value: 'multibanco', label: 'Multibanco' },
  { value: 'transferencia', label: 'Transferência Bancária' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'permuta', label: 'Permuta' },
];

export const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  liquidado: 'Liquidado',
  vencido: 'Vencido',
  parcial: 'Parcial',
  cancelado: 'Cancelado',
};

export const ALL_CATEGORIAS = [
  ...CATEGORIAS,
  // Legacy
  { value: 'produtos_revenda', label: 'Produtos para Revenda' },
  { value: 'mercadorias', label: 'Mercadorias' },
  { value: 'agua', label: 'Água' },
  { value: 'luz', label: 'Luz' },
  { value: 'internet', label: 'Internet' },
  { value: 'telecomunicacoes', label: 'Telecomunicações' },
  { value: 'arrendamento', label: 'Arrendamento' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'reformas', label: 'Reformas' },
];

export const emptyAccountPayableForm: AccountPayableFormData = {
  supplierId: '',
  tipoLancamento: 'despesa',
  categoria: '',
  descricao: '',
  numeroDocumento: '',
  dataEmissao: new Date(),
  valorBruto: '',
  ivaRate: '23',
  ivaValue: '',
  valorLiquido: '',
  formaPagamento: 'imediato',
  dataPagamento: new Date(),
  dataVencimento: new Date(),
  metodoPagamento: 'transferencia',
  observacoes: '',
  costCenterId: '',
  articleId: '',
  quantity: '',
  items: [],
};
