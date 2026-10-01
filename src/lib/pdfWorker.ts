import * as pdfjsLib from 'pdfjs-dist';
// Worker empacotado localmente pelo Vite (versão exacta da dependência).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/**
 * Arranque do worker do PDF.js, num sítio só.
 *
 * O nginx serve ficheiros `.mjs` como `application/octet-stream`, e o browser
 * recusa carregar um module worker sem MIME de JavaScript. A volta é buscar o
 * código do worker e criar o Worker a partir de um Blob com o MIME certo posto
 * por nós — tudo no cliente, sem depender da configuração do servidor.
 *
 * Isto já vivia copiado dentro do CartaoDetailModal. Fica aqui para o próximo
 * que precise não voltar a descobrir o mesmo — e para não haver a tentação de
 * ir buscar o worker a um CDN, que a loja bloqueia.
 */

/**
 * Fontes padrão do PDF.js (Helvetica, Times, Courier e afins).
 *
 * Muitos PDF oficiais — o alvará dos bombeiros entre eles — NÃO embebem estas
 * fontes: contam que o leitor as tenha. Sem este endereço o pdfjs avisa
 * "fetchStandardFontData failed" e o texto sai com um substituto pobre ou em
 * branco. Os ficheiros estão em public/pdf-fonts, copiados de pdfjs-dist, para
 * não depender de nenhum CDN.
 */
const FONTES_PADRAO = "/pdf-fonts/";

let arranque: Promise<void> | null = null;

export function ensurePdfWorker(): Promise<void> {
  if (arranque) return arranque;
  arranque = (async () => {
    const codigo = await (await fetch(pdfWorkerUrl)).text();
    const blobUrl = URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' }));
    pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(blobUrl, { type: 'module' });
  })();
  arranque.catch(() => { arranque = null; }); // permitir nova tentativa
  return arranque;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fila e memória
//
// A ficha do Renevaldo tem 33 documentos. Sem limite, o browser tentava
// descarregar e desenhar os 33 ao mesmo tempo: nada aparecia durante muito
// tempo e depois aparecia tudo de repente. Com fila de 3, as primeiras
// miniaturas — as que se veem — aparecem quase logo.
// ─────────────────────────────────────────────────────────────────────────────

const LIMITE_SIMULTANEO = 3;
let aCorrer = 0;
const espera: (() => void)[] = [];

async function comVez<T>(tarefa: () => Promise<T>): Promise<T> {
  if (aCorrer >= LIMITE_SIMULTANEO) {
    await new Promise<void>(resolve => espera.push(resolve));
  }
  aCorrer++;
  try {
    return await tarefa();
  } finally {
    aCorrer--;
    espera.shift()?.();
  }
}

/**
 * Miniaturas já desenhadas nesta sessão, por caminho do ficheiro.
 *
 * A chave é o caminho no armazenamento e NÃO o URL: o URL é assinado e muda a
 * cada pedido, portanto nunca acertaria duas vezes. Reabrir a mesma ficha passa
 * a ser instantâneo.
 */
const memoria = new Map<string, string>();

/** Tira a assinatura do URL, ficando com o caminho — a chave estável. */
function chaveDe(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abre um PDF pedindo ao servidor só os bocados de que precisa.
 *
 * Antes descarregava-se o ficheiro inteiro com `fetch` e passava-se o buffer.
 * Para uma miniatura da primeira página isso é desperdício: um currículo de 5 MB
 * era descarregado por completo para se desenhar um quadrado de 12 mm. O
 * armazenamento do Supabase aceita pedidos por intervalo, e o pdf.js sabe
 * usá-los quando lhe damos o URL em vez do conteúdo.
 */
function abrirPdf(url: string) {
  return pdfjsLib.getDocument({
    url,
    standardFontDataUrl: FONTES_PADRAO,
    rangeChunkSize: 65536,
    disableAutoFetch: true,   // não puxar o resto do ficheiro sem ser preciso
    disableStream: false,
  });
}

/**
 * Desenha a primeira página de um PDF e devolve-a como imagem.
 * `largura` é a largura desejada em pixéis; a altura sai da proporção.
 */
export async function primeiraPaginaComoImagem(url: string, largura = 240): Promise<string | null> {
  const chave = `${chaveDe(url)}@${largura}`;
  const guardada = memoria.get(chave);
  if (guardada) return guardada;

  return comVez(async () => {
    // Outra miniatura igual pode ter chegado enquanto esperávamos vez.
    const entretanto = memoria.get(chave);
    if (entretanto) return entretanto;

    await ensurePdfWorker();
    const pdf = await abrirPdf(url).promise;
    const pagina = await pdf.getPage(1);

    const base = pagina.getViewport({ scale: 1 });
    const viewport = pagina.getViewport({ scale: largura / base.width });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvasContext: ctx, viewport }).promise;

    // JPEG em vez de PNG: uma miniatura de 12 mm não precisa de compressão sem
    // perdas, e o PNG ocupava três a quatro vezes mais na memória da sessão.
    const imagem = canvas.toDataURL('image/jpeg', 0.72);
    pdf.destroy?.();
    memoria.set(chave, imagem);
    return imagem;
  });
}

/**
 * Desenha TODAS as páginas de um PDF e devolve-as como imagens.
 *
 * Devolver imagens em vez de escrever num elemento do ecrã é deliberado: a
 * primeira versão desenhava dentro de um `div` obtido por referência, e a
 * referência vinha vazia quando o diálogo ainda não tinha montado — a
 * pré-visualização ficava presa em "a preparar" para sempre, sem erro nenhum.
 * Sem referência não há esse tempo morto: as páginas ou existem ou lançam.
 */
export async function paginasComoImagens(
  url: string,
  largura = 900,
  aoProgredir?: (feitas: number, total: number) => void,
): Promise<string[]> {
  await ensurePdfWorker();
  // Aqui quer-se o documento inteiro — é uma leitura, não uma miniatura.
  const pdf = await pdfjsLib.getDocument({
    url, standardFontDataUrl: FONTES_PADRAO,
  }).promise;

  const out: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const base = pagina.getViewport({ scale: 1 });
    const viewport = pagina.getViewport({ scale: largura / base.width });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvasContext: ctx, viewport }).promise;
    out.push(canvas.toDataURL('image/png'));
    aoProgredir?.(i, pdf.numPages);
  }
  return out;
}

export { pdfjsLib };
