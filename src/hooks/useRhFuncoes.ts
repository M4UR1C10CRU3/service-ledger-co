import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGrupoEmpresas } from '@/hooks/useGrupoEmpresas';
import { useToast } from '@/hooks/use-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Descrições de função do grupo.
//
// As secções vêm em JSON porque cada função tem um conjunto diferente delas —
// obrigar todas ao mesmo molde encheria metade dos cargos de campos vazios. O
// ecrã desenha o que existe e ignora o resto.
// ─────────────────────────────────────────────────────────────────────────────

export interface AreaResponsabilidade { area: string; itens: string[]; }
export interface PassoFluxo { titulo: string; descricao: string; }
export interface Fluxo { titulo: string; passos: PassoFluxo[]; nota?: string; }

export interface Funcao {
  id: string;
  codigo: string;
  nome: string;
  departamento: string | null;
  nivel: 'direcao' | 'tecnico' | 'assistente' | 'operacional';
  cor: string | null;
  missao: string;
  reportaA: string | null;
  localTrabalho: string | null;
  horario: string | null;
  ferramentas: string | null;
  requisitos: { obrigatorios?: string[]; valorizados?: string[] };
  responsabilidades: AreaResponsabilidade[];
  /** O que NÃO é do cargo. É isto que evita o "pensei que fosses tu". */
  naoEDoCargo: string[];
  competencias: { profissionais?: string[]; comportamentais?: string[] };
  fluxos: Fluxo[];
  indicadores: string[];
  revisao: string;
  substitui: string | null;
  ordem: number;
}

export interface Passagem {
  id: string;
  momento: string;
  entrega: string;
  recebe: string;
  levaJunto: string | null;
}

const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

function mapFuncao(r: any): Funcao {
  return {
    id: r.id, codigo: r.codigo, nome: r.nome, departamento: r.departamento,
    nivel: r.nivel, cor: r.cor, missao: r.missao, reportaA: r.reporta_a,
    localTrabalho: r.local_trabalho, horario: r.horario, ferramentas: r.ferramentas,
    requisitos: r.requisitos ?? {},
    responsabilidades: arr(r.responsabilidades),
    naoEDoCargo: arr(r.nao_e_do_cargo),
    competencias: r.competencias ?? {},
    fluxos: arr(r.fluxos),
    indicadores: arr(r.indicadores),
    revisao: r.revisao, substitui: r.substitui, ordem: r.ordem,
  };
}

export function useRhFuncoes() {
  const { grupoId } = useGrupoEmpresas();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: funcoes = [], isLoading } = useQuery<Funcao[]>({
    queryKey: ['rh_funcoes', grupoId],
    enabled: !!grupoId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('rh_funcoes' as any) as any)
        .select('*').eq('grupo_id', grupoId).eq('ativo', true).order('ordem');
      if (error) throw error;
      return (data || []).map(mapFuncao);
    },
  });

  const { data: passagens = [] } = useQuery<Passagem[]>({
    queryKey: ['rh_passagens', grupoId],
    enabled: !!grupoId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('rh_funcao_passagens' as any) as any)
        .select('*').eq('grupo_id', grupoId).order('ordem');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id, momento: r.momento, entrega: r.entrega,
        recebe: r.recebe, levaJunto: r.leva_junto,
      }));
    },
  });

  /** Quem ocupa cada função hoje — para o ecrã não ser só teoria. */
  const { data: ocupantes = {} } = useQuery<Record<string, string[]>>({
    queryKey: ['rh_funcao_ocupantes', grupoId],
    enabled: !!grupoId && funcoes.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from('employees') as any)
        .select('full_name, funcao_id')
        .in('funcao_id', funcoes.map(f => f.id))
        .eq('status', 'active');
      const mapa: Record<string, string[]> = {};
      (data || []).forEach((e: any) => {
        if (!e.funcao_id) return;
        (mapa[e.funcao_id] ||= []).push(e.full_name);
      });
      return mapa;
    },
  });

  const atribuir = useMutation({
    mutationFn: async ({ employeeId, funcaoId }: { employeeId: string; funcaoId: string | null }) => {
      // `.select()` porque uma escrita bloqueada pela segurança devolve
      // sucesso com zero linhas, não erro.
      const { data, error } = await (supabase.from('employees') as any)
        .update({ funcao_id: funcaoId }).eq('id', employeeId).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('A base de dados recusou a alteração.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh_funcao_ocupantes'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Função atribuída' });
    },
    onError: (e: any) => toast({ title: 'Não foi possível atribuir', description: e.message, variant: 'destructive' }),
  });

  return { funcoes, passagens, ocupantes, atribuir, isLoading, semGrupo: !grupoId };
}
