import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';


export interface DocenteInfo {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  formacao: string | null;
  especializacao: string | null;
  /** Necessário para publicar materiais — a linha de material exige empresa. */
  empresa_id: string;
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
  return useQuery({
    queryKey: ['portal_instrutor'],
    queryFn: async (): Promise<PortalInstrutorData> => {
      const empty: PortalInstrutorData = {
        docente: null, turmas: [], matriculas: [],
        kpis: { turmasActivas: 0, totalAlunos: 0, turmasConcluidas: 0 },
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return empty;

      // Identificação pela conta, não pelo email — ver a nota em usePortalAluno.
      const { data: docente } = await (supabase as any)
        .from('school_docentes')
        // A coluna chama-se area_especializacao. Pedir 'especializacao' fazia a
        // consulta inteira falhar, e o portal dizia "instrutor não encontrado"
        // a toda a gente — nunca chegou a funcionar.
        .select('id, empresa_id, nome, email, telefone, formacao, area_especializacao')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (!docente) return empty;

      const empresa = { id: docente.empresa_id as string };

      const { data: turmasRaw = [] } = await (supabase as any)
        .from('school_turmas')
        .select('id, titulo, status, modalidade, inicio, fim, vagas, local, curso_id')
        .eq('empresa_id', empresa.id)
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
      let notasPorMatricula: Record<string, number> = {};
      if (turmaIds.length) {
        // A nota NÃO vive na matrícula: `school_matriculas.nota_final` não
        // existe. Pedi-la fazia a consulta devolver erro, `data` vinha a null,
        // o .map() rebentava e o portal inteiro do instrutor caía — era esta a
        // razão de dizer "instrutor não encontrado" mesmo com a ficha ligada.
        // As notas estão em school_avaliacoes, uma por avaliação.
        const { data: mr } = await (supabase as any)
          .from('school_matriculas')
          .select('id, aluno_id, turma_id, status, data_matricula')
          .in('turma_id', turmaIds);
        matriculasRaw = mr ?? [];

        const { data: avals } = await (supabase as any)
          .from('school_avaliacoes')
          .select('matricula_id, nota, nota_maxima')
          .in('turma_id', turmaIds);

        // Média percentual das avaliações de cada matrícula.
        const soma: Record<string, { n: number; total: number }> = {};
        (avals ?? []).forEach((a: any) => {
          if (a.matricula_id == null || a.nota == null) return;
          const max = a.nota_maxima || 20;
          const s = soma[a.matricula_id] ?? { n: 0, total: 0 };
          s.n += 1;
          s.total += (Number(a.nota) / Number(max)) * 100;
          soma[a.matricula_id] = s;
        });
        notasPorMatricula = Object.fromEntries(
          Object.entries(soma).map(([id, s]) => [id, Math.round(s.total / s.n)])
        );
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
        status: m.status, nota_final: notasPorMatricula[m.id] ?? null,
        data_matricula: m.data_matricula, turma_id: m.turma_id,
        turma_titulo: turmasMap2[m.turma_id]?.titulo ?? '—',
      }));

      return {
        // O ecrã mostra `especializacao`; a base de dados guarda-a como
        // area_especializacao. A tradução fica aqui, num sítio só.
        docente: { ...docente, especializacao: docente.area_especializacao ?? null },
        turmas,
        matriculas,
        kpis: {
          turmasActivas: turmas.filter(t => ['aberta', 'em_andamento'].includes(t.status)).length,
          totalAlunos: matriculasRaw.length,
          // As turmas fecham com 'encerrada'; 'concluida' é o estado das
          // matrículas. Contar pelo estado errado dava sempre zero.
          turmasConcluidas: turmas.filter(t => ['encerrada', 'concluida'].includes(t.status)).length,
        },
      };
    },

  });
}
