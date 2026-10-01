import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Factory, Loader2 } from 'lucide-react';

export interface PedidoPassagem {
  cartaoId: string;
  cartaoTitulo: string;
  /** Coluna onde o cartão está agora (a «Adjudicado» do Comercial). */
  listaAtualId: string;
}

interface Props {
  pedido: PedidoPassagem | null;
  empresaId: string | undefined;
  quadroAtualId: string | undefined;
  onClose: () => void;
  fetchQuadros: (empresaId: string) => Promise<{ id: string; nome: string }[]>;
  fetchListas: (quadroId: string) => Promise<{ id: string; nome: string }[]>;
  mover: (cartaoId: string, srcListaId: string, target: { empresaId: string; quadroId: string; listaId: string }) => Promise<boolean>;
  registar: (cartaoId: string, texto: string) => void;
}

/**
 * Fase 2 (01/10/2026): um cartão que chega a «Adjudicado» no quadro Comercial
 * passa para a Produção sem ter de ir ao menu «Mover». É o PRÓPRIO cartão que
 * muda de quadro — comentários, checklist, anexos e membros vão com ele.
 * «Agora não» deixa tudo como está.
 */
export function PassarProducaoDialog({ pedido, empresaId, quadroAtualId, onClose, fetchQuadros, fetchListas, mover, registar }: Props) {
  const [quadros, setQuadros] = useState<{ id: string; nome: string }[]>([]);
  const [quadroId, setQuadroId] = useState('');
  const [listas, setListas] = useState<{ id: string; nome: string }[]>([]);
  const [listaId, setListaId] = useState('');
  const [aCarregar, setACarregar] = useState(false);
  const [aMover, setAMover] = useState(false);

  useEffect(() => {
    if (!pedido || !empresaId) return;
    setACarregar(true);
    fetchQuadros(empresaId).then(qs => {
      const prod = qs.filter(q => q.id !== quadroAtualId && /produ/i.test(q.nome));
      setQuadros(prod);
      setQuadroId(prod[0]?.id ?? '');
    }).finally(() => setACarregar(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido?.cartaoId, empresaId]);

  useEffect(() => {
    if (!quadroId) { setListas([]); setListaId(''); return; }
    fetchListas(quadroId).then(ls => { setListas(ls); setListaId(ls[0]?.id ?? ''); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quadroId]);

  if (!pedido) return null;

  const confirmar = async () => {
    if (!empresaId || !quadroId || !listaId || aMover) return;
    setAMover(true);
    try {
      const destinoQuadro = quadros.find(q => q.id === quadroId)?.nome ?? 'Produção';
      const destinoLista = listas.find(l => l.id === listaId)?.nome ?? '';
      // Regista antes de mover: a atividade fica no cartão e vai com ele.
      registar(pedido.cartaoId, `passou para a Produção: "${destinoQuadro}" → "${destinoLista}"`);
      const ok = await mover(pedido.cartaoId, pedido.listaAtualId, { empresaId, quadroId, listaId });
      if (ok) onClose();
    } finally {
      setAMover(false);
    }
  };

  return (
    <Dialog open={!!pedido} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Factory className="h-5 w-5" /> Passar para a Produção?</DialogTitle>
          <DialogDescription>
            «{pedido.cartaoTitulo}» foi adjudicado. O cartão passa com todos os comentários, documentos, checklist e membros.
          </DialogDescription>
        </DialogHeader>

        {aCarregar ? (
          <p className="text-sm text-muted-foreground">A procurar o quadro de Produção…</p>
        ) : quadros.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta empresa ainda não tem um quadro de Produção. Em Quadros, use «Criar quadros-padrão».
          </p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pp-quadro">Quadro</Label>
              <Select value={quadroId} onValueChange={setQuadroId}>
                <SelectTrigger id="pp-quadro"><SelectValue /></SelectTrigger>
                <SelectContent>{quadros.map(q => <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pp-lista">Coluna</Label>
              <Select value={listaId} onValueChange={setListaId}>
                <SelectTrigger id="pp-lista"><SelectValue /></SelectTrigger>
                <SelectContent>{listas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={aMover}>Agora não</Button>
          <Button onClick={confirmar} disabled={aMover || !quadroId || !listaId}>
            {aMover && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Passar para a Produção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
