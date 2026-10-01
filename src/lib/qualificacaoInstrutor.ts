import { supabase } from '@/integrations/supabase/client';
import { codigoNormaDoCurso } from '@/lib/responsabilidadeTecnica';

/**
 * Qual das formações do instrutor deve aparecer NESTE certificado.
 *
 * Um instrutor acumula formações — Engenheiro de Segurança do Trabalho,
 * Bombeiro Civil, Supervisor de Brigada. Nem todas credenciam todos os cursos:
 * num NR-10, "Bombeiro Civil" não acrescenta nada e, a mais, dilui o que
 * interessa. Imprime-se a interseção entre o que ele tem e o que a norma pede.
 *
 * Quando a interseção é vazia, NÃO se inventa: devolve-se lista vazia e o
 * certificado imprime o nome do instrutor sozinho. Um aviso a tempo vale mais
 * do que uma credencial que ninguém confirmou.
 */

export interface FormacaoRelevante {
  nome: string;
  sigla: string | null;
  conselho: string | null;
  registo: string | null;
  /** Ordem no catálogo — quanto menor, mais alto o título. */
  ordem?: number;
}

/**
 * "Engenheiro Eletricista — CREA/AP 0320008916"
 *
 * O conselho só se prefixa se o número ainda não o trouxer. Quem preenche
 * escreve muitas vezes "CREA/AP 0320008916" no campo do registo, e o resultado
 * era "CREA CREA/AP 0320008916" — o nome do conselho duas vezes.
 */
export function descreverFormacao(f: FormacaoRelevante): string {
  if (!f.registo) return f.nome;

  const registo = f.registo.trim();
  const conselho = (f.conselho ?? '').trim();
  const jaTemConselho =
    conselho !== '' &&
    registo.toUpperCase().includes(conselho.toUpperCase());

  const credencial = jaTemConselho || !conselho ? registo : `${conselho} ${registo}`;
  return `${f.nome} — ${credencial}`;
}

export interface QualificacaoDoCertificado {
  /** Só as formações que credenciam a norma deste curso. */
  relevantes: FormacaoRelevante[];
  /** Todas as que o instrutor tem — para o ecrã poder explicar o que ficou de fora. */
  todas: FormacaoRelevante[];
  /** Norma lida do curso; null quando o curso não é de nenhuma NR. */
  norma: string | null;
  /** Uma linha pronta a imprimir, ou null se não há nada credenciado. */
  linha: string | null;
}

export async function qualificacaoParaCertificado(
  docenteId: string | null | undefined,
  curso: { nome?: string | null; categoria?: string | null },
): Promise<QualificacaoDoCertificado> {
  const vazio: QualificacaoDoCertificado = { relevantes: [], todas: [], norma: null, linha: null };
  if (!docenteId) return vazio;

  const norma = codigoNormaDoCurso(curso?.nome, curso?.categoria);

  const { data: ligacoes } = await (supabase.from('school_docente_formacoes' as any) as any)
    .select('registo, formacao_id, school_formacoes(nome, sigla, conselho, ordem)')
    .eq('docente_id', docenteId);

  const todas: FormacaoRelevante[] = (ligacoes ?? []).map((l: any) => ({
    nome: l.school_formacoes?.nome ?? '—',
    sigla: l.school_formacoes?.sigla ?? null,
    conselho: l.school_formacoes?.conselho ?? null,
    registo: l.registo ?? null,
  }));

  if (!norma || todas.length === 0) return { ...vazio, todas, norma };

  // Que formações credenciam esta norma.
  const { data: mapa } = await (supabase.from('school_formacao_normas' as any) as any)
    .select('formacao_id').eq('norma', norma);

  const credenciam = new Set((mapa ?? []).map((m: any) => m.formacao_id));
  const relevantes = (ligacoes ?? [])
    .filter((l: any) => credenciam.has(l.formacao_id))
    .map((l: any) => ({
      nome: l.school_formacoes?.nome ?? '—',
      sigla: l.school_formacoes?.sigla ?? null,
      conselho: l.school_formacoes?.conselho ?? null,
      registo: l.registo ?? null,
      ordem: l.school_formacoes?.ordem ?? 999,
    }))
    // O título mais alto primeiro — é o que credencia com mais força. A ordem
    // do catálogo já exprime isso: Engenheiro de Segurança do Trabalho é 10,
    // Técnico é 20. Sem isto, a ordem seria a de inserção na ficha, que não
    // quer dizer nada.
    .sort((a: FormacaoRelevante, b: FormacaoRelevante) => (a.ordem ?? 999) - (b.ordem ?? 999));

  return {
    relevantes,
    todas,
    norma,
    linha: relevantes.length ? relevantes.map(descreverFormacao).join(' · ') : null,
  };
}

/**
 * Título do responsável técnico para ESTE curso.
 *
 * A linha do TRT diz quem assinou o termo no conselho. O título que a acompanha
 * deve ser a modalidade registada nesse conselho que credencia a norma do curso
 * — na NR-10, «Técnico em Eletrotécnica». Só contam formações do mesmo conselho
 * do registo (CRT com CRT): um título registado no MTE ao lado de um número do
 * CRT seria uma incoerência que uma auditoria apanha.
 *
 * Quando nenhuma modalidade do conselho credencia a norma (Direção Defensiva,
 * por exemplo), imprime-se o título genérico configurado na empresa —
 * «Técnico Industrial» — que é verdadeiro para todos os cursos do termo.
 */
export async function tituloResponsavelTecnico(
  config: { cert_rt_docente_id?: string | null; cert_rt_conselho?: string | null; cert_rt_titulo?: string | null },
  curso: { nome?: string | null; categoria?: string | null },
): Promise<string | null> {
  const generico = config.cert_rt_titulo ?? null;
  if (!config.cert_rt_docente_id) return generico;
  const norma = codigoNormaDoCurso(curso?.nome, curso?.categoria);
  if (!norma) return generico;

  const letras = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  const conselhoRT = letras(config.cert_rt_conselho);

  const [{ data: ligacoes }, { data: mapa }] = await Promise.all([
    (supabase.from('school_docente_formacoes' as any) as any)
      .select('formacao_id, school_formacoes(nome, conselho, ordem)').eq('docente_id', config.cert_rt_docente_id),
    (supabase.from('school_formacao_normas' as any) as any).select('formacao_id').eq('norma', norma),
  ]);
  const credenciam = new Set((mapa ?? []).map((m: any) => m.formacao_id));
  const titulos = (ligacoes ?? [])
    .filter((l: any) => credenciam.has(l.formacao_id))
    .filter((l: any) => !conselhoRT || letras(l.school_formacoes?.conselho).startsWith(conselhoRT.slice(0, 3)))
    .sort((a: any, b: any) => (a.school_formacoes?.ordem ?? 999) - (b.school_formacoes?.ordem ?? 999))
    .map((l: any) => l.school_formacoes?.nome)
    .filter(Boolean);
  return titulos.length ? titulos.join(' e ') : generico;
}
