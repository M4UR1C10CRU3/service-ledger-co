/**
 * Administrativo — licenciamentos e documentação legal.
 *
 * O motor é universal; o catálogo é que muda de país para país. Por isso não há
 * aqui nenhuma lista de tipos de documento nem de âmbitos: essas vêm da base de
 * dados (`adm_tipos_documento`, `adm_paises`). Escrever aqui "municipal |
 * estadual | federal" partia Portugal, onde os âmbitos são outros.
 */

export type ValidadeUnidade = 'dias' | 'meses' | 'anos';

export const VALIDADE_UNIDADES: { id: ValidadeUnidade; label: string; singular: string }[] = [
  { id: 'dias', label: 'dias', singular: 'dia' },
  { id: 'meses', label: 'meses', singular: 'mês' },
  { id: 'anos', label: 'anos', singular: 'ano' },
];

export type EstadoDocumento =
  | 'vigente'
  | 'a_vencer'
  | 'vencido'
  | 'sem_validade'
  | 'em_renovacao'
  | 'dispensado'
  | 'arquivado';

export const ESTADO_CONFIG: Record<EstadoDocumento, { label: string; bg: string; dot: string }> = {
  vigente:      { label: 'Vigente',      bg: 'bg-green-100 text-green-700 border-green-200',   dot: '#16a34a' },
  a_vencer:     { label: 'A vencer',     bg: 'bg-amber-100 text-amber-700 border-amber-200',   dot: '#d97706' },
  vencido:      { label: 'Vencido',      bg: 'bg-red-100 text-red-700 border-red-200',         dot: '#dc2626' },
  sem_validade: { label: 'Sem validade', bg: 'bg-slate-100 text-slate-700 border-slate-200',   dot: '#64748b' },
  em_renovacao: { label: 'Em renovação', bg: 'bg-blue-100 text-blue-700 border-blue-200',      dot: '#2563eb' },
  dispensado:   { label: 'Dispensado',   bg: 'bg-gray-100 text-gray-600 border-gray-200',      dot: '#9ca3af' },
  arquivado:    { label: 'Arquivado',    bg: 'bg-gray-100 text-gray-600 border-gray-200',      dot: '#9ca3af' },
};

/** Rótulos dos âmbitos. O que não estiver aqui mostra-se como veio da base. */
export const AMBITO_LABEL: Record<string, string> = {
  municipal: 'Municipal',
  estadual: 'Estadual',
  federal: 'Federal',
  nacional: 'Nacional',
  uniao_europeia: 'União Europeia',
  privado: 'Privado',
};

export const ambitoLabel = (a?: string | null): string =>
  a ? (AMBITO_LABEL[a] ?? a) : '—';

export interface AdmPais {
  codigo: string;
  nome: string;
  ambitos: string[];
  identificador_label: string | null;
}

/**
 * Um tipo do catálogo. Serve tanto para os tipos da plataforma como para os
 * tipos próprios da empresa — a origem distingue-se por `origem`, e é ela que
 * decide em que coluna do documento o identificador é gravado.
 */
export interface TipoDocumento {
  id: string;
  origem: 'catalogo' | 'empresa';
  pais: string | null;
  nome: string;
  entidade_emissora: string | null;
  ambito: string | null;
  validade_valor: number | null;
  validade_unidade: ValidadeUnidade | null;
  aviso_dias_sugerido: number;
  rotina: boolean;
  obrigatorio: boolean;
  aplica_a_vertical: string | null;
}

export interface DocumentoLegal {
  id: string;
  empresa_id: string;
  tipo_id: string | null;
  tipo_empresa_id: string | null;
  tipo_nome: string;
  titulo: string;
  numero: string | null;
  entidade_emissora: string | null;
  ambito: string | null;
  data_emissao: string | null;
  data_validade: string | null;
  validade_valor: number | null;
  validade_unidade: ValidadeUnidade | null;
  aviso_dias: number;
  rotina: boolean;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  custo_renovacao: number | null;
  observacoes: string | null;
  em_renovacao: boolean;
  dispensado: boolean;
  arquivado: boolean;
  created_by_nome: string | null;
  created_at: string;
  updated_at: string;
  /** Vêm da vista v_adm_documentos, calculados — nunca gravados. */
  estado: EstadoDocumento;
  dias_para_vencer: number | null;
}

export interface DocumentoVersao {
  id: string;
  empresa_id: string;
  documento_id: string;
  numero: string | null;
  data_emissao: string | null;
  data_validade: string | null;
  nome_ficheiro: string | null;
  storage_path: string | null;
  mime_type: string | null;
  tamanho_bytes: number | null;
  vigente: boolean;
  notas: string | null;
  created_by_nome: string | null;
  created_at: string;
}

export interface DocumentoHistorico {
  id: string;
  empresa_id: string;
  documento_id: string;
  tipo: string;
  descricao: string;
  metadata: Record<string, unknown> | null;
  utilizador_nome: string | null;
  created_at: string;
}

/**
 * Soma um período a uma data. É isto que propõe a próxima validade quando se
 * escolhe um tipo — proposta, sempre editável, nunca imposta.
 */
export function somarPeriodo(
  base: string,
  valor: number | null | undefined,
  unidade: ValidadeUnidade | null | undefined,
): string | null {
  if (!base || !valor || !unidade) return null;
  const d = new Date(base + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  if (unidade === 'dias') d.setDate(d.getDate() + valor);
  if (unidade === 'meses') d.setMonth(d.getMonth() + valor);
  if (unidade === 'anos') d.setFullYear(d.getFullYear() + valor);
  return d.toISOString().slice(0, 10);
}

/** "30 dias", "1 ano", "3 anos" — sem inventar plurais errados. */
export function descreverPeriodo(
  valor: number | null | undefined,
  unidade: ValidadeUnidade | null | undefined,
): string {
  if (!valor || !unidade) return 'Sem validade';
  const cfg = VALIDADE_UNIDADES.find(u => u.id === unidade);
  if (!cfg) return `${valor} ${unidade}`;
  return `${valor} ${valor === 1 ? cfg.singular : cfg.label}`;
}
