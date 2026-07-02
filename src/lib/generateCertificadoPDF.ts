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

// ════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO POR TENANT (escola)
// O motor de certificados é genérico do módulo School. Tudo o que é
// específico de uma escola (imagens, textos institucionais, diretor,
// mapas de assinaturas e temas) vive aqui. Para adicionar uma nova
// escola: criar um novo TenantCertConfig + pasta de assets própria em
// /public/assets/certificado/<tenant>/.
// ════════════════════════════════════════════════════════════════

export interface TenantCertConfig {
  /** Pasta dos assets deste tenant (sem barra final). Vazio = sem imagens. */
  assetsBase: string;
  /** Nome oficial (negrito no texto introdutório da página 1). */
  nomeOficial: string;
  /** Cabeçalho roxo do verso (linha 1). */
  headerVerso: string;
  /** Rodapé do verso (só usado no fallback sem template). */
  rodapeVerso: string;
  /** Texto da coluna "Verificação de autenticidade". */
  verificacaoTexto: string;
  /** Texto por defeito da coluna "Reconhecimento" (quando o curso não define). */
  reconhecimentoDefault: string;
  /** Nome do diretor em duas linhas + cargo. */
  diretorNome: [string, string];
  diretorCargo: string;
  /** Ficheiro da assinatura do diretor (dentro de assetsBase) ou null. */
  diretorSigFile: string | null;
  /** Cargo mostrado sob a assinatura do instrutor. */
  instrutorCargo: string;
  /** Logos do topo (fallback manual): esquerda / centro / centro-saúde / direita. */
  logoEsquerda?: string;
  logoCentro?: string;
  logoCentroSaude?: string;
  logoDireita?: string;
  /** Categorias que trocam o logo central pela variante de saúde. */
  healthCats: string[];
  /** Assinaturas de instrutores empacotadas: match por tokens do nome. */
  instrutorSigs: { tokens: string[]; file: string }[];
  /** Foto de fundo (marca d'água) por tema: match por token no nome do curso. */
  cursoTemas: { token: string; tema: string }[];
}

const ITC_CONFIG: TenantCertConfig = {
  assetsBase: '/assets/certificado/itc',
  nomeOficial: 'Instituto de Treinamentos e resgate do Amapá - ITC',
  headerVerso: 'INSTITUTO DE TREINAMENTOS E RESGATE DO AMAPÁ — ITC',
  rodapeVerso:
    'Instituto de Treinamentos e Resgate do Amapá – ITC · CNPJ 53.827.322/0001-75 · Macapá, AP · www.itctreinamentos.com',
  verificacaoTexto:
    'Acesse o site www.itctreinamentos.com para verificar a autenticidade deste certificado através do código de codificação.',
  reconhecimentoDefault:
    'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP), em conformidade com as Normas Regulamentadoras aplicáveis (MTE/Brasil).',
  diretorNome: ['Renevaldo Machado', 'Cavalcante'],
  diretorCargo: 'Diretor Pedagógico',
  diretorSigFile: 'sig-renevaldo-cavalcante.png',
  instrutorCargo: 'Instrutor Responsável',
  logoEsquerda: 'logo-itc.png',
  logoCentro: 'logo-mais-com.png',
  logoCentroSaude: 'logo-nobre-urgencia.png',
  logoDireita: 'logo-cee-ap.png',
  healthCats: ['saude', 'saúde', 'resgate', 'emergência', 'emergencia', 'primeiros socorros', 'socorrismo'],
  instrutorSigs: [
    { tokens: ['marcos', 'ferreira'], file: 'sig-marcos-ferreira.png' },
    { tokens: ['eber',   'sousa'],    file: 'sig-eber-sousa.png' },
    { tokens: ['eder',   'barbosa'],  file: 'sig-eder-barbosa.png' },
    { tokens: ['fabio',  'costa'],    file: 'sig-fabio-costa.png' },
  ],
  cursoTemas: [
    { token: 'altura',         tema: 'altura' },        // Supervisor / Trabalhador / Resgate em Altura
    { token: 'bombeiro',       tema: 'bombeiro' },
    { token: 'eletricista',    tema: 'eletrica' },
    { token: 'assentador',     tema: 'construcao' },
    { token: 'pedreiro',       tema: 'construcao' },
    { token: 'instalador',     tema: 'construcao' },
    { token: 'hidraulico',     tema: 'construcao' },
    { token: 'refrigeracao',   tema: 'refrigeracao' },
    { token: 'rocadeira',      tema: 'rocadeira' },
    { token: 'portaria',       tema: 'portaria' },
    { token: 'administrativo', tema: 'administrativo' },
  ],
};

/** Resolve a configuração do tenant a partir dos dados do certificado. */
function resolveTenantConfig(data: CertificadoPDFData): TenantCertConfig {
  const n = normName(data.empresa_nome || '');
  if (n.includes('itc') || n.includes('instituto de treinamentos')) return ITC_CONFIG;
  // Tenant desconhecido: certificado funcional sem imagens, textos derivados dos dados
  return {
    assetsBase: '',
    nomeOficial: data.empresa_nome || '—',
    headerVerso: (data.empresa_nome || '').toUpperCase(),
    rodapeVerso: data.empresa_nome || '',
    verificacaoTexto:
      'Verifique a autenticidade deste certificado através do código de codificação junto da instituição emissora.',
    reconhecimentoDefault:
      'Certificado emitido em conformidade com as normas aplicáveis à formação profissional.',
    diretorNome: ['', ''],
    diretorCargo: 'Diretor Pedagógico',
    diretorSigFile: null,
    instrutorCargo: 'Instrutor Responsável',
    healthCats: [],
    instrutorSigs: [],
    cursoTemas: [],
  };
}

// ════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════

function isHealthCategory(cfg: TenantCertConfig, cat?: string | null): boolean {
  if (!cat) return false;
  return cfg.healthCats.some(h => cat.toLowerCase().includes(h));
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

// Formata horas decimais como no sistema antigo: 3 → "3h", 1.5 → "1h30min", 0.5 → "30min"
function formatHoras(h: number): string {
  if (!h || h <= 0) return '';
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  if (min === 0) return `${whole}h`;
  if (whole === 0) return `${min}min`;
  return `${whole}h${min}min`;
}

function normName(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function pickInstrutorSigFile(cfg: TenantCertConfig, nome?: string | null): string | null {
  if (!nome) return null;
  const n = normName(nome);
  for (const e of cfg.instrutorSigs) if (e.tokens.every(t => n.includes(t))) return e.file;
  return null;
}

function pickCursoTema(cfg: TenantCertConfig, nome?: string | null): string | null {
  if (!nome) return null;
  const n = normName(nome);
  for (const e of cfg.cursoTemas) if (n.includes(e.token)) return e.tema;
  return null;
}

async function loadImg(url: string | null): Promise<string | null> {
  if (!url) return null;
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

// Desenha um logo preservando o aspect ratio natural, dentro de uma caixa (maxW × maxH).
// anchorY é interpretado segundo vAnchor: 'middle' (centro vert., default) ou 'bottom'
// (a base da imagem fica em anchorY — usado nas assinaturas para assentarem na linha).
// anchor: 'left' | 'center' | 'right'
function addLogoFit(
  doc: jsPDF,
  dataUrl: string | null,
  anchorX: number,
  anchorY: number,
  maxW: number,
  maxH: number,
  anchor: 'left' | 'center' | 'right',
  vAnchor: 'middle' | 'bottom' = 'middle'
) {
  if (!dataUrl) return;
  let w = maxW, h = maxH;
  try {
    const p: any = doc.getImageProperties(dataUrl);
    const r = p.width / p.height;
    w = maxW; h = w / r;
    if (h > maxH) { h = maxH; w = h * r; }
  } catch { /* fallback: usa a caixa cheia */ }
  const x = anchor === 'left' ? anchorX : anchor === 'right' ? anchorX - w : anchorX - w / 2;
  const y = vAnchor === 'bottom' ? anchorY - h : anchorY - h / 2;
  doc.addImage(dataUrl, 'PNG', x, y, w, h, undefined, 'FAST');
}

// Losango preenchido (rotação 45°) centrado em (cx,cy), meia-diagonal hd
function diamondFill(doc: jsPDF, cx: number, cy: number, hd: number, c: [number, number, number]) {
  doc.setFillColor(...c);
  doc.triangle(cx, cy - hd, cx + hd, cy, cx, cy + hd, 'F');
  doc.triangle(cx, cy - hd, cx - hd, cy, cx, cy + hd, 'F');
}

// Losango só contorno (linha)
function diamondOutline(doc: jsPDF, cx: number, cy: number, hdx: number, hdy: number, c: [number, number, number], lw: number) {
  doc.setDrawColor(...c);
  doc.setLineWidth(lw);
  doc.line(cx, cy - hdy, cx + hdx, cy);
  doc.line(cx + hdx, cy, cx, cy + hdy);
  doc.line(cx, cy + hdy, cx - hdx, cy);
  doc.line(cx - hdx, cy, cx, cy - hdy);
}

// Decoração de losangos no rodapé (igual à maquete de referência)
function drawBottomDiamonds(doc: jsPDF) {
  // Contornos coral — 2 losangos sobrepostos de cada lado (como a maquete)
  diamondOutline(doc, 6,   272, 39, 39, [255, 128, 128], 1.1); // esq. exterior
  diamondOutline(doc, 36,  283, 30, 30, [255, 128, 128], 1.1); // esq. interior
  diamondOutline(doc, 204, 272, 39, 39, [255, 128, 128], 1.1); // dir. exterior
  diamondOutline(doc, 174, 283, 30, 30, [255, 128, 128], 1.1); // dir. interior
  // Losangos preenchidos
  diamondFill(doc, 11.8,  282.8, 14.2, [255, 204, 0]);   // amarelo — canto inf. esquerdo
  diamondFill(doc, 43.5,  288,   17,   [255, 151, 13]);  // laranja
  diamondFill(doc, 198.2, 282.8, 14.2, [96, 142, 40]);   // verde — canto inf. direito
  diamondFill(doc, 166.5, 288,   17,   [141, 50, 124]);  // roxo
}

function drawCornerDecorations(doc: jsPDF, bottomDiamonds = false) {
  const s1 = 50, s2 = 35, s3 = 20;

  if (bottomDiamonds) {
    // Rodapé com losangos (página 1, como a maquete)
    drawBottomDiamonds(doc);
  } else {
    // Canto inferior esquerdo: vermelho-laranja / laranja / amarelo (página 2)
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
  }

  // Canto superior direito: verde escuro / verde médio
  doc.setFillColor(0, 110, 55);
  doc.triangle(W, 0, W - 30, 0, W, 30, 'F');
  doc.setFillColor(30, 160, 80);
  doc.triangle(W, 0, W - 18, 0, W, 18, 'F');

  // Canto superior esquerdo: laranja pequeno
  doc.setFillColor(210, 55, 25);
  doc.triangle(0, 0, 20, 0, 0, 20, 'F');
}

// ════════════════════════════════════════════════════════════════
// Gerador
// ════════════════════════════════════════════════════════════════

export async function generateCertificadoPDF(data: CertificadoPDFData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const base = window.location.origin;
  const cfg = resolveTenantConfig(data);

  // URL de um asset do tenant (null quando o tenant não tem assets)
  const asset = (file?: string | null): string | null =>
    cfg.assetsBase && file ? `${base}${cfg.assetsBase}/${file}` : null;

  // Tema da foto de fundo (marca d'água), conforme o curso
  const tema = pickCursoTema(cfg, data.curso_nome);

  const [bgImg, logoItc, logoCentro, logoCee, logoDir, cursiveFont, tplP1, tplP2, tplFrame, bgFoto] = await Promise.all([
    loadImg(asset('cert-background.jpg')),
    loadImg(asset(cfg.logoEsquerda)),
    isHealthCategory(cfg, data.curso_categoria)
      ? loadImg(asset(cfg.logoCentroSaude))
      : loadImg(asset(cfg.logoCentro)),
    loadImg(asset(cfg.logoDireita)),
    loadImg(asset(cfg.diretorSigFile)),
    loadCursiveFont(doc),
    loadImg(asset('cert_page_1_branco.png')),
    loadImg(asset('cert_page_2a_branco.png')),
    loadImg(asset('cert_page_1_frame.png')),
    tema ? loadImg(asset(`bg-${tema}.png`)) : Promise.resolve(null),
  ]);

  // Assinatura do DIRETOR = ficheiro fixo do tenant.
  // Assinatura do INSTRUTOR: 1) URL do docente no storage; 2) fallback por nome
  //    para um asset empacotado; 3) nenhuma (mostra só a linha).
  let logoInst: string | null = null;
  if (data.docente_assinatura_url) {
    logoInst = await loadImg(data.docente_assinatura_url);
  } else {
    const instFile = pickInstrutorSigFile(cfg, data.docente_nome);
    if (instFile) logoInst = await loadImg(asset(instFile));
  }

  // ════════════════════════════════════════════════════════════
  // PÁGINA 1 — CERTIFICADO
  // ════════════════════════════════════════════════════════════

  // Fundo da página 1.
  // Preferido: estratificação branco → FOTO do tema (cinza, esmaecida) → MOLDURA
  //   transparente (logos+losangos+cantos). Sem foto, fica visualmente igual ao branco.
  if (tplFrame) {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');
    if (bgFoto) {
      doc.saveGraphicsState();
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.16 }));
      doc.addImage(bgFoto, 'PNG', 0, 0, W, H, undefined, 'FAST');
      doc.restoreGraphicsState();
    }
    doc.addImage(tplFrame, 'PNG', 0, 0, W, H, undefined, 'FAST');
  } else if (tplP1) {
    // Fallback 1: maquete opaca (sem foto de fundo)
    doc.addImage(tplP1, 'PNG', 0, 0, W, H, undefined, 'FAST');
  } else {
    // Fallback 2: desenho manual (caso nenhum template carregue)
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');
    if (bgImg) {
      doc.saveGraphicsState();
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
      doc.addImage(bgImg, 'JPEG', 10, 40, W - 20, 190, undefined, 'FAST');
      doc.restoreGraphicsState();
    }
    drawCornerDecorations(doc, true);
    const logoCY = 20;
    addLogoFit(doc, logoItc,    12,     logoCY, 30, 26, 'left');
    addLogoFit(doc, logoCentro, W / 2,  logoCY, 28, 28, 'center');
    addLogoFit(doc, logoCee,    W - 12, logoCY, 54, 22, 'right');
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
  renderInlineText(doc, [
    { text: 'O ',              bold: false, color: DGRAY },
    { text: cfg.nomeOficial,   bold: true,  color: BLACK },
    { text: ', confere este',  bold: false, color: DGRAY },
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
  const sigLineY   = 236;
  const sigBottomY = sigLineY - 1.5;  // a base da assinatura assenta logo acima da linha
  const leftX      = 52;
  const rightX     = W - 52;

  // Instrutor (esquerda) — proporção preservada, fundo transparente, assente na linha
  addLogoFit(doc, logoInst, leftX, sigBottomY, 42, 22, 'center', 'bottom');
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
      doc.text(cfg.instrutorCargo, leftX, sigLineY + 19, { align: 'center' });
    } else {
      doc.text(l1, leftX, sigLineY + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DGRAY);
      doc.text(cfg.instrutorCargo, leftX, sigLineY + 13, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DGRAY);
    doc.text(cfg.instrutorCargo, leftX, sigLineY + 7, { align: 'center' });
  }

  // Diretor (direita) — proporção preservada, fundo transparente, assente na linha
  addLogoFit(doc, logoDir, rightX, sigBottomY, 42, 22, 'center', 'bottom');
  doc.setDrawColor(...LGRAY);
  doc.line(rightX - 36, sigLineY, rightX + 36, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  if (cfg.diretorNome[0]) doc.text(cfg.diretorNome[0], rightX, sigLineY + 6,  { align: 'center' });
  if (cfg.diretorNome[1]) doc.text(cfg.diretorNome[1], rightX, sigLineY + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DGRAY);
  doc.text(cfg.diretorCargo, rightX, sigLineY + 19, { align: 'center' });

  // ════════════════════════════════════════════════════════════
  // PÁGINA 2 — CONTEÚDO PROGRAMÁTICO (sempre gerada)
  // ════════════════════════════════════════════════════════════
  {
    doc.addPage();
    // Fundo = template em branco da página 2 (cabeçalho + rodapé + cantos incluídos)
    if (tplP2) {
      doc.addImage(tplP2, 'PNG', 0, 0, W, H, undefined, 'FAST');
    } else {
      // Fallback: desenho manual
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, W, H, 'F');
      drawCornerDecorations(doc);
      doc.setFillColor(...PURPLE);
      doc.rect(0, 0, W, 28, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...WHITE);
      doc.text(cfg.headerVerso, W / 2, 12, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('CONTEÚDO PROGRAMÁTICO DO CURSO', W / 2, 21, { align: 'center' });
    }

    // Nome do curso — faixa lavanda, logo abaixo do cabeçalho do template (~37mm)
    doc.setFillColor(230, 218, 245);
    doc.rect(0, 38, W, 11, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PURPLE);
    doc.text(data.curso_nome || '—', 14, 45.5);

    // ── Tabela conteúdo programático ─────────────────────────
    let tY = 53;
    const temConteudo = (data.conteudo_programatico?.length ?? 0) > 0;
    // Só mostra a coluna C/H se algum módulo tiver horas definidas (fiel ao sistema antigo)
    const temHoras = (data.conteudo_programatico ?? []).some(m => (m.horas ?? 0) > 0);
    if (temConteudo && data.conteudo_programatico) {
      // Cabeçalho da tabela: texto roxo sobre branco
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...PURPLE);
      doc.text('Conteúdo programático', 14, tY);
      if (temHoras) doc.text('C/H', W - 14, tY, { align: 'right' });
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
        if (temHoras && (item.horas ?? 0) > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.text(formatHoras(item.horas), W - 14, tY, { align: 'right' });
        }
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(12, tY + 2, W - 12, tY + 2);
        totalCH += item.horas ?? 0;
        tY += 8;
      });

      // Total (roxo bold) — só quando há horas por módulo
      if (temHoras) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...PURPLE);
        doc.text('Carga horária total', 14, tY);
        doc.text(formatHoras(totalCH), W - 14, tY, { align: 'right' });
        doc.setDrawColor(...PURPLE);
        doc.setLineWidth(0.3);
        doc.line(12, tY + 2, W - 12, tY + 2);
        tY += 10;
      } else {
        tY += 2;
      }
    }

    // ── Objetivo + Metodologia (sempre renderizado) ──────────
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

    // ── Barra de estatísticas (sempre renderizada) ────────────
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

    // ── Reconhecimento / Verificação / Válido até (sempre) ───
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

      const recText = data.reconhecimento || cfg.reconhecimentoDefault;
      const verText = cfg.verificacaoTexto;

      doc.setFillColor(250, 245, 255);
      const bH3 = 34;
      cols.forEach(c => doc.rect(c, tY, c3W, bH3, 'F'));

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...BLACK);
      doc.text(doc.splitTextToSize(recText, c3W - 4), cols[0] + 2, tY + 5);
      doc.text(doc.splitTextToSize(verText, c3W - 4), cols[1] + 2, tY + 5);

      // Caixa "VÁLIDO ATÉ" em verde escuro (como no template)
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

    // Rodapé já vem no template (tplP2); só desenhado no fallback
    if (!tplP2) {
      doc.setDrawColor(...LGRAY);
      doc.setLineWidth(0.3);
      doc.line(12, H - 14, W - 12, H - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...LGRAY);
      doc.text(cfg.rodapeVerso, W / 2, H - 8, { align: 'center' });
    }
  }

  return doc.output('blob');
}
