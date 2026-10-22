import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { contextoSemRepetir, fraseDaAuditoria, moduloDe, rotuloCampo, formatarValor, type RegistoAuditoria } from '@/lib/auditoriaFrases';

/**
 * Exportação do relatório «Atividade dos utilizadores».
 * Excel: uma linha por registo, com a frase e o antes/depois de cada campo.
 * PDF: A4 deitado, para imprimir ou anexar — frase e contexto, sem o detalhe técnico.
 */

export interface ContextoExportacao {
  nomeEmpresa: (r: RegistoAuditoria) => string;
  moedaEmpresa: (id: string | null) => string;
  /** Linha que descreve os filtros aplicados (vai para o cabeçalho). */
  filtros: string;
  geradoPor: string;
}

const quandoLegivel = (r: RegistoAuditoria) => format(parseISO(r.quando), 'dd/MM/yyyy HH:mm:ss');
const operacaoLegivel = { INSERT: 'Criou', UPDATE: 'Alterou', DELETE: 'Apagou' } as const;

function alteracoes(r: RegistoAuditoria, moeda: string): string {
  const campos = r.operacao === 'UPDATE' ? r.campos ?? [] : Object.keys((r.depois ?? r.antes ?? {}) as object);
  const antes = (r.antes ?? {}) as Record<string, unknown>;
  const depois = (r.depois ?? {}) as Record<string, unknown>;
  return campos.map(c => r.operacao === 'UPDATE'
    ? `${rotuloCampo(c)}: ${formatarValor(c, antes[c], moeda, false)} → ${formatarValor(c, depois[c], moeda, false)}`
    : `${rotuloCampo(c)}: ${formatarValor(c, (r.operacao === 'INSERT' ? depois : antes)[c], moeda, false)}`).join('\n');
}

export function exportarExcel(registos: RegistoAuditoria[], ctx: ContextoExportacao) {
  const linhas = registos.map(r => {
    const moeda = ctx.moedaEmpresa(r.empresa_id);
    return {
      'Data/hora': quandoLegivel(r),
      Utilizador: r.autor_nome,
      'E-mail': r.autor_email ?? '',
      Empresa: ctx.nomeEmpresa(r),
      Módulo: moduloDe(r.tabela),
      Ação: operacaoLegivel[r.operacao],
      Descrição: `${r.autor_nome} ${fraseDaAuditoria(r, moeda)}`,
      Contexto: r.contexto ?? '',
      'Alterações (antes → depois)': alteracoes(r, moeda),
      Automática: r.automatica ? 'sim' : '',
      Tabela: r.tabela,
      'Id do registo': r.registo_id ?? '',
      Sessão: r.sessao_id ?? '',
      IP: r.ip ?? '',
    };
  });
  const ws = XLSX.utils.json_to_sheet(linhas);
  ws['!cols'] = [{ wch: 19 }, { wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 9 }, { wch: 70 },
    { wch: 50 }, { wch: 70 }, { wch: 10 }, { wch: 24 }, { wch: 38 }, { wch: 38 }, { wch: 15 }];
  const capa = XLSX.utils.aoa_to_sheet([
    ['Atividade dos utilizadores — Clariza'],
    [`Gerado a ${format(new Date(), 'dd/MM/yyyy HH:mm')} por ${ctx.geradoPor}`],
    [`Filtros: ${ctx.filtros}`],
    [`${registos.length} registos`],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Atividade');
  XLSX.utils.book_append_sheet(wb, capa, 'Filtros');
  XLSX.writeFile(wb, `atividade-utilizadores_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
}

/**
 * As letras-padrão do PDF (Helvetica) só têm o alfabeto WinAnsi: acentos, «», €, – e … sim;
 * emojis, setas e o espaço fino que o Intl põe nos milhares não — sairiam como lixo.
 */
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
// espaço inseparável e espaços finos (o Intl pt-PT usa-os nos milhares e antes do €)
const ESPACOS_ESPECIAIS = new RegExp(`[${String.fromCharCode(0xa0, 0x202f, 0x2009)}]`, 'g');
function paraPDF(s: string): string {
  return s.replace(ESPACOS_ESPECIAIS, ' ').replace(/→/g, '->')
    .replace(/[^\t\n\r\x20-\xFF]/gu, ch => (WIN_ANSI_EXTRA.includes(ch) ? ch : ''));
}

export function exportarPDF(registos: RegistoAuditoria[], ctx: ContextoExportacao) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const margem = 12;
  // colunas: data | utilizador | empresa | módulo | o que fez (o resto)
  const col = [margem, margem + 30, margem + 72, margem + 112, margem + 146];
  const larguraFrase = largura - margem - col[4];
  let y = 0;

  const cabecalho = (primeira: boolean) => {
    y = margem;
    if (primeira) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text('Atividade dos utilizadores', margem, y + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90);
      doc.text(paraPDF(`Gerado a ${format(new Date(), 'dd/MM/yyyy HH:mm')} por ${ctx.geradoPor} · ${registos.length} registos`), margem, y + 10);
      doc.text(doc.splitTextToSize(paraPDF(`Filtros: ${ctx.filtros}`), largura - 2 * margem), margem, y + 14);
      y += 22;
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(40);
    ['Data/hora', 'Utilizador', 'Empresa', 'Módulo', 'O que fez'].forEach((t, i) => doc.text(t, col[i], y));
    doc.setDrawColor(180); doc.line(margem, y + 1.5, largura - margem, y + 1.5);
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(20);
  };

  cabecalho(true);
  for (const r of registos) {
    const moeda = ctx.moedaEmpresa(r.empresa_id);
    const frase = doc.splitTextToSize(paraPDF(fraseDaAuditoria(r, moeda) + (r.automatica ? ' (automático)' : '')), larguraFrase);
    const ctxTexto = contextoSemRepetir(r);
    const contexto = ctxTexto ? doc.splitTextToSize(paraPDF(ctxTexto), larguraFrase) : [];
    const autor = doc.splitTextToSize(paraPDF(r.autor_nome), 40);
    const empresa = doc.splitTextToSize(paraPDF(ctx.nomeEmpresa(r)), 38);
    const modulo = doc.splitTextToSize(moduloDe(r.tabela), 32);
    const nLinhas = Math.max(frase.length + contexto.length, autor.length, empresa.length, modulo.length);
    const alto = nLinhas * 3.6 + 2;
    if (y + alto > altura - margem) { doc.addPage(); cabecalho(false); }
    doc.setFontSize(8);
    doc.text(quandoLegivel(r), col[0], y);
    doc.text(autor, col[1], y);
    doc.text(empresa, col[2], y);
    doc.text(modulo, col[3], y);
    doc.text(frase, col[4], y);
    if (contexto.length) { doc.setTextColor(110); doc.text(contexto, col[4], y + frase.length * 3.6); doc.setTextColor(20); }
    y += alto;
    doc.setDrawColor(230); doc.line(margem, y - 2.4, largura - margem, y - 2.4);
  }
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p); doc.setFontSize(7.5); doc.setTextColor(130);
    doc.text(`Clariza · Atividade dos utilizadores · página ${p} de ${paginas}`, largura - margem, altura - 6, { align: 'right' });
  }
  doc.save(`atividade-utilizadores_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
}
