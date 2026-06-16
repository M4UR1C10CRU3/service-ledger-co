import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CertificadoPDFData {
  aluno_nome: string;
  aluno_cpf?: string | null;
  curso_nome: string;
  curso_categoria?: string | null;
  carga_horaria: number | null;
  horas_teoricas?: number | null;
  horas_praticas?: number | null;
  data_inicio?: string | null;
  emitido_em: string;
  validade_em?: string | null;
  docente_nome?: string | null;
  docente_assinatura_url?: string | null;
  codigo: string;
  empresa_nome: string;
  empresa_aplicacao?: string | null;
  conteudo_programatico?: { modulo: string; horas: number }[];
  objetivo?: string | null;
  metodologia?: string | null;
  reconhecimento?: string | null;
  aprovacao_minima?: number | null;
  validade_anos?: number | null;
  modulos_count?: number | null;
}

const W = 210;
const H = 297;

const PURPLE = [108, 48, 150] as [number, number, number];
const BLACK  = [15,  15,  15] as [number, number, number];
const DGRAY  = [80,  80,  80] as [number, number, number];
const LGRAY  = [160, 160, 160] as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];

const HEALTH_CATS = ['saude', 'resgate', 'saúde', 'emergência', 'emergencia', 'primeiros socorros', 'socorrismo'];

function isHealthCategory(cat?: string | null): boolean {
  if (!cat) return false;
  return HEALTH_CATS.some(h => cat.toLowerCase().includes(h));
}

function parseDate(d: string): Date | null {
  const clean = d.length === 10 ? d + 'T00:00:00' : d;
  const dt = new Date(clean);
  return isNaN(dt.getTime()) ? null : dt;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const dt = parseDate(d);
  if (!dt) return '—';
  try { return format(dt, 'dd/MM/yyyy', { locale: ptBR }); } catch { return '—'; }
}

async function loadImg(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function loadCursiveFont(doc: jsPDF): Promise<string | null> {
  try {
    const url = 'https://fonts.gstatic.com/s/greatvibes/v19/RWmMoKWR9v4ksMfaWd_JN9XLiaQoDmlH.ttf';
    const res = await fetch(url);
    if (!res.ok) throw new Error('font fetch failed');
    const buf = await res.arrayBuffer();
    const b64 = btoa(Array.from(new Uint8Array(buf)).map(b => String.fromCharCode(b)).join(''));
    doc.addFileToVFS('GreatVibes.ttf', b64);
    doc.addFont('GreatVibes.ttf', 'GreatVibes', 'normal');
    return 'GreatVibes';
  } catch { return null; }
}

function renderInlineText(
  doc: jsPDF,
  segments: { text: string; bold: boolean; color: [number, number, number] }[],
  y: number,
  fontSize: number
) {
  doc.setFontSize(fontSize);
  let totalW = 0;
  segments.forEach(s => {
    doc.setFont('helvetica', s.bold ? 'bold' : 'normal');
    totalW += doc.getTextWidth(s.text);
  });
  let x = W / 2 - totalW / 2;
  segments.forEach(s => {
    doc.setFont('helvetica', s.bold ? 'bold' : 'normal');
    doc.setTextColor(...s.color);
    doc.text(s.text, x, y);
    x += doc.getTextWidth(s.text);
  });
}

function drawCornerDecorations(doc: jsPDF) {
  const s1 = 50, s2 = 35, s3 = 20;

  // Canto inferior esquerdo: vermelho-laranja / laranja / amarelo
  doc.setFillColor(210, 55, 25);
  doc.triangle(0, H, s1, H, 0, H - s1, 'F');
  doc.setFillColor(255, 100, 0);
  doc.triangle(0, H, s2, H, 0, H - s2, 'F');
  doc.setFillColor(255, 210, 0);
  doc.triangle(0, H, s3, H, 0, H - s3, 'F');

  // Canto inferior direito: roxo escuro / roxo / violeta
  doc.setFillColor(90, 0, 130);
  doc.triangle(W, H, W - s1, H, W, H - s1, 'F');
  doc.setFillColor(140, 30, 180);
  doc.triangle(W, H, W - s2, H, W, H - s2, 'F');
  doc.setFillColor(190, 70, 200);
  doc.triangle(W, H, W - s3, H, W, H - s3, 'F');

  // Canto superior direito: verde escuro / verde médio
  doc.setFillColor(0, 110, 55);
  doc.triangle(W, 0, W - 30, 0, W, 30, 'F');
  doc.setFillColor(30, 160, 80);
  doc.triangle(W, 0, W - 18, 0, W, 18, 'F');

  // Canto superior esquerdo: laranja pequeno
  doc.setFillColor(210, 55, 25);
  doc.triangle(0, 0, 20, 0, 0, 20, 'F');
}

export async function generateCertificadoPDF(data: CertificadoPDFData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const base = window.location.origin;

  const [bgImg, logoItc, logoCentro, logoCee, logoDir, cursiveFont] = await Promise.all([
    loadImg(`${base}/assets/certificado/cert-background.jpg`),
    loadImg(`${base}/assets/certificado/logo-itc.png`),
    isHealthCategory(data.curso_categoria)
      ? loadImg(`${base}/assets/certificado/logo-nobre-urgencia.png`)
      : loadImg(`${base}/assets/certificado/logo-mais-com.png`),
    loadImg(`${base}/assets/certificado/logo-cee-ap.png`),
    loadImg(`${base}/assets/certificado/assinatura-diretor.png`),
    loadCursiveFont(doc),
  ]);

  // Assinatura instrutor: URL do docente ou fallback para PNG do director (teste)
  const logoInst = data.docente_assinatura_url
    ? await loadImg(data.docente_assinatura_url)
    : logoDir;

  // ════════════════════════════════════════════════════════════
  // PÁGINA 1 — CERTIFICADO
  // ════════════════════════════════════════════════════════════

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');

  // Watermark
  if (bgImg) {
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
    doc.addImage(bgImg, 'JPEG', 10, 40, W - 20, 190, undefined, 'FAST');
    doc.restoreGraphicsState();
  }

  drawCornerDecorations(doc);

  // ── Logos ──────────────────────────────────────────────────
  if (logoItc)    doc.addImage(logoItc,    'PNG', 12,      7,  30, 26, undefined, 'FAST');
  if (logoCentro) doc.addImage(logoCentro, 'PNG', W/2-16,  7,  32, 26, undefined, 'FAST');
  if (logoCee)    doc.addImage(logoCee,    'PNG', W-64,   11,  52, 20, undefined, 'FAST');

  // ── Título ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(52);
  doc.setTextColor(...BLACK);
  doc.text('CERTIFICADO', W / 2, 57, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...PURPLE);
  doc.text('DE CONCLUSÃO DE CURSO', W / 2, 70, { align: 'center' });

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(14, 78, W - 14, 78);

  // ── Texto introdutório ─────────────────────────────────────
  renderInlineText(doc, [
    { text: 'O ',                                                      bold: false, color: DGRAY },
    { text: 'Instituto de Treinamentos e resgate do Amapá - ITC',      bold: true,  color: BLACK },
    { text: ', confere este',                                           bold: false, color: DGRAY },
  ], 90, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...DGRAY);
  doc.text('certificado de conclusão de curso a:', W / 2, 100, { align: 'center' });

  // ── Nome do aluno ──────────────────────────────────────────
  const nameY = 124;
  if (cursiveFont) {
    doc.setFont(cursiveFont, 'normal');
    doc.setFontSize(40);
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(34);
  }
  doc.setTextColor(...BLACK);
  doc.text(data.aluno_nome, W / 2, nameY, { align: 'center' });

  // Linha roxa sob o nome
  doc.setFont('helvetica', 'normal');
  const nameLineW = Math.min(165, data.aluno_nome.length * 4.5 + 25);
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - nameLineW / 2, nameY + 4, W / 2 + nameLineW / 2, nameY + 4);

  // CPF
  if (data.aluno_cpf) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...BLACK);
    doc.text(`CPF:${data.aluno_cpf}`, W / 2, 136, { align: 'center' });
  }

  // ── Dados do curso ─────────────────────────────────────────
  renderInlineText(doc, [
    { text: 'Curso:  ', bold: true, color: BLACK },
    { text: data.curso_nome || '—', bold: true, color: BLACK },
  ], 152, 12);

  const chSegs: { text: string; bold: boolean; color: [number, number, number] }[] = [];
  if (data.carga_horaria) {
    chSegs.push({ text: 'Carga Horária: ', bold: true,  color: BLACK });
    chSegs.push({ text: `${data.carga_horaria}h`, bold: false, color: DGRAY });
    chSegs.push({ text: '   ', bold: false, color: DGRAY });
  }
  if (data.data_inicio) {
    chSegs.push({ text: 'Início: ', bold: true,  color: BLACK });
    chSegs.push({ text: fmtDate(data.data_inicio), bold: false, color: DGRAY });
    chSegs.push({ text: '   ', bold: false, color: DGRAY });
  }
  if (data.emitido_em) {
    chSegs.push({ text: 'conclusão: ', bold: true, color: BLACK });
    chSegs.push({ text: fmtDate(data.emitido_em), bold: false, color: DGRAY });
  }
  if (chSegs.length) renderInlineText(doc, chSegs, 162, 11);

  const empVal = data.empresa_aplicacao || data.empresa_nome;
  renderInlineText(doc, [
    { text: 'Empresa ou local de aplicação: ', bold: true,  color: BLACK },
    { text: empVal, bold: false, color: DGRAY },
  ], 172, 11);

  renderInlineText(doc, [
    { text: 'Codificação do certificado: ', bold: true,  color: BLACK },
    { text: data.codigo, bold: false, color: DGRAY },
  ], 182, 11);

  // ── Assinaturas ────────────────────────────────────────────
  const sigLineY = 236;
  const sigImgH  = 21;
  const sigImgW  = 55;
  const sigImgY  = sigLineY - sigImgH - 2;
  const leftX    = 52;
  const rightX   = W - 52;

  // Instrutor (esquerda)
  if (logoInst) {
    doc.addImage(logoInst, 'PNG', leftX - sigImgW / 2, sigImgY, sigImgW, sigImgH, undefined, 'FAST');
  }
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.4);
  doc.line(leftX - 36, sigLineY, leftX + 36, sigLineY);

  const instNome = data.docente_nome || '';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  if (instNome) {
    const words = instNome.split(' ');
    const mid = Math.ceil(words.length / 2);
    const l1 = words.slice(0, mid).join(' ');
    const l2 = words.slice(mid).join(' ');
    if (l2) {
      doc.text(l1, leftX, sigLineY + 6,  { align: 'center' });
      doc.text(l2, leftX, sigLineY + 12, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DGRAY);
      doc.text('Instrutor Responsável', leftX, sigLineY + 19, { align: 'center' });
    } else {
      doc.text(l1, leftX, sigLineY + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DGRAY);
      doc.text('Instrutor Responsável', leftX, sigLineY + 13, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DGRAY);
    doc.text('Instrutor Responsável', leftX, sigLineY + 7, { align: 'center' });
  }

  // Director (direita)
  if (logoDir) {
    doc.addImage(logoDir, 'PNG', rightX - sigImgW / 2, sigImgY, sigImgW, sigImgH, undefined, 'FAST');
  }
  doc.setDrawColor(...LGRAY);
  doc.line(rightX - 36, sigLineY, rightX + 36, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text('Renevaldo Machado', rightX, sigLineY + 6,  { align: 'center' });
  doc.text('Cavalcante',        rightX, sigLineY + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DGRAY);
  doc.text('Diretor Pedagógico', rightX, sigLineY + 19, { align: 'center' });

  // ════════════════════════════════════════════════════════════
  // PÁGINA 2 — CONTEÚDO PROGRAMÁTICO (sempre gerada)
  // ════════════════════════════════════════════════════════════
  {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');
    drawCornerDecorations(doc);

    // Cabeçalho roxo
    doc.setFillColor(...PURPLE);
    doc.rect(0, 0, W, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text('INSTITUTO DE TREINAMENTOS E RESGATE DO AMAPÁ — ITC', W / 2, 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('CONTEÚDO PROGRAMÁTICO DO CURSO', W / 2, 21, { align: 'center' });

    // Nome do curso em roxo bold
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PURPLE);
    doc.text(data.curso_nome || '—', 14, 36);

    // ── Tabela conteúdo programático ─────────────────────────
    let tY = 42;
    const temConteudo = (data.conteudo_programatico?.length ?? 0) > 0;
    if (temConteudo && data.conteudo_programatico) {
      // Cabeçalho da tabela: texto roxo sobre branco
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...PURPLE);
      doc.text('Conteúdo programático', 14, tY);
      doc.text('C/H', W - 14, tY, { align: 'right' });
      doc.setDrawColor(...PURPLE);
      doc.setLineWidth(0.3);
      doc.line(12, tY + 2, W - 12, tY + 2);
      tY += 7;

      let totalCH = 0;
      data.conteudo_programatico.forEach(item => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...BLACK);
        doc.text(item.modulo, 14, tY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(`${item.horas}h`, W - 14, tY, { align: 'right' });
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(12, tY + 2, W - 12, tY + 2);
        totalCH += item.horas;
        tY += 8;
      });

      // Total (roxo bold)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...PURPLE);
      doc.text('Carga horária total', 14, tY);
      doc.text(`${totalCH}h`, W - 14, tY, { align: 'right' });
      doc.setDrawColor(...PURPLE);
      doc.setLineWidth(0.3);
      doc.line(12, tY + 2, W - 12, tY + 2);
      tY += 10;
    }

    // ── Objetivo + Metodologia ────────────────────────────────
    if (data.objetivo || data.metodologia) {
      const colW = (W - 30) / 2;
      const c1 = 12;
      const c2 = c1 + colW + 6;

      doc.setFillColor(...PURPLE);
      doc.rect(c1, tY, colW, 9, 'F');
      doc.rect(c2, tY, colW, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...WHITE);
      doc.text('OBJETIVO DO CURSO', c1 + colW / 2, tY + 6, { align: 'center' });
      doc.text('METODOLOGIA', c2 + colW / 2, tY + 6, { align: 'center' });
      tY += 9;

      doc.setFontSize(8.5);
      const objLines = doc.splitTextToSize(data.objetivo || '', colW - 5);
      const metLines = doc.splitTextToSize(data.metodologia || '', colW - 5);
      const maxL = Math.max(objLines.length, metLines.length);
      const bH = maxL * 4.5 + 10;

      doc.setFillColor(250, 245, 255);
      doc.rect(c1, tY, colW, bH, 'F');
      doc.rect(c2, tY, colW, bH, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BLACK);
      doc.text(objLines, c1 + 3, tY + 6);
      doc.text(metLines, c2 + 3, tY + 6);
      tY += bH + 4;
    }

    // ── Barra de estatísticas ─────────────────────────────────
    const stats = [
      data.carga_horaria    ? `Carga Horária: ${data.carga_horaria}h`        : null,
      data.modulos_count    ? `Módulos: ${data.modulos_count}`                : null,
      data.aprovacao_minima ? `Aprovação mínima: ${data.aprovacao_minima}%`  : null,
      data.validade_anos    ? `Validade: ${data.validade_anos} anos`          : null,
    ].filter(Boolean) as string[];

    if (stats.length > 0) {
      doc.setFillColor(235, 218, 248);
      doc.rect(12, tY, W - 24, 9, 'F');
      const allSegs: { text: string; bold: boolean; color: [number, number, number] }[] = [];
      stats.forEach((s, i) => {
        const [lbl, ...rest] = s.split(': ');
        allSegs.push({ text: lbl + ': ', bold: true,  color: PURPLE });
        allSegs.push({ text: rest.join(': '), bold: false, color: PURPLE });
        if (i < stats.length - 1) allSegs.push({ text: '   ', bold: false, color: PURPLE });
      });
      renderInlineText(doc, allSegs, tY + 6, 8.5);
      tY += 13;
    }

    // ── Reconhecimento / Verificação / Válido até (3 colunas) ─
    if (data.reconhecimento || data.validade_em) {
      const c3W = (W - 30) / 3;
      const cols = [12, 12 + c3W + 3, 12 + (c3W + 3) * 2];
      const titles = ['RECONHECIMENTO', 'VERIFICAÇÃO DE AUTENTICIDADE', 'VÁLIDO ATÉ'];

      titles.forEach((t, i) => {
        doc.setFillColor(...PURPLE);
        doc.rect(cols[i], tY, c3W, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...WHITE);
        doc.text(t, cols[i] + c3W / 2, tY + 5.5, { align: 'center' });
      });
      tY += 8;

      const recText = data.reconhecimento ||
        'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da IRATA International e NR 35 (MTE/Brasil).';
      const verText =
        'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da IRATA International e NR 35 (MTE/Brasil).\nValidação via website do ITC.';

      doc.setFillColor(250, 245, 255);
      const bH3 = 32;
      cols.forEach(c => doc.rect(c, tY, c3W, bH3, 'F'));

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...BLACK);
      doc.text(doc.splitTextToSize(recText, c3W - 4), cols[0] + 2, tY + 5);
      doc.text(doc.splitTextToSize(verText, c3W - 4), cols[1] + 2, tY + 5);

      if (data.validade_em) {
        doc.setFillColor(...PURPLE);
        doc.roundedRect(cols[2] + 3, tY + 3, c3W - 6, 22, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...WHITE);
        doc.text('Vencimento', cols[2] + c3W / 2, tY + 11, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(fmtDate(data.validade_em), cols[2] + c3W / 2, tY + 20, { align: 'center' });
      }
    }

    // Rodapé
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.line(12, H - 14, W - 12, H - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...LGRAY);
    doc.text(
      'Instituto de Treinamentos e Resgate do Amapá – ITC · CNPJ 53.827.322/0001-75 · Macapá, AP · www.itctreinamentos.com',
      W / 2, H - 8, { align: 'center' }
    );
  }

  return doc.output('blob');
}
