import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * O espaço da empresa cliente na plataforma.
 *
 * A versão anterior recebia o cliente por parâmetro e era uma vista que a
 * administração abria sobre um cliente — não um portal. Além disso ligava os
 * formandos à empresa comparando texto (`empresa_trabalho ILIKE '%nome%'`),
 * campo que está vazio em todos os alunos: o resultado era sempre zero.
 *
 * Agora a empresa vem da CONTA de quem entrou, através da sua ficha de
 * contacto, e os formandos vêm da chave estrangeira cliente_corp_id.
 */

export interface ClienteCorpInfo {
  id: string;
  empresa_id: string;
  nome: string;
  responsavel: string | null;
  cnpj: string | null;
}

export interface ContactoCorp {
  id: string;
  nome: string;
  cargo: string | null;
  email: string;
}

export interface ContratoCorp {
  id: string;
  descricao: string | null;
  valor_total: number | null;
  inicio: string | null;
  fim: string | null;
  status: string;
  observacao: string | null;
}

export interface AlunoCorpItem {
  id: string;
  nome: string;
  email: string | null;
  cpf: string | null;
  status: string;
  cursos_em_andamento: number;
  certificados_emitidos: number;
}

export interface TreinamentoCorpItem {
  id: string;
  titulo: string;
  curso_nome: string;
  status: string;
  inicio: string | null;
  fim: string | null;
  local: string | null;
  total_alunos: number;
  concluidos: number;
}

export interface CertificadoCorp {
  id: string;
  codigo: string;
  aluno_nome: string;
  curso_nome: string;
  emitido_em: string;
  validade_em: string | null;
  url_pdf: string | null;
}

export interface PedidoFormacao {
  id: string;
  numero: string;
  curso_nome: string | null;
  n_formandos: number | null;
  modalidade: string | null;
  local_pretendido: string | null;
  data_pretendida: string | null;
  observacoes: string | null;
  estado: string;
  resposta: string | null;
  valor_proposto: number | null;
  /** Turma que o ITC abriu para este pedido. Sem ela não se indicam formandos. */
  turma_id: string | null;
  /** Quantos colaboradores já foram indicados, dos que se pediu. */
  indicados: number;
  created_at: string;
}

export interface CursoDisponivel {
  id: string;
  nome: string;
  carga_horaria: number | null;
  validade_meses: number | null;
  /**
   * Lugar deste curso no perfil de atendimento do cliente.
   *   'sim'      — faz parte da formação recorrente dele
   *   'eventual' — já contratou, sem recorrência
   *   null       — fora do perfil; continua disponível para escolher
   */
  perfil: 'sim' | 'eventual' | null;
}

export interface PortalCorpData {
  cliente: ClienteCorpInfo | null;
  contacto: ContactoCorp | null;
  contratos: ContratoCorp[];
  alunos: AlunoCorpItem[];
  treinamentos: TreinamentoCorpItem[];
  certificados: CertificadoCorp[];
  pedidos: PedidoFormacao[];
  cursos: CursoDisponivel[];
  kpis: {
    totalAlunos: number;
    emFormacao: number;
    certificados: number;
    /** Certificados que caducam nos próximos 90 dias — o alerta que interessa. */
    vencendo: number;
    vencidos: number;
    contratosAtivos: number;
    pedidosAbertos: number;
  };
}

const VAZIO: PortalCorpData = {
  cliente: null, contacto: null, contratos: [], alunos: [],
  treinamentos: [], certificados: [], pedidos: [], cursos: [],
  kpis: { totalAlunos: 0, emFormacao: 0, certificados: 0, vencendo: 0, vencidos: 0, contratosAtivos: 0, pedidosAbertos: 0 },
};

export function usePortalCorporativo() {
  return useQuery<PortalCorpData>({
    queryKey: ['portal_corporativo'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return VAZIO;

      const { data: contacto } = await (supabase as any)
        .from('school_corp_contactos')
        .select('id, cliente_id, nome, cargo, email')
        .eq('auth_user_id', user.id)
        .eq('ativo', true)
        .maybeSingle();
      if (!contacto) return VAZIO;

      const { data: cliente } = await (supabase as any)
        .from('school_clientes_corp')
        .select('id, empresa_id, nome, responsavel, cnpj')
        .eq('id', contacto.cliente_id)
        .maybeSingle();
      if (!cliente) return VAZIO;

      const [{ data: contratos }, { data: alunos }, { data: pedidos }, { data: cursos }] = await Promise.all([
        (supabase as any).from('school_contratos_corp')
          .select('id, descricao, valor_total, inicio, fim, status, observacao')
          .eq('cliente_id', cliente.id).order('inicio', { ascending: false }),
        (supabase as any).from('school_alunos')
          .select('id, nome, email, cpf, status')
          .eq('cliente_corp_id', cliente.id).order('nome'),
        (supabase as any).from('school_pedidos_formacao')
          .select('id, numero, curso_nome, n_formandos, modalidade, local_pretendido, data_pretendida, observacoes, estado, resposta, valor_proposto, turma_id, created_at')
          .eq('cliente_id', cliente.id).order('created_at', { ascending: false }),
        (supabase as any).from('school_cursos')
          .select('id, nome, carga_horaria, validade_meses')
          .eq('empresa_id', cliente.empresa_id).eq('ativo', true).order('nome'),
      ]);

      // Perfil de atendimento: os cursos que costumam compor a formação DESTE
      // cliente. Não filtra a lista — ordena-a. Ele continua a poder pedir
      // qualquer curso, mas procura primeiro nos dele em vez de percorrer 55.
      const { data: perfil } = await (supabase as any)
        .from('school_cliente_perfil_cursos')
        .select('curso_id, nivel')
        .eq('cliente_id', cliente.id);
      const nivelPorCurso: Record<string, 'sim' | 'eventual'> =
        Object.fromEntries(((perfil ?? []) as any[]).map(p => [p.curso_id, p.nivel]));

      const alunoIds = (alunos ?? []).map((a: any) => a.id);

      let matriculas: any[] = [];
      let certificadosRaw: any[] = [];
      if (alunoIds.length) {
        const [{ data: m }, { data: c }] = await Promise.all([
          (supabase as any).from('school_matriculas')
            .select('id, aluno_id, turma_id, status').in('aluno_id', alunoIds),
          (supabase as any).from('school_certificados')
            .select('id, codigo, aluno_id, aluno_nome, curso_nome, emitido_em, validade_em, url_pdf, turma_id')
            .in('aluno_id', alunoIds).order('emitido_em', { ascending: false }),
        ]);
        matriculas = m ?? [];
        certificadosRaw = c ?? [];
      }

      // Turmas onde os formandos desta empresa andam — a calendarização.
      const turmaIds = [...new Set(matriculas.map(m => m.turma_id).filter(Boolean))];
      let turmas: any[] = [];
      let cursoNomePorId: Record<string, string> = {};
      if (turmaIds.length) {
        const { data: t } = await (supabase as any).from('school_turmas')
          .select('id, titulo, status, inicio, fim, local, curso_id').in('id', turmaIds);
        turmas = t ?? [];
        cursoNomePorId = Object.fromEntries((cursos ?? []).map((c: any) => [c.id, c.nome]));
      }

      const nomePorAluno = Object.fromEntries((alunos ?? []).map((a: any) => [a.id, a.nome]));
      const EM_CURSO = ['ativa', 'matriculada', 'confirmada', 'em_andamento'];

      const alunosItens: AlunoCorpItem[] = (alunos ?? []).map((a: any) => ({
        id: a.id, nome: a.nome, email: a.email, cpf: a.cpf, status: a.status,
        cursos_em_andamento: matriculas.filter(m => m.aluno_id === a.id && EM_CURSO.includes(m.status)).length,
        certificados_emitidos: certificadosRaw.filter(c => c.aluno_id === a.id).length,
      }));

      const treinamentos: TreinamentoCorpItem[] = turmas.map((t: any) => {
        const daTurma = matriculas.filter(m => m.turma_id === t.id);
        return {
          id: t.id, titulo: t.titulo,
          curso_nome: cursoNomePorId[t.curso_id] ?? '—',
          status: t.status, inicio: t.inicio, fim: t.fim, local: t.local,
          total_alunos: daTurma.length,
          concluidos: daTurma.filter(m => m.status === 'concluida').length,
        };
      }).sort((a, b) => (b.inicio ?? '').localeCompare(a.inicio ?? ''));

      const certificados: CertificadoCorp[] = certificadosRaw.map((c: any) => ({
        id: c.id, codigo: c.codigo,
        aluno_nome: c.aluno_nome ?? nomePorAluno[c.aluno_id] ?? '—',
        curso_nome: c.curso_nome ?? '—',
        emitido_em: c.emitido_em, validade_em: c.validade_em, url_pdf: c.url_pdf,
      }));

      // Caducidade: é isto que faz a empresa voltar a contratar a tempo.
      const hoje = new Date().toISOString().slice(0, 10);
      const daquiA90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
      const vencidos = certificados.filter(c => c.validade_em && c.validade_em < hoje).length;
      const vencendo = certificados.filter(c => c.validade_em && c.validade_em >= hoje && c.validade_em <= daquiA90).length;

      return {
        cliente,
        contacto: { id: contacto.id, nome: contacto.nome, cargo: contacto.cargo, email: contacto.email },
        contratos: contratos ?? [],
        alunos: alunosItens,
        treinamentos,
        certificados,
        // Quantos formandos já foram indicados por pedido. Conta-se pelas
        // matrículas da turma que pertencem a esta empresa — não se guarda um
        // contador, que seria mais uma coisa a poder ficar dessincronizada.
        pedidos: ((pedidos ?? []) as any[]).map(p => ({
          ...p,
          indicados: p.turma_id
            ? matriculas.filter(m => m.turma_id === p.turma_id).length
            : 0,
        })),
        // Ordem: primeiro os recorrentes, depois os eventuais, depois o resto.
        // Dentro de cada grupo, por nome.
        cursos: ((cursos ?? []) as any[])
          .map(c => ({ ...c, perfil: nivelPorCurso[c.id] ?? null }))
          .sort((a, b) => {
            const peso = (p: string | null) => (p === 'sim' ? 0 : p === 'eventual' ? 1 : 2);
            return peso(a.perfil) - peso(b.perfil) || a.nome.localeCompare(b.nome);
          }),
        kpis: {
          totalAlunos: alunosItens.length,
          emFormacao: matriculas.filter(m => EM_CURSO.includes(m.status)).length,
          certificados: certificados.length,
          vencendo,
          vencidos,
          contratosAtivos: (contratos ?? []).filter((c: any) => c.status === 'ativo').length,
          pedidosAbertos: (pedidos ?? []).filter((p: any) => ['pedido', 'em_analise'].includes(p.estado)).length,
        },
      };
    },
  });
}

export interface NovoPedido {
  cliente_id: string;
  empresa_id: string;
  curso_id: string | null;
  curso_nome: string;
  n_formandos: number | null;
  modalidade: string | null;
  local_pretendido: string | null;
  data_pretendida: string | null;
  observacoes: string | null;
  pedido_por: string | null;
}

/** Submete um pedido de orçamento de formação. */
export function useCriarPedidoFormacao() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (p: NovoPedido) => {
      // O número vem da base de dados: atómico, e nunca dois pedidos iguais.
      const { data: numero, error: errNum } = await (supabase.rpc as any)(
        'school_gerar_numero_pedido', { p_cliente_id: p.cliente_id }
      );
      if (errNum) throw new Error(`Não foi possível numerar o pedido: ${errNum.message}`);

      const { data, error } = await (supabase as any)
        .from('school_pedidos_formacao')
        .insert({ ...p, numero })
        .select('id, numero');
      if (error) throw error;
      // RLS a bloquear devolve sucesso com zero linhas, não erro.
      if (!data?.length) throw new Error('O pedido não foi gravado — sem permissão sobre este cliente.');
      return data[0].numero as string;
    },
    onSuccess: (numero) => {
      qc.invalidateQueries({ queryKey: ['portal_corporativo'] });
      toast({ title: `Pedido ${numero} enviado`, description: 'O ITC recebeu o seu pedido e vai responder com uma proposta.' });
    },
    onError: (e: Error) => toast({ title: 'Erro ao enviar o pedido', description: e.message, variant: 'destructive' }),
  });
}
