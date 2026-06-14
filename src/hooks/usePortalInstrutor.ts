import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

export interface DocenteInfo {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  formacao: string | null;
  especializacao: string | null;
}

export interface TurmaInstrutor {
  id: string;
  titulo: string;
  curso_nome: string;
  status: string;
  modalidade: string | null;
  inicio: string | null;
  fim: string | null;
  vagas: number | null;
  total_matriculas: number;
  local: string | null;
}

export interface MatriculaInstrutor {
  id: string;
  aluno_nome: string;
  status: string;
  nota_final: number | null;
  data_matricula: string;
  turma_id: string;
  turma_titulo: string;
}

export interface PortalInstrutorData {
  docente: DocenteInfo | null;
  turmas: TurmaInstrutor[];
  matriculas: MatriculaInstrutor[];
  kpis: { turmasActivas: number; totalAlunos: number; turmasConcluidas: number };
}

export function usePortalInstrutor() {
  const { empresa } = useEmpresa();

  return useQuery({
    queryKey: ['portal_instrutor', empresa?.id],
    queryFn: async (): Promise<PortalInstrutorData> => {
      const empty: PortalInstrutorData = {
        docente: null, turmas: [], matriculas: [],
        kpis: { turmasActivas: 0, totalAlunos: 0, turmasConcluidas: 0 },
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return empty;

      const { data: lu } = await (supabase as any)
        .from('liberty_utilizadores').select('email').eq('auth_user_id', user.id).maybeSingle();
      const email = lu?.email || user.email;
      if (!email) return empty;

      const { data: docente } = await (supabase as any)
        .from('school_docentes')
        .select('id, nome, email, telefone, formacao, especializacao')
        .eq('empresa_id', empresa!.id)
        .eq('email', email)
        .maybeSingle();
      if (!docente) return empty;

      const { data: turmasRaw = [] } = await (supabase as any)
        .from('school_turmas')
        .select('id, titulo, status, modalidade, inicio, fim, vagas, local, curso_id')
        .eq('empresa_id', empresa!.id)
        .eq('docente_id', docente.id)
        .order('inicio', { ascending: false });

      const cursoIds = [...new Set((turmasRaw as any[]).map((t: any) => t.curso_id).filter(Boolean))];
      let cursosMap: Record<string, string> = {};
      if (cursoIds.length) {
        const { data: cs } = await (supabase as any).from('school_cursos').select('id,nome').in('id', cursoIds);
        cursosMap = Object.fromEntries((cs || []).map((c: any) => [c.id, c.nome]));
      }

      const turmaIds = (turmasRaw as any[]).map((t: any) => t.id);
      let matriculasRaw: any[] = [];
      if (turmaIds.length) {
        const { data: mr = [] } = await (supabase as any)
          .from('school_matriculas')
          .select('id, aluno_id, turma_id, status, nota_final, data_matricula')
          .in('turma_id', turmaIds);
        matriculasRaw = mr;
      }

      const alunoIds = [...new Set(matriculasRaw.map((m: any) => m.aluno_id).filter(Boolean))];
      let alunosMap: Record<string, string> = {};
      if (alunoIds.length) {
        const { data: as_ } = await (supabase as any).from('school_alunos').select('id,nome').in('id', alunoIds);
        alunosMap = Object.fromEntries((as_ || []).map((a: any) => [a.id, a.nome]));
      }

      const matriculasByTurma: Record<string, number> = {};
      matriculasRaw.forEach((m: any) => {
        matriculasByTurma[m.turma_id] = (matriculasByTurma[m.turma_id] ?? 0) + 1;
      });

      const turmas: TurmaInstrutor[] = (turmasRaw as any[]).map((t: any) => ({
        id: t.id, titulo: t.titulo, curso_nome: cursosMap[t.curso_id] ?? '—',
        status: t.status, modalidade: t.modalidade, inicio: t.inicio, fim: t.fim,
        vagas: t.vagas, local: t.local, total_matriculas: matriculasByTurma[t.id] ?? 0,
      }));

      const turmasMap2 = Object.fromEntries(turmas.map(t => [t.id, t]));
      const matriculas: MatriculaInstrutor[] = matriculasRaw.map((m: any) => ({
        id: m.id, aluno_nome: alunosMap[m.aluno_id] ?? '—',
        status: m.status, nota_final: m.nota_final,
        data_matricula: m.data_matricula, turma_id: m.turma_id,
        turma_titulo: turmasMap2[m.turma_id]?.titulo ?? '—',
      }));

      return {
        docente,
        turmas,
        matriculas,
        kpis: {
          turmasActivas: turmas.filter(t => ['aberta', 'em_andamento'].includes(t.status)).length,
          totalAlunos: matriculasRaw.length,
          turmasConcluidas: turmas.filter(t => t.status === 'concluida').length,
        },
      };
    },
    enabled: !!empresa?.id,
  });
}
