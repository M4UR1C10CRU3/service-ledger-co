export type PlaneamentoColuna =
  | 'ideia'
  | 'levantamento'
  | 'pesquisa'
  | 'consulta_externa'
  | 'validacao'
  | 'aprovado'
  | 'implementacao'
  | 'concluido'
  | 'arquivado';

export const PLANEAMENTO_COLUNAS: { id: PlaneamentoColuna; label: string; color: string }[] = [
  { id: 'ideia', label: 'Ideia', color: '#94a3b8' },
  { id: 'levantamento', label: 'Em Levantamento', color: '#60a5fa' },
  { id: 'pesquisa', label: 'Em Pesquisa', color: '#818cf8' },
  { id: 'consulta_externa', label: 'Em Consulta Externa', color: '#a78bfa' },
  { id: 'validacao', label: 'Em Validação', color: '#f59e0b' },
  { id: 'aprovado', label: 'Aprovado', color: '#10b981' },
  { id: 'implementacao', label: 'Em Implementação', color: '#E8561A' },
  { id: 'concluido', label: 'Concluído', color: '#16a34a' },
  { id: 'arquivado', label: 'Arquivado', color: '#6b7280' },
];

export type PlaneamentoPrioridade = 'baixa' | 'media' | 'alta' | 'critica';
export const PRIORIDADE_CONFIG: Record<PlaneamentoPrioridade, { label: string; color: string; bg: string }> = {
  baixa: { label: 'Baixa', color: '#16a34a', bg: 'bg-green-100 text-green-700 border-green-200' },
  media: { label: 'Média', color: '#eab308', bg: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  alta: { label: 'Alta', color: '#f97316', bg: 'bg-orange-100 text-orange-700 border-orange-200' },
  critica: { label: 'Crítica', color: '#dc2626', bg: 'bg-red-100 text-red-700 border-red-200' },
};

export const AREAS_NEGOCIO = [
  'Operacional', 'Comercial', 'Financeiro', 'Tecnologia',
  'Recursos Humanos', 'Marketing', 'Jurídico', 'Outro',
] as const;
export type AreaNegocio = typeof AREAS_NEGOCIO[number];

export const AREA_COLORS: Record<string, string> = {
  Operacional: 'bg-slate-100 text-slate-700 border-slate-200',
  Comercial: 'bg-blue-100 text-blue-700 border-blue-200',
  Financeiro: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Tecnologia: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Recursos Humanos': 'bg-purple-100 text-purple-700 border-purple-200',
  Marketing: 'bg-pink-100 text-pink-700 border-pink-200',
  Jurídico: 'bg-amber-100 text-amber-700 border-amber-200',
  Outro: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const TIPOS_CONSULTA = ['Jurídica', 'Financeira', 'Técnica', 'Comercial', 'Outra'] as const;
export type TipoConsulta = typeof TIPOS_CONSULTA[number];

export type DecisaoFinal = 'aprovado' | 'rejeitado' | 'aguarda_info' | 'em_pausa';
export const DECISAO_LABEL: Record<DecisaoFinal, string> = {
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  aguarda_info: 'Aguarda mais informação',
  em_pausa: 'Em pausa',
};

export interface CriterioValidacao {
  id: string;
  titulo: string;
  ok: boolean;
}

export interface PlaneamentoCard {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string | null;
  objetivo: string | null;
  problema_oportunidade: string | null;
  impacto_esperado: string | null;
  coluna: PlaneamentoColuna;
  area_negocio: string | null;
  areas_afetadas: string[];
  prioridade: PlaneamentoPrioridade;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  responsaveis_extra: string[];
  prazo_estimado: string | null;
  data_inicio_real: string | null;
  data_conclusao_prevista: string | null;
  data_conclusao_real: string | null;
  tags: string[];
  info_internas: string | null;
  referencias_externas: string | null;
  notas_pesquisa: string | null;
  criterios_validacao: CriterioValidacao[];
  parecer: string | null;
  decisao_final: DecisaoFinal | null;
  data_decisao: string | null;
  decisao_observacoes: string | null;
  plano_implementacao: string | null;
  ordem: number;
  created_by_nome: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaneamentoConsulta {
  id: string;
  card_id: string;
  empresa_id: string;
  entidade: string;
  tipo: string;
  data_consulta: string | null;
  resumo: string | null;
  created_by_nome: string | null;
  created_at: string;
}

export interface PlaneamentoChecklistItem {
  id: string;
  card_id: string;
  empresa_id: string;
  titulo: string;
  responsavel_nome: string | null;
  prazo: string | null;
  concluido: boolean;
  concluido_em: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface PlaneamentoAnexo {
  id: string;
  card_id: string;
  consulta_id: string | null;
  empresa_id: string;
  nome: string;
  url: string;
  storage_path: string | null;
  mime_type: string | null;
  tamanho_bytes: number | null;
  uploaded_by_nome: string | null;
  created_at: string;
}

export interface PlaneamentoHistorico {
  id: string;
  card_id: string;
  empresa_id: string;
  tipo: string;
  descricao: string;
  metadata: any;
  utilizador_nome: string | null;
  created_at: string;
}
