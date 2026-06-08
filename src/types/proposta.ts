export type PropostaEstado = 'rascunho' | 'enviada' | 'aceite' | 'recusada' | 'expirada';
export type TipoLinha = 'seccao' | 'artigo' | 'subtotal' | 'texto';

export interface Proposta {
  id: string;
  empresaId: string;
  numeroProposta: string;
  numeroSequencial: number;
  ano: number;
  clienteId: string | null;
  clienteNome: string | null;
  clienteMorada: string | null;
  clienteNif: string | null;
  vendedorId: string | null;
  vendedorNome: string | null;
  dataEmissao: string;
  horaEmissao: string;
  validadeDias: number;
  dataValidade: string | null;
  estado: PropostaEstado;
  titulo: string | null;
  descricaoGeral: string | null;
  taxaIva: number;
  totalSemIva: number;
  valorIva: number;
  totalComIva: number;
  condicoesGerais: string | null;
  validadeTexto: string | null;
  duracao: string | null;
  condicoesPagamento: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
  poId?: string | null;
  numeroPo?: string | null;
  pdfAceiteUrl?: string | null;
}

export interface PropostaLinha {
  id: string;
  propostaId: string;
  empresaId: string;
  ordem: number;
  tipoLinha: TipoLinha;
  referencia: string | null;
  designacao: string | null;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  descontoPct: number;
  totalLinha: number;
  produtoId: string | null;
}

export interface PropostaFormData {
  clienteId: string | null;
  clienteNome: string;
  clienteMorada: string;
  clienteNif: string;
  vendedorNome: string;
  dataEmissao: string;
  titulo: string;
  descricaoGeral: string;
  taxaIva: number;
  condicoesGerais: string;
  validadeTexto: string;
  duracao: string;
  condicoesPagamento: string;
  observacoes: string;
  validadeDias: number;
  linhas: PropostaLinhaForm[];
}

export interface PropostaLinhaForm {
  id?: string;
  ordem: number;
  tipoLinha: TipoLinha;
  referencia: string;
  designacao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  descontoPct: number;
  totalLinha: number;
  produtoId: string | null;
}
