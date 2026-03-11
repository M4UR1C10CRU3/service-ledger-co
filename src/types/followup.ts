export type FaseFollowup =
  | 'contacto_inicial'
  | 'proposta_enviada'
  | 'em_negociacao'
  | 'decisao_pendente'
  | 'adjudicado'
  | 'arquivado';

export type TipoContacto = 'telefone' | 'whatsapp' | 'email' | 'reuniao' | 'visita' | 'nota_interna';
export type Sentimento = 'positivo' | 'neutro' | 'negativo' | 'desconhecido';

export const FASES_CONFIG: Record<FaseFollowup, { label: string; color: string; bgClass: string }> = {
  contacto_inicial: { label: 'Contacto Inicial', color: '#6B7280', bgClass: 'bg-gray-100 text-gray-700' },
  proposta_enviada: { label: 'Proposta Enviada', color: '#3B82F6', bgClass: 'bg-blue-100 text-blue-700' },
  em_negociacao: { label: 'Em Negociação', color: '#EAB308', bgClass: 'bg-yellow-100 text-yellow-700' },
  decisao_pendente: { label: 'Decisão Pendente', color: '#F97316', bgClass: 'bg-orange-100 text-orange-700' },
  adjudicado: { label: 'Adjudicado ✅', color: '#22C55E', bgClass: 'bg-green-100 text-green-700' },
  arquivado: { label: 'Arquivado ❌', color: '#EF4444', bgClass: 'bg-red-100 text-red-700' },
};

export const FASES_ORDER: FaseFollowup[] = [
  'contacto_inicial',
  'proposta_enviada',
  'em_negociacao',
  'decisao_pendente',
  'adjudicado',
  'arquivado',
];

export const TIPOS_CONTACTO: Record<TipoContacto, { label: string; icon: string }> = {
  telefone: { label: 'Telefone', icon: '📞' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  email: { label: 'Email', icon: '📧' },
  reuniao: { label: 'Reunião', icon: '🤝' },
  visita: { label: 'Visita', icon: '🏠' },
  nota_interna: { label: 'Nota Interna', icon: '📝' },
};

export const SENTIMENTOS: Record<Sentimento, { label: string; icon: string }> = {
  positivo: { label: 'Positivo', icon: '😊' },
  neutro: { label: 'Neutro', icon: '😐' },
  negativo: { label: 'Negativo', icon: '😟' },
  desconhecido: { label: 'Desconhecido', icon: '❓' },
};

export const MOTIVOS_ARQUIVO = [
  'Preço',
  'Concorrência',
  'Sem resposta',
  'Projeto cancelado',
  'Outro',
];

export interface Oportunidade {
  id: string;
  empresaId: string;
  clienteId: string | null;
  clienteNome: string | null;
  propostaId: string | null;
  titulo: string;
  fase: FaseFollowup;
  responsavelId: string | null;
  responsavelNome: string | null;
  probabilidade: number;
  valorEstimado: number | null;
  dataAdjudicacaoEsperada: string | null;
  dataAdjudicacaoReal: string | null;
  motivoArquivo: string | null;
  sentimentoAtual: Sentimento;
  dataUltimoContacto: string | null;
  proximoFollowupData: string | null;
  proximoFollowupTipo: string | null;
  proximoFollowupNotas: string | null;
  notasInternas: string | null;
  createdAt: string;
  updatedAt: string;
  // joined
  numeroProposta?: string;
  totalComIva?: number;
}

export interface Contacto {
  id: string;
  oportunidadeId: string;
  empresaId: string;
  dataContacto: string;
  tipoContacto: TipoContacto;
  resultado: string | null;
  feedbackCliente: string | null;
  sentimento: Sentimento;
  probabilidadeApos: number | null;
  faseAnterior: string | null;
  faseNova: string | null;
  proximoFollowupData: string | null;
  proximoFollowupTipo: string | null;
  proximoFollowupNotas: string | null;
  utilizadorId: string | null;
  utilizadorNome: string | null;
  createdAt: string;
}

export interface HistoricoFase {
  id: string;
  oportunidadeId: string;
  empresaId: string;
  faseAnterior: string | null;
  faseNova: string;
  dataTransicao: string;
  utilizadorId: string | null;
  utilizadorNome: string | null;
  contactoId: string | null;
  notas: string | null;
}
