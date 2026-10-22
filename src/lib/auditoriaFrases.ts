import { format, parseISO } from 'date-fns';

/**
 * Frases legíveis da auditoria (tabela `public.auditoria`, escrita por gatilho na base).
 *
 * A base guarda o facto em bruto — tabela, operação, campos, antes/depois. Aqui
 * transforma-se isso em «Ricardo Pessoa desmarcou a tarefa «Abrir OS»» ou
 * «alterou o total com IVA da proposta «WMTCEC 2026/1» de 487,10 € para 5 764,00 €».
 * Os módulos e os nomes das entidades vivem aqui (e não na base) para se poderem
 * afinar sem migração.
 */

/** EVENTO: ação que não escreve numa tabela (ex.: exportar), ou linha trazida do registo antigo. */
export type OperacaoAuditoria = 'INSERT' | 'UPDATE' | 'DELETE' | 'EVENTO';

export interface RegistoAuditoria {
  id: number;
  quando: string;
  auth_uid: string | null;
  autor_id: string | null;
  autor_nome: string;
  autor_email: string | null;
  papel: string | null;
  sessao_id: string | null;
  ip: string | null;
  empresa_id: string | null;
  grupo_id: string | null;
  ambito: 'empresa' | 'grupo' | 'global';
  tabela: string;
  operacao: OperacaoAuditoria;
  registo_id: string | null;
  rotulo: string | null;
  contexto: string | null;
  campos: string[] | null;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  automatica: boolean;
  erro: string | null;
}

interface Entidade {
  modulo: string;
  /** Com artigo: «o cliente», «a proposta». */
  nome: string;
}

const M = {
  quadros: 'Quadros',
  comercial: 'Comercial',
  compras: 'Compras',
  financeiro: 'Financeiro',
  operacoes: 'Ordens de serviço',
  stocks: 'Produtos e stocks',
  rh: 'RH',
  utilizadores: 'Utilizadores e configurações',
  administrativo: 'Administrativo',
  marketing: 'Marketing',
  ecommerce: 'E-commerce',
  school: 'School (ITC)',
  agencia: 'Agência',
  labs: 'Labs',
  outros: 'Outros',
} as const;

const ENTIDADES: Record<string, Entidade> = {
  quadros: { modulo: M.quadros, nome: 'o quadro' },
  quadro_listas: { modulo: M.quadros, nome: 'a lista' },
  quadro_cartoes: { modulo: M.quadros, nome: 'o cartão' },
  cartao_checklists: { modulo: M.quadros, nome: 'a checklist' },
  cartao_checklist_items: { modulo: M.quadros, nome: 'a tarefa' },
  cartao_comentarios: { modulo: M.quadros, nome: 'o comentário' },
  cartao_anexos: { modulo: M.quadros, nome: 'o anexo' },
  cartao_membros: { modulo: M.quadros, nome: 'o membro do cartão' },
  cartao_etiquetas: { modulo: M.quadros, nome: 'a etiqueta' },
  cartao_etiqueta_rel: { modulo: M.quadros, nome: 'a etiqueta do cartão' },
  checklist_templates: { modulo: M.quadros, nome: 'o modelo de checklist' },
  checklist_template_items: { modulo: M.quadros, nome: 'a tarefa do modelo' },
  quadro_automacoes: { modulo: M.quadros, nome: 'a automação' },
  quadro_modelos: { modulo: M.quadros, nome: 'o modelo de quadro' },
  quadro_modelo_listas: { modulo: M.quadros, nome: 'a lista do modelo' },

  clientes: { modulo: M.comercial, nome: 'o cliente' },
  propostas: { modulo: M.comercial, nome: 'a proposta' },
  propostas_linhas: { modulo: M.comercial, nome: 'a linha da proposta' },
  pedidos_orcamento: { modulo: M.comercial, nome: 'o pedido de orçamento' },
  po_linhas: { modulo: M.comercial, nome: 'a linha do pedido' },
  followup_oportunidades: { modulo: M.comercial, nome: 'a oportunidade' },
  followup_contactos: { modulo: M.comercial, nome: 'o contacto de follow-up' },
  workflow_checklist_items: { modulo: M.comercial, nome: 'a tarefa do workflow' },
  plano_pagamentos: { modulo: M.comercial, nome: 'o plano de pagamentos' },
  plano_pagamentos_modelos: { modulo: M.comercial, nome: 'o modelo de plano de pagamentos' },

  suppliers: { modulo: M.compras, nome: 'o fornecedor' },
  notas_encomenda: { modulo: M.compras, nome: 'a nota de encomenda' },
  notas_encomenda_items: { modulo: M.compras, nome: 'a linha da nota de encomenda' },
  notas_encomenda_checklist: { modulo: M.compras, nome: 'a tarefa da nota de encomenda' },
  subempreiteiros: { modulo: M.compras, nome: 'o subempreiteiro' },
  subempreiteiros_documentos: { modulo: M.compras, nome: 'o documento do subempreiteiro' },

  services: { modulo: M.financeiro, nome: 'o serviço' },
  liquidacoes: { modulo: M.financeiro, nome: 'a liquidação' },
  accounts_payable: { modulo: M.financeiro, nome: 'a conta a pagar' },
  account_payments: { modulo: M.financeiro, nome: 'o pagamento' },
  cash_flows: { modulo: M.financeiro, nome: 'o movimento de caixa' },
  cost_centers: { modulo: M.financeiro, nome: 'o centro de custo' },
  email_history: { modulo: M.financeiro, nome: 'o e-mail de cobrança' },
  trabalhos_extra: { modulo: M.financeiro, nome: 'o trabalho extra' },

  ordens_servico: { modulo: M.operacoes, nome: 'a ordem de serviço' },
  ordens_servico_checklist: { modulo: M.operacoes, nome: 'a tarefa da OS' },
  os_checklist_templates: { modulo: M.operacoes, nome: 'o modelo de OS' },
  os_checklist_template_itens: { modulo: M.operacoes, nome: 'a tarefa do modelo de OS' },

  produtos: { modulo: M.stocks, nome: 'o produto' },
  stock_atual: { modulo: M.stocks, nome: 'o stock' },
  stock_movimentos: { modulo: M.stocks, nome: 'o movimento de stock' },
  stock_movements: { modulo: M.stocks, nome: 'o movimento de stock' },
  articles: { modulo: M.stocks, nome: 'o artigo' },

  employees: { modulo: M.rh, nome: 'o colaborador' },
  job_positions: { modulo: M.rh, nome: 'o cargo' },
  time_records: { modulo: M.rh, nome: 'o registo de ponto' },
  feriados: { modulo: M.rh, nome: 'o feriado' },
  rh_vagas: { modulo: M.rh, nome: 'a vaga' },
  rh_candidatos: { modulo: M.rh, nome: 'o candidato' },
  rh_entrevistas: { modulo: M.rh, nome: 'a entrevista' },
  rh_avaliacoes: { modulo: M.rh, nome: 'a avaliação' },
  rh_acolhimentos: { modulo: M.rh, nome: 'o acolhimento' },
  rh_acolhimento_itens: { modulo: M.rh, nome: 'a tarefa de acolhimento' },
  rh_funcoes: { modulo: M.rh, nome: 'a função' },

  liberty_utilizadores: { modulo: M.utilizadores, nome: 'o utilizador' },
  liberty_utilizador_empresas: { modulo: M.utilizadores, nome: 'o acesso a uma empresa' },
  liberty_utilizador_permissoes: { modulo: M.utilizadores, nome: 'a permissão' },
  profiles: { modulo: M.utilizadores, nome: 'o perfil da conta' },
  empresas: { modulo: M.utilizadores, nome: 'a empresa' },
  empresa_grupos: { modulo: M.utilizadores, nome: 'o grupo de empresas' },
  liberty_empresas_config: { modulo: M.utilizadores, nome: 'a configuração da empresa' },
  empresa_smtp_configs: { modulo: M.utilizadores, nome: 'a configuração de e-mail' },
  liberty_webhooks: { modulo: M.utilizadores, nome: 'o webhook' },
  auditoria_leitores: { modulo: M.utilizadores, nome: 'o leitor da auditoria' },
  auditoria_excluidas: { modulo: M.utilizadores, nome: 'a exclusão da auditoria' },
  auditoria: { modulo: M.utilizadores, nome: 'a auditoria' },
  liberty_configuracoes_utilizador: { modulo: M.utilizadores, nome: 'as preferências pessoais' },
  evento: { modulo: M.outros, nome: 'um evento' },

  adm_documentos: { modulo: M.administrativo, nome: 'o documento' },
  adm_documento_versoes: { modulo: M.administrativo, nome: 'a versão do documento' },
  adm_tipos_documento: { modulo: M.administrativo, nome: 'o tipo de documento' },
  planeamento_cards: { modulo: M.administrativo, nome: 'o cartão de planeamento' },
  planeamento_checklist: { modulo: M.administrativo, nome: 'a tarefa de planeamento' },
  cp_concursos: { modulo: M.administrativo, nome: 'o concurso' },
  cp_documentos: { modulo: M.administrativo, nome: 'o documento do concurso' },
  cp_mapa_itens: { modulo: M.administrativo, nome: 'o item do mapa de quantidades' },

  marketing_tarefas: { modulo: M.marketing, nome: 'a tarefa de marketing' },
  marketing_comentarios: { modulo: M.marketing, nome: 'o comentário' },
  marketing_anexos: { modulo: M.marketing, nome: 'o anexo' },
  marketing_editorial_posts: { modulo: M.marketing, nome: 'o post' },

  ecommerce_encomendas: { modulo: M.ecommerce, nome: 'a encomenda' },
  ecommerce_produtos_monitorizados: { modulo: M.ecommerce, nome: 'o produto monitorizado' },
  ecommerce_ajustes_preco: { modulo: M.ecommerce, nome: 'o ajuste de preço' },
  ecommerce_relatorios: { modulo: M.ecommerce, nome: 'o relatório' },
  pesquisa_satisfacao_respostas: { modulo: M.ecommerce, nome: 'a resposta ao inquérito' },

  school_alunos: { modulo: M.school, nome: 'o aluno' },
  school_turmas: { modulo: M.school, nome: 'a turma' },
  school_cursos: { modulo: M.school, nome: 'o curso' },
  school_matriculas: { modulo: M.school, nome: 'a matrícula' },
  school_frequencia: { modulo: M.school, nome: 'a presença' },
  school_avaliacoes: { modulo: M.school, nome: 'a avaliação' },
  school_certificados: { modulo: M.school, nome: 'o certificado' },
  school_docentes: { modulo: M.school, nome: 'o instrutor' },
  school_clientes_corp: { modulo: M.school, nome: 'o cliente corporativo' },
  school_pedidos_formacao: { modulo: M.school, nome: 'o pedido de formação' },

  ag_projetos: { modulo: M.agencia, nome: 'o projeto' },
  ag_jobs: { modulo: M.agencia, nome: 'o job' },
  ag_job_tarefas: { modulo: M.agencia, nome: 'a tarefa do job' },
  ag_propostas: { modulo: M.agencia, nome: 'a proposta' },
};

/** Tabelas sem entrada própria caem no módulo pelo prefixo do nome. */
const PREFIXOS: [string, string][] = [
  ['cartao_', M.quadros], ['quadro', M.quadros], ['school_', M.school], ['ag_', M.agencia],
  ['lb_', M.labs], ['rh_', M.rh], ['marketing_', M.marketing], ['ecommerce_', M.ecommerce],
  ['adm_', M.administrativo], ['cp_', M.administrativo], ['planeamento_', M.administrativo],
  ['liberty_', M.utilizadores], ['worker', M.utilizadores], ['assinatura', M.utilizadores],
];

export function moduloDe(tabela: string): string {
  return ENTIDADES[tabela]?.modulo ?? PREFIXOS.find(([p]) => tabela.startsWith(p))?.[1] ?? M.outros;
}

export function entidadeDe(tabela: string): string {
  return ENTIDADES[tabela]?.nome ?? `o registo de «${tabela.replace(/_/g, ' ')}»`;
}

/** «o cliente» → «do cliente»; «a proposta» → «da proposta»; «as preferências» → «das preferências». */
function de(nome: string): string {
  if (nome.startsWith('o ')) return `do ${nome.slice(2)}`;
  if (nome.startsWith('a ')) return `da ${nome.slice(2)}`;
  if (nome.startsWith('os ')) return `dos ${nome.slice(3)}`;
  if (nome.startsWith('as ')) return `das ${nome.slice(3)}`;
  return `de ${nome}`;
}

export const MODULOS: string[] = Object.values(M);

/** Filtro por módulo na consulta (PostgREST): as tabelas conhecidas mais os prefixos. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function aplicarFiltroModulo(query: any, modulo: string): any {
  if (modulo === M.outros) {
    // tudo o que não cai em nenhum módulo
    let q = query.not('tabela', 'in', `(${Object.keys(ENTIDADES).join(',')})`);
    for (const [p] of PREFIXOS) q = q.not('tabela', 'like', `${p}%`);
    return q;
  }
  const tabelas = Object.entries(ENTIDADES).filter(([, e]) => e.modulo === modulo).map(([t]) => t);
  const partes = PREFIXOS.filter(([, m]) => m === modulo).map(([p]) => `tabela.like.${p}*`);
  if (tabelas.length) partes.unshift(`tabela.in.(${tabelas.join(',')})`);
  return partes.length ? query.or(partes.join(',')) : query;
}

const ROTULOS_CAMPO: Record<string, string> = {
  total_com_iva: 'total com IVA', total_sem_iva: 'total sem IVA', valor_iva: 'IVA', taxa_iva: 'taxa de IVA',
  valor_com_iva: 'valor com IVA', valor_sem_iva: 'valor sem IVA', valor_faturado: 'valor faturado',
  lista_id: 'lista', data_limite: 'prazo', data_limite_concluida: 'prazo cumprido', responsavel_nome: 'responsável',
  responsavel_id: 'responsável', concluido: 'concluída', concluida: 'concluída', estado: 'estado', status: 'estado',
  titulo: 'título', descricao: 'descrição', nome: 'nome', full_name: 'nome', ultimo_acesso: 'último acesso',
  perfil: 'perfil', ativo: 'ativo', eliminado: 'eliminado', arquivado: 'arquivado', capa_url: 'capa',
  movido_em: 'data da mudança', texto: 'texto', email: 'e-mail', telefone: 'telefone', nif: 'NIF', iban: 'IBAN',
  smtp_pass: 'palavra-passe SMTP', secret: 'segredo', quantidade: 'quantidade', preco: 'preço',
  data_emissao: 'data de emissão', data_vencimento: 'data de vencimento', data_pagamento: 'data de pagamento',
  valor_pago: 'valor pago', presente: 'presença', nota_final: 'nota final', deleted_at: 'eliminado em',
  perm_ver: 'pode ver', perm_criar: 'pode criar', perm_editar: 'pode editar', perm_eliminar: 'pode eliminar',
};

export function rotuloCampo(campo: string): string {
  return ROTULOS_CAMPO[campo] ?? campo.replace(/_id$/, '').replace(/_/g, ' ');
}

/** Campos femininos (o resto leva «o»); um campo sem nome conhecido fica «o campo «…»». */
const CAMPOS_FEMININOS = new Set(['descricao', 'lista_id', 'concluido', 'concluida', 'capa_url', 'movido_em',
  'smtp_pass', 'quantidade', 'taxa_iva', 'presente', 'nota_final', 'data_emissao', 'data_vencimento', 'data_pagamento']);

function campoComArtigo(campo: string): string {
  if (!(campo in ROTULOS_CAMPO)) return `o campo «${rotuloCampo(campo)}»`;
  return `${CAMPOS_FEMININOS.has(campo) ? 'a' : 'o'} ${rotuloCampo(campo)}`;
}

/** O contexto sem o que a frase já diz (ao mover um cartão, as listas vão na frase). */
export function contextoSemRepetir(r: RegistoAuditoria): string | null {
  if (!r.contexto) return null;
  if (r.tabela === 'quadro_cartoes' && r.campos?.includes('lista_id')) {
    return r.contexto.replace(/(^| · )de «[^»]*» para «[^»]*»$/, '') || null;
  }
  return r.contexto;
}

const RE_DINHEIRO = /(valor|total|preco|preço|custo|amount|salario|salary|iva$|desconto|juros|multa|montante|pago|balance)/i;
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valor de um campo, pronto a ler. `curto` corta textos longos (frases e tabela). */
export function formatarValor(campo: string, v: unknown, moeda = 'EUR', curto = true): string {
  if (v === null || v === undefined || v === '') return '(vazio)';
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  const num = typeof v === 'number' ? v : (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null);
  if (num !== null && RE_DINHEIRO.test(campo) && !/taxa|pct|percent/i.test(campo)) {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda || 'EUR' }).format(num);
  }
  if (num !== null) return new Intl.NumberFormat('pt-PT').format(num);
  if (typeof v === 'string') {
    if (RE_UUID.test(v)) return `ref. ${v.slice(0, 8)}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return format(parseISO(v), 'dd/MM/yyyy');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return format(parseISO(v), 'dd/MM/yyyy HH:mm');
    return curto && v.length > 80 ? `${v.slice(0, 77)}…` : v;
  }
  const json = JSON.stringify(v);
  return curto && json.length > 80 ? `${json.slice(0, 77)}…` : json;
}

/** Campo que dá nome à alteração quando mudam vários (o dinheiro e o estado primeiro). */
function campoPrincipal(campos: string[]): string {
  const prioridade = [/total_com_iva/, /valor|total|preco/, /estado|status/, /titulo|nome|full_name/, /data_limite|prazo/];
  for (const re of prioridade) {
    const c = campos.find(x => re.test(x));
    if (c) return c;
  }
  return campos[0];
}

const aspas = (s: string | null | undefined) => (s ? ` «${s.length > 70 ? `${s.slice(0, 67)}…` : s}»` : '');

/** A frase, sem o nome de quem fez: «desmarcou a tarefa «Abrir OS»». */
export function fraseDaAuditoria(r: RegistoAuditoria, moeda = 'EUR'): string {
  const ent = entidadeDe(r.tabela);
  const rot = aspas(r.rotulo);
  const linha = (r.depois ?? r.antes ?? {}) as Record<string, unknown>;

  if (r.erro) return `${r.operacao === 'INSERT' ? 'criou' : r.operacao === 'DELETE' ? 'apagou' : 'alterou'} ${ent} (registo incompleto: ${r.erro})`;
  if (r.tabela === 'auditoria') return r.rotulo ?? 'purgou registos antigos da auditoria';
  if (r.operacao === 'EVENTO') {
    // ação sem tabela (ex.: exportar) ou linha trazida do registo antigo: a descrição já vem escrita
    const d = String(linha.descricao ?? linha.acao ?? 'registou um evento').trim();
    return d.charAt(0).toLowerCase() + d.slice(1);
  }

  if (r.operacao === 'INSERT') {
    switch (r.tabela) {
      case 'cartao_comentarios': return `comentou${aspas(String(linha.texto ?? ''))}`;
      case 'cartao_membros': return `adicionou${aspas(String(linha.nome ?? ''))} ao cartão`;
      case 'cartao_etiqueta_rel': return 'pôs uma etiqueta no cartão';
      case 'cartao_anexos': case 'marketing_anexos': case 'planeamento_anexos': return `anexou${rot}`;
      case 'time_records': return `registou o ponto${rot}`;
      case 'school_frequencia': return `registou ${linha.presente === false ? 'a falta' : 'a presença'}${rot}`;
      case 'liberty_utilizador_empresas': return 'deu acesso a uma empresa';
    }
    return `criou ${ent}${rot}`;
  }

  if (r.operacao === 'DELETE') {
    switch (r.tabela) {
      case 'cartao_membros': return `retirou${aspas(String(linha.nome ?? ''))} do cartão`;
      case 'cartao_etiqueta_rel': return 'tirou uma etiqueta do cartão';
      case 'liberty_utilizador_empresas': return 'retirou o acesso a uma empresa';
    }
    return `apagou ${ent}${rot}`;
  }

  // UPDATE
  const campos = r.campos ?? [];
  const antes = r.antes ?? {};
  const depois = r.depois ?? {};
  const so = (c: string) => campos.length === 1 && campos[0] === c;

  if (so('ultimo_acesso')) return 'entrou na aplicação';
  for (const c of ['concluido', 'concluida']) {
    if (campos.includes(c) && typeof depois[c] === 'boolean') {
      const resto = campos.length > 1 ? ` (e mais ${campos.length - 1} alteração${campos.length > 2 ? 'ões' : ''})` : '';
      return depois[c] ? `marcou ${ent}${rot} como concluída${resto}` : `desmarcou ${ent}${rot}${resto}`;
    }
  }
  if (campos.includes('arquivado') && typeof depois.arquivado === 'boolean') {
    return `${depois.arquivado ? 'arquivou' : 'desarquivou'} ${ent}${rot}`;
  }
  if (campos.includes('deleted_at') || campos.includes('eliminado')) {
    const apagado = depois.deleted_at != null || depois.eliminado === true;
    return `${apagado ? 'eliminou' : 'recuperou'} ${ent}${rot}`;
  }
  if (campos.includes('lista_id') && r.tabela === 'quadro_cartoes') {
    const listas = r.contexto?.match(/de «[^»]*» para «[^»]*»$/)?.[0];
    return `moveu ${ent}${rot}${listas ? ` ${listas}` : ' para outra lista'}`;
  }
  if (!campos.length) return `alterou ${ent}${rot}`;

  const c = campoPrincipal(campos);
  const mais = campos.length > 1 ? ` (+${campos.length - 1} campo${campos.length > 2 ? 's' : ''})` : '';
  const oculto = antes[c] === '«oculto»' || depois[c] === '«oculto»';
  if (oculto) return `alterou ${campoComArtigo(c)} ${de(ent)}${rot}${mais}`;
  return `alterou ${campoComArtigo(c)} ${de(ent)}${rot} de ${formatarValor(c, antes[c], moeda)} para ${formatarValor(c, depois[c], moeda)}${mais}`;
}

export type TipoAcao = 'criou' | 'alterou' | 'apagou' | 'marcou' | 'entrou' | 'evento';

/** Tipo de ação para o filtro e para a etiqueta colorida. */
export function tipoDeAcao(r: RegistoAuditoria): TipoAcao {
  if (r.operacao === 'EVENTO') {
    // registo antigo: a ação vinha escrita («criou_cliente», «eliminou_utilizador»…)
    const acao = String((r.depois as Record<string, unknown> | null)?.acao ?? '');
    if (acao.startsWith('criou')) return 'criou';
    if (acao.startsWith('eliminou')) return 'apagou';
    if (/^(editou|atualizou|mudou|alterou)/.test(acao)) return 'alterou';
    return 'evento';
  }
  if (r.operacao === 'INSERT') return 'criou';
  if (r.operacao === 'DELETE') return 'apagou';
  const campos = r.campos ?? [];
  if (campos.length === 1 && campos[0] === 'ultimo_acesso') return 'entrou';
  if (campos.includes('concluido') || campos.includes('concluida')) return 'marcou';
  return 'alterou';
}
