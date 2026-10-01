import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, X } from 'lucide-react';
import { FicheiroMiniatura, FicheiroPreviewDialog } from '@/components/ficheiros/FicheiroPreview';

export interface DocumentoParaGrelha {
  id: string;
  nome_ficheiro: string;
  storage_path: string;
  mime_type?: string | null;
  tamanho_bytes?: number | null;
  /** Linha por baixo do nome: tipo, validade, o que fizer sentido. */
  legenda?: string | null;
  /** Marca no canto — "Vencido", "Diploma", o que for. */
  etiqueta?: string | null;
}

/**
 * Documentos como miniaturas, e não como uma lista de nomes de ficheiro.
 *
 * Um currículo, um diploma e um certificado reconhecem-se de relance pelo
 * aspeto — o brasão, o carimbo, o cabeçalho da instituição. Uma lista de
 * "documento_1.pdf" obriga a abrir cada um para saber o que é, e é isso que
 * faz com que ninguém confira.
 *
 * Serve também para mostrar: a ficha de um instrutor com os diplomas à vista é
 * o que sustenta a credibilidade perante um cliente corporativo.
 */
export function GrelhaDocumentos({
  documentos,
  urlDoFicheiro,
  urlsDosFicheiros,
  onRemover,
  vazio = 'Nenhum documento anexado.',
}: {
  documentos: DocumentoParaGrelha[];
  urlDoFicheiro: (path: string) => Promise<string | null>;
  /** Assina vários de uma vez. Muito mais rápido em fichas com dezenas. */
  urlsDosFicheiros?: (paths: string[]) => Promise<Record<string, string>>;
  onRemover?: (doc: DocumentoParaGrelha) => void;
  vazio?: string;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [aPrever, setAPrever] = useState<DocumentoParaGrelha | null>(null);

  // Os buckets são privados: cada miniatura precisa do seu URL assinado.
  //
  // Num lote só, quando quem chama sabe fazê-lo. A ficha do Renevaldo tem 33
  // documentos, e 33 idas ao servidor só para assinar endereços custavam mais
  // do que desenhar as miniaturas. Sem `urlsDosFicheiros`, cai-se no caminho
  // antigo, um a um.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const comFicheiro = documentos.filter(d => d.storage_path);
      if (comFicheiro.length === 0) { setUrls({}); return; }

      if (urlsDosFicheiros) {
        const mapa = await urlsDosFicheiros(comFicheiro.map(d => d.storage_path));
        if (!vivo) return;
        setUrls(Object.fromEntries(
          comFicheiro
            .map(d => [d.id, mapa[d.storage_path]] as const)
            .filter(([, u]) => u) as [string, string][],
        ));
        return;
      }

      const pares = await Promise.all(
        comFicheiro.map(async d => [d.id, await urlDoFicheiro(d.storage_path)] as const),
      );
      if (vivo) setUrls(Object.fromEntries(pares.filter(([, u]) => u) as [string, string][]));
    })();
    return () => { vivo = false; };
  }, [documentos, urlDoFicheiro, urlsDosFicheiros]);

  if (documentos.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{vazio}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {documentos.map(d => (
          <div key={d.id}
               className="group relative rounded-lg border p-2 flex flex-col gap-2 hover:border-primary/40 transition">
            {onRemover && (
              <Button
                size="icon" variant="ghost"
                className="absolute top-1 right-1 h-6 w-6 z-10 opacity-0 group-hover:opacity-100
                           focus-visible:opacity-100 text-destructive hover:text-destructive"
                title="Remover"
                onClick={() => onRemover(d)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}

            <div className="flex justify-center">
              <FicheiroMiniatura
                url={urls[d.id] ?? null}
                mime={d.mime_type}
                nome={d.nome_ficheiro}
                onAbrirPreview={() => setAPrever(d)}
              />
            </div>

            <div className="min-w-0 text-center">
              {d.etiqueta && (
                <Badge variant="outline" className="text-[10px] font-normal mb-1">{d.etiqueta}</Badge>
              )}
              <p className="text-xs font-medium truncate" title={d.nome_ficheiro}>{d.nome_ficheiro}</p>
              {d.legenda && (
                <p className="text-[11px] text-muted-foreground truncate">{d.legenda}</p>
              )}
            </div>

            <Button
              size="sm" variant="ghost" className="h-7 text-xs"
              onClick={async () => {
                const u = urls[d.id] ?? await urlDoFicheiro(d.storage_path);
                if (u) window.open(u, '_blank', 'noopener');
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" /> Abrir
            </Button>
          </div>
        ))}
      </div>

      <FicheiroPreviewDialog
        open={aPrever !== null}
        onOpenChange={o => !o && setAPrever(null)}
        url={aPrever ? (urls[aPrever.id] ?? null) : null}
        mime={aPrever?.mime_type}
        nome={aPrever?.nome_ficheiro}
      />
    </>
  );
}
