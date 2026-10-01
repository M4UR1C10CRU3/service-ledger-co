import { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, History, Upload } from 'lucide-react';
import { FicheiroMiniatura, FicheiroPreviewDialog } from '@/components/ficheiros/FicheiroPreview';
import {
  ESTADO_CONFIG, ambitoLabel, descreverPeriodo,
  type DocumentoLegal, type DocumentoVersao, type DocumentoHistorico,
} from '@/types/administrativo';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documento: DocumentoLegal | null;
  listarVersoes: (id: string) => Promise<DocumentoVersao[]>;
  listarHistorico: (id: string) => Promise<DocumentoHistorico[]>;
  urlDoFicheiro: (path: string) => Promise<string | null>;
  anexarAoDocumento: (doc: DocumentoLegal, ficheiro: File) => Promise<boolean>;
  podeEditar: boolean;
}

const data = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-PT') : '—';

const dataHora = (d: string) => new Date(d).toLocaleString('pt-PT');

export function DocumentoDetalhe({
  open, onOpenChange, documento, listarVersoes, listarHistorico, urlDoFicheiro,
  anexarAoDocumento, podeEditar,
}: Props) {
  const [versoes, setVersoes] = useState<DocumentoVersao[]>([]);
  const [historico, setHistorico] = useState<DocumentoHistorico[]>([]);
  const [aEnviar, setAEnviar] = useState(false);
  const inputFicheiro = useRef<HTMLInputElement>(null);
  const [recarga, setRecarga] = useState(0);

  // URL assinado por versão, para a miniatura poder desenhar sem novo pedido.
  // O bucket é privado: sem isto não há como mostrar seja o que for.
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [aPrever, setAPrever] = useState<DocumentoVersao | null>(null);

  useEffect(() => {
    if (!open || !documento) return;
    let vivo = true;
    (async () => {
      const [v, h] = await Promise.all([
        listarVersoes(documento.id),
        listarHistorico(documento.id),
      ]);
      if (!vivo) return;
      setVersoes(v);
      setHistorico(h);

      const pares = await Promise.all(
        v.filter(x => x.storage_path)
         .map(async x => [x.id, await urlDoFicheiro(x.storage_path as string)] as const),
      );
      if (vivo) {
        setUrls(Object.fromEntries(pares.filter(([, u]) => u) as [string, string][]));
      }
    })();
    return () => { vivo = false; };
  }, [open, documento, listarVersoes, listarHistorico, urlDoFicheiro, recarga]);

  const escolherFicheiro = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    // Limpar o input já: sem isto, escolher o mesmo ficheiro outra vez não
    // dispara o evento e parece que a aplicação ignorou o clique.
    e.target.value = '';
    if (!f || !documento) return;
    setAEnviar(true);
    const ok = await anexarAoDocumento(documento, f);
    setAEnviar(false);
    if (ok) setRecarga(n => n + 1);
  };

  if (!documento) return null;
  const estado = ESTADO_CONFIG[documento.estado] ?? ESTADO_CONFIG.sem_validade;

  // O bucket é privado: o link é assinado no momento e vale uma hora.
  const abrir = async (path: string | null) => {
    if (!path) return;
    const url = await urlDoFicheiro(path);
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            {documento.titulo}
            <Badge variant="outline" className={estado.bg}>{estado.label}</Badge>
            {documento.rotina && <Badge variant="outline">Rotina</Badge>}
          </DialogTitle>
          <DialogDescription>
            {documento.tipo_nome}
            {documento.numero ? ` · n.º ${documento.numero}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <Campo rotulo="Entidade emissora" valor={documento.entidade_emissora ?? '—'} />
          <Campo rotulo="Âmbito" valor={ambitoLabel(documento.ambito)} />
          <Campo rotulo="Emitido em" valor={data(documento.data_emissao)} />
          <Campo rotulo="Vence em" valor={data(documento.data_validade)} />
          <Campo rotulo="Período de renovação"
                 valor={descreverPeriodo(documento.validade_valor, documento.validade_unidade)} />
          <Campo rotulo="Aviso" valor={`${documento.aviso_dias} dias antes`} />
          <Campo rotulo="Responsável" valor={documento.responsavel_nome ?? '—'} />
          <Campo rotulo="Custo de renovação"
                 valor={documento.custo_renovacao != null ? documento.custo_renovacao.toFixed(2) : '—'} />
        </div>

        {documento.observacoes && (
          <>
            <Separator />
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{documento.observacoes}</p>
          </>
        )}

        <Separator />

        <section>
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Ficheiros ({versoes.filter(v => v.storage_path).length})
            </h3>
            {podeEditar && (
              <>
                <input
                  ref={inputFicheiro}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
                  onChange={escolherFicheiro}
                />
                <Button size="sm" variant="outline" disabled={aEnviar}
                        onClick={() => inputFicheiro.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" />
                  {aEnviar ? 'A carregar…' : versoes.some(v => v.vigente && v.storage_path)
                    ? 'Substituir ficheiro' : 'Anexar ficheiro'}
                </Button>
              </>
            )}
          </div>
          {versoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda sem ficheiro. Carregue em <strong>Anexar ficheiro</strong> para juntar o PDF ou a
              fotografia do documento.
            </p>
          ) : (
            <ul className="space-y-2">
              {versoes.map(v => (
                <li key={v.id}
                    className="flex items-center gap-3 rounded-md border p-3 text-sm">
                  <FicheiroMiniatura
                    url={urls[v.id] ?? null}
                    mime={v.mime_type}
                    nome={v.nome_ficheiro}
                    onAbrirPreview={() => setAPrever(v)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {v.numero || 'Sem número'}
                      {v.vigente && <Badge variant="outline" className="ml-2">Vigente</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data(v.data_emissao)} → {data(v.data_validade)}
                      {v.nome_ficheiro ? ` · ${v.nome_ficheiro}` : ' · sem ficheiro'}
                    </p>
                    {v.notas && <p className="text-xs text-muted-foreground mt-1">{v.notas}</p>}
                  </div>
                  {v.storage_path && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setAPrever(v)}>
                        <FileText className="h-4 w-4 mr-1" /> Ver
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => abrir(v.storage_path)}>
                        <Download className="h-4 w-4 mr-1" /> Abrir
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <Separator />

        <section>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <History className="h-4 w-4" /> Histórico
          </h3>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registos.</p>
          ) : (
            <ul className="space-y-1.5">
              {historico.map(h => (
                <li key={h.id} className="text-sm">
                  <span className="text-muted-foreground text-xs">{dataHora(h.created_at)}</span>
                  {' — '}{h.descricao}
                  {h.utilizador_nome && (
                    <span className="text-muted-foreground text-xs"> ({h.utilizador_nome})</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </DialogContent>

      <FicheiroPreviewDialog
        open={aPrever !== null}
        onOpenChange={o => !o && setAPrever(null)}
        url={aPrever ? (urls[aPrever.id] ?? null) : null}
        mime={aPrever?.mime_type}
        nome={aPrever?.nome_ficheiro}
      />
    </Dialog>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="font-medium">{valor}</p>
    </div>
  );
}
