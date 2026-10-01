import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileUp, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { formatEUR } from '@/lib/formatters';
import { lerProposta, emparelhar, type PropostaLida, type Emparelhamento } from '@/lib/concursos/lerProposta';
import type { MapaItem } from '@/types/concursos';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  mapa: MapaItem[];
  precoBase: number | null;
  onAplicar: (pares: Emparelhamento[], extra: { total: number | null; numero: string | null }) => Promise<unknown>;
}

/**
 * Sobe a proposta do PHC (PDF) ou o Excel do mapa, mostra o que vai preencher
 * e só escreve depois de confirmar. Nunca escreve às cegas: entre versões a
 * Câmara renumera artigos, e um preço no item errado é pior do que nenhum.
 */
export function ImportarPropostaDialog({ aberto, onFechar, mapa, precoBase, onAplicar }: Props) {
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [lida, setLida] = useState<PropostaLida | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aLer, setALer] = useState(false);
  const [aAplicar, setAAplicar] = useState(false);

  const pares = useMemo(() => lida ? emparelhar(lida, mapa) : [], [lida, mapa]);
  const porCodigo = pares.filter(p => p.como === 'codigo');
  const porDescricao = pares.filter(p => p.como === 'descricao');
  const semPar = pares.filter(p => p.como === 'sem_par');
  const itensMapa = mapa.filter(i => i.nivel === 'item');
  const cobertos = new Set(pares.filter(p => p.item_id).map(p => p.item_id));
  const ficamSemPreco = itensMapa.filter(i => !cobertos.has(i.id) && i.preco_unitario == null);
  const totalAposImportar = itensMapa.reduce((s, i) => {
    const p = pares.find(x => x.item_id === i.id);
    const pu = p ? p.linha.preco_unitario : i.preco_unitario;
    return pu != null && i.quantidade != null ? s + i.quantidade * pu : s;
  }, 0);

  const reiniciar = () => { setFicheiro(null); setLida(null); setErro(null); };

  const escolher = async (f: File | null) => {
    reiniciar();
    if (!f) return;
    setFicheiro(f); setALer(true);
    try { setLida(await lerProposta(f)); }
    catch (e: any) { setErro(e?.message ?? 'Não consegui ler o ficheiro.'); }
    finally { setALer(false); }
  };

  const aplicar = async () => {
    if (!lida) return;
    setAAplicar(true);
    try { await onAplicar(pares, { total: lida.total_sem_iva, numero: lida.numero_proposta }); reiniciar(); onFechar(); }
    finally { setAAplicar(false); }
  };

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o) { reiniciar(); onFechar(); } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileUp size={18} /> Importar proposta com preços</DialogTitle>
          <DialogDescription>
            Aceita o PDF da proposta emitida pelo PHC ou o Excel do mapa preenchido. Mostra o que vai preencher antes de gravar.
          </DialogDescription>
        </DialogHeader>

        {!lida && (
          <label className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/40">
            <Upload size={28} className="text-muted-foreground" />
            <span className="text-sm">{aLer ? 'A ler…' : ficheiro ? ficheiro.name : 'Escolher ficheiro (PDF ou Excel)'}</span>
            <input type="file" accept=".pdf,.xlsx,.xls" className="hidden" onChange={e => escolher(e.target.files?.[0] ?? null)} />
          </label>
        )}

        {erro && <p className="text-sm text-destructive flex items-center gap-1"><XCircle size={14} /> {erro}</p>}

        {lida && (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            {lida.avisos.map((a, i) => (
              <p key={i} className="text-sm text-amber-600 flex items-start gap-1"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {a}</p>
            ))}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="rounded border p-2"><p className="text-xs text-muted-foreground">Linhas lidas</p><p className="font-semibold">{lida.linhas.length}</p></div>
              <div className="rounded border p-2"><p className="text-xs text-muted-foreground">Com par no mapa</p><p className="font-semibold">{porCodigo.length + porDescricao.length}<span className="text-xs font-normal text-muted-foreground"> ({porDescricao.length} pela descrição)</span></p></div>
              <div className="rounded border p-2"><p className="text-xs text-muted-foreground">Sem par</p><p className={`font-semibold ${semPar.length ? 'text-destructive' : ''}`}>{semPar.length}</p></div>
              <div className="rounded border p-2"><p className="text-xs text-muted-foreground">Total após importar</p><p className="font-semibold">{formatEUR(totalAposImportar)}</p>
                <p className="text-xs text-muted-foreground">{lida.total_sem_iva != null ? `PDF diz ${formatEUR(lida.total_sem_iva)}` : ''}{precoBase != null && totalAposImportar > precoBase ? ' · acima da base' : ''}</p></div>
            </div>

            {lida.total_sem_iva != null && Math.abs(lida.total_sem_iva - totalAposImportar) > 1 && (
              <p className="text-sm text-amber-600 flex items-start gap-1"><AlertTriangle size={14} className="mt-0.5 shrink-0" />
                O total do ficheiro ({formatEUR(lida.total_sem_iva)}) não bate com a soma dos preços emparelhados ({formatEUR(totalAposImportar)}). Há linhas sem par ou preços que não foram lidos.
              </p>
            )}

            <div className="flex-1 min-h-0 overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">No ficheiro</TableHead>
                    <TableHead>Descrição (ficheiro)</TableHead>
                    <TableHead className="w-24 text-right">P. unit.</TableHead>
                    <TableHead className="w-24">No mapa</TableHead>
                    <TableHead className="w-28">Como</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pares.map((p, i) => (
                    <TableRow key={i} className={p.como === 'sem_par' ? 'bg-destructive/5' : p.como === 'descricao' ? 'bg-amber-500/5' : undefined}>
                      <TableCell className="font-mono text-xs">{p.linha.codigo}</TableCell>
                      <TableCell className="text-xs">{p.linha.descricao.slice(0, 90)}{p.linha.descricao.length > 90 && '…'}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">{formatEUR(p.linha.preco_unitario)}</TableCell>
                      <TableCell className="font-mono text-xs">{p.item_codigo ?? '—'}</TableCell>
                      <TableCell>
                        {p.como === 'codigo' && <Badge variant="secondary" className="gap-1 text-[10px]"><CheckCircle2 size={10} /> código</Badge>}
                        {p.como === 'descricao' && <Badge variant="default" className="gap-1 text-[10px]"><AlertTriangle size={10} /> descrição {Math.round(p.semelhanca * 100)}%</Badge>}
                        {p.como === 'sem_par' && <Badge variant="destructive" className="gap-1 text-[10px]"><XCircle size={10} /> sem par</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {ficamSemPreco.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Depois de importar, {ficamSemPreco.length} item{ficamSemPreco.length === 1 ? '' : 's'} do mapa continua{ficamSemPreco.length === 1 ? '' : 'm'} sem preço: {ficamSemPreco.slice(0, 8).map(i => i.codigo).join(', ')}{ficamSemPreco.length > 8 && '…'}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {lida && <Button variant="ghost" onClick={reiniciar}>Outro ficheiro</Button>}
          <Button variant="outline" onClick={() => { reiniciar(); onFechar(); }}>Cancelar</Button>
          <Button onClick={aplicar} disabled={!lida || aAplicar || (porCodigo.length + porDescricao.length) === 0}>
            {aAplicar ? 'A gravar…' : `Aplicar ${porCodigo.length + porDescricao.length} preço${(porCodigo.length + porDescricao.length) === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
