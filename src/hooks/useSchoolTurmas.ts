import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

export interface SchoolTurma {
  id: string;
  empresa_id: string;
  titulo: string;
  curso_id: string | null;
  docente_id: string | null;
  status: string;
  modalidade: string | null;
  inicio: string | null;
  fim: string | null;
  vagas: number | null;
  local: string | null;
  created_at: string;
  updated_at: string;
  curso_nome?: string;
  docente_nome?: string;
  total_matriculas?: number;
}

export type SchoolTurmaInput = Omit<SchoolTurma, 'id' | 'empresa_id' | 'created_at' | 'updated_at' | 'curso_nome' | 'docente_nome' | 'total_matriculas'>;

const TABLE = 'school_turmas' as any;

export function useSchoolTurmas() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: turmas = [], isLoading } = useQuery<SchoolTurma[]>({
    queryKey: ['school_turmas', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE).select('*')
        .eq('empresa_id', empresa!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = data || [];
      const cursoIds = [...new Set(rows.map((r: any) => r.curso_id).filter(Boolean))];
      const docenteIds = [...new Set(rows.map((r: any) => r.docente_id).filter(Boolean))];
      const turmaIds = rows.map((r: any) => r.id);

      let cursosMap: Record<string, string> = {};
      if (cursoIds.length) {
        const { data: cs } = await supabase.from('school_cursos' as any).select('id,nome').in('id', cursoIds);
        cursosMap = Object.fromEntries((cs || []).map((c: any) => [c.id, c.nome]));
      }
      let docentesMap: Record<string, string> = {};
      if (docenteIds.length) {
        const { data: ds } = await supabase.from('school_docentes' as any).select('id,nome').in('id', docenteIds);
        docentesMap = Object.fromEntries((ds || []).map((d: any) => [d.id, d.nome]));
      }
      let matriculasCount: Record<string, number> = {};
      if (turmaIds.length) {
        const { data: ms } = await supabase
          .from('school_matriculas' as any).select('turma_id')
          .in('turma_id', turmaIds).neq('status', 'cancelada');
        (ms || []).forEach((m: any) => { matriculasCount[m.turma_id] = (matriculasCount[m.turma_id] || 0) + 1; });
      }

      return rows.map((r: any) => ({
        ...r,
        curso_nome: cursosMap[r.curso_id] ?? null,
        docente_nome: docentesMap[r.docente_id] ?? null,
        total_matriculas: matriculasCount[r.id] ?? 0,
      })) as SchoolTurma[];
    },
  });

  const createTurma = useMutation({
    mutationFn: async (input: SchoolTurmaInput) => {
      const { error } = await supabase.from(TABLE).insert({ ...input, empresa_id: empresa!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_turmas'] }); toast({ title: 'Turma criada' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateTurma = useMutation({
    mutationFn: async ({ id, ...input }: Partial<SchoolTurmaInput> & { id: string }) => {
      const { error } = await supabase.from(TABLE).update({ ...input, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_turmas'] }); toast({ title: 'Turma actualizada' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteTurma = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_turmas'] }); toast({ title: 'Turma removida' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { turmas, isLoading, createTurma, updateTurma, deleteTurma };
}
