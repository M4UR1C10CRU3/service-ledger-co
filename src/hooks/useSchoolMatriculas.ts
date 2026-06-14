import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

export interface SchoolMatricula {
  id: string;
  empresa_id: string;
  aluno_id: string;
  turma_id: string;
  status: string;
  data_matricula: string;
  nota_final: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  aluno_nome?: string;
  turma_titulo?: string;
  curso_nome?: string;
}

export type SchoolMatriculaInput = Omit<SchoolMatricula, 'id' | 'empresa_id' | 'created_at' | 'updated_at' | 'aluno_nome' | 'turma_titulo' | 'curso_nome'>;

const TABLE = 'school_matriculas' as any;

export function useSchoolMatriculas(turmaId?: string) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: matriculas = [], isLoading } = useQuery<SchoolMatricula[]>({
    queryKey: ['school_matriculas', empresa?.id, turmaId],
    enabled: !!empresa?.id,
    queryFn: async () => {
      let q = supabase.from(TABLE).select('*').eq('empresa_id', empresa!.id);
      if (turmaId) q = q.eq('turma_id', turmaId);
      const { data, error } = await q.order('data_matricula', { ascending: false });
      if (error) throw error;

      const rows = data || [];
      const alunoIds = [...new Set(rows.map((r: any) => r.aluno_id).filter(Boolean))];
      const turmaIds = [...new Set(rows.map((r: any) => r.turma_id).filter(Boolean))];

      let alunosMap: Record<string, string> = {};
      if (alunoIds.length) {
        const { data: as_ } = await supabase.from('school_alunos' as any).select('id,nome').in('id', alunoIds);
        alunosMap = Object.fromEntries((as_ || []).map((a: any) => [a.id, a.nome]));
      }
      let turmasMap: Record<string, { titulo: string; curso_id: string }> = {};
      if (turmaIds.length) {
        const { data: ts } = await supabase.from('school_turmas' as any).select('id,titulo,curso_id').in('id', turmaIds);
        turmasMap = Object.fromEntries((ts || []).map((t: any) => [t.id, t]));
      }
      const cursoIds = [...new Set(Object.values(turmasMap).map(t => t.curso_id).filter(Boolean))];
      let cursosMap: Record<string, string> = {};
      if (cursoIds.length) {
        const { data: cs } = await supabase.from('school_cursos' as any).select('id,nome').in('id', cursoIds);
        cursosMap = Object.fromEntries((cs || []).map((c: any) => [c.id, c.nome]));
      }

      return rows.map((r: any) => ({
        ...r,
        aluno_nome: alunosMap[r.aluno_id] ?? '—',
        turma_titulo: turmasMap[r.turma_id]?.titulo ?? '—',
        curso_nome: cursosMap[turmasMap[r.turma_id]?.curso_id] ?? '—',
      })) as SchoolMatricula[];
    },
  });

  const createMatricula = useMutation({
    mutationFn: async (input: SchoolMatriculaInput) => {
      const { error } = await supabase.from(TABLE).insert({ ...input, empresa_id: empresa!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_matriculas'] }); qc.invalidateQueries({ queryKey: ['school_turmas'] }); toast({ title: 'Matrícula registada' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateMatricula = useMutation({
    mutationFn: async ({ id, ...input }: Partial<SchoolMatriculaInput> & { id: string }) => {
      const { error } = await supabase.from(TABLE).update({ ...input, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_matriculas'] }); toast({ title: 'Matrícula actualizada' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteMatricula = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_matriculas'] }); qc.invalidateQueries({ queryKey: ['school_turmas'] }); toast({ title: 'Matrícula removida' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { matriculas, isLoading, createMatricula, updateMatricula, deleteMatricula };
}
