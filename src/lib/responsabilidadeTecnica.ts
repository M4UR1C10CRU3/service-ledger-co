/**
 * Responsabilidade técnica no certificado.
 *
 * O TRT é uma afirmação legal: diz que aquela formação foi dada sob a
 * responsabilidade de um técnico registado, e que a norma em causa está entre
 * as que o termo cobre. Por isso não se imprime o número do TRT às cegas —
 * imprime-se quando é verdade.
 *
 * A regra tem dois degraus, de propósito:
 *   · o RESPONSÁVEL TÉCNICO aparece sempre que a escola o tenha configurado —
 *     ele é o responsável da escola, independentemente do curso;
 *   · o NÚMERO DO TRT só aparece se a NR do curso estiver coberta pelo termo E
 *     a data de emissão estiver dentro da vigência.
 *
 * Se em vez disso a linha inteira desaparecesse quando a NR não bate certo,
 * ninguém perceberia porquê e seria reportado como avaria.
 */

export interface ResponsavelTecnico {
  nome?: string | null;
  titulo?: string | null;
  conselho?: string | null;
  registo?: string | null;
  trtNumero?: string | null;
  trtValidade?: string | null;
  trtNrs?: string[] | null;
}

/**
 * Reduz o nome de um curso ao código canónico da norma que ele ensina.
 *
 * Apanha "NR-35", "NR 35", "NR35" e o caso especial do SEP, que é uma
 * qualificação da NR-10 e não uma norma à parte. Devolve null quando o curso
 * não é de nenhuma NR — uma formação livre não deixa de poder ser dada, apenas
 * não invoca o termo.
 */
export function codigoNormaDoCurso(...partes: (string | null | undefined)[]): string | null {
  const texto = partes.filter(Boolean).join(' ').toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  const m = texto.match(/\bNR\s*-?\s*(\d{1,2})\b/);
  if (m) {
    const n = m[1].padStart(2, '0');
    // SEP é a NR-10 aplicada ao Sistema Elétrico de Potência e tem cobertura
    // própria no termo — tratá-la como NR-10 simples seria afirmar de mais.
    if (n === '10' && /\bSEP\b/.test(texto)) return 'NR-10-SEP';
    return `NR-${n}`;
  }

  if (/DIRECAO\s+DEFENSIVA/.test(texto)) return 'DIRECAO-DEFENSIVA';
  if (/PRIMEIROS\s+SOCORROS/.test(texto)) return 'PRIMEIROS-SOCORROS';

  return null;
}

export interface LinhaResponsabilidade {
  /** Primeira linha: quem é o responsável técnico. */
  responsavel: string;
  /** Segunda linha: registo no conselho e, quando aplicável, o TRT. */
  registo: string;
  /** Falso quando o TRT existe mas não pode ser invocado neste certificado. */
  trtInvocado: boolean;
}

export function linhaResponsabilidadeTecnica(
  rt: ResponsavelTecnico,
  curso: { nome?: string | null; categoria?: string | null },
  emitidoEm: string | Date,
): LinhaResponsabilidade | null {
  if (!rt?.nome) return null;

  const responsavel = rt.titulo
    ? `Responsabilidade Técnica: ${rt.nome} — ${rt.titulo}`
    : `Responsabilidade Técnica: ${rt.nome}`;

  const pedacos: string[] = [];
  if (rt.conselho && rt.registo) pedacos.push(`${rt.conselho} n.º ${rt.registo}`);
  else if (rt.registo) pedacos.push(`Registo n.º ${rt.registo}`);

  // ── O TRT só entra se for verdade ──────────────────────────────────────────
  let trtInvocado = false;
  if (rt.trtNumero) {
    const data = typeof emitidoEm === 'string' ? new Date(emitidoEm) : emitidoEm;
    const dentroDaVigencia = !rt.trtValidade
      || (!Number.isNaN(data.getTime()) && data <= new Date(rt.trtValidade + 'T23:59:59'));

    const norma = codigoNormaDoCurso(curso?.nome, curso?.categoria);
    const lista = rt.trtNrs ?? [];
    // Sem lista declarada, o termo não limita normas: aceita-se.
    const normaCoberta = lista.length === 0 || (norma !== null && lista.includes(norma));

    if (dentroDaVigencia && normaCoberta) {
      pedacos.push(`TRT n.º ${rt.trtNumero}`);
      trtInvocado = true;
    }
  }

  return { responsavel, registo: pedacos.join(' · '), trtInvocado };
}
