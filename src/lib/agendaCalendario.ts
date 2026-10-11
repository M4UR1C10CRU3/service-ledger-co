/**
 * Levar a agenda da escola para o calendário de cada um.
 *
 * Duas vias, porque servem necessidades diferentes:
 *
 *  · ADICIONAR UM COMPROMISSO — abre o Google Agenda com o evento preenchido.
 *    Serve para o instrutor pôr uma turma na sua agenda pessoal e receber lá o
 *    aviso. É uma cópia: se a turma mudar de data, a cópia não muda.
 *
 *  · SUBSCREVER A AGENDA — um endereço que o Google visita sozinho de tempos a
 *    tempos. Acompanha as alterações, mas exige um endereço público, e por isso
 *    leva um segredo por pessoa que pode ser trocado.
 *
 * O ficheiro .ics descarregado serve para importar de uma vez em qualquer
 * calendário — Google, Outlook ou Apple.
 */

export interface EventoAgenda {
  id: string;
  titulo: string;
  curso_nome: string | null;
  inicio: string | null;
  fim: string | null;
  local: string | null;
  docente_nome: string | null;
  cliente_nome: string | null;
  n_alunos: number | null;
}

/** AAAA-MM-DD -> AAAAMMDD, o formato de data solta do iCalendar. */
function paraDataICS(d: string): string {
  return d.slice(0, 10).replace(/-/g, '');
}

/** O fim de um evento de dia inteiro é exclusivo: soma-se um dia. */
function diaSeguinte(d: string): string {
  const dt = new Date(`${d.slice(0, 10)}T00:00:00`);
  dt.setDate(dt.getDate() + 1);
  return paraDataICS(dt.toISOString());
}

function descricaoDe(e: EventoAgenda): string {
  const linhas = [
    e.curso_nome,
    e.docente_nome ? `Instrutor: ${e.docente_nome}` : null,
    e.cliente_nome ? `Empresa: ${e.cliente_nome}` : null,
    e.n_alunos ? `${e.n_alunos} formando${e.n_alunos !== 1 ? 's' : ''}` : null,
  ].filter(Boolean);
  return linhas.join('\n');
}

/** Link que abre o Google Agenda com o evento por confirmar. */
export function linkGoogleAgenda(e: EventoAgenda): string | null {
  if (!e.inicio) return null;
  const fim = e.fim ?? e.inicio;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${e.curso_nome ?? 'Formação'} — ${e.titulo}`,
    dates: `${paraDataICS(e.inicio)}/${diaSeguinte(fim)}`,
    details: descricaoDe(e),
    location: e.local ?? '',
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Escapa o que o iCalendar trata como separador. */
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function gerarICS(eventos: EventoAgenda[], nomeCalendario = 'Clariza School'): string {
  const agora = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const blocos = eventos
    .filter(e => e.inicio)
    .map(e => [
      'BEGIN:VEVENT',
      `UID:${e.id}@clariza.school`,
      `DTSTAMP:${agora}`,
      `DTSTART;VALUE=DATE:${paraDataICS(e.inicio!)}`,
      `DTEND;VALUE=DATE:${diaSeguinte(e.fim ?? e.inicio!)}`,
      `SUMMARY:${esc(`${e.curso_nome ?? 'Formação'} — ${e.titulo}`)}`,
      `DESCRIPTION:${esc(descricaoDe(e))}`,
      e.local ? `LOCATION:${esc(e.local)}` : null,
      // Aviso na véspera: uma formação não se prepara na própria manhã.
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Formação amanhã',
      'END:VALARM',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n'));

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Clariza//School//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(nomeCalendario)}`,
    'X-WR-TIMEZONE:America/Belem',
    ...blocos,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function descarregarICS(eventos: EventoAgenda[], nomeFicheiro = 'agenda-clariza-school.ics') {
  const blob = new Blob([gerarICS(eventos)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFicheiro;
  a.click();
  URL.revokeObjectURL(url);
}
