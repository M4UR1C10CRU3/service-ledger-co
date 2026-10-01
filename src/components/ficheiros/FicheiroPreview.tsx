import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, ImageIcon, Download, Loader2 } from 'lucide-react';
import { paginasComoImagens, primeiraPaginaComoImagem } from '@/lib/pdfWorker';

const ehImagem = (mime?: string | null, nome?: string | null) =>
  /^image\//.test(mime ?? '') || /\.(png|jpe?g|webp|heic|gif)$/i.test(nome ?? '');

const ehPdf = (mime?: string | null, nome?: string | null) =>
  (mime ?? '').includes('pdf') || /\.pdf$/i.test(nome ?? '');

/**
 * Miniatura do ficheiro.
 *
 * Vive em `ficheiros/` e nao em `administrativo/` porque deixou de ser so dos
 * licenciamentos: os documentos dos instrutores usam o mesmo.
 *
 * Vale o trabalho porque um documento legal reconhece-se de relance — o
 * carimbo, o brasão, o formulário — e abrir num separador novo só para
 * confirmar que é o ficheiro certo é caro para uma pergunta tão pequena.
 */
export function FicheiroMiniatura({
  url, mime, nome, onAbrirPreview,
}: {
  url: string | null;
  mime?: string | null;
  nome?: string | null;
  onAbrirPreview: () => void;
}) {
  const [img, setImg] = useState<string | null>(null);
  const [estado, setEstado] = useState<'espera' | 'pronto' | 'falhou'>('espera');
  const [aVista, setAVista] = useState(false);
  const caixa = useRef<HTMLButtonElement>(null);

  /**
   * Só se desenha o que está à vista.
   *
   * A ficha do Renevaldo tem 33 documentos e menos de dez cabem no ecrã.
   * Desenhar os 33 à cabeça fazia esperar por miniaturas que ninguém ia ver — e
   * um cliente corporativo não tem paciência para isso. Com 300 px de margem, a
   * fila seguinte já vem preparada antes de chegar ao ecrã.
   */
  useEffect(() => {
    const el = caixa.current;
    if (!el || aVista) return;
    if (typeof IntersectionObserver === 'undefined') { setAVista(true); return; }

    const obs = new IntersectionObserver(
      entradas => {
        if (entradas.some(e => e.isIntersecting)) { setAVista(true); obs.disconnect(); }
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [aVista]);

  useEffect(() => {
    let vivo = true;
    if (!url) { setEstado('falhou'); return; }
    if (!aVista) return;   // fora do ecrã: nem se pede o ficheiro

    (async () => {
      try {
        if (ehImagem(mime, nome)) {
          if (vivo) { setImg(url); setEstado('pronto'); }
          return;
        }
        if (ehPdf(mime, nome)) {
          const dataUrl = await primeiraPaginaComoImagem(url, 240);
          if (vivo && dataUrl) { setImg(dataUrl); setEstado('pronto'); }
          else if (vivo) setEstado('falhou');
          return;
        }
        if (vivo) setEstado('falhou'); // tipo sem pré-visualização possível
      } catch {
        if (vivo) setEstado('falhou');
      }
    })();

    return () => { vivo = false; };
  }, [url, mime, nome, aVista]);

  const Icone = ehImagem(mime, nome) ? ImageIcon : FileText;

  return (
    <button
      ref={caixa}
      type="button"
      onClick={onAbrirPreview}
      disabled={!url}
      title={url ? 'Ver maior' : 'Sem ficheiro'}
      className="h-16 w-12 shrink-0 rounded border bg-muted/40 overflow-hidden flex items-center
                 justify-center hover:ring-2 hover:ring-primary/40 focus-visible:ring-2
                 focus-visible:ring-primary transition disabled:cursor-default disabled:hover:ring-0"
    >
      {estado === 'pronto' && img
        ? <img src={img} alt={nome ?? 'Pré-visualização'} className="h-full w-full object-cover object-top" />
        : estado === 'espera'
          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          : <Icone className="h-5 w-5 text-muted-foreground" />}
    </button>
  );
}

/**
 * Pré-visualização grande, dentro da aplicação.
 *
 * Nos PDF desenham-se todas as páginas — um alvará tem duas ou três e a
 * segunda costuma ser onde está a validade.
 */
export function FicheiroPreviewDialog({
  open, onOpenChange, url, mime, nome,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string | null;
  mime?: string | null;
  nome?: string | null;
}) {
  const [paginas, setPaginas] = useState<string[]>([]);
  const [estado, setEstado] = useState<'espera' | 'pronto' | 'falhou'>('espera');
  const [erro, setErro] = useState('');
  const [progresso, setProgresso] = useState({ feitas: 0, total: 0 });

  useEffect(() => {
    if (!open) return;

    let cancelado = false;
    // Reposto a cada abertura: sem isto, a segunda pré-visualização começava
    // a mostrar as páginas da primeira.
    setPaginas([]);
    setErro('');
    setProgresso({ feitas: 0, total: 0 });
    setEstado('espera');

    if (!url) { setEstado('falhou'); setErro('Este ficheiro não tem endereço válido.'); return; }
    if (ehImagem(mime, nome)) { setEstado('pronto'); return; }
    if (!ehPdf(mime, nome)) {
      setEstado('falhou');
      setErro('Este tipo de ficheiro não tem pré-visualização.');
      return;
    }

    (async () => {
      let fase = 'arranque do leitor';
      try {
        fase = 'descarga do ficheiro';
        const imagens = await paginasComoImagens(url, 900, (feitas, total) => {
          if (!cancelado) setProgresso({ feitas, total });
        });
        if (cancelado) return;
        if (imagens.length === 0) throw new Error('o ficheiro não tem páginas legíveis');
        setPaginas(imagens);
        setEstado('pronto');
      } catch (e) {
        if (cancelado) return;
        setErro(`Falhou na ${fase}: ` + (e instanceof Error ? e.message : String(e)));
        setEstado('falhou');
      }
    })();

    return () => { cancelado = true; };
  }, [open, url, mime, nome]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-6">
            <span className="truncate">{nome ?? 'Documento'}</span>
            {url && (
              <Button size="sm" variant="outline" asChild>
                <a href={url} target="_blank" rel="noopener">
                  <Download className="h-4 w-4 mr-1" /> Abrir original
                </a>
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {estado === 'espera' && (
          <p className="text-sm text-muted-foreground flex items-center gap-2 py-10 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            {progresso.total > 0
              ? `A desenhar a página ${progresso.feitas} de ${progresso.total}…`
              : 'A preparar a pré-visualização…'}
          </p>
        )}

        {estado === 'falhou' && (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{erro}</p>
            {url && (
              <Button variant="outline" asChild>
                <a href={url} target="_blank" rel="noopener">Abrir num separador novo</a>
              </Button>
            )}
          </div>
        )}

        {estado === 'pronto' && ehImagem(mime, nome) && url && (
          <img src={url} alt={nome ?? ''} className="max-w-full h-auto mx-auto rounded" />
        )}

        {estado === 'pronto' && paginas.length > 0 && (
          <div className="space-y-3">
            {paginas.map((p, i) => (
              <figure key={i} className="space-y-1">
                <img
                  src={p}
                  alt={`Página ${i + 1}`}
                  className="w-full h-auto rounded bg-white shadow-sm"
                />
                {paginas.length > 1 && (
                  <figcaption className="text-xs text-muted-foreground text-center">
                    Página {i + 1} de {paginas.length}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
