import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Pedidos de formação das empresas clientes, do lado do ITC.
 *
 * Estes pedidos existiam na base e no portal do cliente, mas não havia ecrã
 * nenhum onde a secretaria os visse — chegavam e ficavam lá. Sem este lado, o
 * pedido nunca passava a "confirmado" e a empresa nunca chegava a indicar os
 * formandos.
 *
 * O ciclo: a empresa pede por QUANTIDADE (ainda não sabe quem vai) → o ITC
 * responde com valor e confirma uma turma com data → a empresa preenche nome e
 * documento de cada colaborador.
 */

export const ESTADOS_PEDIDO = {
  pedido:     { rotulo: 'Novo',        cls: 'border-blue-500/40 text-blue-600 bg-blue-500/10' },
  em_analise: { rotulo: 'Em análise',  cls: 'border-amber-500/40 text-amber-600 bg-amber-500/10' },
  confirmado: { rotulo: 'Confirmado',  cls: 'border-green-500/40 text-green-600 bg-green-500/10' },
  concluido:  { rotulo: 'Concluído',   cls: 'border-slate-500/40 text-slate-500 bg-slate-500/10' },
  recusado:   { rotulo: 'Recusado',    cls: 'border-red-500/40 text-red-600 bg-red-500/10' },
} as const;

export interface PedidoITC {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nome: string;
  curso_id: string | null;
  curso_nome: string | null;
  n_formandos: number | null;
  modalidade: string | null;
  local_pretendido: string | null;
  data_pretendida: string | null;
  observacoes: string | null;
  estado: string;
  resposta: string | null;
  valor_proposto: number | null;
  turma_id: string | null;
  turma_titulo: string | null;
  /** Quantos formandos a empresa já indicou, dos que pediu. */
  indicados: number;
  created_at: string;
}

export function useSchoolPedidos() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery<PedidoITC[]>({
    queryKey: ['school-pedidos', empresa?.id ?? null],
    enabled: Boolean(empresa),
    queryFn: async () => {
      const { data, error } = await (supabase.from('school_pedidos_formacao') as any)
        .select('*, school_clientes_corp(nome), school_turmas(titulo)')
        .eq('empresa_id', empresa!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const linhas = (data ?? []) as any[];

      // Quantos já foram indicados por pedido — conta as matrículas na turma
      // que pertencem a formandos daquele cliente.
      const comTurma = linhas.filter(p => p.turma_id);
      let porPedido: Record<string, number> = {};
      if (comTurma.length) {
        const { data: mats } = await (supabase.from('school_matriculas') as any)
          .select('turma_id, school_alunos!inner(cliente_corp_id)')
          .in('turma_id', comTurma.map(p => p.turma_id));
        for (const p of comTurma) {
          porPedido[p.id] = ((mats ?? []) as any[]).filter(
            m => m.turma_id === p.turma_id &&
                 m.school_alunos?.cliente_corp_id === p.cliente_id).length;
        }
      }

      return linhas.map(p => ({
        ...p,
        cliente_nome: p.school_clientes_corp?.nome ?? '—',
        turma_titulo: p.school_turmas?.titulo ?? null,
        indicados: porPedido[p.id] ?? 0,
      }));
    },
  });

  /** Turmas abertas de um curso, para o ITC escolher onde encaixar o pedido. */
  const turmasDoCurso = async (cursoId: string | null) => {
    if (!empresa || !cursoId) return [];
    const { data } = await (supabase.from('school_turmas') as any)
      .select('id, titulo, inicio, fim, vagas, status')
      .eq('empresa_id', empresa.id).eq('curso_id', cursoId)
      .in('status', ['aberta', 'em_andamento'])
      .order('inicio', { ascending: true });
    return (data ?? []) as any[];
  };

  const responder = useMutation({
    mutationFn: async (p: {
      id: string; estado: string; resposta?: string;
      valor_proposto?: number | null; turma_id?: string | null;
    }) => {
      // Confirmar sem turma deixaria a empresa a olhar para um pedido
      // "confirmado" sem forma de indicar ninguém.
      if (p.estado === 'confirmado' && !p.turma_id) {
        throw new Error('Para confirmar é preciso indicar a turma onde a formação vai decorrer.');
      }
      const { data, error } = await (supabase.from('school_pedidos_formacao') as any)
        .update({
          estado: p.estado,
          resposta: p.resposta ?? null,
          valor_proposto: p.valor_proposto ?? null,
          turma_id: p.turma_id ?? null,
          respondido_em: new Date().toISOString(),
        })
        .eq('id', p.id)
        .select('id');
      if (error) throw error;
      // Sem `.select()` uma escrita recusada pelas regras devolveria sucesso
      // com zero linhas — e o pedido ficaria por responder sem ninguém saber.
      if (!data?.length) throw new Error('A resposta não foi gravada. Verifique as permissões.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school-pedidos'] });
      qc.invalidateQueries({ queryKey: ['portal_corporativo'] });
      toast({ title: 'Pedido atualizado' });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Não foi possível responder', description: e.message }),
  });

  return { pedidos, isLoading, responder, turmasDoCurso };
}
