import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CertificadoPDFData {
  aluno_nome: string;
  curso_nome: string;
  carga_horaria: number | null;
  horas_teoricas?: number | null;
  horas_praticas?: number | null;
  emitido_em: string;        // 'YYYY-MM-DD'
  validade_em?: string | null;
  docente_nome?: string | null;
  codigo: string;
  empresa_nome: string;
  empresa_logo_url?: string | null;
  conteudo_programatico?: string[];
  objetivo?: string | null;
  reconhecimento?: string | null;
  aprovacao_minima?: number | null;
}

const W = 297;  // A4 landscape width mm
const H = 210;  // A4 landscape height mm

// Cores ITC
const GOLD   = [180, 140, 40]  as [number, number, number];
const DARK   = [20,  30,  50]  as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];
const LIGHT  = [240, 240, 245] as [number, number, number];
const GREY   = [120, 120, 130] as [number, number, number];

function fmt(d: string) {
  return format(new Date(d + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function generateCertificadoPDF(data: CertificadoPDFData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ─── PÁGINA 1 — Certificado ──────────────────────────────────────────────

  // Fundo escuro
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, H, 'F');

  // Faixa lateral esquerda dourada
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, 8, H, 'F');

  // Faixa topo dourada
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, W, 3, 'F');

  // Faixa fundo dourada
  doc.rect(0, H - 3, W, 3, 'F');

  // Faixa lateral direita
  doc.rect(W - 8, 0, 8, H, 'F');

  // Título "CERTIFICADO"
  doc.setTextColor(...GOLD);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO DE CONCLUSÃO', W / 2, 22, { align: 'center' });

  // Linha decorativa
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(60, 26, W - 60, 26);

  // "Certificamos que"
  doc.setTextColor(...GREY as [number, number, number]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Certificamos que', W / 2, 38, { align: 'center' });

  // Nome do aluno em destaque
  doc.setTextColor(...WHITE);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  const nomeAluno = data.aluno_nome.toUpperCase();
  doc.text(nomeAluno, W / 2, 58, { align: 'center' });

  // Linha sob o nome
  const nomeWidth = doc.getTextWidth(nomeAluno);
  const nomeX = W / 2 - nomeWidth / 2;
  doc.setLineWidth(0.6);
  doc.line(nomeX, 61, nomeX + nomeWidth, 61);

  // "participou e concluiu com êxito"
  doc.setTextColor(...GREY as [number, number, number]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('participou e concluiu com êxito o curso de', W / 2, 73, { align: 'center' });

  // Nome do curso
  doc.setTextColor(...GOLD);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.curso_nome, W / 2, 86, { align: 'center' });

  // Carga horária
  if (data.carga_horaria) {
    doc.setTextColor(...LIGHT as [number, number, number]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const hText = data.horas_teoricas && data.horas_praticas
      ? `Carga horária total: ${data.carga_horaria}h (${data.horas_teoricas}h teóricas + ${data.horas_praticas}h práticas)`
      : `Carga horária: ${data.carga_horaria} horas`;
    doc.text(hText, W / 2, 96, { align: 'center' });
  }

  // Datas (emissão + validade)
  doc.setTextColor(...GREY as [number, number, number]);
  doc.setFontSize(8.5);
  const emitidoText = `Emitido em ${fmt(data.emitido_em)}`;
  const validadeText = data.validade_em ? `   ·   Válido até ${fmt(data.validade_em)}` : '';
  doc.text(emitidoText + validadeText, W / 2, 106, { align: 'center' });

  // Reconhecimento / NR
  if (data.reconhecimento) {
    doc.setTextColor(...LIGHT as [number, number, number]);
    doc.setFontSize(8);
    doc.text(data.reconhecimento, W / 2, 115, { align: 'center' });
  }

  // ── Assinatura + instrutor ─────────────────────────────────────
  if (data.docente_nome) {
    const sigX = W / 2;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.line(sigX - 40, 148, sigX + 40, 148);
    doc.setTextColor(...WHITE);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(data.docente_nome, sigX, 153, { align: 'center' });
    doc.setTextColor(...GREY as [number, number, number]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Instrutor Responsável', sigX, 158, { align: 'center' });
  }

  // ── Assinatura empresa (esquerda) ──────────────────────────────
  const empX = 60;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(empX - 35, 148, empX + 35, 148);
  doc.setTextColor(...WHITE);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(data.empresa_nome, empX, 153, { align: 'center' });
  doc.setTextColor(...GREY as [number, number, number]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Instituição', empX, 158, { align: 'center' });

  // ── QR Code (canto inferior direito) ──────────────────────────
  const verifyUrl = `${window.location.origin}/certificado/${data.codigo}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1, color: { dark: '#ffffff', light: '#00000000' } });
    doc.addImage(qrDataUrl, 'PNG', W - 52, H - 55, 36, 36);
    doc.setTextColor(...GREY as [number, number, number]);
    doc.setFontSize(6.5);
    doc.text('Verificar autenticidade', W - 34, H - 16, { align: 'center' });
  } catch { /* QR silently skipped */ }

  // ── Código (canto inferior esquerdo) ──────────────────────────
  doc.setTextColor(...GREY as [number, number, number]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Código: ${data.codigo}`, 16, H - 10);

  // ── Logo empresa (topo esquerdo) ──────────────────────────────
  if (data.empresa_logo_url) {
    try {
      const logoData = await loadImageAsDataUrl(data.empresa_logo_url);
      if (logoData) doc.addImage(logoData, 16, 10, 28, 18, undefined, 'FAST');
    } catch { /* logo skipped */ }
  }

  // ─── PÁGINA 2 — Conteúdo Programático ───────────────────────────────────

  if ((data.conteudo_programatico?.length ?? 0) > 0 || data.objetivo) {
    doc.addPage();

    doc.setFillColor(...DARK);
    doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, 0, W, 3, 'F');
    doc.rect(0, H - 3, W, 3, 'F');
    doc.rect(0, 0, 8, H, 'F');
    doc.rect(W - 8, 0, 8, H, 'F');

    doc.setTextColor(...GOLD);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTEÚDO PROGRAMÁTICO', W / 2, 20, { align: 'center' });

    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(60, 24, W - 60, 24);

    // Curso + aluno
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.text(data.curso_nome, W / 2, 33, { align: 'center' });
    doc.setTextColor(...GREY as [number, number, number]);
    doc.setFontSize(8);
    doc.text(`Participante: ${data.aluno_nome}`, W / 2, 40, { align: 'center' });

    let y = 52;

    if (data.objetivo) {
      doc.setTextColor(...GOLD);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('OBJETIVO', 18, y);
      y += 6;
      doc.setTextColor(...LIGHT as [number, number, number]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const objLines = doc.splitTextToSize(data.objetivo, W - 36);
      doc.text(objLines, 18, y);
      y += objLines.length * 5 + 6;
    }

    if (data.conteudo_programatico && data.conteudo_programatico.length > 0) {
      doc.setTextColor(...GOLD);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('MÓDULOS', 18, y);
      y += 6;
      doc.setTextColor(...LIGHT as [number, number, number]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      const half = Math.ceil(data.conteudo_programatico.length / 2);
      const left = data.conteudo_programatico.slice(0, half);
      const right = data.conteudo_programatico.slice(half);
      const colW = (W - 36) / 2;

      left.forEach((item, i) => {
        doc.text(`• ${item}`, 18, y + i * 7);
        if (right[i]) doc.text(`• ${right[i]}`, 18 + colW, y + i * 7);
      });
      y += half * 7 + 6;
    }

    if (data.aprovacao_minima) {
      doc.setTextColor(...GREY as [number, number, number]);
      doc.setFontSize(7.5);
      doc.text(`Nota mínima de aprovação: ${data.aprovacao_minima}%`, 18, y);
    }

    // Código + data no rodapé
    doc.setTextColor(...GREY as [number, number, number]);
    doc.setFontSize(7);
    doc.text(`Código: ${data.codigo}   ·   Emitido em: ${fmt(data.emitido_em)}   ·   ${data.empresa_nome}`, W / 2, H - 10, { align: 'center' });
  }

  return doc.output('blob');
}
