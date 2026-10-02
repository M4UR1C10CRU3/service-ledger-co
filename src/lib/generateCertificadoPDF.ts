import { jsPDF } from 'jspdf';
import { linhaResponsabilidadeTecnica, codigoNormaDoCurso } from "@/lib/responsabilidadeTecnica";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CertificadoPDFData {
  aluno_nome: string;
  aluno_cpf?: string | null;
  /** Só se imprimem na Direção Defensiva (exigência do DETRAN). */
  aluno_cnh_renach?: string | null;
  aluno_cnh_categoria?: string | null;
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
  /**
   * Selo na caixa RECONHECIMENTO, escolhido pelo cliente do aluno (reconhecimentoCertificado.ts).
   * undefined = certificado antigo, sem esta escolha: fica como era (Equatorial em todos os da arte do ITC).
   */
  logo_reconhecimento?: 'equatorial' | 'ipiranga' | null;
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

  // ── Responsabilidade técnica (TRT) ──────────────────────────────────────
  rt_nome?: string | null;
  rt_titulo?: string | null;
  rt_conselho?: string | null;
  rt_registo?: string | null;
  trt_numero?: string | null;
  trt_validade?: string | null;
  trt_nrs?: string[] | null;

  // ── O que uma auditoria de NR confere ───────────────────────────────────
  tipo_treinamento?: string | null;
  local_realizacao?: string | null;
  nota_final?: number | null;
  frequencia_percent?: number | null;
  instrutor_qualificacao?: string | null;
  entidade_razao_social?: string | null;
  entidade_documento?: string | null;
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

// Logótipo da entidade homologadora, na caixa RECONHECIMENTO do verso. Hoje é o
// Grupo Equatorial, que homologa o ITC, e por isso vive na pasta do ITC e só entra
// nos certificados dessa arte — outra escola não deve levar este selo. Quando
// houver uma segunda escola, isto passa a campo na ficha da empresa.
// Desde 02/10/2026 o selo depende do cliente do aluno: Equatorial (setor elétrico e engenharia) ou
// Ipiranga (empresas do grupo). Ver reconhecimentoCertificado.ts.
const LOGOS_HOMOLOGA = {
  equatorial: { path: '/assets/certificado/itc/logo-equatorial.png', prop: 954 / 284 },   // já recortado
  ipiranga:   { path: '/assets/certificado/itc/logo-ipiranga.png',   prop: 880 / 272 },   // retângulo amarelo
} as const;

const HEALTH_CATS = ['saude', 'resgate', 'saúde', 'emergência', 'emergencia', 'primeiros socorros', 'socorrismo'];

/** «Direção Defensiva», com ou sem acentos, maiúsculas ou minúsculas. */
export function eDirecaoDefensiva(nomeCurso?: string | null): boolean {
  return codigoNormaDoCurso(nomeCurso) === 'DIRECAO-DEFENSIVA';
}

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

/**
 * Opacidade da marca de água conforme a claridade da imagem. Os 16 % foram
 * afinados para a fotografia escura da NR-35; uma imagem clara (a placa da
 * Direção Defensiva) a 16 % desaparece. Sobe até 40 % à medida que a imagem é
 * mais clara — o texto por cima continua legível porque a imagem é clara.
 */
async function opacidadeMarcaAgua(dataUrl: string): Promise<number> {
  try {
    const img = new Image();
    await new Promise<void>((ok, err) => { img.onload = () => ok(); img.onerror = () => err(new Error('img')); img.src = dataUrl; });
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d'); if (!ctx) return 0.16;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 64, 64); ctx.drawImage(img, 0, 0, 64, 64);
    const d = ctx.getImageData(0, 0, 64, 64).data; let soma = 0;
    for (let i = 0; i < d.length; i += 4) soma += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    const lum = soma / (d.length / 4);          // 0 = preta, 1 = branca
    if (lum <= 0.5) return 0.16;
    return Math.min(0.40, 0.16 + ((lum - 0.5) / 0.45) * 0.24);
  } catch { return 0.16; }
}

async function loadImg(url: string): Promise<string | null> {
  // Sem endereço não há imagem. Antes, fetch('') pedia a própria página da
  // aplicação (HTML, 200 OK), que seguia como «PNG» e rebentava o addImage —
  // um instrutor sem assinatura fazia falhar todos os certificados da turma
  // (Op. de Roçadeira, 28/09/2026).
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    // Mesma armadilha com um caminho que já não existe: o servidor devolve o
    // index.html da SPA com 200. Só aceitamos imagens.
    if (!blob.type.startsWith('image/')) return null;
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

/**
 * Bloco de quem assina, de cima para baixo:
 *
 *       Divaldo dos Santos Souza          ← nome
 *   Engenheiro Eletricista — CREA/AP …    ← título profissional e registo
 *          Instrutor Responsável          ← função neste curso
 *
 * O título vem antes da função porque é ele que credencia quem assina: um SESMT
 * lê-o para saber se aquela pessoa tinha competência para ensinar aquilo. A
 * função é só o papel que teve no curso.
 */
function drawSignatario(
  doc: jsPDF,
  x: number,
  lineY: number,
  nome: string | null | undefined,
  cargo: string,
  /**
   * Só as formações que credenciam a norma DESTE curso, já ordenadas pelo
   * título mais alto — decidido em `qualificacaoParaCertificado`.
   */
  qualificacao?: string | null,
) {
  const LARGURA = 74;   // a linha da assinatura tem 72 mm

  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.4);
  doc.line(x - 36, lineY, x + 36, lineY);

  let y = lineY;

  // ── Nome ────────────────────────────────────────────────────────────────
  if (nome) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    // Partir pela LARGURA e não pela contagem de palavras: "Marcos Ferreira da
    // Silva" cabia numa linha e saía partido ao meio, "Marcos Ferreira / da
    // Silva".
    const linhasNome = doc.splitTextToSize(nome, LARGURA).slice(0, 2);
    linhasNome.forEach((l: string) => { y += 6; doc.text(l, x, y, { align: 'center' }); });
  }

  // ── Título profissional e registo ───────────────────────────────────────
  if (qualificacao) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...DGRAY);
    const todas = doc.splitTextToSize(qualificacao, LARGURA) as string[];
    const cabem = todas.slice(0, 2);
    // Duas linhas é o que cabe antes de a assinatura tocar no rodapé. O que
    // não couber é ANUNCIADO, nunca cortado em silêncio: um certificado que
    // esconde metade de uma credencial é pior do que um que a resume.
    if (todas.length > 2) {
      const total = qualificacao.split(' · ').length;
      const mostradas = cabem.join(' ').split(' · ').length;
      const extra = total - mostradas;
      if (extra > 0) cabem[1] = `${cabem[1].replace(/[\s·]+$/, '')} e mais ${extra}`;
    }
    cabem.forEach((l: string) => { y += 4; doc.text(l, x, y, { align: 'center' }); });
  }

  // ── Função no curso ─────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...LGRAY);
  y += qualificacao ? 5 : 6;
  doc.text(cargo, x, y, { align: 'center' });
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

  const arteDoItc = /\/certificado\/itc\//.test(data.arte_frente || '');
  const seloHomologa: 'equatorial' | 'ipiranga' | null = !arteDoItc ? null
    : data.logo_reconhecimento === undefined ? 'equatorial'   // certificado anterior a esta regra
    : data.logo_reconhecimento;
  const [sigInstrutor, sigDiretor, qrImg, logoHomologa] = await Promise.all([
    loadImg(urlAbs(data.docente_assinatura_url) || ''),
    loadImg(urlAbs(data.diretor_assinatura_url) || ''),
    data.qr_verificacao ? Promise.resolve(data.qr_verificacao) : Promise.resolve(null),
    // Só a escola cuja arte vive na pasta do ITC leva selo de homologador, e qual depende do cliente.
    seloHomologa ? loadImg(`${base}${LOGOS_HOMOLOGA[seloHomologa].path}`) : Promise.resolve(null),
  ]);
  const LOGO_HOMOLOGA_PROP = seloHomologa ? LOGOS_HOMOLOGA[seloHomologa].prop : 1;

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
    (doc as any).setGState(new (doc as any).GState({ opacity: await opacidadeMarcaAgua(bgImg) }));
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
    doc.text(`CPF: ${data.aluno_cpf}`, W / 2, 136, { align: 'center' });
  }

  // Direção Defensiva: o DETRAN exige o RENACH e a categoria da CNH no certificado.
  // Os campos vivem na ficha do aluno e só saem impressos neste curso.
  if (eDirecaoDefensiva(data.curso_nome) && (data.aluno_cnh_renach || data.aluno_cnh_categoria)) {
    const partes: string[] = [];
    if (data.aluno_cnh_renach) partes.push(`RENACH: ${data.aluno_cnh_renach}`);
    if (data.aluno_cnh_categoria) partes.push(`Categoria CNH: ${data.aluno_cnh_categoria}`);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...BLACK);
    doc.text(partes.join('   ·   '), W / 2, 142, { align: 'center' });
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
    chSegs.push({ text: 'Conclusão: ', bold: true, color: BLACK });
    chSegs.push({ text: fmtDate(conclusao), bold: false, color: DGRAY });
  }
  if (chSegs.length) renderInlineText(doc, chSegs, 162, 11);

  // ── Bloco de dados ─────────────────────────────────────────
  //
  // Um cursor em vez de Y escritos à mão: as linhas daqui para baixo são
  // opcionais (nem toda a turma tem local próprio, nem todo o aluno tem nota) e
  // com posições fixas duas delas sobrepunham-se. O cursor desce só quando algo
  // é mesmo impresso.
  let y = 162;
  const linha = (
    segs: { text: string; bold: boolean; color: [number, number, number] }[],
    salto: number,
    tamanho = 11,
  ) => { y += salto; renderInlineText(doc, segs, y, tamanho); };

  const TIPO_LABEL: Record<string, string> = {
    inicial: 'Inicial',
    periodico: 'Periódico',
    reciclagem: 'Reciclagem',
    eventual: 'Eventual',
    complementar: 'Complementar',
  };

  // O tipo de treinamento é o primeiro item que uma auditoria procura: sem ele
  // não se sabe de quando conta o prazo da próxima formação.
  if (data.tipo_treinamento) {
    linha([
      { text: 'Tipo de treinamento: ', bold: true, color: BLACK },
      { text: TIPO_LABEL[data.tipo_treinamento] ?? data.tipo_treinamento, bold: false, color: DGRAY },
    ], 9);
  }

  const empVal = data.empresa_aplicacao || data.empresa_nome;
  linha([
    { text: 'Empresa ou local de aplicação: ', bold: true, color: BLACK },
    { text: empVal, bold: false, color: DGRAY },
  ], 9);

  // Onde o curso foi dado — diferente de para quem foi dado. Só sai quando é
  // outra coisa: repetir a mesma morada seria ruído.
  if (data.local_realizacao && data.local_realizacao !== empVal) {
    linha([
      { text: 'Local de realização: ', bold: true, color: BLACK },
      { text: data.local_realizacao, bold: false, color: DGRAY },
    ], 8, 10);
  }


  linha([
    { text: 'Codificação do certificado: ', bold: true, color: BLACK },
    { text: data.codigo, bold: false, color: DGRAY },
  ], 9);


  // ── Responsabilidade técnica e qualificação do instrutor ───
  // Mais miúdas que o resto: são informação de credenciamento, não de honra.
  {
    const rt = linhaResponsabilidadeTecnica(
      {
        nome: data.rt_nome,
        titulo: data.rt_titulo,
        conselho: data.rt_conselho,
        registo: data.rt_registo,
        trtNumero: data.trt_numero,
        trtValidade: data.trt_validade,
        trtNrs: data.trt_nrs,
      },
      { nome: data.curso_nome, categoria: data.curso_categoria },
      data.emitido_em,
    );


    if (rt) {
      linha([{ text: rt.responsavel, bold: false, color: DGRAY }], 7, 8.5);
      if (rt.registo) linha([{ text: rt.registo, bold: true, color: DGRAY }], 5, 8.5);
    }
  }

  // ── Assinaturas ────────────────────────────────────────────
  const sigLineY = 236;
  const sigImgH  = 21;
  const sigImgW  = 55;
  // Os PNG das assinaturas trazem margem transparente em baixo: com a imagem a
  // terminar acima da linha, o traço ficava a flutuar. Desce até 4 mm abaixo da
  // linha para o traço assentar nela (pedido do utilizador, 14/09/2026).
  const sigImgY  = sigLineY - sigImgH + 4;
  const leftX    = 52;
  const rightX   = W - 52;

  // Uma assinatura ilegível não impede o certificado: sai a linha sem imagem.
  if (sigInstrutor) {
    try { doc.addImage(sigInstrutor, 'PNG', leftX - sigImgW / 2, sigImgY, sigImgW, sigImgH, undefined, 'FAST'); }
    catch (e) { console.warn('Assinatura do instrutor ilegível — certificado segue sem ela', e); }
  }
  drawSignatario(doc, leftX, sigLineY, data.docente_nome, 'Instrutor Responsável', data.instrutor_qualificacao);

  if (sigDiretor) {
    try { doc.addImage(sigDiretor, 'PNG', rightX - sigImgW / 2, sigImgY, sigImgW, sigImgH, undefined, 'FAST'); }
    catch (e) { console.warn('Assinatura do diretor ilegível — certificado segue sem ela', e); }
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

      // Os módulos longos (Direção Defensiva tem descrições de duas linhas) eram
      // escritos numa linha só e saíam pela margem fora, por cima das horas. Agora
      // partem-se à largura da coluna; se a tabela ainda assim não couber antes do
      // rodapé da arte, a letra encolhe um degrau em vez de invadir o que vem a seguir.
      const largModulo = W - 14 - 14 - 16;                 // margens e coluna das horas
      const limite = (arteVerso ? 259 : H - 20) - 4 - 100; // 100 mm = objetivo + barra + verificação
      let fonte = 9.5, altLinha = 4.3, folga = 3.7;
      const medir = () => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(fonte);
        const linhas = data.conteudo_programatico!.map(i => doc.splitTextToSize(i.modulo, largModulo) as string[]);
        const alt = linhas.reduce((s, l) => s + l.length * altLinha + folga, 0);
        return { linhas, alt };
      };
      let med = medir();
      if (tY + med.alt > limite) { fonte = 8.5; altLinha = 3.8; folga = 3.0; med = medir(); }

      let totalCH = 0;
      data.conteudo_programatico.forEach((item, idx) => {
        const linhas = med.linhas[idx];
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fonte);
        doc.setTextColor(...BLACK);
        linhas.forEach((l, k) => doc.text(l, 14, tY + k * altLinha));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fonte);
        doc.text(`${item.horas}h`, W - 14, tY, { align: 'right' });
        const fundo = tY + (linhas.length - 1) * altLinha;
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(12, fundo + 2, W - 12, fundo + 2);
        totalCH += item.horas;
        tY = fundo + folga + altLinha;
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
      // O que o aluno teve, ao lado do que era exigido: é essa comparação que
      // prova o aproveitamento, e é ela que uma auditoria procura.
      if (data.nota_final != null)         statItems.push(['Aproveitamento', `${data.nota_final}`]);
      if (data.frequencia_percent != null) statItems.push(['Frequência', `${data.frequencia_percent}%`]);
      if (data.validade_anos)    statItems.push(['Validade', `${data.validade_anos} ${data.validade_anos === 1 ? 'ano' : 'anos'}`]);
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
      const recLinhas = doc.splitTextToSize(recText, c3W - 4);
      doc.text(recLinhas, cols[0] + 2, tY + 5);

      // Logótipo da entidade homologadora, centrado no espaço que sobra por baixo
      // do texto do reconhecimento. O texto é que manda: se o curso tiver um
      // reconhecimento comprido e não sobrar altura, o logótipo não entra — nunca
      // se sobrepõe ao texto nem transborda da caixa.
      if (logoHomologa) {
        // getLineHeight() vem em PONTOS, não na unidade do documento (mm). Sem
        // dividir pelo scaleFactor o cálculo salta para fora da caixa e o espaço
        // livre dá negativo — o logótipo nunca chegava a ser desenhado.
        const alturaLinha = doc.getLineHeight() / doc.internal.scaleFactor;
        const fimTexto = tY + 5 + (recLinhas.length - 1) * alturaLinha + 1;
        const livreY = fimTexto + 1.5;
        const livreH = tY + bH3 - 2 - livreY;
        const livreW = c3W - 10;
        if (livreH >= 4) {
          let lw = livreW, lh = lw / LOGO_HOMOLOGA_PROP;
          if (lh > livreH) { lh = livreH; lw = lh * LOGO_HOMOLOGA_PROP; }
          doc.addImage(logoHomologa, 'PNG', cols[0] + (c3W - lw) / 2, livreY + (livreH - lh) / 2, lw, lh, undefined, 'FAST');
        }
      }

      // Verificação: QR à esquerda, instruções à direita. Sem QR, texto a toda
      // a largura — como estava antes.
      const site = data.url_verificacao || 'o site da instituição';
      if (qrImg) {
        const qrS = 20;
        doc.addImage(qrImg, 'PNG', cols[1] + 2, tY + 3, qrS, qrS, undefined, 'FAST');
        doc.setFontSize(6.5);
        // O endereço não pode ser partido a meio da palavra ("https:// teste…/v erificar"
        // era o que o splitTextToSize fazia). Sai sem o protocolo, a negrito, e
        // parte-se só na barra se não couber na coluna ao lado do QR.
        const largTexto = c3W - qrS - 7;
        const xTexto = cols[1] + qrS + 4;
        const enderecoVisivel = site.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        let yv = tY + 6;
        const escreve = (linhas: string[], bold = false) => {
          doc.setFont('helvetica', bold ? 'bold' : 'normal');
          for (const l of linhas) { doc.text(l, xTexto, yv); yv += 3; }
        };
        escreve(doc.splitTextToSize('Leia o código ou aceda a', largTexto));
        if (doc.getTextWidth(enderecoVisivel) <= largTexto) escreve([enderecoVisivel], true);
        else {
          const corte = enderecoVisivel.indexOf('/');
          escreve(corte > 0 ? [enderecoVisivel.slice(0, corte), enderecoVisivel.slice(corte)] : doc.splitTextToSize(enderecoVisivel, largTexto), true);
        }
        escreve(doc.splitTextToSize('e introduza a codificação para confirmar a autenticidade deste certificado.', largTexto));
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

      // A entidade formadora com o seu número fiscal, por baixo do rodapé.
      // É por aqui que um cliente confirma que a escola existe e é quem diz
      // ser — e por isso vai a fechar, não no meio dos dados do curso.
      const ent = [data.entidade_razao_social, data.entidade_documento].filter(Boolean).join(' · ');
      if (ent) {
        doc.setFontSize(6.5);
        doc.setTextColor(...LGRAY);
        doc.text(ent, W / 2, H - 4, { align: 'center' });
      }
    }
  }

  return doc.output('blob');
}
