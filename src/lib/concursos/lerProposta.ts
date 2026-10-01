/**
 * Lê uma proposta de preços — o PDF que o PHC emite, ou um Excel do mapa — e
 * devolve os preços unitários por artigo, o total e o número da proposta.
 *
 * Não escreve nada: a decisão de aplicar é de quem vê a pré-visualização.
 * Entre versões do mapa a Câmara renumera artigos, por isso devolvemos também
 * a descrição, para emparelhar por ela quando o código não bate.
 */
import * as XLSX from 'xlsx';

export interface LinhaProposta {
  codigo: string;
  descricao: string;
  unidade: string | null;
  quantidade: number | null;
  preco_unitario: number;
  total: number | null;
}

export interface PropostaLida {
  origem: 'pdf' | 'xlsx';
  linhas: LinhaProposta[];
  total_sem_iva: number | null;
  numero_proposta: string | null;
  avisos: string[];
}

/** "2 785,00" → 2785 ; "1.250,50" → 1250.5 ; "1250.5" → 1250.5 */
export const numeroPT = (s: string | number | null | undefined): number | null => {
  if (s == null) return null;
  if (typeof s === 'number') return Number.isFinite(s) ? s : null;
  const t = String(s).trim().replace(/\s/g, '').replace(/€/g, '');
  if (!t) return null;
  const n = t.includes(',') ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t);
  return Number.isFinite(n) ? n : null;
};

const RE_CODIGO = /^\s*(\d+\.\d+\.\d+)\s*-\s*(.*)$/;
// rasto numérico do PHC no fim da linha:  1,000 und   2 785,00   2 785,00
const RE_RASTO = /(\d[\d .]*,\d{1,3})\s+(und|un|m2|m3|ml|m|kg|vg|h|dia|l)\s+(\d[\d .]*,\d{2})\s+(\d[\d .]*,\d{2})\s*$/i;
const RE_TOTAL = /TOTAL\s+sem\s+IVA\s*:?\s*(\d[\d .]*,\d{2})/i;
const RE_NUM_PROPOSTA = /Proposta\s+(?:OJ[A-Z]*\s*)?n[.ºo°]*\s*([\d]+[_/-]\d{4})/i;

// ── PDF ───────────────────────────────────────────────────────────────────────

async function carregarPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  const v = pdfjsLib.version;
  // O nginx serve .mjs como octet-stream; o worker vem por CDN, como no resto da app.
  const candidatos = [
    `https://unpkg.com/pdfjs-dist@${v}/build/pdf.worker.min.mjs`,
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.mjs`,
  ];
  for (const url of candidatos) {
    try { if ((await fetch(url, { method: 'HEAD' })).ok) { pdfjsLib.GlobalWorkerOptions.workerSrc = url; return pdfjsLib; } } catch { /* próximo */ }
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  return pdfjsLib;
}

/** Reconstrói as linhas de texto de uma página pela coordenada Y. */
async function linhasDaPagina(pagina: any): Promise<string[]> {
  const conteudo = await pagina.getTextContent();
  const porY = new Map<number, { x: number; s: string }[]>();
  for (const it of conteudo.items as any[]) {
    if (!it.str) continue;
    const y = Math.round(it.transform[5]);
    const x = it.transform[4];
    // tolerância de 2pt: o PHC alinha mal a meio ponto
    let chave = y;
    for (const k of porY.keys()) if (Math.abs(k - y) <= 2) { chave = k; break; }
    if (!porY.has(chave)) porY.set(chave, []);
    porY.get(chave)!.push({ x, s: it.str });
  }
  return [...porY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, itens]) => itens.sort((a, b) => a.x - b.x).map(i => i.s).join('  ').replace(/\s+/g, ' ').trim());
}

export async function lerPropostaPdf(ficheiro: File): Promise<PropostaLida> {
  const pdfjsLib = await carregarPdfjs();
  const pdf = await pdfjsLib.getDocument({ data: await ficheiro.arrayBuffer() }).promise;
  const linhas: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) linhas.push(...await linhasDaPagina(await pdf.getPage(p)));
  return extrairDeLinhas(linhas, 'pdf');
}

/** Partilhado entre PDF e texto: código na linha, rasto numérico na mesma ou nas seguintes. */
export function extrairDeLinhas(linhas: string[], origem: 'pdf' | 'xlsx'): PropostaLida {
  const out: LinhaProposta[] = [];
  const vistos = new Set<string>();
  let codigo: string | null = null, descricao = '';
  let total_sem_iva: number | null = null, numero_proposta: string | null = null;
  const avisos: string[] = [];

  for (const l of linhas) {
    const mt = l.match(RE_TOTAL); if (mt) total_sem_iva = numeroPT(mt[1]);
    const mn = l.match(RE_NUM_PROPOSTA); if (mn && !numero_proposta) numero_proposta = mn[1].replace('_', '/');
    const mc = l.match(RE_CODIGO);
    if (mc) { codigo = mc[1]; descricao = mc[2]; }
    else if (codigo && !vistos.has(codigo) && !RE_RASTO.test(l)) descricao += ' ' + l;
    const mr = l.match(RE_RASTO);
    if (mr && codigo && !vistos.has(codigo)) {
      const pu = numeroPT(mr[3]);
      if (pu != null) {
        out.push({
          codigo,
          descricao: descricao.replace(RE_RASTO, '').replace(/\s+/g, ' ').trim(),
          unidade: mr[2].toLowerCase().replace('und', 'un'),
          quantidade: numeroPT(mr[1]),
          preco_unitario: pu,
          total: numeroPT(mr[4]),
        });
        vistos.add(codigo);
      }
    }
  }
  if (!out.length) avisos.push('Não encontrei nenhuma linha com código de artigo e preço. É mesmo a proposta com a lista de preços unitários?');
  if (total_sem_iva == null) avisos.push('Não encontrei o «TOTAL sem IVA» — o total da proposta terá de ser confirmado à mão.');
  return { origem, linhas: out, total_sem_iva, numero_proposta, avisos };
}

// ── Excel ─────────────────────────────────────────────────────────────────────

export async function lerPropostaXlsx(ficheiro: File): Promise<PropostaLida> {
  const wb = XLSX.read(await ficheiro.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const avisos: string[] = [];

  // cabeçalho: procurar a coluna do código e a do preço unitário
  let iCod = 0, iDesc = 1, iUn = 2, iQtd = 3, iPu = 4, iTot = 5;
  const cab = rows.findIndex(r => r.some((c: any) => /unit/i.test(String(c))));
  if (cab >= 0) {
    const h = rows[cab].map((c: any) => String(c).toLowerCase());
    const idx = (re: RegExp, def: number) => { const i = h.findIndex(x => re.test(x)); return i >= 0 ? i : def; };
    iCod = idx(/art|c[oó]d|ref/, 0); iDesc = idx(/descri|designa/, 1); iUn = idx(/^un|unid/, 2);
    iQtd = idx(/qtd|quant/, 3); iPu = idx(/unit/, 4); iTot = idx(/parcial|total|import/, 5);
  } else avisos.push('Sem linha de cabeçalho reconhecível; assumi a ordem Art. · Descrição · Un. · Qtd. · P. unitário · Parcial.');

  const out: LinhaProposta[] = [];
  let total_sem_iva: number | null = null;
  for (const r of rows) {
    const cod = String(r[iCod] ?? '').trim();
    if (/^\d+\.\d+\.\d+$/.test(cod)) {
      const pu = numeroPT(r[iPu]);
      if (pu != null && pu > 0) out.push({
        codigo: cod, descricao: String(r[iDesc] ?? '').trim(), unidade: String(r[iUn] ?? '').trim() || null,
        quantidade: numeroPT(r[iQtd]), preco_unitario: pu, total: numeroPT(r[iTot]),
      });
    } else if (/total/i.test(String(r[iDesc] ?? '')) && !/base|margem|29/i.test(String(r[iDesc] ?? ''))) {
      const t = numeroPT(r[iTot]); if (t != null) total_sem_iva = t;
    }
  }
  if (!out.length) avisos.push('Nenhuma linha com código de artigo e preço unitário preenchido.');
  return { origem: 'xlsx', linhas: out, total_sem_iva, numero_proposta: null, avisos };
}

export async function lerProposta(ficheiro: File): Promise<PropostaLida> {
  const nome = ficheiro.name.toLowerCase();
  if (nome.endsWith('.pdf')) return lerPropostaPdf(ficheiro);
  if (/\.xlsx?$/.test(nome)) return lerPropostaXlsx(ficheiro);
  throw new Error('Formato não suportado — aceito PDF (proposta do PHC) ou Excel (mapa preenchido).');
}

// ── Emparelhamento ────────────────────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Proporção das palavras (≥4 letras) da descrição mais curta que aparecem na outra. */
export function semelhanca(a: string, b: string): number {
  const A = new Set(norm(a).split(' ').filter(w => w.length > 3));
  const B = new Set(norm(b).split(' ').filter(w => w.length > 3));
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}

export interface Emparelhamento {
  linha: LinhaProposta;
  item_id: string | null;
  item_codigo: string | null;
  item_descricao: string | null;
  preco_atual: number | null;
  como: 'codigo' | 'descricao' | 'sem_par';
  semelhanca: number;
}

/**
 * Primeiro pelo código; se o código não existir no mapa (renumeração), pela
 * descrição com semelhança ≥ 0,85. Cada item do mapa só recebe um preço.
 */
export function emparelhar(
  lida: PropostaLida,
  mapa: { id: string; codigo: string; descricao: string; nivel: string; preco_unitario: number | null }[],
): Emparelhamento[] {
  const itens = mapa.filter(i => i.nivel === 'item');
  const porCodigo = new Map(itens.map(i => [i.codigo, i]));
  const usados = new Set<string>();
  const out: Emparelhamento[] = [];
  for (const l of lida.linhas) {
    const direto = porCodigo.get(l.codigo);
    if (direto && !usados.has(direto.id)) {
      usados.add(direto.id);
      out.push({ linha: l, item_id: direto.id, item_codigo: direto.codigo, item_descricao: direto.descricao, preco_atual: direto.preco_unitario, como: 'codigo', semelhanca: 1 });
      continue;
    }
    let melhor: typeof itens[number] | null = null, ms = 0;
    for (const i of itens) { if (usados.has(i.id)) continue; const s = semelhanca(l.descricao, i.descricao); if (s > ms) { ms = s; melhor = i; } }
    if (melhor && ms >= 0.85) {
      usados.add(melhor.id);
      out.push({ linha: l, item_id: melhor.id, item_codigo: melhor.codigo, item_descricao: melhor.descricao, preco_atual: melhor.preco_unitario, como: 'descricao', semelhanca: ms });
    } else {
      out.push({ linha: l, item_id: null, item_codigo: null, item_descricao: null, preco_atual: null, como: 'sem_par', semelhanca: ms });
    }
  }
  return out;
}
