export interface AccountPayable {
  id: string;
  empresaId: string;
  supplierId: string;
  supplierName?: string;
  tipoLancamento: 'compra' | 'despesa_fixa' | 'custo_investimento';
  categoria: string;
  descricao: string | null;
  numeroDocumento: string | null;
  dataEmissao: string;
  valorBruto: number;
  desconto: number;
  acrescimo: number;
  valorLiquido: number;
  formaPagamento: 'a_vista' | 'a_prazo';
  dataPagamento: string | null;
  dataVencimento: string | null;
  metodoPagamento: string | null;
  comprovanteUrl: string | null;
  status: 'pendente' | 'liquidado' | 'vencido' | 'parcial' | 'cancelado';
  centroCusto: string | null;
  projeto: string | null;
  observacoes: string | null;
  vincularEstoque: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountPayableFormData {
  supplierId: string;
  tipoLancamento: 'compra' | 'despesa_fixa' | 'custo_investimento';
  categoria: string;
  descricao: string;
  numeroDocumento: string;
  dataEmissao: Date;
  valorBruto: string;
  desconto: string;
  acrescimo: string;
  formaPagamento: 'a_vista' | 'a_prazo';
  dataPagamento: Date;
  dataVencimento: Date;
  metodoPagamento: string;
  centroCusto: string;
  projeto: string;
  observacoes: string;
  vincularEstoque: boolean;
}

export const TIPO_LANCAMENTO_LABELS: Record<string, string> = {
  compra: 'Compra',
  despesa_fixa: 'Despesa Fixa',
  custo_investimento: 'Custo/Investimento',
};

export const CATEGORIAS_POR_TIPO: Record<string, { value: string; label: string }[]> = {
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

export const METODOS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'boleto', label: 'Boleto' },
];

export const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  liquidado: 'Liquidado',
  vencido: 'Vencido',
  parcial: 'Parcial',
  cancelado: 'Cancelado',
};

export const ALL_CATEGORIAS = [
  ...CATEGORIAS_POR_TIPO.compra,
  ...CATEGORIAS_POR_TIPO.despesa_fixa,
  ...CATEGORIAS_POR_TIPO.custo_investimento,
];

export const emptyAccountPayableForm: AccountPayableFormData = {
  supplierId: '',
  tipoLancamento: 'compra',
  categoria: '',
  descricao: '',
  numeroDocumento: '',
  dataEmissao: new Date(),
  valorBruto: '',
  desconto: '',
  acrescimo: '',
  formaPagamento: 'a_vista',
  dataPagamento: new Date(),
  dataVencimento: new Date(),
  metodoPagamento: 'transferencia',
  centroCusto: '',
  projeto: '',
  observacoes: '',
  vincularEstoque: false,
};
