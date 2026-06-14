import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

export interface SchoolAluno {
  id: string;
  empresa_id: string;
  nome: string;
  email: string | null;
  cpf: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  status: string;
  empresa_trabalho: string | null;
  foto_url: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type SchoolAlunoInput = Omit<SchoolAluno, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>;

const TABLE = 'school_alunos' as any;

export function useSchoolAlunos() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: alunos = [], isLoading } = useQuery<SchoolAluno[]>({
    queryKey: ['school_alunos', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE).select('*')
        .eq('empresa_id', empresa!.id)
        .order('nome');
      if (error) throw error;
      return (data || []) as SchoolAluno[];
    },
  });

  const createAluno = useMutation({
    mutationFn: async (input: SchoolAlunoInput) => {
      const { error } = await supabase.from(TABLE).insert({ ...input, empresa_id: empresa!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_alunos'] }); toast({ title: 'Aluno criado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateAluno = useMutation({
    mutationFn: async ({ id, ...input }: Partial<SchoolAlunoInput> & { id: string }) => {
      const { error } = await supabase.from(TABLE).update({ ...input, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_alunos'] }); toast({ title: 'Aluno actualizado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteAluno = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_alunos'] }); toast({ title: 'Aluno removido' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { alunos, isLoading, createAluno, updateAluno, deleteAluno };
}
