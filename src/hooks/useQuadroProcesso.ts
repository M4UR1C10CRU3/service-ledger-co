import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { inserirNotificacaoInterna } from '@/hooks/useNotificacoesInternas';

// ─────────────────────────────────────────────────────────────────────────────
// O motor de processos dos Quadros.
//
// Um quadro é 'livre' (o de sempre — sem regras) ou tipado. Num quadro tipado,
// as colunas herdam o processo que estava nos Workflows: cada uma declara o que
// exige para lá entrar, e a entrada pode disparar automações.
//
// A estrutura é PROGRESSIVA por desenho: o cartão cria-se com um título, e só
// se pede o que falta quando alguém tenta avançá-lo. Foi a exigência à cabeça
// que fez a equipa abandonar os Workflows antigos.
// ─────────────────────────────────────────────────────────────────────────────

export type TipoQuadro = 'livre' | 'compras' | 'comercial' | 'producao' | 'financeiro';

export interface QuadroModelo {
  codigo: string;
  nome: string;
  tipo: TipoQuadro;
  descricao: string | null;
  docTipo: string | null;
  ordem: number;
  listas: Array<{
    estadoCodigo: string;
    nome: string;
    cor: string | null;
    posicao: number;
    camposObrigatorios: string[];
    final: boolean;
    bloqueada: boolean;
  }>;
}

/** Rótulos legíveis dos campos, para as mensagens do que falta. */
export const CAMPOS_LABEL: Record<string, string> = {
  cliente_id:     'Cliente',
  supplier_id:    'Fornecedor',
  responsavel_id: 'Responsável',
  contacto_email: 'Email de contacto',
  valor:          'Valor',
  data_limite:    'Data-limite',
  descricao:      'Descrição',
  // Etapas de Job no Agency
  prazo:           'Prazo',
  horas_previstas: 'Horas previstas',
};

export type Gatilho = 'entra_lista' | 'sai_lista' | 'sem_movimento' | 'data_limite' | 'campo_alterado';
export type Accao = 'email' | 'notificacao_interna' | 'criar_documento' | 'webhook';

export const GATILHOS: Record<Gatilho, string> = {
  entra_lista:    'Quando o cartão entra numa coluna',
  sai_lista:      'Quando o cartão sai de uma coluna',
  sem_movimento:  'Quando fica parado N dias',
  data_limite:    'Quando chega a data-limite',
  campo_alterado: 'Quando um campo muda',
};

export const ACCOES: Record<Accao, string> = {
  email:               'Enviar email',
  notificacao_interna: 'Notificar internamente',
  criar_documento:     'Criar documento ligado',
  webhook:             'Chamar automação externa (n8n)',
};

/** De onde vem o evento. O motor é o mesmo para os dois. */
export type ContextoAutomacao = 'quadro' | 'agency_job';

export interface Automacao {
  id: string;
  empresaId: string;
  contexto: ContextoAutomacao;
  quadroId: string | null;
  modeloCodigo: string | null;
  nome: string;
  ativo: boolean;
  gatilho: Gatilho;
  gatilhoEstadoCodigo: string | null;
  gatilhoDias: number | null;
  gatilhoCampo: string | null;
  accao: Accao;
  accaoConfig: Record<string, any>;
}

// ── Modelos ──────────────────────────────────────────────────────────────────

export function useQuadroModelos() {
  const { data: modelos = [], isLoading } = useQuery<QuadroModelo[]>({
    queryKey: ['quadro_modelos'],
    queryFn: async () => {
      const [{ data: ms, error: e1 }, { data: ls, error: e2 }] = await Promise.all([
        (supabase.from('quadro_modelos' as any) as any).select('*').order('ordem'),
        (supabase.from('quadro_modelo_listas' as any) as any).select('*').order('posicao'),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return (ms || []).map((m: any) => ({
        codigo: m.codigo, nome: m.nome, tipo: m.tipo,
        descricao: m.descricao, docTipo: m.doc_tipo, ordem: m.ordem,
        listas: (ls || []).filter((l: any) => l.modelo_codigo === m.codigo).map((l: any) => ({
          estadoCodigo: l.estado_codigo, nome: l.nome, cor: l.cor, posicao: l.posicao,
          camposObrigatorios: Array.isArray(l.campos_obrigatorios) ? l.campos_obrigatorios : [],
          final: l.final, bloqueada: l.bloqueada,
        })),
      }));
    },
  });
  return { modelos, isLoading };
}

/** Cria um quadro já com o processo montado. */
export function useCriarQuadroDeModelo() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      { modelo, nome, cor, descricao }:
      { modelo: string; nome: string; cor?: string; descricao?: string },
    ) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { data, error } = await (supabase.rpc as any)('quadro_criar_de_modelo', {
        p_empresa_id: empresa.id, p_modelo: modelo, p_nome: nome.trim(),
      });
      if (error) throw error;
      const id = data as string;

      // A função monta o processo; a aparência fica a cargo de quem criou.
      if (cor || descricao) {
        await (supabase.from('quadros') as any)
          .update({ ...(cor ? { cor } : {}), ...(descricao ? { descricao } : {}) })
          .eq('id', id);
      }
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quadros'] });
      toast({ title: 'Quadro criado com o processo montado' });
    },
    onError: (e: any) => toast({ title: 'Erro ao criar quadro', description: e.message, variant: 'destructive' }),
  });
}

// ── Validação do movimento ───────────────────────────────────────────────────

/**
 * Devolve os campos que faltam para o cartão poder entrar naquela coluna.
 * Vazio = pode avançar. A UI usa isto para EXPLICAR o que falta, em vez de
 * recusar o arrasto sem dizer porquê.
 */
export async function camposEmFalta(cartaoId: string, listaDestino: string): Promise<string[]> {
  const { data, error } = await (supabase.rpc as any)('quadro_campos_em_falta', {
    p_cartao_id: cartaoId, p_lista_destino: listaDestino,
  });
  if (error) { console.error('Validação de movimento falhou', error); return []; }
  return (data as string[]) ?? [];
}

/**
 * Versão local do mesmo teste, para a UI marcar os campos em falta sem ida à
 * base. A decisão de deixar ou não avançar continua a ser da base de dados —
 * isto é só para mostrar.
 */
export function camposVaziosNoCartao(cartao: any, campos: string[]): string[] {
  const vazio = (v: any) => v === null || v === undefined || v === '';
  return campos.filter(c => vazio(cartao?.[c]));
}

export function descreveFalta(campos: string[]): string {
  const nomes = campos.map(c => CAMPOS_LABEL[c] ?? c);
  if (nomes.length === 1) return `Falta preencher: ${nomes[0]}.`;
  return `Faltam preencher: ${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}.`;
}

// ── Automações ───────────────────────────────────────────────────────────────

const T_AUT = 'quadro_automacoes' as any;
const T_LOG = 'quadro_automacao_execucoes' as any;

function mapAutomacao(r: any): Automacao {
  return {
    id: r.id, empresaId: r.empresa_id, contexto: (r.contexto ?? 'quadro') as ContextoAutomacao,
    quadroId: r.quadro_id,
    modeloCodigo: r.modelo_codigo, nome: r.nome, ativo: r.ativo,
    gatilho: r.gatilho, gatilhoEstadoCodigo: r.gatilho_estado_codigo,
    gatilhoDias: r.gatilho_dias, gatilhoCampo: r.gatilho_campo,
    accao: r.accao, accaoConfig: r.accao_config ?? {},
  };
}

export function useAutomacoes(quadroId?: string) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: automacoes = [], isLoading } = useQuery<Automacao[]>({
    queryKey: ['quadro_automacoes', empresa?.id, quadroId ?? 'todas'],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(T_AUT) as any)
        .select('*').eq('empresa_id', empresa!.id).order('criado_em');
      if (error) throw error;
      return (data || []).map(mapAutomacao);
    },
  });

  const inval = () => qc.invalidateQueries({ queryKey: ['quadro_automacoes'] });

  const guardar = useMutation({
    mutationFn: async (a: Partial<Automacao> & { nome: string; gatilho: Gatilho; accao: Accao }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const row = {
        empresa_id: empresa.id,
        contexto: a.contexto ?? 'quadro',
        quadro_id: a.quadroId ?? null,
        modelo_codigo: a.modeloCodigo ?? null,
        nome: a.nome.trim(),
        ativo: a.ativo ?? true,
        gatilho: a.gatilho,
        gatilho_estado_codigo: a.gatilhoEstadoCodigo ?? null,
        gatilho_dias: a.gatilhoDias ?? null,
        gatilho_campo: a.gatilhoCampo ?? null,
        accao: a.accao,
        accao_config: a.accaoConfig ?? {},
      };
      if (a.id) {
        const { data, error } = await (supabase.from(T_AUT) as any)
          .update(row).eq('id', a.id).eq('empresa_id', empresa.id).select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('A base de dados recusou a alteração.');
      } else {
        const { error } = await (supabase.from(T_AUT) as any).insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => { inval(); toast({ title: 'Automação guardada' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const alternar = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(T_AUT) as any)
        .update({ ativo }).eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: inval,
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(T_AUT) as any)
        .delete().eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => { inval(); toast({ title: 'Automação eliminada' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { automacoes, isLoading, guardar, alternar, eliminar };
}

/** Histórico de execuções — sem isto, uma automação que falha falha em silêncio. */
export function useExecucoesAutomacao(limite = 50) {
  const { empresa } = useEmpresa();
  const { data: execucoes = [] } = useQuery({
    queryKey: ['quadro_automacao_execucoes', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(T_LOG) as any)
        .select('*').eq('empresa_id', empresa!.id)
        .order('executado_em', { ascending: false }).limit(limite);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id, automacaoId: r.automacao_id, cartaoId: r.cartao_id,
        estado: r.estado as 'sucesso' | 'falha' | 'ignorada',
        detalhe: r.detalhe, executadoEm: r.executado_em,
      }));
    },
  });
  return { execucoes };
}

// ── Execução ─────────────────────────────────────────────────────────────────

/**
 * Corre as automações que casam com a entrada do cartão numa coluna.
 *
 * As ações simples correm aqui; o que for externo delega no n8n por webhook,
 * que já corre no servidor. Cada execução fica registada — incluindo as que
 * falham, para que ninguém fique a achar que o email foi enviado.
 */
/** Regras ativas da empresa que reagem a esta mudança de estado. */
async function regrasAplicaveis(
  empresaId: string,
  estadoOrigem: string | null,
  estadoDestino: string | null,
  pertence: (r: Automacao) => boolean,
): Promise<Automacao[]> {
  const { data: regras } = await (supabase.from(T_AUT) as any)
    .select('*').eq('empresa_id', empresaId).eq('ativo', true);
  if (!regras?.length) return [];

  return (regras as any[]).map(mapAutomacao).filter(r => {
    if (!pertence(r)) return false;
    if (r.gatilho === 'entra_lista') return r.gatilhoEstadoCodigo === estadoDestino;
    if (r.gatilho === 'sai_lista')   return r.gatilhoEstadoCodigo === estadoOrigem;
    return false;   // gatilhos temporais são avaliados por tarefa agendada
  });
}

/**
 * Corre as ações. É partilhado pelos Quadros e pelos Jobs do Agency — o alvo é
 * um cartão ou um job, e a única coisa que muda é a coluna onde o registo da
 * execução o vai referenciar.
 */
async function correrRegras(
  empresaId: string,
  regras: Automacao[],
  alvo: any,
  estadoDestino: string | null,
  referencia: { cartao_id?: string; job_id?: string },
): Promise<void> {
  for (const regra of regras) {
    let estado: 'sucesso' | 'falha' | 'ignorada' = 'sucesso';
    let detalhe = '';
    try {
      switch (regra.accao) {
        case 'notificacao_interna':
          await inserirNotificacaoInterna({
            empresa_id: empresaId,
            tipo: 'automacao_quadro',
            titulo: regra.accaoConfig.titulo || regra.nome,
            mensagem: (regra.accaoConfig.mensagem || '').replace('{titulo}', alvo.titulo),
            perfil_destino: regra.accaoConfig.perfil_destino || 'todos',
            referencia_id: referencia.cartao_id ?? referencia.job_id ?? null,
            referencia_tipo: referencia.job_id ? 'ag_job' : 'quadro_cartao',
          });
          detalhe = 'Notificação interna criada.';
          break;

        case 'email': {
          const para = resolveDestinatario(regra.accaoConfig, alvo);
          if (!para) { estado = 'ignorada'; detalhe = 'Sem email de destino.'; break; }
          const { error } = await supabase.functions.invoke('send-email', {
            body: {
              to: para,
              subject: (regra.accaoConfig.assunto || regra.nome).replace('{titulo}', alvo.titulo),
              html: (regra.accaoConfig.corpo || '').replace('{titulo}', alvo.titulo),
              from: regra.accaoConfig.remetente,
            },
          });
          if (error) throw error;
          detalhe = `Email enviado para ${para}.`;
          break;
        }

        case 'webhook': {
          const url = regra.accaoConfig.url;
          if (!url) { estado = 'ignorada'; detalhe = 'Automação sem endereço configurado.'; break; }
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              evento: regra.gatilho,
              contexto: regra.contexto,
              estado: estadoDestino,
              alvo,
            }),
          });
          if (!r.ok) throw new Error(`Resposta ${r.status} do serviço externo.`);
          detalhe = 'Automação externa chamada.';
          break;
        }

        case 'criar_documento':
          // Reservado: cria o documento ligado ao cartão. Fica por implementar
          // até estar decidido que documento cada tipo de quadro gera.
          estado = 'ignorada';
          detalhe = 'Criação de documento ainda não implementada.';
          break;
      }
    } catch (e: any) {
      estado = 'falha';
      detalhe = e?.message ?? 'Erro desconhecido.';
    }

    await (supabase.from(T_LOG) as any).insert({
      empresa_id: empresaId, automacao_id: regra.id, ...referencia,
      estado, detalhe,
    });
  }
}

function resolveDestinatario(cfg: Record<string, any>, alvo: any): string | null {
  switch (cfg.destinatario) {
    case 'fixo':       return cfg.para || null;
    case 'cliente':
    case 'fornecedor':
    case 'contacto':   return alvo.contacto_email || null;
    default:           return alvo.contacto_email || cfg.para || null;
  }
}

/** Entrada dos Quadros: o cartão mudou de coluna. */
export async function dispararAutomacoes(params: {
  empresaId: string;
  cartaoId: string;
  quadroId: string;
  modeloCodigo: string | null;
  estadoDestino: string | null;
  estadoOrigem: string | null;
}): Promise<void> {
  const { empresaId, cartaoId, quadroId, modeloCodigo, estadoDestino, estadoOrigem } = params;
  if (!estadoDestino && !estadoOrigem) return;   // quadro livre: nada a fazer

  const regras = await regrasAplicaveis(empresaId, estadoOrigem, estadoDestino, r =>
    r.contexto === 'quadro'
    && (r.quadroId === quadroId || (!!r.modeloCodigo && r.modeloCodigo === modeloCodigo)));
  if (!regras.length) return;

  const { data: cartao } = await (supabase.from('quadro_cartoes') as any)
    .select('*').eq('id', cartaoId).maybeSingle();
  if (!cartao) return;

  await correrRegras(empresaId, regras, cartao, estadoDestino, { cartao_id: cartaoId });
}

/** Entrada do Agency: o job mudou de etapa. Mesmo motor, mesmo registo. */
export async function dispararAutomacoesJob(params: {
  empresaId: string;
  jobId: string;
  estadoDestino: string | null;
  estadoOrigem: string | null;
}): Promise<void> {
  const { empresaId, jobId, estadoDestino, estadoOrigem } = params;
  if (!estadoDestino && !estadoOrigem) return;

  // As automações de Job são da empresa inteira — não há "quadro" a que pertençam.
  const regras = await regrasAplicaveis(empresaId, estadoOrigem, estadoDestino,
    r => r.contexto === 'agency_job');
  if (!regras.length) return;

  const { data: job } = await (supabase.from('ag_jobs' as any) as any)
    .select('*').eq('id', jobId).maybeSingle();
  if (!job) return;

  await correrRegras(empresaId, regras, job, estadoDestino, { job_id: jobId });
}

/** Igual à dos Quadros, para as etapas de Job. */
export async function camposEmFaltaJob(jobId: string, etapaDestino: string): Promise<string[]> {
  const { data, error } = await (supabase.rpc as any)('ag_job_campos_em_falta', {
    p_job_id: jobId, p_etapa_destino: etapaDestino,
  });
  if (error) { console.error('Validação de movimento do job falhou', error); return []; }
  return (data as string[]) ?? [];
}
