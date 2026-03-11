import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

export interface Avaliacao {
  id: string;
  empresa_id: string;
  colaborador_id: string;
  colaborador_nome: string | null;
  avaliador_id: string | null;
  avaliador_nome: string | null;
  tipo_avaliacao: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  data_avaliacao: string;
  data_prevista: string | null;
  estado: string;
  qa_qualidade: number | null;
  qa_produtividade: number | null;
  qa_conhecimento: number | null;
  qa_resolucao: number | null;
  qb_pontualidade: number | null;
  qb_postura: number | null;
  qb_relacionamento: number | null;
  qb_comunicacao: number | null;
  qc_proatividade: number | null;
  qc_aprendizagem: number | null;
  qc_adaptacao: number | null;
  qd_seguranca: number | null;
  qd_cuidado_equip: number | null;
  media_grupo_a: number | null;
  media_grupo_b: number | null;
  media_grupo_c: number | null;
  media_grupo_d: number | null;
  pontuacao_final: number | null;
  classificacao: string | null;
  pontos_fortes: string | null;
  areas_melhoria: string | null;
  objetivos_proximo: string | null;
  plano_desenvolvimento: string | null;
  observacoes: string | null;
  recomendacao: string | null;
  novo_cargo: string | null;
  nova_remuneracao: number | null;
  data_efetivacao: string | null;
  obj_melhoria: string | null;
  prazo_revisao: string | null;
  responsavel_acomp: string | null;
  motivo_desligamento: string | null;
  avaliador_confirmou: boolean;
  colaborador_notificado: boolean;
  data_comunicacao: string | null;
  obs_colaborador: string | null;
  criado_em: string;
  atualizado_em: string;
}

export function calcularMedias(av: Partial<Avaliacao>) {
  const ga = [av.qa_qualidade, av.qa_produtividade, av.qa_conhecimento, av.qa_resolucao].filter(v => v != null) as number[];
  const gb = [av.qb_pontualidade, av.qb_postura, av.qb_relacionamento, av.qb_comunicacao].filter(v => v != null) as number[];
  const gc = [av.qc_proatividade, av.qc_aprendizagem, av.qc_adaptacao].filter(v => v != null) as number[];
  const gd = [av.qd_seguranca, av.qd_cuidado_equip].filter(v => v != null) as number[];

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const media_grupo_a = avg(ga);
  const media_grupo_b = avg(gb);
  const media_grupo_c = avg(gc);
  const media_grupo_d = avg(gd);

  const pontuacao_final = media_grupo_a * 0.4 + media_grupo_b * 0.3 + media_grupo_c * 0.2 + media_grupo_d * 0.1;

  let classificacao = '';
  if (pontuacao_final >= 4.5) classificacao = 'Excecional';
  else if (pontuacao_final >= 3.5) classificacao = 'Bom Desempenho';
  else if (pontuacao_final >= 2.5) classificacao = 'Desempenho Adequado';
  else if (pontuacao_final >= 1.5) classificacao = 'Abaixo do Esperado';
  else classificacao = 'Insatisfatório';

  return {
    media_grupo_a: Math.round(media_grupo_a * 100) / 100,
    media_grupo_b: Math.round(media_grupo_b * 100) / 100,
    media_grupo_c: Math.round(media_grupo_c * 100) / 100,
    media_grupo_d: Math.round(media_grupo_d * 100) / 100,
    pontuacao_final: Math.round(pontuacao_final * 100) / 100,
    classificacao,
  };
}

export function getClassificacaoBadge(classificacao: string) {
  switch (classificacao) {
    case 'Excecional': return { emoji: '🏆', color: 'bg-emerald-100 text-emerald-800' };
    case 'Bom Desempenho': return { emoji: '✅', color: 'bg-blue-100 text-blue-800' };
    case 'Desempenho Adequado': return { emoji: '⚠️', color: 'bg-amber-100 text-amber-800' };
    case 'Abaixo do Esperado': return { emoji: '🔴', color: 'bg-orange-100 text-orange-800' };
    case 'Insatisfatório': return { emoji: '❌', color: 'bg-red-100 text-red-800' };
    default: return { emoji: '—', color: 'bg-gray-100 text-gray-800' };
  }
}

export function useAvaliacoes(colaboradorId?: string) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const avaliacoesQuery = useQuery({
    queryKey: ['rh-avaliacoes', empresa?.id, colaboradorId],
    queryFn: async () => {
      if (!empresa) return [];
      let query = supabase
        .from('rh_avaliacoes')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('data_prevista', { ascending: true, nullsFirst: false });
      if (colaboradorId) {
        query = query.eq('colaborador_id', colaboradorId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Avaliacao[];
    },
    enabled: !!empresa,
  });

  const createAvaliacao = useMutation({
    mutationFn: async (av: Partial<Avaliacao>) => {
      if (!empresa) throw new Error('Empresa não selecionada');
      const medias = calcularMedias(av);
      const { data, error } = await supabase
        .from('rh_avaliacoes')
        .insert({ ...av, ...medias, empresa_id: empresa.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-avaliacoes'] });
      toast({ title: 'Avaliação criada!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const updateAvaliacao = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Avaliacao> & { id: string }) => {
      const medias = calcularMedias(data);
      const { error } = await supabase.from('rh_avaliacoes').update({ ...data, ...medias } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-avaliacoes'] });
      toast({ title: 'Avaliação atualizada!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteAvaliacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rh_avaliacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-avaliacoes'] });
      toast({ title: 'Avaliação removida!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  return { avaliacoes: avaliacoesQuery.data || [], isLoading: avaliacoesQuery.isLoading, createAvaliacao, updateAvaliacao, deleteAvaliacao };
}
