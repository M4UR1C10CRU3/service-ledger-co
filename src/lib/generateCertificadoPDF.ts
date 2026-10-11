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
  data_conclusao?: string | null;
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

  // ── Configuração por empresa ────────────────────────────────────────────
  // Quando a empresa tem arte aprovada, imprimimos SOBRE ela: a arte traz os
  // logótipos, a moldura e o rodapé já na posição certa, e o código só desenha
  // os valores. Sem arte configurada mantém-se o desenho por primitivas, que é
  // o comportamento de sempre — nenhum inquilino fica pior do que estava.
  arte_frente?: string | null;
  arte_verso?: string | null;
  marca_agua?: string | null;
  texto_institucional?: string | null;
  rodape?: string | null;
  diretor_nome?: string | null;
  diretor_cargo?: string | null;
  diretor_assinatura_url?: string | null;
  url_verificacao?: string | null;
  qr_verificacao?: string | null;
}

const W = 210;
const H = 297;

const PURPLE = [108, 48, 150] as [number, number, number];
const BLACK  = [15,  15,  15] as [number, number, number];
const DGRAY  = [80,  80,  80] as [number, number, number];
const LGRAY  = [160, 160, 160] as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];

// Medido nas artes do ITC (1414x2000 px para A4):
//  · página 1 — logótipos até 38,6 mm, decoração a partir de 233,4 mm
//  · página 2 — faixa roxa até 37,4 mm, rodapé a partir de 259 mm
const ARTE_P2_FAIXA_FIM = 37.4;

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

/** Absoluta fica como está; relativa passa a apontar para a origem da app. */
function urlAbs(p?: string | null): string | null {
  if (!p) return null;
  if (/^(https?:|data:|blob:)/.test(p)) return p;
  return `${window.location.origin}${p.startsWith('/') ? '' : '/'}${p}`;
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

/** Decoração desenhada — só usada quando a empresa não tem arte configurada. */
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

/** Nome do signatário em uma ou duas linhas, com o cargo por baixo. */
function drawSignatario(
  doc: jsPDF,
  x: number,
  lineY: number,
  nome: string | null | undefined,
  cargo: string
) {
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.4);
  doc.line(x - 36, lineY, x + 36, lineY);

  const cargoAbaixo = (dy: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DGRAY);
    doc.text(cargo, x, lineY + dy, { align: 'center' });
  };

  if (!nome) { cargoAbaixo(7); return; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);

  const words = nome.split(' ');
  const mid = Math.ceil(words.length / 2);
  const l1 = words.slice(0, mid).join(' ');
  const l2 = words.slice(mid).join(' ');

  if (l2) {
    doc.text(l1, x, lineY + 6,  { align: 'center' });
    doc.text(l2, x, lineY + 12, { align: 'center' });
    cargoAbaixo(19);
  } else {
    doc.text(l1, x, lineY + 6, { align: 'center' });
    cargoAbaixo(13);
  }
}

export async function generateCertificadoPDF(data: CertificadoPDFData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const base = window.location.origin;

  const temArte = Boolean(data.arte_frente);

  const [arteFrente, arteVerso, bgImg, logoItc, logoCentro, logoCee, cursiveFont] = await Promise.all([
    loadImg(urlAbs(data.arte_frente) || ''),
    loadImg(urlAbs(data.arte_verso) || ''),
    // Sem imagem de fundo definida no curso não há marca de água. Antes tentava
    // sempre um ficheiro fixo que deixou de existir, e falhava em silêncio.
    data.marca_agua ? loadImg(urlAbs(data.marca_agua)!) : Promise.resolve(null),
    // Só necessários quando não há arte: a arte já traz os logótipos embutidos.
    temArte ? Promise.resolve(null) : loadImg(`${base}/assets/certificado/logo-itc.png`),
    temArte ? Promise.resolve(null) : (isHealthCategory(data.curso_categoria)
      ? loadImg(`${base}/assets/certificado/logo-nobre-urgencia.png`)
      : loadImg(`${base}/assets/certificado/logo-mais-com.png`)),
    temArte ? Promise.resolve(null) : loadImg(`${base}/assets/certificado/logo-cee-ap.png`),
    loadCursiveFont(doc),
  ]);

  const [sigInstrutor, sigDiretor, qrImg] = await Promise.all([
    loadImg(urlAbs(data.docente_assinatura_url) || ''),
    loadImg(urlAbs(data.diretor_assinatura_url) || ''),
    data.qr_verificacao ? Promise.resolve(data.qr_verificacao) : Promise.resolve(null),
  ]);

  // ════════════════════════════════════════════════════════════
  // PÁGINA 1 — CERTIFICADO
  // ════════════════════════════════════════════════════════════

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');

  if (arteFrente) {
    // A arte traz logótipos e moldura já posicionados.
    doc.addImage(arteFrente, 'PNG', 0, 0, W, H, undefined, 'FAST');
  }

  // Marca de água do curso: ocupa a folha inteira, por baixo do texto e por
  // cima da arte.
  //
  // A proporção da imagem é respeitada — são fotografias de pessoas em contexto
  // real e esticá-las nota-se logo, mesmo a 16% de opacidade. Preenche-se a
  // página como uma capa: escala pelo lado que falta cobrir e o excedente do
  // outro lado sai fora da folha (o PDF corta no limite da página). As imagens
  // de fundo dos cursos vêm em proporção A4, pelo que na prática não há corte.
  if (bgImg) {
    let x = 0, y = 0, larg = W, alt = H;
    try {
      const p = (doc as any).getImageProperties(bgImg);
      const escala = Math.max(W / p.width, H / p.height);
      larg = p.width * escala;
      alt  = p.height * escala;
      x = (W - larg) / 2;
      y = (H - alt) / 2;
    } catch {
      // Sem propriedades legíveis, estica para a folha toda.
    }
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.16 }));
    doc.addImage(bgImg, x, y, larg, alt, undefined, 'FAST');
    doc.restoreGraphicsState();
  }

  if (!arteFrente) {
    drawCornerDecorations(doc);
    if (logoItc)    doc.addImage(logoItc,    'PNG', 12,      7,  30, 26, undefined, 'FAST');
    if (logoCentro) doc.addImage(logoCentro, 'PNG', W/2-16,  7,  32, 26, undefined, 'FAST');
    if (logoCee)    doc.addImage(logoCee,    'PNG', W-64,   11,  52, 20, undefined, 'FAST');
  }

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
  const instituicao = data.texto_institucional || data.empresa_nome;
  renderInlineText(doc, [
    { text: 'O ',            bold: false, color: DGRAY },
    { text: instituicao,     bold: true,  color: BLACK },
    { text: ', confere este', bold: false, color: DGRAY },
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
  // A conclusão é a data em que o curso terminou. Só na falta dela é que se usa
  // a data de emissão — que pode ser muito posterior, no caso de uma 2.ª via.
  const conclusao = data.data_conclusao || data.emitido_em;
  if (conclusao) {
    chSegs.push({ text: 'conclusão: ', bold: true, color: BLACK });
    chSegs.push({ text: fmtDate(conclusao), bold: false, color: DGRAY });
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

  if (sigInstrutor) {
    doc.addImage(sigInstrutor, 'PNG', leftX - sigImgW / 2, sigImgY, sigImgW, sigImgH, undefined, 'FAST');
  }
  drawSignatario(doc, leftX, sigLineY, data.docente_nome, 'Instrutor Responsável');

  if (sigDiretor) {
    doc.addImage(sigDiretor, 'PNG', rightX - sigImgW / 2, sigImgY, sigImgW, sigImgH, undefined, 'FAST');
  }
  drawSignatario(doc, rightX, sigLineY, data.diretor_nome, data.diretor_cargo || 'Diretor Pedagógico');

  // ════════════════════════════════════════════════════════════
  // PÁGINA 2 — CONTEÚDO PROGRAMÁTICO (sempre gerada)
  // ════════════════════════════════════════════════════════════
  {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');

    // A arte do verso já traz a faixa roxa de cabeçalho e o rodapé.
    if (arteVerso) {
      doc.addImage(arteVerso, 'PNG', 0, 0, W, H, undefined, 'FAST');
    } else {
      drawCornerDecorations(doc);
      doc.setFillColor(...PURPLE);
      doc.rect(0, 0, W, 28, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...WHITE);
      doc.text((data.texto_institucional || data.empresa_nome).toUpperCase(), W / 2, 12, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('CONTEÚDO PROGRAMÁTICO DO CURSO', W / 2, 21, { align: 'center' });
    }

    // O conteúdo começa logo abaixo da faixa — desenhada ou vinda da arte.
    const topo = arteVerso ? ARTE_P2_FAIXA_FIM + 1 : 30;

    // Nome do curso — faixa lavanda
    doc.setFillColor(230, 218, 245);
    doc.rect(0, topo, W, 11, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PURPLE);
    doc.text(data.curso_nome || '—', 14, topo + 7.5);

    // ── Tabela conteúdo programático ─────────────────────────
    // Folga suficiente abaixo da faixa: com 4 mm o cabeçalho da tabela colava
    // no nome do curso.
    let tY = topo + 18;
    const temConteudo = (data.conteudo_programatico?.length ?? 0) > 0;
    if (temConteudo && data.conteudo_programatico) {
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

    // ── Objetivo + Metodologia ───────────────────────────────
    {
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

      const objText = data.objetivo || 'Capacitar profissionais com conhecimentos teóricos e práticos para exercício seguro e eficiente das atividades do curso.';
      const metText = data.metodologia || 'Aulas expositivas, demonstrações práticas, exercícios supervisionados e avaliação de desempenho individual.';

      doc.setFontSize(8.5);
      const objLines = doc.splitTextToSize(objText, colW - 5);
      const metLines = doc.splitTextToSize(metText, colW - 5);
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

    // ── Barra de estatísticas ────────────────────────────────
    {
      const statSegs: { text: string; bold: boolean; color: [number, number, number] }[] = [];
      const addStat = (lbl: string, val: string, last: boolean) => {
        statSegs.push({ text: lbl + ': ', bold: true,  color: PURPLE });
        statSegs.push({ text: val,         bold: false, color: PURPLE });
        if (!last) statSegs.push({ text: '   ', bold: false, color: PURPLE });
      };
      const statItems: [string, string][] = [];
      if (data.carga_horaria)    statItems.push(['Carga Horária', `${data.carga_horaria}h`]);
      if (data.modulos_count)    statItems.push(['Módulos', `${data.modulos_count}`]);
      if (data.aprovacao_minima) statItems.push(['Aprovação mínima', `${data.aprovacao_minima}%`]);
      if (data.validade_anos)    statItems.push(['Validade', `${data.validade_anos} anos`]);
      if (statItems.length === 0) statItems.push(['Certificado', 'de Conclusão de Curso']);

      statItems.forEach(([lbl, val], i) => addStat(lbl, val, i === statItems.length - 1));

      doc.setFillColor(235, 218, 248);
      doc.rect(12, tY, W - 24, 9, 'F');
      renderInlineText(doc, statSegs, tY + 6, 8.5);
      tY += 13;
    }

    // ── Reconhecimento / Verificação / Válido até ────────────
    {
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

      doc.setFillColor(250, 245, 255);
      const bH3 = 34;
      cols.forEach(c => doc.rect(c, tY, c3W, bH3, 'F'));

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...BLACK);
      doc.text(doc.splitTextToSize(recText, c3W - 4), cols[0] + 2, tY + 5);

      // Verificação: QR à esquerda, instruções à direita. Sem QR, texto a toda
      // a largura — como estava antes.
      const site = data.url_verificacao || 'o site da instituição';
      if (qrImg) {
        const qrS = 20;
        doc.addImage(qrImg, 'PNG', cols[1] + 2, tY + 3, qrS, qrS, undefined, 'FAST');
        doc.setFontSize(6.5);
        doc.text(
          doc.splitTextToSize(`Leia o código ou aceda a ${site} e introduza a codificação para confirmar a autenticidade deste certificado.`, c3W - qrS - 7),
          cols[1] + qrS + 4, tY + 6
        );
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...PURPLE);
        doc.text(data.codigo, cols[1] + 2 + qrS / 2, tY + qrS + 7, { align: 'center' });
      } else {
        doc.text(
          doc.splitTextToSize(`Acesse o site ${site} para verificar a autenticidade deste certificado através do código de codificação.`, c3W - 4),
          cols[1] + 2, tY + 5
        );
      }

      // Caixa "VÁLIDO ATÉ" em verde escuro
      const GREEN_DARK: [number, number, number] = [20, 120, 60];
      doc.setFillColor(...GREEN_DARK);
      doc.roundedRect(cols[2] + 3, tY + 3, c3W - 6, 26, 3, 3, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...WHITE);
      doc.text('Vencimento', cols[2] + c3W / 2, tY + 12, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(data.validade_em ? fmtDate(data.validade_em) : 'Sem validade', cols[2] + c3W / 2, tY + 23, { align: 'center' });
    }

    // Rodapé — só quando não vem na arte.
    if (!arteVerso) {
      doc.setDrawColor(...LGRAY);
      doc.setLineWidth(0.3);
      doc.line(12, H - 14, W - 12, H - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...LGRAY);
      doc.text(data.rodape || data.empresa_nome, W / 2, H - 8, { align: 'center' });
    }
  }

  return doc.output('blob');
}
