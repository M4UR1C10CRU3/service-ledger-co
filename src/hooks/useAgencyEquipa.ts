import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

export type AreaFuncao = 'relacao' | 'criacao' | 'audiovisual' | 'digital' | 'suporte';
export type Senioridade = 'junior' | 'pleno' | 'senior';
export type OrigemIndicador = 'automatico' | 'campo_novo' | 'manual';

export const AREAS: Record<AreaFuncao, { label: string; cor: string }> = {
  relacao:    { label: 'Relação e direção', cor: '#C2410C' },
  criacao:    { label: 'Criação',           cor: '#7C3AED' },
  audiovisual:{ label: 'Audiovisual',       cor: '#0F766E' },
  digital:    { label: 'Digital',           cor: '#1D4ED8' },
  suporte:    { label: 'Suporte',           cor: '#6B7280' },
};

export const SENIORIDADES: Record<Senioridade, string> = {
  junior: 'Júnior', pleno: 'Pleno', senior: 'Sénior',
};

export const ORIGENS: Record<OrigemIndicador, { label: string; nota: string }> = {
  automatico: { label: 'Automático', nota: 'Sai do sistema sem ninguém fazer nada' },
  campo_novo: { label: 'Campo novo', nota: 'Precisa de ser preenchido no trabalho' },
  manual:     { label: 'Manual',     nota: 'Depende de julgamento, avalia-se na conversa' },
};

export interface Funcao {
  id: string;
  empresaId: string | null;
  codigo: string;
  nome: string;
  aliases: string | null;
  area: AreaFuncao;
  missao: string;
  responsabilidades: string[];
  entregaveis: string[];
  indicadores: Array<{ i: string; o: OrigemIndicador }>;
  sinaisAlerta: string | null;
  decideSozinho: string | null;
  escala: string | null;
  ordem: number;
  /** true quando é o modelo global, não uma versão da empresa */
  global: boolean;
}

export interface MembroEquipa {
  utilizadorId: string;
  pessoa: string;
  funcaoId: string;
  funcaoCodigo: string;
  funcao: string;
  area: AreaFuncao;
  senioridade: Senioridade;
  principal: boolean;
  horas90d: number;
  custo90d: number;
}

const T_FUNC = 'ag_funcoes' as any;
const T_ATRIB = 'ag_colaborador_funcoes' as any;
const V_EQUIPA = 'ag_v_equipa' as any;

function mapFuncao(r: any): Funcao {
  return {
    id: r.id, empresaId: r.empresa_id, codigo: r.codigo, nome: r.nome,
    aliases: r.aliases, area: r.area, missao: r.missao,
    responsabilidades: Array.isArray(r.responsabilidades) ? r.responsabilidades : [],
    entregaveis: Array.isArray(r.entregaveis) ? r.entregaveis : [],
    indicadores: Array.isArray(r.indicadores) ? r.indicadores : [],
    sinaisAlerta: r.sinais_alerta, decideSozinho: r.decide_sozinho, escala: r.escala,
    ordem: r.ordem, global: r.empresa_id === null,
  };
}

/**
 * O modelo de equipa: as nove responsabilidades que têm de ter dono numa
 * agência, quem as desempenha, e as horas reais de cada pessoa.
 */
export function useAgencyEquipa() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  /** Funções visíveis: modelos globais + versões próprias da empresa. */
  const { data: funcoes = [], isLoading } = useQuery<Funcao[]>({
    queryKey: ['ag_funcoes', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(T_FUNC) as any)
        .select('*').eq('ativo', true).order('ordem');
      if (error) throw error;
      const todas = (data || []).map(mapFuncao) as Funcao[];
      // Se a empresa tiver a sua versão de um código, essa substitui o modelo global.
      const proprios = new Set(todas.filter(f => !f.global).map(f => f.codigo));
      return todas.filter(f => !f.global || !proprios.has(f.codigo));
    },
  });

  const { data: equipa = [] } = useQuery<MembroEquipa[]>({
    queryKey: ['ag_equipa', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(V_EQUIPA) as any)
        .select('*').eq('empresa_id', empresa!.id);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        utilizadorId: r.utilizador_id, pessoa: r.pessoa ?? '—',
        funcaoId: r.funcao_id, funcaoCodigo: r.funcao_codigo, funcao: r.funcao,
        area: r.area, senioridade: r.senioridade, principal: r.principal,
        horas90d: Number(r.horas_90d ?? 0), custo90d: Number(r.custo_90d ?? 0),
      }));
    },
  });

  const inval = () => {
    qc.invalidateQueries({ queryKey: ['ag_equipa'] });
    qc.invalidateQueries({ queryKey: ['ag_funcoes'] });
  };

  const atribuir = useMutation({
    mutationFn: async (a: {
      utilizadorId: string; funcaoId: string;
      senioridade?: Senioridade; principal?: boolean;
    }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(T_ATRIB) as any).insert({
        empresa_id: empresa.id,
        utilizador_id: a.utilizadorId,
        funcao_id: a.funcaoId,
        senioridade: a.senioridade ?? 'pleno',
        principal: a.principal ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => { inval(); toast({ title: 'Função atribuída' }); },
    onError: (e: any) => toast({
      title: 'Não foi possível atribuir',
      description: e.message?.includes('duplicate') || e.code === '23505'
        ? 'Esta pessoa já tem esta função.' : e.message,
      variant: 'destructive',
    }),
  });

  const remover = useMutation({
    mutationFn: async ({ utilizadorId, funcaoId }: { utilizadorId: string; funcaoId: string }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(T_ATRIB) as any)
        .delete().eq('empresa_id', empresa.id)
        .eq('utilizador_id', utilizadorId).eq('funcao_id', funcaoId);
      if (error) throw error;
    },
    onSuccess: () => { inval(); toast({ title: 'Função removida' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  /**
   * Responsabilidades sem dono. É o diagnóstico central deste modelo: numa
   * agência pequena não faz mal a mesma pessoa acumular funções — faz mal
   * uma responsabilidade não ter dono nenhum.
   */
  const funcoesSemDono = funcoes.filter(f => !equipa.some(m => m.funcaoId === f.id));

  return { funcoes, equipa, funcoesSemDono, isLoading, atribuir, remover };
}
