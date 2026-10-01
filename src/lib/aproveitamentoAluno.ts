import { supabase } from '@/integrations/supabase/client';

/**
 * Nota e frequência do aluno numa turma, para irem no certificado.
 *
 * Vêm de `school_avaliacoes` e `school_frequencia`. Sem nenhuma avaliação
 * registada, vale a `nota_final` escrita na matrícula — é assim que o ITC
 * lança a nota na prática. (A coluna só passou a existir na base a 15/09/2026:
 * estava no ficheiro de migração mas nunca tinha sido aplicada, e a ficha de
 * matrícula falhava ao gravar por causa disso.)
 *
 * Regra da casa que isto reforça: confirmar contra a base, nunca contra o
 * `types.ts` — e agora também nunca contra o próprio ficheiro de migração.
 */

export interface Aproveitamento {
  /** Média das avaliações, arredondada a duas casas. Null se não houve nenhuma. */
  nota: number | null;
  /** Percentagem de presenças. Null se não houve registo de frequência. */
  frequencia: number | null;
}

export async function aproveitamentoDoAluno(
  alunoId: string,
  turmaId: string,
): Promise<Aproveitamento> {
  const vazio: Aproveitamento = { nota: null, frequencia: null };
  if (!alunoId || !turmaId) return vazio;

  // A matrícula é a chave: é ela que liga o aluno à turma, e é a ela que as
  // avaliações e as presenças estão presas.
  const { data: matricula } = await (supabase.from('school_matriculas' as any) as any)
    .select('id, nota_final')
    .eq('aluno_id', alunoId)
    .eq('turma_id', turmaId)
    .maybeSingle();

  if (!matricula?.id) return vazio;

  const [{ data: avaliacoes }, { data: presencas }] = await Promise.all([
    (supabase.from('school_avaliacoes' as any) as any)
      .select('nota').eq('matricula_id', matricula.id),
    (supabase.from('school_frequencia' as any) as any)
      .select('presente').eq('matricula_id', matricula.id),
  ]);

  const notas = (avaliacoes ?? [])
    .map((a: any) => Number(a.nota))
    .filter((n: number) => Number.isFinite(n));

  const notaMatricula = Number(matricula.nota_final);
  const nota = notas.length
    ? Math.round((notas.reduce((s: number, n: number) => s + n, 0) / notas.length) * 100) / 100
    : (Number.isFinite(notaMatricula) && matricula.nota_final != null ? notaMatricula : null);

  const aulas = presencas ?? [];
  const frequencia = aulas.length
    ? Math.round((aulas.filter((p: any) => p.presente).length / aulas.length) * 10000) / 100
    : null;

  return { nota, frequencia };
}
