import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Receipt } from 'lucide-react';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { OrdemServico } from '@/types/ordemServico';
import { registarFaturaDaOs, valorPorFaturar } from '@/lib/circuitoReceita';

interface Props {
  os: OrdemServico | null;
  onOpenChange: (v: boolean) => void;
  /** Muda o estado da OS para «faturada» (o que o botão fazia antes). */
  onMarcarFaturada: () => Promise<boolean>;
}

/**
 * Faturar uma OS passa a registar a fatura no trabalho em Vendas / Serviços,
 * para que apareça em Receitas, Débitos e Cobranças. «Só marcar como
 * faturada» mantém o comportamento antigo para quem já lançou a fatura à mão.
 */
export function FaturarOsDialog({ os, onOpenChange, onMarcarFaturada }: Props) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const [numero, setNumero] = useState('');
  const [valor, setValor] = useState('');
  const [taxa, setTaxa] = useState('23');
  const [data, setData] = useState('');
  const [aGravar, setAGravar] = useState(false);

  useEffect(() => {
    if (!os) return;
    setNumero('');
    setTaxa('23');
    setData(new Date().toISOString().split('T')[0]);
    const base = os.valorFinal || os.valorEstimado || 0;
    setValor(base ? String(base) : '');
    valorPorFaturar(os.serviceId).then(v => { if (v != null) setValor(v ? v.toFixed(2) : ''); });
  }, [os]);

  if (!os) return null;

  const registar = async () => {
    if (!empresa || aGravar) return;
    setAGravar(true);
    try {
      const r = await registarFaturaDaOs(empresa.id, {
        id: os.id, titulo: os.titulo, clienteId: os.clienteId, clienteNome: os.clienteNome,
        serviceId: os.serviceId, propostaNumero: os.propostaNumero,
      }, {
        numero, valorComIva: parseFloat(valor.replace(',', '.')) || 0,
        taxaIva: parseFloat(taxa) || 0, dataISO: data || new Date().toISOString().split('T')[0],
      });
      if (!r.ok) {
        toast({ title: 'Fatura não registada', description: r.erro, variant: 'destructive' });
        return;
      }
      await onMarcarFaturada();
      toast({ title: `Fatura ${numero.trim()} registada`, description: 'Já aparece em Vendas / Serviços, Receitas e Débitos.' });
      onOpenChange(false);
    } finally {
      setAGravar(false);
    }
  };

  const soMarcar = async () => {
    if (aGravar) return;
    setAGravar(true);
    try {
      if (await onMarcarFaturada()) onOpenChange(false);
    } finally {
      setAGravar(false);
    }
  };

  return (
    <Dialog open={!!os} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Faturar {os.numero}</DialogTitle>
          <DialogDescription>
            A fatura fica registada no trabalho em Vendas / Serviços, onde se registam os recebimentos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="fat-numero">Nº da fatura</Label>
            <Input id="fat-numero" value={numero} onChange={e => setNumero(e.target.value)} placeholder="ex.: FT 2026/123" autoFocus />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fat-valor">Valor com IVA (€)</Label>
            <Input id="fat-valor" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fat-taxa">Taxa de IVA (%)</Label>
            <Input id="fat-taxa" inputMode="decimal" value={taxa} onChange={e => setTaxa(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label htmlFor="fat-data">Data da fatura</Label>
            <Input id="fat-data" type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={soMarcar} disabled={aGravar}>Só marcar como faturada</Button>
          <Button onClick={registar} disabled={aGravar || !numero.trim()}>
            {aGravar && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registar fatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
