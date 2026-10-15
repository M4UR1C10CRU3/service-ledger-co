/**
 * Horas úteis para os prazos de SLA (Clariza Labs · Infra).
 *
 * Um contrato «8 horas de resposta em dias úteis» não se conta no relógio de
 * parede: um pedido que entra na sexta às 17h tem de ser respondido até segunda
 * às 16h (1h na sexta + 7h na segunda), e não no sábado à 1h da manhã. Aqui faz-se essa
 * conta, janela a janela, saltando fins de semana e feriados.
 *
 * Janelas por horário do contrato:
 *   uteis     — segunda a sexta, 9h–18h
 *   alargado  — segunda a sábado, 8h–22h
 *   24x7      — sempre (relógio de parede)
 *
 * Feriados: os nacionais de Portugal, calculados (incluindo os móveis, que
 * dependem da Páscoa), mais os que a empresa registar na tabela `feriados`
 * (ex.: o municipal).
 */
export type Horario = 'uteis' | 'alargado' | '24x7';

const JANELA: Record<Exclude<Horario, '24x7'>, { dias: number[]; abre: number; fecha: number }> = {
  uteis:    { dias: [1, 2, 3, 4, 5],    abre: 9, fecha: 18 },
  alargado: { dias: [1, 2, 3, 4, 5, 6], abre: 8, fecha: 22 },
};

export const ROTULO_HORARIO: Record<Horario, string> = {
  uteis: 'Dias úteis, 9h–18h',
  alargado: 'Segunda a sábado, 8h–22h',
  '24x7': '24 horas, 7 dias',
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/** Feriados nacionais obrigatórios de Portugal num ano (datas ISO). */
export function feriadosPT(ano: number): string[] {
  const p = pascoa(ano);
  const desloca = (dias: number) => { const d = new Date(p); d.setDate(d.getDate() + dias); return iso(d); };
  return [
    `${ano}-01-01`, desloca(-2) /* Sexta-feira Santa */, iso(p) /* Páscoa */, `${ano}-04-25`, `${ano}-05-01`,
    desloca(60) /* Corpo de Deus */, `${ano}-06-10`, `${ano}-08-15`, `${ano}-10-05`, `${ano}-11-01`,
    `${ano}-12-01`, `${ano}-12-08`, `${ano}-12-25`,
  ];
}

/** Conjunto de feriados para os anos à volta de hoje, mais os da empresa. */
export function conjuntoFeriados(extra: string[] = []): Set<string> {
  const ano = new Date().getFullYear();
  return new Set([...feriadosPT(ano - 1), ...feriadosPT(ano), ...feriadosPT(ano + 1), ...extra]);
}

/** Intervalos de trabalho [início, fim] (em ms) do dia `d`, ou [] se não se trabalha. */
function janelaDoDia(d: Date, horario: Exclude<Horario, '24x7'>, feriados: Set<string>): [number, number] | null {
  const j = JANELA[horario];
  if (!j.dias.includes(d.getDay()) || feriados.has(iso(d))) return null;
  const a = new Date(d); a.setHours(j.abre, 0, 0, 0);
  const b = new Date(d); b.setHours(j.fecha, 0, 0, 0);
  return [a.getTime(), b.getTime()];
}

/** O momento em que se esgotam `horas` úteis a contar de `inicio`. */
export function somarHorasUteis(inicio: Date, horas: number, horario: Horario, feriados: Set<string>): Date {
  if (horario === '24x7') return new Date(inicio.getTime() + horas * 36e5);
  let falta = horas * 36e5;
  const dia = new Date(inicio); dia.setHours(0, 0, 0, 0);
  for (let i = 0; i < 400; i++) {
    const w = janelaDoDia(dia, horario, feriados);
    if (w) {
      const de = Math.max(w[0], inicio.getTime());
      if (de < w[1]) {
        const cabe = w[1] - de;
        if (falta <= cabe) return new Date(de + falta);
        falta -= cabe;
      }
    }
    dia.setDate(dia.getDate() + 1);
  }
  return new Date(inicio.getTime() + horas * 36e5); // salvaguarda: nunca devia chegar aqui
}

/** Milissegundos úteis entre `a` e `b` (0 se b ≤ a). */
export function msUteisEntre(a: Date, b: Date, horario: Horario, feriados: Set<string>): number {
  if (b <= a) return 0;
  if (horario === '24x7') return b.getTime() - a.getTime();
  let total = 0;
  const dia = new Date(a); dia.setHours(0, 0, 0, 0);
  while (dia.getTime() <= b.getTime()) {
    const w = janelaDoDia(dia, horario, feriados);
    if (w) total += Math.max(0, Math.min(w[1], b.getTime()) - Math.max(w[0], a.getTime()));
    dia.setDate(dia.getDate() + 1);
  }
  return total;
}
