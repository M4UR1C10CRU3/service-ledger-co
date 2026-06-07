import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AlunoInfo {
  id: string;
  nome: string;
  email: string | null;
  cpf: string | null;
  telefone: string | null;
  ativo: boolean;
}

export interface MatriculaPortal {
  id: string;
  status: string;
  data_matricula: string;
  turma_id: string;
  turma_titulo: string;
  curso_nome: string;
  modalidade: string;
  inicio: string | null;
  fim: string | null;
}

export interface CertificadoPortal {
  id: string;
  codigo: string;
  emitido_em: string;
  validade_em: string | null;
  url_pdf: string | null;
  turma_titulo: string;
  curso_nome: string;
}

export interface TurmaDisponivel {
  id: string;
  titulo: string;
  curso_nome: string;
  modalidade: string;
  inicio: string | null;
  fim: string | null;
  vagas: number | null;
}

export interface AlunoPortalKPIs {
  emAndamento: number;
  concluidos: number;
  certificados: number;
  proximaAula: string | null;
}

export interface AlunoPortalData {
  aluno: AlunoInfo | null;
  matriculas: MatriculaPortal[];
  certificados: CertificadoPortal[];
  turmasDisponiveis: TurmaDisponivel[];
  kpis: AlunoPortalKPIs;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePortalAluno() {
  const { empresa } = useEmpresa();

  return useQuery({
    queryKey: ['portal_aluno', empresa?.id],
    queryFn: async (): Promise<AlunoPortalData> => {
      const empty: AlunoPortalData = {
        aluno: null, matriculas: [], certificados: [],
        turmasDisponiveis: [],
        kpis: { emAndamento: 0, concluidos: 0, certificados: 0, proximaAula: null },
      };

      // 1. Auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return empty;

      // 2. Email via liberty_utilizadores (fallback ao email auth)
      const { data: lu } = await (supabase as any)
        .from('liberty_utilizadores')
        .select('email')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      const email = lu?.email || user.email;
      if (!email) return empty;

      // 3. school_alunos pelo email
      const { data: aluno } = await (supabase as any)
        .from('school_alunos')
        .select('id, nome, email, cpf, telefone, ativo')
        .eq('empresa_id', empresa!.id)
        .eq('email', email)
        .maybeSingle();
      if (!aluno) return empty;

      // 4. Matrículas do aluno
      const { data: mats = [] } = await (supabase as any)
        .from('school_matriculas')
        .select('id, status, data_matricula, turma_id')
        .eq('empresa_id', empresa!.id)
        .eq('aluno_id', aluno.id)
        .order('data_matricula', { ascending: false });

      // 5. Turmas dessas matrículas
      const turmaIds = [...new Set((mats as any[]).map((m: any) => m.turma_id).filter(Boolean))];
      let turmasMap: Record<string, any> = {};
      if (turmaIds.length) {
        const { data: turmas = [] } = await (supabase as any)
          .from('school_turmas')
          .select('id, titulo, modalidade, inicio, fim, curso_id')
          .in('id', turmaIds);

        const cursoIds = [...new Set((turmas as any[]).map((t: any) => t.curso_id).filter(Boolean))];
        let cursosMap: Record<string, string> = {};
        if (cursoIds.length) {
          const { data: cursos = [] } = await (supabase as any)
            .from('school_cursos')
            .select('id, nome')
            .in('id', cursoIds);
          cursosMap = Object.fromEntries((cursos as any[]).map((c: any) => [c.id, c.nome]));
        }
        turmasMap = Object.fromEntries(
          (turmas as any[]).map((t: any) => [t.id, { ...t, curso_nome: cursosMap[t.curso_id] ?? '—' }])
        );
      }

      // 6. Certificados
      const { data: certs = [] } = await (supabase as any)
        .from('school_certificados')
        .select('id, codigo, emitido_em, url_pdf, validade_em, turma_id, aluno_id')
        .eq('empresa_id', empresa!.id)
        .eq('aluno_id', aluno.id)
        .order('emitido_em', { ascending: false });

      // Augmentar turmasMap com turma_ids dos certificados (caso não estejam nas matrículas)
      const certTurmaIds = (certs as any[]).map((c: any) => c.turma_id).filter(Boolean);
      const missingTurmaIds = certTurmaIds.filter((id: string) => !turmasMap[id]);
      if (missingTurmaIds.length) {
        const { data: extra = [] } = await (supabase as any)
          .from('school_turmas')
          .select('id, titulo, modalidade, inicio, fim, curso_id')
          .in('id', missingTurmaIds);
        const extraCursoIds = [...new Set((extra as any[]).map((t: any) => t.curso_id).filter(Boolean))];
        let extraCursosMap: Record<string, string> = {};
        if (extraCursoIds.length) {
          const { data: ec = [] } = await (supabase as any)
            .from('school_cursos').select('id, nome').in('id', extraCursoIds);
          extraCursosMap = Object.fromEntries((ec as any[]).map((c: any) => [c.id, c.nome]));
        }
        (extra as any[]).forEach((t: any) => {
          turmasMap[t.id] = { ...t, curso_nome: extraCursosMap[t.curso_id] ?? '—' };
        });
      }

      // 7. Turmas disponíveis (status 'aberta', empresa)
      const { data: disponiveis = [] } = await (supabase as any)
        .from('school_turmas')
        .select('id, titulo, modalidade, inicio, fim, vagas, curso_id')
        .eq('empresa_id', empresa!.id)
        .eq('status', 'aberta')
        .order('inicio', { ascending: true });

      const dispCursoIds = [...new Set((disponiveis as any[]).map((t: any) => t.curso_id).filter(Boolean))];
      let dispCursosMap: Record<string, string> = {};
      if (dispCursoIds.length) {
        const { data: dc = [] } = await (supabase as any)
          .from('school_cursos').select('id, nome').in('id', dispCursoIds);
        dispCursosMap = Object.fromEntries((dc as any[]).map((c: any) => [c.id, c.nome]));
      }

      // ── Montar resultado ────────────────────────────────────────────────────

      const matriculas: MatriculaPortal[] = (mats as any[]).map((m: any) => {
        const t = turmasMap[m.turma_id] ?? {};
        return {
          id: m.id, status: m.status, data_matricula: m.data_matricula,
          turma_id: m.turma_id, turma_titulo: t.titulo ?? '—',
          curso_nome: t.curso_nome ?? '—', modalidade: t.modalidade ?? '—',
          inicio: t.inicio ?? null, fim: t.fim ?? null,
        };
      });

      const certificados: CertificadoPortal[] = (certs as any[]).map((c: any) => {
        const t = turmasMap[c.turma_id] ?? {};
        return {
          id: c.id, codigo: c.codigo, emitido_em: c.emitido_em,
          validade_em: c.validade_em ?? null,
          url_pdf: c.url_pdf ?? null,
          turma_titulo: t.titulo ?? '—', curso_nome: t.curso_nome ?? '—',
        };
      });

      const turmasDisponiveis: TurmaDisponivel[] = (disponiveis as any[]).map((t: any) => ({
        id: t.id, titulo: t.titulo,
        curso_nome: dispCursosMap[t.curso_id] ?? '—',
        modalidade: t.modalidade, inicio: t.inicio, fim: t.fim, vagas: t.vagas,
      }));

      const activeStatuses = ['ativa', 'matriculada', 'confirmada'];
      const today = new Date().toISOString().split('T')[0];
      const emAndamento = matriculas.filter(m => activeStatuses.includes(m.status)).length;
      const concluidos = matriculas.filter(m => m.status === 'concluida').length;
      const proximaAula = matriculas
        .filter(m => activeStatuses.includes(m.status) && m.inicio && m.inicio >= today)
        .sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? ''))[0]?.inicio ?? null;

      return {
        aluno: { id: aluno.id, nome: aluno.nome, email: aluno.email, cpf: aluno.cpf, telefone: aluno.telefone, ativo: aluno.ativo },
        matriculas, certificados, turmasDisponiveis,
        kpis: { emAndamento, concluidos, certificados: certificados.length, proximaAula },
      };
    },
    enabled: !!empresa?.id,
  });
}
