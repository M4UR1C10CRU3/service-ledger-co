import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGrupoEmpresas } from '@/hooks/useGrupoEmpresas';

// ─────────────────────────────────────────────────────────────────────────────
// O estado da assinatura do grupo.
//
// O Clariza não cobra nem fatura — isso vive no Stripe e num emissor
// certificado pela AT. Aqui só se LÊ o estado que o n8n escreveu, e decide-se
// o que o cliente pode usar.
//
// A escrita é impossível a partir daqui de propósito: não há política que a
// permita. Se houvesse, qualquer utilizador com a chave da API se punha em
// 'ativa' sozinho.
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoAssinatura =
  | 'demonstracao' | 'ativa' | 'pagamento_falhado' | 'suspensa' | 'cancelada'
  /** Piloto ou uso próprio: acesso completo, sem cobrança, fora das contas de receita. */
  | 'interna';

export interface Plano {
  codigo: string;
  nome: string;
  publicoAlvo: string | null;
  descricao: string | null;
  /** Cobrança mensal. NULL no Enterprise, que é sob consulta. */
  precoMensal: number | null;
  /** TOTAL anual. O equivalente mensal mostra-se dividindo por 12. */
  precoAnual: number | null;
  moeda: string;
  limites: Record<string, number | null>;
  funcionalidades: string[];
  sobConsulta: boolean;
  ativo: boolean;
}

/** Preço mensal quando se paga o ano de uma vez — é o que a página mostra. */
export function mensalNoAnual(p: Plano): number | null {
  return p.precoAnual != null ? p.precoAnual / 12 : null;
}

export interface Assinatura {
  id: string;
  grupoId: string;
  planoCodigo: string;
  estado: EstadoAssinatura;
  periodoFim: string | null;
  demoFim: string | null;
  cobrador: string | null;
}

export interface FaturaAssinatura {
  id: string;
  numero: string | null;
  urlPdf: string | null;
  valor: number | null;
  moeda: string;
  estado: 'emitida' | 'paga' | 'anulada' | 'falhada';
  emitidaEm: string;
}

const noFuturo = (iso: string | null) => !!iso && new Date(iso).getTime() > Date.now();

export function useAssinatura() {
  const { grupoId } = useGrupoEmpresas();

  const { data: assinaturas = [], isLoading } = useQuery<Assinatura[]>({
    queryKey: ['assinaturas', grupoId],
    enabled: !!grupoId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('assinaturas' as any) as any)
        .select('*').eq('grupo_id', grupoId);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id, grupoId: r.grupo_id, planoCodigo: r.plano_codigo,
        estado: r.estado, periodoFim: r.periodo_fim, demoFim: r.demo_fim,
        cobrador: r.cobrador,
      }));
    },
  });

  const { data: planos = [] } = useQuery<Plano[]>({
    queryKey: ['planos'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('planos' as any) as any)
        .select('*').order('ordem');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        codigo: r.codigo, nome: r.nome, publicoAlvo: r.publico_alvo, descricao: r.descricao,
        precoMensal: r.preco_mensal != null ? Number(r.preco_mensal) : null,
        precoAnual: r.preco_anual != null ? Number(r.preco_anual) : null,
        moeda: r.moeda,
        limites: r.limites ?? {},
        funcionalidades: Array.isArray(r.funcionalidades) ? r.funcionalidades : [],
        sobConsulta: !!r.sob_consulta,
        ativo: r.ativo,
      }));
    },
  });

  const { data: faturas = [] } = useQuery<FaturaAssinatura[]>({
    queryKey: ['assinatura_faturas', grupoId],
    enabled: !!grupoId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('assinatura_faturas' as any) as any)
        .select('*').eq('grupo_id', grupoId).order('emitida_em', { ascending: false }).limit(24);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id, numero: r.numero, urlPdf: r.url_pdf,
        valor: r.valor != null ? Number(r.valor) : null,
        moeda: r.moeda, estado: r.estado, emitidaEm: r.emitida_em,
      }));
    },
  });

  /** Um grupo, uma assinatura. */
  const principal = assinaturas[0] ?? null;

  /**
   * A assinatura conta? Espelha `grupo_assinatura_valida` na base — a base é
   * que manda; isto é para o ecrã não piscar à espera da resposta.
   *
   * Pagamento falhado continua a deixar trabalhar até ao fim do período pago:
   * é para isso que serve a tolerância do cobrador. Cortar ao primeiro cartão
   * recusado perde clientes que só precisavam de atualizar o cartão.
   */
  const valida = (() => {
    if (!principal) return false;
    if (principal.estado === 'interna') return true;   // piloto: nunca expira
    if (principal.estado === 'ativa') return principal.periodoFim === null || noFuturo(principal.periodoFim);
    if (principal.estado === 'demonstracao') return noFuturo(principal.demoFim);
    if (principal.estado === 'pagamento_falhado') return noFuturo(principal.periodoFim);
    return false;
  })();

  const plano = planos.find(p => p.codigo === principal?.planoCodigo) ?? null;

  /**
   * A única pergunta que o produto faz: "este grupo tem isto?".
   *
   * Perguntar por FUNCIONALIDADE e não por plano é o que permite mexer nos
   * escalões — mudar o Dashboard Executivo de Growth para Starter, por
   * exemplo — sem tocar num único ecrã.
   */
  const tem = (funcionalidade: string): boolean =>
    valida && !!plano?.funcionalidades.includes(funcionalidade);

  /** Teto do plano. NULL = sem limite. */
  const limite = (nome: string): number | null => {
    const v = plano?.limites?.[nome];
    return typeof v === 'number' ? v : null;
  };

  const diasParaFim = (() => {
    const alvo = principal?.estado === 'demonstracao' ? principal.demoFim : principal?.periodoFim;
    if (!alvo) return null;
    return Math.ceil((new Date(alvo).getTime() - Date.now()) / 86_400_000);
  })();

  return {
    planos, faturas, principal, plano, diasParaFim, valida,
    tem, limite,
    /** Sem grupo não há assinatura possível — trata-se como sem acesso, não como livre. */
    semGrupo: !grupoId,
    isLoading,
  };
}
