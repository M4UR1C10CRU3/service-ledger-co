/**
 * Concursos Públicos — Clariza Build.
 *
 * Um concurso é um cartão do Quadro do tipo 'concursos'. As tabelas cp_* guardam
 * o que o cartão não tem: os factos do anúncio, o mapa de quantidades com os
 * nossos preços, e a checklist de documentos do art. 9.º do Programa.
 */

export type EstadoConcurso =
  | 'detetado' | 'proposta_previa' | 'decisao' | 'precos_reais' | 'plano_execucao'
  | 'documentos' | 'validacao' | 'assinatura' | 'submetido' | 'resultado' | 'arquivado';

export const ESTADO_LABEL: Record<EstadoConcurso, string> = {
  detetado: 'Detetado',
  proposta_previa: 'Proposta prévia',
  decisao: 'Decisão',
  precos_reais: 'Preços reais',
  plano_execucao: 'Plano de execução',
  documentos: 'Documentos',
  validacao: 'Validação',
  assinatura: 'Assinatura',
  submetido: 'Submetido',
  resultado: 'Resultado',
  arquivado: 'Arquivado',
};

export const ESTADO_ORDEM: EstadoConcurso[] = [
  'detetado', 'proposta_previa', 'decisao', 'precos_reais', 'plano_execucao',
  'documentos', 'validacao', 'assinatura', 'submetido', 'resultado', 'arquivado',
];

export interface Concurso {
  id: string;
  empresa_id: string;
  cartao_id: string | null;
  referencia_interna: string | null;
  versao: number;
  versao_anterior_id: string | null;
  entidade_nome: string;
  entidade_nipc: string | null;
  entidade_referencia: string | null;
  cliente_id: string | null;
  designacao: string;
  tipo_procedimento: string | null;
  tipo_contrato: string | null;
  cpv: string | null;
  local_execucao: string | null;
  preco_base: number | null;
  prazo_execucao_dias: number | null;
  caucao_pct: number | null;
  criterio_adjudicacao: string | null;
  fundos_eu: boolean | null;
  anuncio_numero: string | null;
  anuncio_data: string | null;
  plataforma: string | null;
  url_pecas: string | null;
  prazo_propostas: string | null;
  prazo_manutencao_dias: number | null;
  habilitacao: string | null;
  estado: EstadoConcurso;
  decisao: 'avancar' | 'declinar' | null;
  decisao_motivo: string | null;
  decisao_em: string | null;
  decisao_por: string | null;
  preco_proposto: number | null;
  proposta_numero: string | null;
  submetido_em: string | null;
  resultado: string | null;
  resultado_em: string | null;
  notas: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type NivelItem = 'capitulo' | 'artigo' | 'item';
export type OrigemPreco = 'reutilizado' | 'qtd_alterada' | 'novo' | 'manual' | 'importado';

export interface MapaItem {
  id: string;
  empresa_id: string;
  concurso_id: string;
  codigo: string;
  nivel: NivelItem;
  descricao: string;
  unidade: string | null;
  quantidade: number | null;
  preco_previo: number | null;
  preco_unitario: number | null;
  origem_preco: OrigemPreco | null;
  codigo_v1: string | null;
  quantidade_v1: number | null;
  posicao: number;
  notas: string | null;
}

export type FamiliaDoc = 'standing' | 'modelo' | 'especifico';
export type EstadoDoc = 'por_fazer' | 'gerado' | 'validado' | 'assinado' | 'submetido' | 'nao_aplicavel';

export const ESTADO_DOC_LABEL: Record<EstadoDoc, string> = {
  por_fazer: 'Por fazer',
  gerado: 'Gerado',
  validado: 'Validado',
  assinado: 'Assinado',
  submetido: 'Submetido',
  nao_aplicavel: 'Não aplicável',
};

export const ESTADO_DOC_ORDEM: EstadoDoc[] = ['por_fazer', 'gerado', 'validado', 'assinado', 'submetido'];

export const FAMILIA_LABEL: Record<FamiliaDoc, string> = {
  standing: 'Certidão / documento permanente',
  modelo: 'Modelo fixo',
  especifico: 'Específico do concurso',
};

export interface DocumentoConcurso {
  id: string;
  empresa_id: string;
  concurso_id: string;
  alinea: string | null;
  nome: string;
  familia: FamiliaDoc;
  depende_do_preco: boolean;
  estado: EstadoDoc;
  anexo_id: string | null;
  validado_por: string | null;
  validado_em: string | null;
  assinado_em: string | null;
  posicao: number;
  notas: string | null;
}

/** Soma parcial = quantidade × preço; ignora capítulos, artigos e itens sem preço. */
export const parcialItem = (i: MapaItem): number | null =>
  i.nivel === 'item' && i.quantidade != null && i.preco_unitario != null
    ? Math.round(i.quantidade * i.preco_unitario * 100) / 100
    : null;

/** Linha de cartao_anexos — o ficheiro vive no bucket privado 'cartao-anexos'. */
export interface AnexoConcurso {
  id: string;
  cartao_id: string;
  nome: string;
  path: string | null;
  url: string | null;
  tipo: string | null;
  adicionado_por_nome: string | null;
  criado_em: string;
}
