import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

export interface Vaga {
  id: string;
  empresa_id: string;
  cargo: string;
  area: string | null;
  num_vagas: number;
  tipo_contrato: string | null;
  regime: string | null;
  salario_base: number | null;
  descricao: string | null;
  requisitos_obrig: string | null;
  requisitos_pref: string | null;
  data_abertura: string;
  data_limite: string | null;
  estado: string;
  motivo_encerr: string | null;
  criado_em: string;
  atualizado_em: string;
  candidatos_count?: number;
  entrevistas_count?: number;
}

export interface Candidato {
  id: string;
  empresa_id: string;
  vaga_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  localidade: string | null;
  fonte: string | null;
  cv_url: string | null;
  estado: string;
  notas_iniciais: string | null;
  ia_resumo_perfil: string | null;
  ia_experiencia: string[] | null;
  ia_competencias_tec: string[] | null;
  ia_competencias_trans: string[] | null;
  ia_formacao: string | null;
  ia_pontos_fortes: string[] | null;
  ia_pontos_atencao: string[] | null;
  ia_adequacao_vaga: string | null;
  ia_justificacao: string | null;
  ia_anos_experiencia: number | null;
  ia_idiomas: string[] | null;
  ia_processado_em: string | null;
  ia_erro: string | null;
  pontuacao_media_entrev: number | null;
  criado_em: string;
}

export interface Entrevista {
  id: string;
  empresa_id: string;
  vaga_id: string;
  candidato_id: string;
  data_hora: string;
  tipo: string | null;
  local_link: string | null;
  duracao_min: number | null;
  entrevistador_id: string | null;
  entrevistador_nome: string | null;
  estado: string;
  p_experiencia: number | null;
  p_conhecimento: number | null;
  p_lideranca: number | null;
  p_comunicacao: number | null;
  p_resolucao: number | null;
  p_apresentacao: number | null;
  p_disponibilidade: number | null;
  p_referencias: number | null;
  p_informatica: number | null;
  p_organizacao: number | null;
  p_adaptabilidade: number | null;
  p_seguranca: number | null;
  pontuacao_final: number | null;
  classificacao: string | null;
  notas: string | null;
  recomendacao: string | null;
  proxima_fase: string | null;
  criado_em: string;
  candidato_nome?: string;
}

export function useVagas() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const vagasQuery = useQuery({
    queryKey: ['rh-vagas', empresa?.id],
    queryFn: async () => {
      if (!empresa) return [];
      const { data, error } = await supabase
        .from('rh_vagas')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return (data || []) as Vaga[];
    },
    enabled: !!empresa,
  });

  const createVaga = useMutation({
    mutationFn: async (vaga: Partial<Vaga>) => {
      if (!empresa) throw new Error('Empresa não selecionada');
      const { data, error } = await supabase
        .from('rh_vagas')
        .insert({ ...vaga, empresa_id: empresa.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-vagas'] });
      toast({ title: 'Vaga criada com sucesso!' });
    },
    onError: (err: any) => toast({ title: 'Erro ao criar vaga', description: err.message, variant: 'destructive' }),
  });

  const updateVaga = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Vaga> & { id: string }) => {
      const { error } = await supabase.from('rh_vagas').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-vagas'] });
      toast({ title: 'Vaga atualizada!' });
    },
    onError: (err: any) => toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' }),
  });

  const deleteVaga = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rh_vagas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-vagas'] });
      toast({ title: 'Vaga removida!' });
    },
    onError: (err: any) => toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' }),
  });

  return { vagas: vagasQuery.data || [], isLoading: vagasQuery.isLoading, createVaga, updateVaga, deleteVaga };
}

export function useCandidatos(vagaId?: string) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const candidatosQuery = useQuery({
    queryKey: ['rh-candidatos', vagaId],
    queryFn: async () => {
      if (!empresa || !vagaId) return [];
      const { data, error } = await supabase
        .from('rh_candidatos')
        .select('*')
        .eq('vaga_id', vagaId)
        .eq('empresa_id', empresa.id)
        .order('pontuacao_media_entrev', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as Candidato[];
    },
    enabled: !!empresa && !!vagaId,
  });

  const createCandidato = useMutation({
    mutationFn: async (candidato: Partial<Candidato>) => {
      if (!empresa) throw new Error('Empresa não selecionada');
      const { data, error } = await supabase
        .from('rh_candidatos')
        .insert({ ...candidato, empresa_id: empresa.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-candidatos'] });
      toast({ title: 'Candidato adicionado!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const updateCandidato = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Candidato> & { id: string }) => {
      const { error } = await supabase.from('rh_candidatos').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-candidatos'] });
      toast({ title: 'Candidato atualizado!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  return { candidatos: candidatosQuery.data || [], isLoading: candidatosQuery.isLoading, createCandidato, updateCandidato };
}

export function useEntrevistas(vagaId?: string) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const entrevistasQuery = useQuery({
    queryKey: ['rh-entrevistas', vagaId],
    queryFn: async () => {
      if (!empresa || !vagaId) return [];
      const { data, error } = await supabase
        .from('rh_entrevistas')
        .select('*, rh_candidatos(nome)')
        .eq('vaga_id', vagaId)
        .eq('empresa_id', empresa.id)
        .order('data_hora', { ascending: false });
      if (error) throw error;
      return (data || []).map((e: any) => ({
        ...e,
        candidato_nome: e.rh_candidatos?.nome || 'N/D',
      })) as Entrevista[];
    },
    enabled: !!empresa && !!vagaId,
  });

  const createEntrevista = useMutation({
    mutationFn: async (entrevista: Partial<Entrevista>) => {
      if (!empresa) throw new Error('Empresa não selecionada');
      const { data, error } = await supabase
        .from('rh_entrevistas')
        .insert({ ...entrevista, empresa_id: empresa.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-entrevistas'] });
      toast({ title: 'Entrevista agendada!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const updateEntrevista = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Entrevista> & { id: string }) => {
      const { error } = await supabase.from('rh_entrevistas').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-entrevistas'] });
      qc.invalidateQueries({ queryKey: ['rh-candidatos'] });
      toast({ title: 'Entrevista atualizada!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  return { entrevistas: entrevistasQuery.data || [], isLoading: entrevistasQuery.isLoading, createEntrevista, updateEntrevista };
}
