import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
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

const PURPLE  = [108, 48, 150]  as [number, number, number];
const BLACK   = [15,  15,  15]  as [number, number, number];
const DGRAY   = [80,  80,  80]  as [number, number, number];
const LGRAY   = [160, 160, 160] as [number, number, number];
const WHITE   = [255, 255, 255] as [number, number, number];

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

function fmtDateLong(d: string | null | undefined): string {
  if (!d) return '—';
  const dt = parseDate(d);
  if (!dt) return '—';
  try { return format(dt, "dd/MM/yyyy", { locale: ptBR }); } catch { return '—'; }
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

// Tenta carregar fonte cursiva do CDN; retorna nome da fonte registada ou null
async function loadCursiveFont(doc: jsPDF): Promise<string | null> {
  try {
    // Great Vibes TTF (elegante e cursivo, similar ao original)
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

// Renderiza texto inline com segmentos bold/normal, centrado em Y
function renderInlineText(
  doc: jsPDF,
  segments: { text: string; bold: boolean; color: [number,number,number] }[],
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

// Losangos decorativos nos cantos (igual ao template original)
function drawCornerDecorations(doc: jsPDF) {
  // ── Canto inferior esquerdo: vermelho-laranja / laranja / amarelo ──
  doc.setFillColor(210, 55, 25);   // vermelho-laranja (exterior)
  doc.triangle(0, H, 42, H, 0, H - 42, 'F');
  doc.setFillColor(255, 100, 0);   // laranja (meio)
  doc.triangle(0, H, 30, H, 0, H - 30, 'F');
  doc.setFillColor(255, 210, 0);   // amarelo (interior)
  doc.triangle(0, H, 18, H, 0, H - 18, 'F');

  // ── Canto inferior direito: roxo / violeta / lilás ──
  doc.setFillColor(90, 0, 130);    // roxo escuro (exterior)
  doc.triangle(W, H, W - 42, H, W, H - 42, 'F');
  doc.setFillColor(155, 40, 185);  // roxo médio
  doc.triangle(W, H, W - 30, H, W, H - 30, 'F');
  doc.setFillColor(200, 80, 210);  // lilás (interior)
  doc.triangle(W, H, W - 18, H, W, H - 18, 'F');

  // ── Canto superior direito: verde escuro / verde médio ──
  doc.setFillColor(0, 110, 55);    // verde escuro
  doc.triangle(W, 0, W - 32, 0, W, 32, 'F');
  doc.setFillColor(40, 170, 90);   // verde médio
  doc.triangle(W, 0, W - 20, 0, W, 20, 'F');

  // ── Canto superior esquerdo: vermelho pequeno (discreta) ──
  doc.setFillColor(210, 55, 25);
  doc.triangle(0, 0, 20, 0, 0, 20, 'F');
}

export async function generateCertificadoPDF(data: CertificadoPDFData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const base = window.location.origin;

  // Carrega todos os recursos em paralelo
  const [bgImg, logoItc, logoCentro, logoCee, logoDir, logoInst, cursiveFont] = await Promise.all([
    loadImg(`${base}/assets/certificado/cert-background.jpg`),
    loadImg(`${base}/assets/certificado/logo-itc.png`),
    isHealthCategory(data.curso_categoria)
      ? loadImg(`${base}/assets/certificado/logo-nobre-urgencia.png`)
      : loadImg(`${base}/assets/certificado/logo-mais-com.png`),
    loadImg(`${base}/assets/certificado/logo-cee-ap.png`),
    loadImg(`${base}/assets/certificado/assinatura-diretor.png`),
    data.docente_assinatura_url ? loadImg(data.docente_assinatura_url) : Promise.resolve(null),
    loadCursiveFont(doc),
  ]);

  // ══════════════════════════════════════════════════════════════════
  // PÁGINA 1 — CERTIFICADO
  // ══════════════════════════════════════════════════════════════════

  // Fundo branco puro
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');

  // Watermark (foto de sala) — ocupa zona central do certificado
  if (bgImg) {
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.10 }));
    doc.addImage(bgImg, 'JPEG', 10, 40, W - 20, 185, undefined, 'FAST');
    doc.restoreGraphicsState();
  }

  // Decorações nos cantos
  drawCornerDecorations(doc);

  // ── Logos no topo ────────────────────────────────────────────────
  // ITC: esquerda, logo quadrado/retangular
  if (logoItc) doc.addImage(logoItc,    'PNG', 12,        8,  28, 24, undefined, 'FAST');
  // Centro: Mais.com ou Nobre, circular
  if (logoCentro) doc.addImage(logoCentro, 'PNG', W/2 - 14, 8,  28, 24, undefined, 'FAST');
  // CEE-AP: direita, mais largo
  if (logoCee) doc.addImage(logoCee,    'PNG', W - 62,   12, 50, 18, undefined, 'FAST');

  // ── Títulos ──────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(44);
  doc.setTextColor(...BLACK);
  doc.text('CERTIFICADO', W / 2, 52, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...PURPLE);
  doc.text('DE CONCLUSÃO DE CURSO', W / 2, 62, { align: 'center' });

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(14, 67, W - 14, 67);

  // ── Texto introdutório ───────────────────────────────────────────
  // Linha 1: "O [bold]Instituto de Treinamentos e resgate do Amapá - ITC[/bold], confere este"
  renderInlineText(doc, [
    { text: 'O ',                                                          bold: false, color: DGRAY },
    { text: 'Instituto de Treinamentos e resgate do Amapá - ITC',          bold: true,  color: BLACK },
    { text: ', confere este',                                               bold: false, color: DGRAY },
  ], 79, 10.5);

  // Linha 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...DGRAY);
  doc.text('certificado de conclusão de curso a:', W / 2, 87, { align: 'center' });

  // ── Nome do aluno ────────────────────────────────────────────────
  const nameY = 110;
  if (cursiveFont) {
    doc.setFont(cursiveFont, 'normal');
    doc.setFontSize(38);
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(32);
  }
  doc.setTextColor(...BLACK);
  doc.text(data.aluno_nome, W / 2, nameY, { align: 'center' });

  // Linha roxa sob o nome
  doc.setFont('helvetica', 'normal'); // reset para medir
  doc.setFontSize(10);
  const nameLineW = Math.min(160, data.aluno_nome.length * 4.5 + 20);
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.6);
  doc.line(W / 2 - nameLineW / 2, nameY + 3, W / 2 + nameLineW / 2, nameY + 3);

  // CPF
  if (data.aluno_cpf) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...DGRAY);
    doc.text(`CPF:${data.aluno_cpf}`, W / 2, nameY + 11, { align: 'center' });
  }

  // ── Dados do curso ───────────────────────────────────────────────
  let dataY = nameY + 24;

  // Curso
  renderInlineText(doc, [
    { text: 'Curso:  ', bold: true,  color: BLACK },
    { text: data.curso_nome || '—', bold: true, color: BLACK },
  ], dataY, 11.5);
  dataY += 11;

  // Carga horária / datas (numa linha)
  const chSegs: { text: string; bold: boolean; color: [number,number,number] }[] = [];
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
    chSegs.push({ text: 'conclusão: ', bold: true,  color: BLACK });
    chSegs.push({ text: fmtDate(data.emitido_em), bold: false, color: DGRAY });
  }
  if (chSegs.length > 0) {
    renderInlineText(doc, chSegs, dataY, 10.5);
    dataY += 10;
  }

  // Empresa
  const empVal = data.empresa_aplicacao || data.empresa_nome;
  renderInlineText(doc, [
    { text: 'Empresa ou local de aplicação: ', bold: true,  color: BLACK },
    { text: empVal, bold: false, color: DGRAY },
  ], dataY, 10.5);
  dataY += 10;

  // Código
  renderInlineText(doc, [
    { text: 'Codificação do certificado: ', bold: true,  color: BLACK },
    { text: data.codigo, bold: false, color: DGRAY },
  ], dataY, 10.5);

  // ── Assinaturas ──────────────────────────────────────────────────
  const sigLineY = 248;
  const sigImgH  = 22;
  const sigImgW  = 58;
  const leftX    = 52;
  const rightX   = W - 52;

  // Instrutor (esquerda)
  if (logoInst) {
    doc.addImage(logoInst, 'PNG', leftX - sigImgW / 2, sigLineY - sigImgH - 1, sigImgW, sigImgH, undefined, 'FAST');
  }
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.4);
  doc.line(leftX - 35, sigLineY, leftX + 35, sigLineY);

  const docenteNome = data.docente_nome || '';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  if (docenteNome) {
    const words = docenteNome.split(' ');
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');
    if (line2) {
      doc.text(line1, leftX, sigLineY + 5, { align: 'center' });
      doc.text(line2, leftX, sigLineY + 10, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...DGRAY);
      doc.text('Instrutor Responsável', leftX, sigLineY + 16, { align: 'center' });
    } else {
      doc.text(line1, leftX, sigLineY + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...DGRAY);
      doc.text('Instrutor Responsável', leftX, sigLineY + 11, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DGRAY);
    doc.text('Instrutor Responsável', leftX, sigLineY + 6, { align: 'center' });
  }

  // Diretor (direita)
  if (logoDir) {
    doc.addImage(logoDir, 'PNG', rightX - sigImgW / 2, sigLineY - sigImgH - 1, sigImgW, sigImgH, undefined, 'FAST');
  }
  doc.setDrawColor(...LGRAY);
  doc.line(rightX - 35, sigLineY, rightX + 35, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text('Renevaldo Machado', rightX, sigLineY + 5, { align: 'center' });
  doc.text('Cavalcante', rightX, sigLineY + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...DGRAY);
  doc.text('Diretor Pedagógico', rightX, sigLineY + 16, { align: 'center' });

  // ── QR Code ──────────────────────────────────────────────────────
  const verifyUrl = `${window.location.origin}/certificado/${data.codigo}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 96, margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', W / 2 - 9, H - 26, 18, 18, undefined, 'FAST');
    doc.setFontSize(6);
    doc.setTextColor(...LGRAY);
    doc.text('Verificar autenticidade', W / 2, H - 5, { align: 'center' });
  } catch { /* skip */ }

  // ══════════════════════════════════════════════════════════════════
  // PÁGINA 2 — CONTEÚDO PROGRAMÁTICO
  // ══════════════════════════════════════════════════════════════════
  const temConteudo = (data.conteudo_programatico?.length ?? 0) > 0;
  const temObj = !!(data.objetivo || data.metodologia || data.reconhecimento);

  if (temConteudo || temObj) {
    doc.addPage();

    // Fundo branco
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');
    drawCornerDecorations(doc);

    // Header roxo
    doc.setFillColor(...PURPLE);
    doc.rect(0, 0, W, 30, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text('INSTITUTO DE TREINAMENTOS E RESGATE DO AMAPÁ — ITC', W / 2, 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('CONTEÚDO PROGRAMÁTICO DO CURSO', W / 2, 21, { align: 'center' });

    // Subtítulo roxo (nome do curso + sigla)
    doc.setFillColor(235, 218, 248);
    doc.rect(12, 33, W - 24, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...PURPLE);
    const cursoLabel = data.curso_nome || '—';
    doc.text(cursoLabel, 16, 39.5);

    // Tabela conteúdo programático
    let tY = 47;
    if (temConteudo && data.conteudo_programatico) {
      // Cabeçalho tabela
      doc.setFillColor(...PURPLE);
      doc.rect(12, tY, W - 24, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...WHITE);
      doc.text('Conteúdo programático', 16, tY + 5.5);
      doc.text('C/H', W - 20, tY + 5.5, { align: 'right' });
      tY += 8;

      let totalCH = 0;
      data.conteudo_programatico.forEach((item, idx) => {
        const rowH = 8;
        doc.setFillColor(...(idx % 2 === 0 ? [255, 255, 255] : [248, 243, 255]) as [number,number,number]);
        doc.rect(12, tY, W - 24, rowH, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...BLACK);
        doc.text(item.modulo, 16, tY + 5.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.horas}h`, W - 20, tY + 5.5, { align: 'right' });
        totalCH += item.horas;
        tY += rowH;
      });

      // Total
      doc.setFillColor(...PURPLE);
      doc.rect(12, tY, W - 24, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...WHITE);
      doc.text('Carga horária total', 16, tY + 5.5);
      doc.text(`${totalCH}h`, W - 20, tY + 5.5, { align: 'right' });
      tY += 12;
    }

    // Objetivo + Metodologia (2 colunas)
    if (data.objetivo || data.metodologia) {
      const colW = (W - 30) / 2;
      const c1 = 12;
      const c2 = c1 + colW + 6;

      // Cabeçalhos
      doc.setFillColor(...PURPLE);
      doc.rect(c1, tY, colW, 9, 'F');
      doc.rect(c2, tY, colW, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...WHITE);
      doc.text('OBJETIVO DO CURSO', c1 + colW / 2, tY + 6, { align: 'center' });
      doc.text('METODOLOGIA', c2 + colW / 2, tY + 6, { align: 'center' });
      tY += 9;

      doc.setFontSize(8);
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

    // Barra de stats
    const stats = [
      data.carga_horaria  ? `Carga Horária: ${data.carga_horaria}h`        : null,
      data.modulos_count  ? `Módulos: ${data.modulos_count}`                : null,
      data.aprovacao_minima ? `Aprovação mínima: ${data.aprovacao_minima}%` : null,
      data.validade_anos  ? `Validade: ${data.validade_anos} anos`          : null,
    ].filter(Boolean) as string[];

    if (stats.length > 0) {
      doc.setFillColor(235, 218, 248);
      doc.rect(12, tY, W - 24, 9, 'F');
      // render stats com bold nos labels
      const allSegs: { text: string; bold: boolean; color: [number,number,number] }[] = [];
      stats.forEach((s, i) => {
        const [lbl, ...rest] = s.split(': ');
        allSegs.push({ text: lbl + ': ', bold: true,  color: PURPLE });
        allSegs.push({ text: rest.join(': '), bold: false, color: PURPLE });
        if (i < stats.length - 1) allSegs.push({ text: '   ', bold: false, color: PURPLE });
      });
      renderInlineText(doc, allSegs, tY + 6, 8.5);
      tY += 13;
    }

    // Reconhecimento | Verificação | Válido até (3 colunas)
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
      const verText = 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da IRATA International e NR 35 (MTE/Brasil).\nValidação via website do ITC.';

      doc.setFillColor(250, 245, 255);
      const bH3 = 32;
      cols.forEach(c => doc.rect(c, tY, c3W, bH3, 'F'));

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...BLACK);
      doc.text(doc.splitTextToSize(recText, c3W - 4), cols[0] + 2, tY + 5);
      doc.text(doc.splitTextToSize(verText, c3W - 4), cols[1] + 2, tY + 5);

      // Validade com destaque roxo
      if (data.validade_em) {
        doc.setFillColor(...PURPLE);
        doc.roundedRect(cols[2] + 3, tY + 3, c3W - 6, 22, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...WHITE);
        doc.text('Vencimento', cols[2] + c3W / 2, tY + 11, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(fmtDateLong(data.validade_em), cols[2] + c3W / 2, tY + 20, { align: 'center' });
      }
      tY += bH3 + 4;
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
