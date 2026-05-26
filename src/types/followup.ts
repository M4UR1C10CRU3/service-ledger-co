export type FaseFollowup =
  | 'po_recebido'
  | 'em_analise'
  | 'proposta_elaboracao'
  | 'proposta_enviada'
  | 'em_negociacao'
  | 'adjudicado'
  | 'perdido';

export type TipoContacto = 'telefone' | 'whatsapp' | 'email' | 'reuniao' | 'visita' | 'nota_interna';
export type Sentimento = 'positivo' | 'neutro' | 'negativo' | 'desconhecido';

export const FASES_CONFIG: Record<FaseFollowup, { label: string; color: string; bgClass: string }> = {
  po_recebido:         { label: 'PO Recebido',            color: '#6B7280', bgClass: 'bg-gray-100 text-gray-700' },
  em_analise:          { label: 'Em Análise',             color: '#3B82F6', bgClass: 'bg-blue-100 text-blue-700' },
  proposta_elaboracao: { label: 'Proposta em Elaboração', color: '#8B5CF6', bgClass: 'bg-violet-100 text-violet-700' },
  proposta_enviada:    { label: 'Proposta Enviada',       color: '#F97316', bgClass: 'bg-orange-100 text-orange-700' },
  em_negociacao:       { label: 'Em Negociação',          color: '#EAB308', bgClass: 'bg-yellow-100 text-yellow-700' },
  adjudicado:          { label: 'Adjudicado ✅',           color: '#22C55E', bgClass: 'bg-green-100 text-green-700' },
  perdido:             { label: 'Perdido ❌',              color: '#EF4444', bgClass: 'bg-red-100 text-red-700' },
};

export const FASES_ORDER: FaseFollowup[] = [
  'po_recebido', 'em_analise', 'proposta_elaboracao',
  'proposta_enviada', 'em_negociacao', 'adjudicado', 'perdido',
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

export const DEFAULT_CHECKLIST_BY_FASE: Record<FaseFollowup, string[]> = {
  po_recebido: [
    'Registar e analisar o PO recebido',
    'Confirmar contacto com o cliente',
    'Avaliar viabilidade do pedido',
    'Atribuir responsável pela orçamentação',
  ],
  em_analise: [
    'Confirmar cotação com fornecedor(es)',
    'Levantamento técnico das necessidades',
    'Agendar visita ao local (se necessário)',
    'Recolher toda a informação para elaborar proposta',
  ],
  proposta_elaboracao: [
    'Elaborar a proposta',
    'Validação da proposta com o Director',
    'Revisão de valores e condições',
    'Preparar documentação de suporte',
  ],
  proposta_enviada: [
    'Enviar proposta ao cliente',
    'Confirmar recepção pelo cliente',
    'Agendar reunião/visita de apresentação',
    'Combinar prazo para feedback',
  ],
  em_negociacao: [
    'Reunião de negociação com o cliente',
    'Análise de contra-proposta (se existir)',
    'Ajuste de condições (se necessário)',
    'Validação final com Director',
  ],
  adjudicado: [
    'Recolher assinatura/confirmação do cliente',
    'Emitir documento de adjudicação',
    'Criar Ordem de Serviço no sistema',
    'Informar equipa de produção',
  ],
  perdido: [],
};

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
  // PO link
  poId?: string | null;
  numeroPo?: string | null;
  // joined
  numeroProposta?: string;
  totalComIva?: number;
  // checklist stats (loaded separately)
  checklistTotal?: number;
  checklistDone?: number;
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

export interface ChecklistItem {
  id: string;
  oportunidadeId: string;
  empresaId: string;
  ordem: number;
  texto: string;
  concluido: boolean;
  responsavelId: string | null;
  responsavelNome: string | null;
  prazo: string | null;
  prazoHora: string | null;
  faseAssociada: string | null;
  concluidoPorNome: string | null;
  concluidoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItemForm {
  oportunidadeId: string;
  empresaId: string;
  ordem: number;
  texto: string;
  responsavelId?: string | null;
  responsavelNome?: string | null;
  prazo?: string | null;
  prazoHora?: string | null;
  faseAssociada?: string | null;
}
