export type POEstado =
  | 'recebido'
  | 'em_analise'
  | 'proposta_elaborada'
  | 'adjudicado'
  | 'os_criada'
  | 'cancelado';

export type TipoPedido = 'orcamentacao' | 'intervencao_imediata';

export interface PedidoOrcamento {
  id: string;
  empresaId: string;
  numeroPo: string;
  numeroSequencial: number;
  ano: number;
  tipoPedido: TipoPedido;
  clienteId: string | null;
  clienteNome: string;
  clienteMorada: string | null;
  clienteNif: string | null;
  clienteTelefone: string | null;
  clienteEmail: string | null;
  vendedorId: string | null;
  vendedorNome: string | null;
  titulo: string | null;
  descricaoNecessidade: string | null;
  obra: string | null;
  duracaoObra: string | null;
  localExecucao: string | null;
  estado: POEstado;
  validadeDias: number;
  validadeTexto: string | null;
  condicoesPagamento: string | null;
  condicoesGerais: string | null;
  observacoes: string | null;
  propostaId: string | null;
  numeroProposta: string | null;
  osId: string | null;
  numeroOs: string | null;
  dataEmissao: string;
  horaEmissao: string;
  createdAt: string;
  updatedAt: string;
}

export interface POLinha {
  id: string;
  poId: string;
  empresaId: string;
  ordem: number;
  tipoLinha: 'artigo' | 'seccao' | 'texto';
  referencia: string | null;
  designacao: string | null;
  quantidade: number;
  unidade: string;
  observacaoLinha: string | null;
}

export interface POLinhaForm {
  id?: string;
  ordem: number;
  tipoLinha: 'artigo' | 'seccao' | 'texto';
  referencia: string;
  designacao: string;
  quantidade: number;
  unidade: string;
  observacaoLinha: string;
}

export interface POFormData {
  tipoPedido: TipoPedido;
  clienteId: string | null;
  clienteNome: string;
  clienteMorada: string;
  clienteNif: string;
  clienteTelefone: string;
  clienteEmail: string;
  vendedorNome: string;
  dataEmissao: string;
  titulo: string;
  descricaoNecessidade: string;
  obra: string;
  duracaoObra: string;
  localExecucao: string;
  validadeDias: number;
  validadeTexto: string;
  condicoesPagamento: string;
  condicoesGerais: string;
  observacoes: string;
  linhas: POLinhaForm[];
}
