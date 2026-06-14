import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

export interface ClienteCorpInfo {
  id: string;
  nome: string;
  responsavel: string | null;
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

export interface PortalCorpData {
  cliente: ClienteCorpInfo | null;
  alunos: AlunoCorpItem[];
  treinamentos: TreinamentoCorpItem[];
  certificados: CertificadoCorp[];
  kpis: { totalAlunos: number; emFormacao: number; certificados: number; vencendo: number };
}

export function usePortalCorporativo(clienteCorpId?: string) {
  const { empresa } = useEmpresa();

  return useQuery({
    queryKey: ['portal_corporativo', empresa?.id, clienteCorpId],
    queryFn: async (): Promise<PortalCorpData> => {
      const empty: PortalCorpData = {
        cliente: null, alunos: [], treinamentos: [], certificados: [],
        kpis: { totalAlunos: 0, emFormacao: 0, certificados: 0, vencendo: 0 },
      };
      if (!clienteCorpId) return empty;

      const { data: cliente } = await (supabase as any)
        .from('school_clientes_corp')
        .select('id, nome, responsavel')
        .eq('id', clienteCorpId)
        .eq('empresa_id', empresa!.id)
        .maybeSingle();
      if (!cliente) return empty;

      // Alunos cujo empresa_trabalho inclui o nome do cliente
      const { data: alunosRaw = [] } = await (supabase as any)
        .from('school_alunos')
        .select('id, nome, email, cpf, status')
        .eq('empresa_id', empresa!.id)
        .ilike('empresa_trabalho', `%${cliente.nome}%`);

      const alunoIds = (alunosRaw as any[]).map((a: any) => a.id);
      let matriculasRaw: any[] = [];
      let certificadosRaw: any[] = [];

      if (alunoIds.length) {
        const [{ data: mr = [] }, { data: cr = [] }] = await Promise.all([
          (supabase as any).from('school_matriculas').select('id, aluno_id, turma_id, status').in('aluno_id', alunoIds).eq('empresa_id', empresa!.id),
          (supabase as any).from('school_certificados').select('id, codigo, aluno_id, turma_id, emitido_em, validade_em, url_pdf').in('aluno_id', alunoIds).eq('empresa_id', empresa!.id).order('emitido_em', { ascending: false }),
        ]);
        matriculasRaw = mr;
        certificadosRaw = cr;
      }

      const turmaIds = [...new Set([...matriculasRaw.map((m: any) => m.turma_id), ...certificadosRaw.map((c: any) => c.turma_id)].filter(Boolean))];
      let turmasMap: Record<string, any> = {};
      let cursosMap: Record<string, string> = {};
      if (turmaIds.length) {
        const { data: ts } = await (supabase as any).from('school_turmas').select('id, titulo, status, inicio, fim, curso_id').in('id', turmaIds);
        turmasMap = Object.fromEntries((ts || []).map((t: any) => [t.id, t]));
        const cursoIds = [...new Set((ts || []).map((t: any) => t.curso_id).filter(Boolean))];
        if (cursoIds.length) {
          const { data: cs } = await (supabase as any).from('school_cursos').select('id, nome').in('id', cursoIds);
          cursosMap = Object.fromEntries((cs || []).map((c: any) => [c.id, c.nome]));
        }
      }

      const alunosMap = Object.fromEntries((alunosRaw as any[]).map((a: any) => [a.id, a.nome]));

      const matsByAluno: Record<string, any[]> = {};
      matriculasRaw.forEach((m: any) => {
        if (!matsByAluno[m.aluno_id]) matsByAluno[m.aluno_id] = [];
        matsByAluno[m.aluno_id].push(m);
      });
      const certsByAluno: Record<string, number> = {};
      certificadosRaw.forEach((c: any) => { certsByAluno[c.aluno_id] = (certsByAluno[c.aluno_id] ?? 0) + 1; });

      const alunos: AlunoCorpItem[] = (alunosRaw as any[]).map((a: any) => ({
        id: a.id, nome: a.nome, email: a.email, cpf: a.cpf, status: a.status,
        cursos_em_andamento: (matsByAluno[a.id] ?? []).filter((m: any) => ['confirmada', 'em_andamento'].includes(m.status)).length,
        certificados_emitidos: certsByAluno[a.id] ?? 0,
      }));

      const matsByTurma: Record<string, { total: number; concluidos: number }> = {};
      matriculasRaw.forEach((m: any) => {
        if (!matsByTurma[m.turma_id]) matsByTurma[m.turma_id] = { total: 0, concluidos: 0 };
        matsByTurma[m.turma_id].total++;
        if (m.status === 'concluida') matsByTurma[m.turma_id].concluidos++;
      });

      const treinamentosSet = new Set<string>(matriculasRaw.map((m: any) => m.turma_id));
      const treinamentos: TreinamentoCorpItem[] = [...treinamentosSet].map(tid => {
        const t = turmasMap[tid] ?? {};
        const stats = matsByTurma[tid] ?? { total: 0, concluidos: 0 };
        return {
          id: tid, titulo: t.titulo ?? '—', curso_nome: cursosMap[t.curso_id] ?? '—',
          status: t.status ?? '—', inicio: t.inicio, fim: t.fim,
          total_alunos: stats.total, concluidos: stats.concluidos,
        };
      });

      const certificados: CertificadoCorp[] = (certificadosRaw as any[]).map((c: any) => ({
        id: c.id, codigo: c.codigo,
        aluno_nome: alunosMap[c.aluno_id] ?? '—',
        curso_nome: cursosMap[turmasMap[c.turma_id]?.curso_id] ?? '—',
        emitido_em: c.emitido_em, validade_em: c.validade_em, url_pdf: c.url_pdf,
      }));

      const hoje = new Date();
      const em30dias = new Date(hoje); em30dias.setDate(hoje.getDate() + 30);
      const vencendo = certificados.filter(c => {
        if (!c.validade_em) return false;
        const v = new Date(c.validade_em + 'T23:59:59');
        return v >= hoje && v <= em30dias;
      }).length;

      return {
        cliente,
        alunos,
        treinamentos,
        certificados,
        kpis: {
          totalAlunos: alunos.length,
          emFormacao: alunos.filter(a => a.cursos_em_andamento > 0).length,
          certificados: certificados.length,
          vencendo,
        },
      };
    },
    enabled: !!empresa?.id && !!clienteCorpId,
  });
}
