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

// A4 portrait em mm
const W = 210;
const H = 297;

// Paleta ITC
const PURPLE   = [108, 48, 150]  as [number, number, number];
const BLACK    = [20,  20,  20]  as [number, number, number];
const GRAY     = [100, 100, 100] as [number, number, number];
const LGRAY    = [150, 150, 150] as [number, number, number];
const WHITE    = [255, 255, 255] as [number, number, number];

// Categorias de saúde/resgate que usam o logo Nobre
const HEALTH_CATS = ['saude', 'resgate', 'saúde', 'emergência', 'emergencia', 'primeiros socorros', 'socorrismo'];

function isHealthCategory(cat?: string | null): boolean {
  if (!cat) return false;
  const c = cat.toLowerCase();
  return HEALTH_CATS.some(h => c.includes(h));
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
  try { return format(dt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }); } catch { return '—'; }
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

function drawCornerTriangles(doc: jsPDF) {
  // Canto inferior esquerdo: triângulos laranja/amarelo
  doc.setFillColor(255, 165, 0);
  doc.triangle(0, H, 18, H, 0, H - 18, 'F');
  doc.setFillColor(255, 200, 50);
  doc.triangle(0, H, 12, H, 0, H - 12, 'F');

  // Canto inferior direito: triângulos roxo/rosa
  doc.setFillColor(180, 60, 180);
  doc.triangle(W, H, W - 18, H, W, H - 18, 'F');
  doc.setFillColor(220, 100, 220);
  doc.triangle(W, H, W - 12, H, W, H - 12, 'F');

  // Canto superior direito: triângulos verde
  doc.setFillColor(50, 160, 80);
  doc.triangle(W, 0, W - 18, 0, W, 18, 'F');

  // Canto superior esquerdo: triângulo laranja
  doc.setFillColor(255, 140, 0);
  doc.triangle(0, 0, 18, 0, 0, 18, 'F');
}

export async function generateCertificadoPDF(data: CertificadoPDFData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Carregar imagens em paralelo ────────────────────────────────
  const base = window.location.origin;
  const [bgImg, logoItc, logoCentro, logoCee, logoDir, logoInst] = await Promise.all([
    loadImg(`${base}/assets/certificado/cert-background.jpg`),
    loadImg(`${base}/assets/certificado/logo-itc.png`),
    isHealthCategory(data.curso_categoria)
      ? loadImg(`${base}/assets/certificado/logo-nobre-urgencia.png`)
      : loadImg(`${base}/assets/certificado/logo-mais-com.png`),
    loadImg(`${base}/assets/certificado/logo-cee-ap.png`),
    loadImg(`${base}/assets/certificado/assinatura-diretor.png`),
    data.docente_assinatura_url ? loadImg(data.docente_assinatura_url) : Promise.resolve(null),
  ]);

  // ══════════════════════════════════════════════════════════════════
  // PÁGINA 1 — CERTIFICADO
  // ══════════════════════════════════════════════════════════════════

  // Fundo branco
  doc.setFillColor(245, 244, 248);
  doc.rect(0, 0, W, H, 'F');

  // Foto de fundo (watermark) centrada, baixa opacidade
  if (bgImg) {
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
    doc.addImage(bgImg, 'JPEG', 20, 55, 170, 170, undefined, 'FAST');
    doc.restoreGraphicsState();
  }

  // Triângulos decorativos nos cantos
  drawCornerTriangles(doc);

  // ── Logos no topo ────────────────────────────────────────────────
  const logoY = 12;
  const logoH = 22;
  if (logoItc) doc.addImage(logoItc, 'PNG', 14, logoY, 24, logoH, undefined, 'FAST');
  if (logoCentro) doc.addImage(logoCentro, 'PNG', W / 2 - 12, logoY, 24, logoH, undefined, 'FAST');
  if (logoCee) doc.addImage(logoCee, 'PNG', W - 58, logoY + 5, 44, 14, undefined, 'FAST');

  // ── Títulos ──────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(38);
  doc.setTextColor(...BLACK);
  doc.text('CERTIFICADO', W / 2, 56, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(...PURPLE);
  doc.text('DE CONCLUSÃO DE CURSO', W / 2, 65, { align: 'center' });

  // Linha separadora
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.3);
  doc.line(20, 70, W - 20, 70);

  // ── Corpo do texto ───────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY);
  doc.text('O ', W / 2, 82, { align: 'center' });

  // Medir e reposicionar inline "O [bold] resto"
  const introY = 82;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY);
  const intro1 = 'O ';
  const intro2 = 'Instituto de Treinamentos e resgate do Amapá - ITC';
  const intro3 = ', confere este';
  const intro4 = 'certificado de conclusão de curso a:';

  const w1 = doc.getTextWidth(intro1);
  const w2 = doc.getTextWidth(intro2);
  const w3 = doc.getTextWidth(intro3);
  const totalW = w1 + w2 + w3;
  const startX = W / 2 - totalW / 2;

  doc.text(intro1, startX, introY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(intro2, startX + w1, introY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(intro3, startX + w1 + w2, introY);
  doc.text(intro4, W / 2, introY + 7, { align: 'center' });

  // ── Nome do aluno (script/itálico) ───────────────────────────────
  doc.setFont('times', 'italic');
  doc.setFontSize(28);
  doc.setTextColor(...BLACK);
  doc.text(data.aluno_nome, W / 2, 112, { align: 'center' });

  // Linha sob o nome
  const nomeW = doc.getTextWidth(data.aluno_nome);
  const lineX = W / 2 - nomeW / 2;
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.5);
  doc.line(lineX - 5, 115, lineX + nomeW + 5, 115);

  // CPF
  if (data.aluno_cpf) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(`CPF: ${data.aluno_cpf}`, W / 2, 121, { align: 'center' });
  }

  // ── Dados do curso ───────────────────────────────────────────────
  const dadosY = 133;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(`Curso:  ${data.curso_nome}`, W / 2, dadosY, { align: 'center' });

  // Carga horária + datas
  doc.setFontSize(10);
  const chParts: string[] = [];
  if (data.carga_horaria) chParts.push(`Carga Horária: ${data.carga_horaria}h`);
  if (data.data_inicio) chParts.push(`Início: ${fmtDate(data.data_inicio)}`);
  if (data.emitido_em) chParts.push(`conclusão: ${fmtDate(data.emitido_em)}`);

  // Render parcialmente bold para datas
  if (chParts.length > 0) {
    const lineY = dadosY + 10;
    const fullText = chParts.join('   ');
    // Simples: render completo em misto
    let xCursor = W / 2 - doc.getTextWidth(fullText) / 2;
    chParts.forEach((part, idx) => {
      const [label, ...rest] = part.split(': ');
      const val = rest.join(': ');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      doc.text(label + ': ', xCursor, lineY);
      xCursor += doc.getTextWidth(label + ': ');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(val, xCursor, lineY);
      xCursor += doc.getTextWidth(val);
      if (idx < chParts.length - 1) {
        doc.text('   ', xCursor, lineY);
        xCursor += doc.getTextWidth('   ');
      }
    });
  }

  // Empresa / local de aplicação
  const empLabel = 'Empresa ou local de aplicação: ';
  const empVal = data.empresa_aplicacao || data.empresa_nome;
  const empY = dadosY + 21;
  const empTotalW = doc.getTextWidth(empLabel) + doc.getTextWidth(empVal);
  let empX = W / 2 - empTotalW / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text(empLabel, empX, empY);
  empX += doc.getTextWidth(empLabel);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(empVal, empX, empY);

  // Código do certificado
  const codLabel = 'Codificação do certificado: ';
  const codVal = data.codigo;
  const codY = dadosY + 31;
  const codTotalW = doc.getTextWidth(codLabel) + doc.getTextWidth(codVal);
  let codX = W / 2 - codTotalW / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text(codLabel, codX, codY);
  codX += doc.getTextWidth(codLabel);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(codVal, codX, codY);

  // ── Assinaturas ──────────────────────────────────────────────────
  const sigY = 225;
  const sigLineY = sigY + 22;
  const leftSigX = 52;
  const rightSigX = W - 52;
  const sigImgH = 20;
  const sigImgW = 55;

  // Assinatura do instrutor (esquerda)
  if (logoInst) {
    doc.addImage(logoInst, 'PNG', leftSigX - sigImgW / 2, sigY, sigImgW, sigImgH, undefined, 'FAST');
  }
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.4);
  doc.line(leftSigX - 32, sigLineY, leftSigX + 32, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  const docenteNome = data.docente_nome || '';
  const nomeWords = docenteNome.split(' ');
  // Quebrar em 2 linhas se longo
  if (doc.getTextWidth(docenteNome) > 60) {
    const mid = Math.ceil(nomeWords.length / 2);
    doc.text(nomeWords.slice(0, mid).join(' '), leftSigX, sigLineY + 5, { align: 'center' });
    doc.text(nomeWords.slice(mid).join(' '), leftSigX, sigLineY + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Instrutor Responsável', leftSigX, sigLineY + 16, { align: 'center' });
  } else {
    doc.text(docenteNome, leftSigX, sigLineY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Instrutor Responsável', leftSigX, sigLineY + 11, { align: 'center' });
  }

  // Assinatura do Diretor (direita)
  if (logoDir) {
    doc.addImage(logoDir, 'PNG', rightSigX - sigImgW / 2, sigY, sigImgW, sigImgH, undefined, 'FAST');
  }
  doc.setDrawColor(...PURPLE);
  doc.line(rightSigX - 32, sigLineY, rightSigX + 32, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text('Renevaldo Machado', rightSigX, sigLineY + 5, { align: 'center' });
  doc.text('Cavalcante', rightSigX, sigLineY + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Diretor Pedagógico', rightSigX, sigLineY + 16, { align: 'center' });

  // QR Code (canto inferior)
  const verifyUrl = `${window.location.origin}/certificado/${data.codigo}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', W / 2 - 10, H - 28, 20, 20, undefined, 'FAST');
    doc.setFontSize(6);
    doc.setTextColor(...LGRAY);
    doc.text('Verificar autenticidade', W / 2, H - 6, { align: 'center' });
  } catch { /* skip */ }

  // ══════════════════════════════════════════════════════════════════
  // PÁGINA 2 — CONTEÚDO PROGRAMÁTICO
  // ══════════════════════════════════════════════════════════════════
  const temConteudo = (data.conteudo_programatico?.length ?? 0) > 0;
  const temObj = !!(data.objetivo || data.metodologia || data.reconhecimento);

  if (temConteudo || temObj) {
    doc.addPage();

    // Fundo
    doc.setFillColor(245, 244, 248);
    doc.rect(0, 0, W, H, 'F');
    drawCornerTriangles(doc);

    // Header roxo
    doc.setFillColor(...PURPLE);
    doc.rect(0, 0, W, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text('INSTITUTO DE TREINAMENTOS E RESGATE DO AMAPÁ — ITC', W / 2, 11, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('CONTEÚDO PROGRAMÁTICO DO CURSO', W / 2, 19, { align: 'center' });

    // Nome do curso
    doc.setFillColor(235, 220, 245);
    doc.rect(12, 31, W - 24, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...PURPLE);
    doc.text(data.curso_nome, 16, 36.5);

    // Tabela de conteúdo programático
    let tableY = 44;
    if (temConteudo && data.conteudo_programatico) {
      // Cabeçalho
      doc.setFillColor(...PURPLE);
      doc.rect(12, tableY, W - 24, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...WHITE);
      doc.text('Conteúdo programático', 16, tableY + 5);
      doc.text('C/H', W - 22, tableY + 5, { align: 'right' });
      tableY += 7;

      let totalH = 0;
      data.conteudo_programatico.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? [255, 255, 255] : [245, 242, 250];
        doc.setFillColor(...bg as [number, number, number]);
        doc.rect(12, tableY, W - 24, 7, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...BLACK);
        doc.text(item.modulo, 16, tableY + 5);
        doc.text(`${item.horas}h`, W - 22, tableY + 5, { align: 'right' });
        totalH += item.horas;
        tableY += 7;
      });

      // Linha total
      doc.setFillColor(...PURPLE);
      doc.rect(12, tableY, W - 24, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...WHITE);
      doc.text('Carga horária total', 16, tableY + 5);
      doc.text(`${totalH}h`, W - 22, tableY + 5, { align: 'right' });
      tableY += 12;
    }

    // Objetivo + Metodologia (2 colunas)
    if (data.objetivo || data.metodologia) {
      const colW = (W - 30) / 2;
      const col1X = 12;
      const col2X = col1X + colW + 6;

      // Cabeçalhos
      doc.setFillColor(...PURPLE);
      doc.rect(col1X, tableY, colW, 8, 'F');
      doc.rect(col2X, tableY, colW, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...WHITE);
      doc.text('OBJETIVO DO CURSO', col1X + colW / 2, tableY + 5.5, { align: 'center' });
      doc.text('METODOLOGIA', col2X + colW / 2, tableY + 5.5, { align: 'center' });
      tableY += 8;

      // Conteúdo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BLACK);
      const objLines = doc.splitTextToSize(data.objetivo || '', colW - 4);
      const metLines = doc.splitTextToSize(data.metodologia || '', colW - 4);
      const maxLines = Math.max(objLines.length, metLines.length);
      const blockH = maxLines * 4.5 + 8;

      doc.setFillColor(252, 248, 255);
      doc.rect(col1X, tableY, colW, blockH, 'F');
      doc.rect(col2X, tableY, colW, blockH, 'F');
      doc.text(objLines, col1X + 3, tableY + 5);
      doc.text(metLines, col2X + 3, tableY + 5);
      tableY += blockH + 4;
    }

    // Barra de stats
    const statsStr = [
      data.carga_horaria ? `Carga Horária: ${data.carga_horaria}h` : null,
      data.modulos_count ? `Módulos: ${data.modulos_count}` : null,
      data.aprovacao_minima ? `Aprovação mínima: ${data.aprovacao_minima}%` : null,
      data.validade_anos ? `Validade: ${data.validade_anos} anos` : null,
    ].filter(Boolean).join('   ');

    if (statsStr) {
      doc.setFillColor(235, 220, 245);
      doc.rect(12, tableY, W - 24, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...PURPLE);
      doc.text(statsStr, W / 2, tableY + 5.5, { align: 'center' });
      tableY += 12;
    }

    // Reconhecimento + Verificação + Validade (3 colunas)
    if (data.reconhecimento || data.validade_em) {
      const c3W = (W - 30) / 3;
      const cX = [12, 12 + c3W + 3, 12 + (c3W + 3) * 2];
      const headerTitles = ['RECONHECIMENTO', 'VERIFICAÇÃO DE AUTENTICIDADE', 'VÁLIDO ATÉ'];
      headerTitles.forEach((title, i) => {
        doc.setFillColor(...PURPLE);
        doc.rect(cX[i], tableY, c3W, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...WHITE);
        doc.text(title, cX[i] + c3W / 2, tableY + 4.5, { align: 'center' });
      });
      tableY += 7;

      const recText = data.reconhecimento || 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP).';
      const verText = 'Validação via website do ITC.';
      const valText = data.validade_em ? `Vencimento\n${fmtDateLong(data.validade_em)}` : '—';

      doc.setFillColor(252, 248, 255);
      const c3H = 28;
      [0, 1, 2].forEach(i => doc.rect(cX[i], tableY, c3W, c3H, 'F'));

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...BLACK);
      doc.text(doc.splitTextToSize(recText, c3W - 4), cX[0] + 2, tableY + 5);
      doc.text(doc.splitTextToSize(verText, c3W - 4), cX[1] + 2, tableY + 5);

      // Validade com destaque
      if (data.validade_em) {
        doc.setFillColor(...PURPLE);
        doc.roundedRect(cX[2] + 4, tableY + 4, c3W - 8, 18, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...WHITE);
        doc.text('Vencimento', cX[2] + c3W / 2, tableY + 10, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(fmtDate(data.validade_em), cX[2] + c3W / 2, tableY + 17, { align: 'center' });
      }
      tableY += c3H + 4;
    }

    // Rodapé
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.line(12, H - 12, W - 12, H - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...LGRAY);
    doc.text(
      `Instituto de Treinamentos e Resgate do Amapá – ITC · CNPJ 53.827.322/0001-75 · Macapá, AP · www.itctreinamentos.com`,
      W / 2, H - 7, { align: 'center' }
    );
  }

  return doc.output('blob');
}
