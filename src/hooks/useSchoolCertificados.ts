import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { gerarCodigoCertificado, guardarPDF } from '@/lib/certificadoEmissao';

export interface SchoolCertificado {
  id: string;
  empresa_id: string;
  aluno_id: string;
  turma_id: string;
  docente_id: string | null;
  codigo: string;
  emitido_em: string;
  validade_em: string | null;
  url_pdf: string | null;
  created_at: string;
  aluno_nome?: string;
  turma_titulo?: string;
  curso_nome?: string;
  docente_nome?: string;
}

export type SchoolCertificadoInput = Omit<SchoolCertificado, 'id' | 'empresa_id' | 'created_at' | 'aluno_nome' | 'turma_titulo' | 'curso_nome' | 'docente_nome'>;

const TABLE = 'school_certificados' as any;

export function useSchoolCertificados() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: certificados = [], isLoading } = useQuery<SchoolCertificado[]>({
    queryKey: ['school_certificados', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE).select('*')
        .eq('empresa_id', empresa!.id)
        .order('emitido_em', { ascending: false });
      if (error) throw error;

      const rows = data || [];
      const alunoIds = [...new Set(rows.map((r: any) => r.aluno_id).filter(Boolean))];
      const turmaIds = [...new Set(rows.map((r: any) => r.turma_id).filter(Boolean))];
      const docenteIds = [...new Set(rows.map((r: any) => r.docente_id).filter(Boolean))];

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
      let docentesMap: Record<string, string> = {};
      if (docenteIds.length) {
        const { data: ds } = await supabase.from('school_docentes' as any).select('id,nome').in('id', docenteIds);
        docentesMap = Object.fromEntries((ds || []).map((d: any) => [d.id, d.nome]));
      }

      // O instantâneo gravado no certificado manda sobre as tabelas ligadas:
      // se o aluno mudar de nome, o certificado emitido continua a dizer o
      // nome com que foi emitido.
      return rows.map((r: any) => ({
        ...r,
        aluno_nome: r.aluno_nome ?? alunosMap[r.aluno_id] ?? '—',
        turma_titulo: turmasMap[r.turma_id]?.titulo ?? '—',
        curso_nome: r.curso_nome ?? cursosMap[turmasMap[r.turma_id]?.curso_id] ?? '—',
        docente_nome: r.docente_nome ?? docentesMap[r.docente_id] ?? null,
      })) as SchoolCertificado[];
    },
  });

  /**
   * Grava o certificado já emitido.
   *
   * O código vem da base de dados (atómico e não adivinhável) e o PDF tem de
   * chegar cá: um certificado sem documento não é um certificado. Se o upload
   * falhar, a emissão falha — antes gravava-se a linha na mesma e ficava a
   * apontar para um ficheiro inexistente.
   */
  const emitirCertificado = useMutation({
    mutationFn: async (
      input: Omit<SchoolCertificadoInput, 'codigo'> & {
        codigo: string;
        pdfBlob: Blob;
        snapshot?: Record<string, unknown>;
      }
    ) => {
      const { pdfBlob, snapshot, codigo, url_pdf: _ignorado, ...rest } = input;
      if (!empresa) throw new Error('Sem empresa ativa.');

      const path = await guardarPDF(empresa.id, codigo, pdfBlob);

      const { data, error } = await supabase
        .from(TABLE)
        .insert({ ...rest, ...(snapshot ?? {}), codigo, url_pdf: path, empresa_id: empresa.id })
        .select('id');
      // RLS a bloquear devolve sucesso com zero linhas, não erro.
      if (error) throw error;
      if (!data?.length) throw new Error('A gravação não devolveu nenhuma linha — sem permissão sobre esta empresa.');
      return codigo;
    },
    onSuccess: (codigo) => { qc.invalidateQueries({ queryKey: ['school_certificados'] }); toast({ title: `Certificado emitido — ${codigo}` }); },
    onError: (e: Error) => toast({ title: 'Erro ao emitir', description: e.message, variant: 'destructive' }),
  });

  const deleteCertificado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_certificados'] }); toast({ title: 'Certificado removido' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { certificados, isLoading, emitirCertificado, deleteCertificado, gerarCodigoCertificado };
}
