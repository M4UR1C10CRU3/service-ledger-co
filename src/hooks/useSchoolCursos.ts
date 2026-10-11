import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

export interface SchoolCurso {
  id: string;
  empresa_id: string;
  nome: string;
  categoria: string | null;
  descricao: string | null;
  carga_horaria: number | null;
  sigla_certificado: string | null;
  validade_meses: number | null;
  horas_teoricas: number | null;
  horas_praticas: number | null;
  conteudo_programatico: { modulo: string; horas: number }[];
  objetivo: string | null;
  metodologia: string | null;
  reconhecimento: string | null;
  aprovacao_minima: number | null;
  /** Fotografia de fundo do curso, marca de água do certificado. */
  template_cert_path: string | null;
  url_site: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type SchoolCursoInput = Omit<SchoolCurso, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>;

const TABLE = 'school_cursos' as any;

export function useSchoolCursos() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: cursos = [], isLoading } = useQuery<SchoolCurso[]>({
    queryKey: ['school_cursos', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE).select('*')
        .eq('empresa_id', empresa!.id)
        .order('nome');
      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        conteudo_programatico: Array.isArray(r.conteudo_programatico) ? r.conteudo_programatico : [],
      })) as SchoolCurso[];
    },
  });

  const createCurso = useMutation({
    mutationFn: async (input: SchoolCursoInput) => {
      // `.select()` e contagem de linhas: uma escrita recusada pelas regras da
      // base de dados devolve sucesso com ZERO linhas, não erro. Sem isto o
      // ecrã anunciava "Curso criado" sem ter criado nada.
      const { data, error } = await supabase.from(TABLE)
        .insert({ ...input, empresa_id: empresa!.id }).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('A base de dados recusou a criação do curso.');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_cursos'] }); toast({ title: 'Curso criado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateCurso = useMutation({
    mutationFn: async ({ id, ...input }: Partial<SchoolCursoInput> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE)
        .update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('A base de dados recusou a alteração do curso.');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_cursos'] }); toast({ title: 'Curso actualizado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteCurso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_cursos'] }); toast({ title: 'Curso removido' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { cursos, isLoading, createCurso, updateCurso, deleteCurso };
}
