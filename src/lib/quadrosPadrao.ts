/**
 * Quadros-padrão do grupo — Fase 2 (01/10/2026).
 *
 * As colunas não foram inventadas: são as que a Tudo Casa Warm e a Obrajusta II
 * já usam todos os dias nos quadros Comercial, Compras e Produção (lidas da
 * base a 01/10/2026), juntas numa versão só. O objetivo é que as cinco
 * empresas trabalhem com o mesmo processo e os mesmos nomes.
 *
 * Só se CRIA o que falta. Um quadro que a empresa já tenha com o mesmo nome
 * não é tocado — nem colunas, nem cartões. Tudo são quadros livres (sem regras
 * a travar o arrasto), que é como a equipa trabalha.
 */
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as any;

export interface QuadroPadrao {
  nome: string;
  cor: string;
  descricao: string;
  colunas: Array<{ nome: string; resultado?: 'ganho' | 'perdido' }>;
}

export const QUADROS_PADRAO: QuadroPadrao[] = [
  {
    nome: 'Comercial — Pipeline', cor: '#1e939c',
    descricao: 'Do pedido do cliente à adjudicação. Um cartão adjudicado passa para a Produção com todo o histórico.',
    colunas: [
      { nome: 'PO Recebido' }, { nome: 'Em Análise' }, { nome: 'Proposta em Elaboração' },
      { nome: 'Proposta Enviada' }, { nome: 'Em Negociação' }, { nome: 'Follow-up, em espera' },
      { nome: 'Adjudicado', resultado: 'ganho' }, { nome: 'Perdido', resultado: 'perdido' },
    ],
  },
  {
    nome: 'Compras — Pipeline', cor: '#5b459b',
    descricao: 'Da necessidade à fatura do fornecedor paga.',
    colunas: [
      { nome: 'Necessidade Identificada' }, { nome: 'Em Cotação' }, { nome: 'Aguarda Aprovação' },
      { nome: 'Encomendado / Pago' }, { nome: 'Em Trânsito' }, { nome: 'Recebido / Conferido' },
      { nome: 'Finalizado' }, { nome: 'Aguardar pagamento' }, { nome: 'Reclamações' }, { nome: 'Notas de Crédito' },
    ],
  },
  {
    nome: 'Produção — Ordens de Serviço', cor: '#f3b247',
    descricao: 'Trabalhos adjudicados, do planeamento à entrega e faturação.',
    colunas: [
      { nome: 'Planeado' }, { nome: 'Em curso' }, { nome: 'Receção Final' },
      { nome: 'Concluído' }, { nome: 'Entregue / Faturado' }, { nome: 'Em Débito' },
    ],
  },
  {
    nome: 'Financeiro — Faturação & Recebimentos', cor: '#2b8fc7',
    descricao: 'O que falta faturar, o que está faturado e o que está em atraso.',
    colunas: [{ nome: 'A Faturar' }, { nome: 'Faturado' }, { nome: 'Recebido' }, { nome: 'Em Atraso' }],
  },
  {
    nome: 'Administrativo — Planeamento', cor: '#8e8e9a',
    descricao: 'Ideias e projetos internos da empresa.',
    colunas: [
      { nome: 'Ideia' }, { nome: 'Em Levantamento' }, { nome: 'Em Pesquisa' },
      { nome: 'Em Consulta Externa' }, { nome: 'Em Validação' }, { nome: 'Aprovado' }, { nome: 'Concluído' },
    ],
  },
];

/** Compara nomes sem ligar a travessões, maiúsculas ou espaços ("Comercial - Pipeline" = "Comercial — Pipeline"). */
export const chaveNome = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Quadros-padrão que esta empresa ainda não tem (arquivados contam como existentes: não se recriam). */
export async function quadrosPadraoEmFalta(empresaId: string): Promise<QuadroPadrao[]> {
  const { data } = await sb.from('quadros').select('nome').eq('empresa_id', empresaId);
  const existentes = new Set((data ?? []).map((q: any) => chaveNome(q.nome)));
  return QUADROS_PADRAO.filter(q => !existentes.has(chaveNome(q.nome)));
}

/** Cria os quadros-padrão em falta. Devolve os nomes criados. Nunca altera quadros existentes. */
export async function criarQuadrosPadrao(empresaId: string, criadoPor?: string | null): Promise<{ criados: string[]; erro?: string }> {
  const emFalta = await quadrosPadraoEmFalta(empresaId);
  const criados: string[] = [];
  for (const q of emFalta) {
    const { data: novo, error } = await sb.from('quadros')
      .insert({ empresa_id: empresaId, nome: q.nome, cor: q.cor, descricao: q.descricao, criado_por: criadoPor || null })
      .select('id').single();
    if (error || !novo) return { criados, erro: error?.message || `Sem permissão para criar «${q.nome}».` };
    const { error: e2 } = await sb.from('quadro_listas').insert(q.colunas.map((c, i) => ({
      quadro_id: novo.id, empresa_id: empresaId, nome: c.nome, posicao: i, resultado: c.resultado ?? null,
    })));
    if (e2) return { criados, erro: `O quadro «${q.nome}» foi criado, mas as colunas não: ${e2.message}` };
    // Etiquetas (as barras de cor dos cartões): as mesmas dos quadros com este
    // nome nas outras empresas do grupo, sem repetidas e sem as que não têm nome.
    const { data: irmaos } = await sb.from('quadros').select('id').neq('empresa_id', empresaId).eq('arquivado', false).ilike('nome', q.nome);
    const ids = (irmaos ?? []).map((x: any) => x.id);
    if (ids.length) {
      const { data: ets } = await sb.from('cartao_etiquetas').select('nome, cor').in('quadro_id', ids);
      const porNome = new Map<string, string>();
      for (const e of ets ?? []) if (e.nome?.trim() && !porNome.has(e.nome)) porNome.set(e.nome, e.cor);
      if (porNome.size) await sb.from('cartao_etiquetas').insert([...porNome].map(([nome, cor]) => ({ quadro_id: novo.id, nome, cor })));
    }
    criados.push(q.nome);
  }
  return { criados };
}
