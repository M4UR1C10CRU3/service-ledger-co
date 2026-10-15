import { supabase } from '@/integrations/supabase/client';

/**
 * Cria um projeto do Labs já com os seus jobs (as fases), num só gesto.
 *
 * Serve os modelos de cada núcleo — o Plano 48h da Estratégia, o site, a loja
 * ou a automação do Produto Digital, e os que vierem. Usa a mesma numeração da
 * app (ag_proximo_numero), por isso os números não colidem com os projetos e
 * jobs criados à mão. Os jobs entram na etapa «Entrada de pedido» (ou Briefing).
 */
export interface FaseModelo {
  titulo: string;
  /** Horas a partir de agora para o prazo deste job (opcional). */
  horas?: number;
  descricao?: string;
}

export async function criarProjetoComFases(opts: {
  empresaId: string;
  nucleoId: string | null;
  nome: string;
  clienteId?: string | null;
  clienteNome?: string | null;
  descricao?: string | null;
  prazo?: Date | null;
  fases: FaseModelo[];
  /** Oportunidade do Workflow Comercial que deu origem ao projeto (adjudicação). */
  oportunidadeId?: string | null;
  /** Valor adjudicado (orçamento do projeto). */
  budget?: number | null;
}): Promise<string> {
  const { empresaId: eid } = opts;
  const agora = new Date();
  const ano = agora.getFullYear();
  const dia = (d: Date) => d.toISOString().slice(0, 10);

  const { data: num, error: eNum } = await (supabase.rpc as any)('ag_proximo_numero', {
    p_empresa_id: eid, p_escopo: 'projeto', p_ano: ano,
  });
  if (eNum) throw eNum;

  const { data: proj, error: eProj } = await (supabase.from('ag_projetos' as any) as any).insert({
    empresa_id: eid, numero: num, ano,
    nome: opts.nome,
    cliente_id: opts.clienteId ?? null, cliente_nome: opts.clienteNome ?? null,
    estado: 'ativo', nucleo_id: opts.nucleoId,
    descricao: opts.descricao ?? null,
    prazo_estimado: opts.prazo ? dia(opts.prazo) : null,
    prazo_desejado: opts.prazo ? dia(opts.prazo) : null,
    ...(opts.oportunidadeId ? { oportunidade_id: opts.oportunidadeId } : {}),
    ...(opts.budget != null ? { budget: opts.budget } : {}),
  }).select('id').single();
  if (eProj) throw eProj;

  // Os jobs novos entram em «Entrada de pedido» (por triar); empresas sem essa etapa usam o Briefing.
  const { data: etapas } = await (supabase.from('ag_job_etapas' as any) as any)
    .select('id, estado_codigo').eq('empresa_id', eid).in('estado_codigo', ['entrada', 'briefing']).eq('ativo', true);
  const etapa = (etapas || []).find((e: any) => e.estado_codigo === 'entrada')
    ?? (etapas || []).find((e: any) => e.estado_codigo === 'briefing') ?? null;

  for (const f of opts.fases) {
    const { data: seq, error: eSeq } = await (supabase.rpc as any)('ag_proximo_numero', {
      p_empresa_id: eid, p_escopo: `job:${proj.id}`, p_ano: ano,
    });
    if (eSeq) throw eSeq;
    const { error: eJob } = await (supabase.from('ag_jobs' as any) as any).insert({
      empresa_id: eid, projeto_id: proj.id, sequencial: seq,
      titulo: f.titulo, descricao: f.descricao ?? null,
      etapa_id: etapa?.id ?? null, nucleo_id: opts.nucleoId,
      prazo: f.horas != null ? dia(new Date(agora.getTime() + f.horas * 36e5)) : null,
    });
    if (eJob) throw eJob;
  }
  return proj.id as string;
}

/** Projeto da produção ligado a uma oportunidade do Workflow Comercial (ou null). */
export async function projetoDaOportunidade(oportunidadeId: string): Promise<{ id: string; numero: number; nome: string } | null> {
  const { data } = await (supabase.from('ag_projetos' as any) as any)
    .select('id, numero, nome').eq('oportunidade_id', oportunidadeId).maybeSingle();
  return data ?? null;
}

/** Modelos de projeto do Produto Digital. A última fase é sempre a aceitação do cliente. */
export const MODELOS_PRODUTO: { codigo: string; nome: string; resumo: string; fases: FaseModelo[] }[] = [
  {
    codigo: 'site', nome: 'Website', resumo: 'Site institucional ou de serviços',
    fases: [
      { titulo: 'Briefing e conteúdos' },
      { titulo: 'Arquitetura e wireframes' },
      { titulo: 'Design (UI)' },
      { titulo: 'Desenvolvimento' },
      { titulo: 'SEO, desempenho e RGPD (cookies, privacidade)' },
      { titulo: 'Revisão com o cliente' },
      { titulo: 'Aceitação do cliente e publicação' },
    ],
  },
  {
    codigo: 'loja', nome: 'Loja online', resumo: 'E-commerce com pagamentos e envios',
    fases: [
      { titulo: 'Briefing e catálogo' },
      { titulo: 'Plataforma e meios de pagamento' },
      { titulo: 'Design da loja' },
      { titulo: 'Produtos e importação' },
      { titulo: 'Envios, impostos e faturação' },
      { titulo: 'Testes de compra de ponta a ponta' },
      { titulo: 'Aceitação do cliente e lançamento' },
    ],
  },
  {
    codigo: 'app', nome: 'App ou plataforma', resumo: 'Software à medida, por sprints',
    fases: [
      { titulo: 'Descoberta e requisitos' },
      { titulo: 'Protótipo navegável' },
      { titulo: 'Arquitetura e modelo de dados' },
      { titulo: 'Sprint 1' },
      { titulo: 'Sprint 2' },
      { titulo: 'Testes e segurança' },
      { titulo: 'Aceitação do cliente e entrada em produção' },
    ],
  },
  {
    codigo: 'automacao', nome: 'Automação e IA', resumo: 'Fluxos n8n, integrações e agentes',
    fases: [
      { titulo: 'Mapear o processo atual' },
      { titulo: 'Desenhar o fluxo' },
      { titulo: 'Ligações e credenciais (no cofre, nunca no fluxo)' },
      { titulo: 'Construir e testar' },
      { titulo: 'Formação da equipa do cliente' },
      { titulo: 'Aceitação do cliente e monitorização' },
    ],
  },
];

/** Modelos de projeto do Estúdio Criativo. */
export const MODELOS_CRIATIVO: { codigo: string; nome: string; resumo: string; fases: FaseModelo[] }[] = [
  {
    codigo: 'video', nome: 'Vídeo', resumo: 'Institucional, produto, reels',
    fases: [
      { titulo: 'Briefing e guião' },
      { titulo: 'Pré-produção: local, equipa e reservas' },
      { titulo: 'Gravação' },
      { titulo: 'Edição e cor' },
      { titulo: 'Som, legendas e versões por rede' },
      { titulo: 'Aceitação do cliente e entrega' },
    ],
  },
  {
    codigo: 'foto', nome: 'Sessão fotográfica', resumo: 'Produto, equipa, espaço, evento',
    fases: [
      { titulo: 'Briefing e lista de planos' },
      { titulo: 'Sessão' },
      { titulo: 'Seleção e edição' },
      { titulo: 'Aceitação do cliente e entrega' },
    ],
  },
  {
    codigo: 'identidade', nome: 'Identidade visual', resumo: 'Logótipo, manual de marca',
    fases: [
      { titulo: 'Briefing e referências' },
      { titulo: 'Propostas de logótipo' },
      { titulo: 'Afinação da proposta escolhida' },
      { titulo: 'Manual de marca e variações' },
      { titulo: 'Aceitação do cliente e entrega dos ficheiros' },
    ],
  },
  {
    codigo: 'grafica', nome: 'Produção gráfica', resumo: 'Plotagem, impressos, personalizados',
    fases: [
      { titulo: 'Briefing e medidas' },
      { titulo: 'Design e prova' },
      { titulo: 'Aprovação da prova pelo cliente' },
      { titulo: 'Produção' },
      { titulo: 'Entrega ou instalação' },
    ],
  },
];

/**
 * Modelos de projeto do Growth. A gestão de redes é mensal: o projeto leva as
 * fases de um mês e a avença (Comercial → Avenças) fatura o fee recorrente;
 * no mês seguinte cria-se outro projeto com o mesmo modelo.
 */
export const MODELOS_GROWTH: { codigo: string; nome: string; resumo: string; fases: FaseModelo[] }[] = [
  {
    codigo: 'redes', nome: 'Gestão de redes sociais', resumo: 'Um mês de conteúdos e comunidade',
    fases: [
      { titulo: 'Planeamento do calendário editorial do mês' },
      { titulo: 'Criação de conteúdos (posts, reels, stories)' },
      { titulo: 'Aprovação do cliente' },
      { titulo: 'Agendamento e publicação' },
      { titulo: 'Gestão da comunidade (comentários e mensagens)' },
      { titulo: 'Relatório do mês e próximos passos' },
    ],
  },
  {
    codigo: 'campanha', nome: 'Campanha promocional e-commerce', resumo: 'Promoção na loja com anúncios',
    fases: [
      { titulo: 'Briefing da campanha (produtos, descontos, datas, objetivo)' },
      { titulo: 'Criativos: banners, posts, email e anúncios' },
      { titulo: 'Preparar a loja: preços, cupões e página da campanha' },
      { titulo: 'Configurar anúncios (Meta/Google), públicos e orçamento' },
      { titulo: 'Aprovação do cliente' },
      { titulo: 'Lançamento da campanha' },
      { titulo: 'Acompanhamento e otimização diária' },
      { titulo: 'Relatório final de resultados (vendas, ROAS, aprendizagens)' },
    ],
  },
];
