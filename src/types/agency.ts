// ─────────────────────────────────────────────────────────────────────────────
// CLARIZA AGENCY — tipos do vertical de Agência de Marketing
// ─────────────────────────────────────────────────────────────────────────────
// BI-REGIONAL POR DESENHO. O vertical funciona em Portugal E no Brasil; uma
// chave por empresa (ag_empresas_vertical.pais) decide qual está ativo.
// O modelo brasileiro do Operand não foi removido — está inteiro, à espera de
// clientes brasileiros. Nada específico de um país pode ser hardcoded aqui.
// ─────────────────────────────────────────────────────────────────────────────

export type PaisAgencia = 'PT' | 'BR';

/** Espelha ag_paises_config. Vem da base de dados, não é constante de código. */
export interface PaisConfig {
  pais: PaisAgencia;
  nome: string;
  locale: string;
  moeda: string;
  moedaSimbolo: string;
  simboloAEsquerda: boolean;
  fusoHorario: string;
  idFiscalLabel: string;
  impostoLabel: string;
  impostoPorFora: boolean;
  docFaturaLabel: string;
  comissaoMeiosPadrao: number | null;
  usaPraca: boolean;
  usaBisemana: boolean;
  usaBonificacaoBv: boolean;
  usaRedeAfiliadas: boolean;
}

/**
 * Vocabulário por país. Não é tradução — é registo linguístico.
 * "Mídia"/"Veículo"/"Pauta"/"Cadastros" marcam o produto como estrangeiro a um
 * utilizador de Mirandela antes de qualquer avaliação funcional; e o inverso
 * vale para um utilizador de Macapá.
 *
 * Nota: "Veículo" em PT-PT lê-se como automóvel — um menu "Veículos" faria
 * pensar em frota. Daí "Meios".
 */
export const VOCABULARIO: Record<PaisAgencia, Record<string, string>> = {
  PT: {
    meios: 'Meios',
    meio: 'Meio',
    meioSingularCadastro: 'Órgão de comunicação',
    pauta: 'Os meus trabalhos',
    agenda: 'Agenda',
    cadastros: 'Registos',
    utilizador: 'Utilizador',
    faturacao: 'Faturação',
    recusado: 'Recusado',
    estado: 'Estado',
    avenca: 'Avença',
    avencaContrato: 'Contrato de avença',
    prestacoes: 'Prestações',
    devedor: 'Cliente',
    credor: 'Fornecedor',
    dataVencimento: 'Data-limite de pagamento',
    feeAgencia: 'Fee de agência',
    idFiscal: 'NIF',
    fatura: 'Fatura',
  },
  BR: {
    meios: 'Mídia',
    meio: 'Veículo',
    meioSingularCadastro: 'Veículo',
    pauta: 'Minha Pauta',
    agenda: 'Pauta',
    cadastros: 'Cadastros',
    utilizador: 'Usuário',
    faturacao: 'Faturamento',
    recusado: 'Reprovado',
    estado: 'Situação',
    avenca: 'Fee',
    avencaContrato: 'Contrato de Fee',
    prestacoes: 'Parcelas',
    devedor: 'Sacado',
    credor: 'Cedente',
    dataVencimento: 'Vencimento',
    feeAgencia: 'Honorários',
    idFiscal: 'CNPJ/CPF',
    fatura: 'Nota Fiscal',
  },
};

export function termo(pais: PaisAgencia, chave: string): string {
  return VOCABULARIO[pais]?.[chave] ?? VOCABULARIO.PT[chave] ?? chave;
}

/** Formata moeda conforme o país ativo: "1 234,56 €" (PT) / "R$ 1.234,56" (BR). */
export function formatMoeda(valor: number, cfg?: PaisConfig | null): string {
  const locale = cfg?.locale || 'pt-PT';
  const moeda = cfg?.moeda || 'EUR';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: moeda }).format(valor);
}

// "Job" mantém-se nos dois países — é termo corrente tanto em agências
// portuguesas ("job bag") como brasileiras.


export type ProjetoEstado = 'ativo' | 'em_pausa' | 'concluido' | 'cancelado';

export const PROJETO_ESTADOS: Record<ProjetoEstado, { label: string; cor: string }> = {
  ativo:      { label: 'Ativo',      cor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  em_pausa:   { label: 'Em pausa',   cor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  concluido:  { label: 'Concluído',  cor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  cancelado:  { label: 'Cancelado',  cor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

export interface Projeto {
  id: string;
  empresaId: string;
  numero: number;
  ano: number;
  nome: string;
  clienteId: string | null;
  clienteNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  estado: ProjetoEstado;
  arquivado: boolean;
  descricao: string | null;
  prazoDesejado: string | null;
  prazoEstimado: string | null;
  budget: number | null;
  horasPrevistas: number | null;
  quadroId: string | null;
  criadoEm: string;
}

/** Vista ag_v_projeto_resumo — previsto vs realizado. */
export interface ProjetoResumo extends Projeto {
  totalJobs: number;
  jobsConcluidos: number;
  horasApontadas: number;
  custoReal: number;
  margemPrevista: number | null;
}

export interface JobEtapa {
  id: string;
  empresaId: string;
  nome: string;
  cor: string;
  ordem: number;
  final: boolean;
  ativo: boolean;
  // ── Processo: as mesmas regras das colunas dos Quadros ──────────────────
  /** Estado a que as automações reagem. */
  estadoCodigo?: string | null;
  /** O que o job tem de ter para poder ENTRAR nesta etapa. */
  camposObrigatorios?: string[];
  /** Não aceita jobs arrastados. */
  bloqueada?: boolean;
}

export interface Job {
  id: string;
  empresaId: string;
  projetoId: string;
  sequencial: number;
  titulo: string;
  descricao: string | null;
  etapaId: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  prazo: string | null;
  horasPrevistas: number | null;
  concluido: boolean;
  concluidoEm: string | null;
  criadoEm: string;
}

export interface JobTarefa {
  id: string;
  empresaId: string;
  jobId: string;
  ordem: number;
  titulo: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  prazo: string | null;
  horasPrevistas: number | null;
  concluida: boolean;
  concluidaEm: string | null;
}

export interface Apontamento {
  id: string;
  empresaId: string;
  projetoId: string;
  jobId: string | null;
  tarefaId: string | null;
  utilizadorId: string | null;
  utilizadorNome: string | null;
  employeeId: string | null;
  data: string;
  inicio: string | null;
  fim: string | null;
  minutos: number;
  descricao: string | null;
  faturavel: boolean;
  custoHoraSnap: number | null;
}

// ── Formulários ──────────────────────────────────────────────────────────────

export interface ProjetoFormData {
  nome: string;
  clienteId: string | null;
  clienteNome: string;
  responsavelId: string | null;
  responsavelNome: string;
  estado: ProjetoEstado;
  descricao: string;
  prazoDesejado: string;
  prazoEstimado: string;
  budget: number | null;
  horasPrevistas: number | null;
}

export const emptyProjetoForm: ProjetoFormData = {
  nome: '',
  clienteId: null,
  clienteNome: '',
  responsavelId: null,
  responsavelNome: '',
  estado: 'ativo',
  descricao: '',
  prazoDesejado: '',
  prazoEstimado: '',
  budget: null,
  horasPrevistas: null,
};

export interface JobFormData {
  titulo: string;
  descricao: string;
  etapaId: string | null;
  responsavelId: string | null;
  responsavelNome: string;
  prazo: string;
  horasPrevistas: number | null;
}

export const emptyJobForm: JobFormData = {
  titulo: '',
  descricao: '',
  etapaId: null,
  responsavelId: null,
  responsavelNome: '',
  prazo: '',
  horasPrevistas: null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Numeração hierárquica do Operand: projeto 7, job 1 → "7.1". */
export function formatJobNumero(projetoNumero: number, sequencial: number): string {
  return `${projetoNumero}.${sequencial}`;
}

/** Minutos → "2h 30m" / "45m". */
export function formatDuracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Catálogo de peças e serviços ─────────────────────────────────────────────

export interface ItemCategoria {
  id: string; empresaId: string; nome: string; ordem: number; ativo: boolean;
}

export interface ItemCatalogo {
  id: string;
  empresaId: string;
  categoriaId: string | null;
  codigo: string | null;
  designacao: string;
  descricao: string | null;
  unidade: string;
  precoUnitario: number | null;
  horasPrevistasPadrao: number | null;
  ativo: boolean;
}

// ── Textos reutilizáveis ─────────────────────────────────────────────────────

export type TipoTexto =
  | 'introducao' | 'consideracoes' | 'condicoes_pagamento'
  | 'obs_cliente' | 'obs_fornecedor' | 'validade';

export const TIPOS_TEXTO: Record<TipoTexto, string> = {
  introducao:          'Introdução',
  consideracoes:       'Considerações finais',
  condicoes_pagamento: 'Condições de pagamento',
  obs_cliente:         'Observações ao cliente',
  obs_fornecedor:      'Observações ao fornecedor',
  validade:            'Validade da proposta',
};

export interface TextoPadrao {
  id: string; empresaId: string; tipo: TipoTexto;
  nome: string; conteudo: string; padrao: boolean; ativo: boolean;
}

// ── Proposta de agência ──────────────────────────────────────────────────────

export type PropostaAgEstado =
  | 'rascunho' | 'aprovacao_interna' | 'aprovacao_cliente'
  | 'aprovada' | 'recusada' | 'expirada';

export const PROPOSTA_AG_ESTADOS: Record<PropostaAgEstado, { label: string; cor: string }> = {
  rascunho:          { label: 'Rascunho',            cor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  aprovacao_interna: { label: 'Aprovação interna',   cor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  aprovacao_cliente: { label: 'Com o cliente',       cor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  aprovada:          { label: 'Aprovada',            cor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  recusada:          { label: 'Recusada',            cor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  expirada:          { label: 'Expirada',            cor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
};

/** Transições permitidas — a máquina de estados de aprovação do Operand. */
export const PROPOSTA_AG_TRANSICOES: Record<PropostaAgEstado, PropostaAgEstado[]> = {
  rascunho:          ['aprovacao_interna'],
  aprovacao_interna: ['aprovacao_cliente', 'rascunho'],
  aprovacao_cliente: ['aprovada', 'recusada'],
  aprovada:          [],
  recusada:          ['rascunho'],
  expirada:          ['rascunho'],
};

export type TipoLinhaAg = 'artigo' | 'seccao' | 'texto' | 'subtotal';

export interface PropostaAgLinha {
  id?: string;
  ordem: number;
  tipoLinha: TipoLinhaAg;
  itemCatalogoId: string | null;
  referencia: string;
  designacao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  descontoPct: number;
  totalLinha: number;
  horasPrevistas: number | null;
  externo: boolean;
}

export interface PropostaAg {
  id: string;
  empresaId: string;
  projetoId: string | null;
  sequencial: number;
  numeroDocumento: string | null;
  clienteId: string | null;
  clienteNome: string | null;
  titulo: string | null;
  estado: PropostaAgEstado;
  dataEmissao: string;
  validadeDias: number;
  responsavelNome: string | null;
  introducao: string | null;
  consideracoes: string | null;
  condicoesPagamento: string | null;
  observacoes: string | null;
  taxaImposto: number | null;
  comissaoPct: number | null;
  totalSemImposto: number;
  valorImposto: number;
  totalComImposto: number;
  jobsLancados: boolean;
}

export interface PropostaParcela {
  id?: string;
  numero: number;
  total: number;
  descricao: string | null;
  valor: number;
  dataVencimento: string | null;
  formaPagamento: string | null;
  estado: 'previsto' | 'faturado' | 'recebido' | 'anulado';
}

// ── Contratos de avença ──────────────────────────────────────────────────────

export type AvencaEstado = 'ativo' | 'suspenso' | 'terminado';

export const AVENCA_ESTADOS: Record<AvencaEstado, { label: string; cor: string }> = {
  ativo:      { label: 'Ativo',      cor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  suspenso:   { label: 'Suspenso',   cor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  terminado:  { label: 'Terminado',  cor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

export interface ContratoAvenca {
  id: string;
  empresaId: string;
  clienteId: string | null;
  clienteNome: string | null;
  designacao: string;
  valorMensal: number;
  horasContratadas: number | null;
  periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  dataInicio: string;
  dataFim: string | null;
  mesesDuracao: number | null;
  estado: AvencaEstado;
  observacoes: string | null;
}

/** Vista ag_v_avenca_consumo — contratadas vs consumidas. */
export interface AvencaConsumo extends ContratoAvenca {
  horasConsumidas: number;
  horasSaldo: number | null;
}

/**
 * Etapas iniciais sugeridas ao ativar o vertical numa empresa nova.
 *
 * As exigências são deliberadamente modestas e progressivas — o job nasce só
 * com um título, e só se pede quem faz e para quando quando alguém o começa
 * mesmo a trabalhar. Exigir tudo à cabeça é o que mata um kanban.
 */
export const ETAPAS_PADRAO: Array<{
  nome: string; cor: string; final?: boolean;
  estadoCodigo: string; camposObrigatorios?: string[];
}> = [
  { nome: 'Briefing',  cor: '#94a3b8', estadoCodigo: 'briefing' },
  { nome: 'Pesquisa',  cor: '#6366f1', estadoCodigo: 'pesquisa',  camposObrigatorios: ['responsavel_id'] },
  { nome: 'Criação',   cor: '#f59e0b', estadoCodigo: 'criacao',   camposObrigatorios: ['responsavel_id', 'prazo'] },
  { nome: 'Revisão',   cor: '#06b6d4', estadoCodigo: 'revisao' },
  { nome: 'Aprovação', cor: '#a855f7', estadoCodigo: 'aprovacao' },
  { nome: 'Concluído', cor: '#22c55e', estadoCodigo: 'concluido', final: true },
];
