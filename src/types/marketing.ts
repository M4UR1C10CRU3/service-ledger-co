export type MarketingStatus =
  | 'ideias'
  | 'em_producao'
  | 'em_revisao'
  | 'em_aprovacao'
  | 'agendado'
  | 'publicado'
  | 'arquivado';

export type MarketingPrioridade = 'baixa' | 'media' | 'alta' | 'urgente';

export type MarketingTipoConteudo =
  | 'post'
  | 'story'
  | 'reels'
  | 'anuncio'
  | 'video'
  | 'blog'
  | 'email'
  | 'outro';

export type MarketingCanal =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'site'
  | 'email'
  | 'outro';

export const STATUS_ORDER: MarketingStatus[] = [
  'ideias',
  'em_producao',
  'em_revisao',
  'em_aprovacao',
  'agendado',
  'publicado',
  'arquivado',
];

export const STATUS_CONFIG: Record<MarketingStatus, { label: string; color: string }> = {
  ideias:       { label: '💡 Ideias',       color: '#94A3B8' },
  em_producao:  { label: '🛠 Em Produção',   color: '#3B82F6' },
  em_revisao:   { label: '👀 Em Revisão',    color: '#EAB308' },
  em_aprovacao: { label: '✋ Em Aprovação',  color: '#A855F7' },
  agendado:     { label: '📅 Agendado',      color: '#6366F1' },
  publicado:    { label: '✅ Publicado',     color: '#22C55E' },
  arquivado:    { label: '📦 Arquivado',     color: '#6B7280' },
};

export const PRIORIDADE_CONFIG: Record<MarketingPrioridade, { label: string; color: string; badgeClass: string }> = {
  baixa:   { label: 'Baixa',   color: '#94A3B8', badgeClass: 'bg-slate-100 text-slate-700' },
  media:   { label: 'Média',   color: '#3B82F6', badgeClass: 'bg-blue-100 text-blue-700' },
  alta:    { label: 'Alta',    color: '#F97316', badgeClass: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'Urgente', color: '#EF4444', badgeClass: 'bg-red-100 text-red-700' },
};

export const TIPO_CONTEUDO_CONFIG: Record<MarketingTipoConteudo, { label: string; icon: string }> = {
  post:    { label: 'Post',    icon: '🖼' },
  story:   { label: 'Story',   icon: '📖' },
  reels:   { label: 'Reels',   icon: '🎬' },
  anuncio: { label: 'Anúncio', icon: '📣' },
  video:   { label: 'Vídeo',   icon: '🎥' },
  blog:    { label: 'Blog',    icon: '📝' },
  email:   { label: 'Email',   icon: '📧' },
  outro:   { label: 'Outro',   icon: '✨' },
};

export const CANAL_CONFIG: Record<MarketingCanal, { label: string; icon: string }> = {
  instagram: { label: 'Instagram', icon: '📷' },
  facebook:  { label: 'Facebook',  icon: '👍' },
  linkedin:  { label: 'LinkedIn',  icon: '💼' },
  tiktok:    { label: 'TikTok',    icon: '🎵' },
  site:      { label: 'Site',      icon: '🌐' },
  email:     { label: 'Email',     icon: '📧' },
  outro:     { label: 'Outro',     icon: '✨' },
};

/** Canal field may store a single canal or a CSV of canais (e.g. "instagram,facebook"). */
export function parseCanais(canal: string | null | undefined): MarketingCanal[] {
  if (!canal) return [];
  return canal.split(',').map(c => c.trim()).filter(Boolean) as MarketingCanal[];
}
export function stringifyCanais(canais: MarketingCanal[]): string | null {
  return canais.length ? (canais.join(',') as any) : null;
}

/** Tipo de conteúdo pode ser único ou CSV (e.g. "post,story"). */
export function parseTipos(tipo: string | null | undefined): MarketingTipoConteudo[] {
  if (!tipo) return [];
  return tipo.split(',').map(t => t.trim()).filter(Boolean) as MarketingTipoConteudo[];
}
export function stringifyTipos(tipos: MarketingTipoConteudo[]): string | null {
  return tipos.length ? (tipos.join(',') as any) : null;
}

export interface MarketingTarefa {
  id: string;
  empresaId: string;
  titulo: string;
  descricao: string | null;
  tipoConteudo: MarketingTipoConteudo | null;
  canal: MarketingCanal | null;
  status: MarketingStatus;
  prioridade: MarketingPrioridade;
  responsavelId: string | null;
  responsavelNome: string | null;
  delegadoPorId: string | null;
  delegadoPorNome: string | null;
  dataPrevista: string | null;
  dataPublicacao: string | null;
  horaPublicacao: string | null;
  hashtags: string | null;
  copyLegenda: string | null;
  linkExterno: string | null;
  briefing: string | null;
  observacoes: string | null;
  ordemKanban: number;
  arquivado: boolean;
  arquivadoEm: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Workflow
  etapaAtual?: string | null;
  aprovadorId?: string | null;
  aprovadorNome?: string | null;
  solicitanteId?: string | null;
  solicitanteNome?: string | null;
  prazoBriefing?: string | null;
  prazoCriacao?: string | null;
  prazoRevisao?: string | null;
  prazoAprovacao?: string | null;
  horaBriefing?: string | null;
  horaCriacao?: string | null;
  horaRevisao?: string | null;
  horaAprovacao?: string | null;
}

export interface MarketingAnexo {
  id: string;
  tarefaId: string;
  empresaId: string;
  tipo: 'upload' | 'link';
  nome: string;
  url: string;
  mimeType: string | null;
  tamanhoBytes: number | null;
  uploadedById: string | null;
  uploadedByNome: string | null;
  createdAt: string;
}

export interface MarketingComentario {
  id: string;
  tarefaId: string;
  empresaId: string;
  autorId: string | null;
  autorNome: string;
  conteudo: string;
  tipo: 'comentario' | 'mudanca_status' | 'sistema';
  createdAt: string;
}

// ============= WORKFLOW =============
export type MarketingEtapa =
  | 'briefing'
  | 'criacao'
  | 'revisao'
  | 'aprovacao'
  | 'publicado';

export const ETAPA_ORDER: MarketingEtapa[] = ['briefing', 'criacao', 'revisao', 'aprovacao', 'publicado'];

export const ETAPA_CONFIG: Record<MarketingEtapa, { label: string; color: string; icon: string }> = {
  briefing:  { label: 'Briefing',   color: '#94A3B8', icon: '📝' },
  criacao:   { label: 'Criação',    color: '#3B82F6', icon: '🎨' },
  revisao:   { label: 'Revisão',    color: '#EAB308', icon: '🔍' },
  aprovacao: { label: 'Aprovação',  color: '#A855F7', icon: '✋' },
  publicado: { label: 'Publicado',  color: '#22C55E', icon: '🚀' },
};

export interface MarketingResponsavel {
  id: string;
  tarefaId: string;
  empresaId: string;
  utilizadorId: string | null;
  utilizadorNome: string;
  funcao: string | null;
  createdAt: string;
}

export interface MarketingChecklistItem {
  id: string;
  tarefaId: string;
  empresaId: string;
  etapa: MarketingEtapa;
  titulo: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  prazo: string | null;
  concluido: boolean;
  concluidoEm: string | null;
  ordem: number;
  createdAt: string;
}

export interface MarketingEtapaHistorico {
  id: string;
  tarefaId: string;
  etapaAnterior: string | null;
  etapaNova: string;
  utilizadorNome: string | null;
  observacoes: string | null;
  createdAt: string;
}
