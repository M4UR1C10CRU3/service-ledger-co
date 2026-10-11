import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


// ── Types ────────────────────────────────────────────────────────────────────

export interface AlunoInfo {
  empresa_id: string;
  id: string;
  nome: string;
  email: string | null;
  cpf: string | null;
  telefone: string | null;
  ativo: boolean;
}

export interface AvaliacaoPortal {
  id: string;
  tipo: string | null;
  descricao: string | null;
  nota: number | null;
  nota_maxima: number | null;
  data_avaliacao: string | null;
}

export interface MaterialPortal {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string | null;
  tipo: string | null;
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
  local: string | null;
  docente_nome: string | null;

  /** Programa do curso, para o aluno saber o que vai fazer. */
  modulos: { modulo: string; horas: number }[];
  carga_horaria: number | null;
  aprovacao_minima: number | null;

  /** Assiduidade: aulas registadas e presenças. */
  aulas_registadas: number;
  presencas: number;
  assiduidade_pct: number | null;

  avaliacoes: AvaliacaoPortal[];
  /** Média percentual das avaliações. Null quando ainda não há nenhuma. */
  nota_final: number | null;
  aprovado: boolean | null;

  materiais: MaterialPortal[];

  /** Certificado desta turma, se já emitido. */
  certificado_codigo: string | null;
  /**
   * Porque é que ainda não há certificado. É a pergunta que o aluno faz ao
   * ver "concluído" e "0 certificados" no mesmo ecrã.
   */
  motivo_sem_certificado: string | null;
}

export interface InscricaoPortal {
  id: string;
  turma_id: string;
  estado: string;
  mensagem: string | null;
  resposta: string | null;
  created_at: string;
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
  inscricoes: InscricaoPortal[];
  kpis: AlunoPortalKPIs;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePortalAluno() {
  return useQuery({
    queryKey: ['portal_aluno'],
    queryFn: async (): Promise<AlunoPortalData> => {
      const empty: AlunoPortalData = {
        aluno: null, matriculas: [], certificados: [],
        turmasDisponiveis: [], inscricoes: [],
        kpis: { emAndamento: 0, concluidos: 0, certificados: 0, proximaAula: null },
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return empty;

      // A ficha vem pela CONTA, não pelo email.
      //
      // Antes procurava-se o aluno pelo email do utilizador, dentro da empresa
      // seleccionada no ERP. Duas coisas partiam-se: um aluno não tem empresa
      // seleccionada nenhuma (não é utilizador do ERP), e a correspondência por
      // email cede assim que alguém muda de endereço.
      const { data: aluno } = await (supabase as any)
        .from('school_alunos')
        .select('id, empresa_id, nome, email, cpf, telefone, ativo')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (!aluno) return empty;

      // A escola é a do aluno, não a que estiver escolhida noutro lado.
      const empresa = { id: aluno.empresa_id as string };

      // 4. Matrículas do aluno
      const { data: mats = [] } = await (supabase as any)
        .from('school_matriculas')
        .select('id, status, data_matricula, turma_id')
        .eq('empresa_id', empresa.id)
        .eq('aluno_id', aluno.id)
        .order('data_matricula', { ascending: false });

      // 5. Turmas dessas matrículas, com o curso por trás
      const turmaIds = [...new Set((mats as any[]).map((m: any) => m.turma_id).filter(Boolean))];
      let turmasMap: Record<string, any> = {};
      let docentesMap: Record<string, string> = {};
      if (turmaIds.length) {
        const { data: turmas = [] } = await (supabase as any)
          .from('school_turmas')
          .select('id, titulo, modalidade, inicio, fim, local, curso_id, docente_id')
          .in('id', turmaIds);

        const cursoIds = [...new Set((turmas as any[]).map((t: any) => t.curso_id).filter(Boolean))];
        let cursosMap: Record<string, any> = {};
        if (cursoIds.length) {
          const { data: cursos = [] } = await (supabase as any)
            .from('school_cursos')
            // O programa e a regra de aprovação: é o que o aluno quer saber
            // quando abre o curso — o que vai fazer e o que tem de atingir.
            .select('id, nome, conteudo_programatico, carga_horaria, aprovacao_minima')
            .in('id', cursoIds);
          cursosMap = Object.fromEntries((cursos as any[]).map((c: any) => [c.id, c]));
        }

        const docenteIds = [...new Set((turmas as any[]).map((t: any) => t.docente_id).filter(Boolean))];
        if (docenteIds.length) {
          const { data: ds = [] } = await (supabase as any)
            .from('school_docentes').select('id, nome').in('id', docenteIds);
          docentesMap = Object.fromEntries((ds as any[]).map((d: any) => [d.id, d.nome]));
        }

        turmasMap = Object.fromEntries(
          (turmas as any[]).map((t: any) => [t.id, {
            ...t,
            curso: cursosMap[t.curso_id] ?? null,
            curso_nome: cursosMap[t.curso_id]?.nome ?? '—',
          }])
        );
      }

      // 5b. Percurso: assiduidade, notas e material das suas turmas
      const matriculaIds = (mats as any[]).map((m: any) => m.id);
      let frequencia: any[] = [];
      let avaliacoes: any[] = [];
      let materiais: any[] = [];
      if (matriculaIds.length) {
        const [{ data: fq }, { data: av }] = await Promise.all([
          (supabase as any).from('school_frequencia')
            .select('matricula_id, data_aula, presente').in('matricula_id', matriculaIds),
          (supabase as any).from('school_avaliacoes')
            .select('id, matricula_id, tipo, descricao, nota, nota_maxima, data_avaliacao')
            .in('matricula_id', matriculaIds).order('data_avaliacao', { ascending: true }),
        ]);
        frequencia = fq ?? [];
        avaliacoes = av ?? [];
      }
      if (turmaIds.length) {
        const { data: mt } = await (supabase as any)
          .from('school_materiais')
          .select('id, turma_id, titulo, descricao, url, tipo')
          .in('turma_id', turmaIds).eq('visivel_aluno', true);
        materiais = mt ?? [];
      }

      // 5c. Pedidos de inscrição já feitos
      const { data: inscricoesRaw } = await (supabase as any)
        .from('school_inscricoes')
        .select('id, turma_id, estado, mensagem, resposta, created_at')
        .eq('aluno_id', aluno.id)
        .order('created_at', { ascending: false });
      const inscricoes: InscricaoPortal[] = inscricoesRaw ?? [];

      // 6. Certificados
      const { data: certs = [] } = await (supabase as any)
        .from('school_certificados')
        .select('id, codigo, emitido_em, url_pdf, validade_em, turma_id, aluno_id')
        .eq('empresa_id', empresa.id)
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
        .eq('empresa_id', empresa.id)
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

      const hoje = new Date().toISOString().slice(0, 10);
      const certPorTurma = Object.fromEntries(
        (certs as any[]).map((c: any) => [c.turma_id, c.codigo])
      );

      const matriculas: MatriculaPortal[] = (mats as any[]).map((m: any) => {
        const t = turmasMap[m.turma_id] ?? {};
        const curso = t.curso ?? null;

        const aulas = frequencia.filter(f => f.matricula_id === m.id);
        const presencas = aulas.filter(f => f.presente).length;

        const avals = avaliacoes
          .filter(a => a.matricula_id === m.id)
          .map(a => ({
            id: a.id, tipo: a.tipo, descricao: a.descricao,
            nota: a.nota == null ? null : Number(a.nota),
            nota_maxima: a.nota_maxima == null ? null : Number(a.nota_maxima),
            data_avaliacao: a.data_avaliacao,
          }));

        // Nota final em percentagem, para se comparar com a aprovação mínima
        // sem depender da escala usada em cada avaliação.
        const comNota = avals.filter(a => a.nota != null);
        const notaFinal = comNota.length
          ? Math.round(comNota.reduce((s, a) => s + (a.nota! / (a.nota_maxima || 20)) * 100, 0) / comNota.length)
          : null;

        const minima = curso?.aprovacao_minima ?? null;
        const aprovado = notaFinal == null || minima == null ? null : notaFinal >= minima;

        const codigoCert = certPorTurma[m.turma_id] ?? null;

        // A pergunta que o aluno faz ao ver "concluído" e "0 certificados".
        let motivo: string | null = null;
        if (!codigoCert) {
          if (m.status === 'concluida') {
            motivo = aprovado === false
              ? `Não atingiu a nota mínima de ${minima}% exigida para este curso.`
              : notaFinal == null
                ? 'O curso está concluído e o certificado será emitido assim que a avaliação for lançada.'
                : 'O curso está concluído e aprovado. O certificado será emitido pela secretaria.';
          } else if (m.status === 'reprovada') {
            motivo = 'Não foi aprovado neste curso.';
          } else if (t.fim && t.fim >= hoje) {
            motivo = 'O certificado é emitido depois de o curso terminar.';
          } else {
            motivo = 'Ainda não há certificado emitido para esta turma.';
          }
        }

        return {
          id: m.id, status: m.status, data_matricula: m.data_matricula,
          turma_id: m.turma_id, turma_titulo: t.titulo ?? '—',
          curso_nome: t.curso_nome ?? '—', modalidade: t.modalidade ?? '—',
          inicio: t.inicio ?? null, fim: t.fim ?? null,
          local: t.local ?? null,
          docente_nome: t.docente_id ? (docentesMap[t.docente_id] ?? null) : null,

          modulos: Array.isArray(curso?.conteudo_programatico) ? curso.conteudo_programatico : [],
          carga_horaria: curso?.carga_horaria ?? null,
          aprovacao_minima: minima,

          aulas_registadas: aulas.length,
          presencas,
          assiduidade_pct: aulas.length ? Math.round((presencas / aulas.length) * 100) : null,

          avaliacoes: avals,
          nota_final: notaFinal,
          aprovado,

          materiais: materiais
            .filter(mt => mt.turma_id === m.turma_id)
            .map(mt => ({ id: mt.id, titulo: mt.titulo, descricao: mt.descricao, url: mt.url, tipo: mt.tipo })),

          certificado_codigo: codigoCert,
          motivo_sem_certificado: motivo,
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
        aluno: { id: aluno.id, empresa_id: aluno.empresa_id, nome: aluno.nome, email: aluno.email, cpf: aluno.cpf, telefone: aluno.telefone, ativo: aluno.ativo },
        matriculas, certificados, turmasDisponiveis, inscricoes,
        kpis: { emAndamento, concluidos, certificados: certificados.length, proximaAula },
      };
    },

  });
}

/** Pede inscrição numa turma aberta. A secretaria confirma e só aí há matrícula. */
export function usePedirInscricao() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ alunoId, empresaId, turmaId, mensagem }: {
      alunoId: string; empresaId: string; turmaId: string; mensagem?: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from('school_inscricoes')
        .insert({ aluno_id: alunoId, empresa_id: empresaId, turma_id: turmaId, mensagem: mensagem || null })
        .select('id');
      if (error) {
        // O índice único trava um segundo pedido para a mesma turma.
        if (error.code === '23505') throw new Error('Já pediu inscrição nesta turma.');
        throw error;
      }
      if (!data?.length) throw new Error('O pedido não foi gravado.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal_aluno'] });
      toast({ title: 'Pedido enviado', description: 'A secretaria vai confirmar a sua inscrição.' });
    },
    onError: (e: Error) => toast({ title: 'Não foi possível pedir', description: e.message, variant: 'destructive' }),
  });
}

/** O aluno corrige o próprio contacto. Nome e CPF ficam com a secretaria. */
export function useAtualizarContacto() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (p: { email?: string; telefone?: string; foto_url?: string }) => {
      const { error } = await (supabase.rpc as any)('school_aluno_atualizar_contacto', {
        p_email: p.email ?? null,
        p_telefone: p.telefone ?? null,
        p_foto_url: p.foto_url ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal_aluno'] });
      toast({ title: 'Dados atualizados' });
    },
    onError: (e: Error) => toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' }),
  });
}
