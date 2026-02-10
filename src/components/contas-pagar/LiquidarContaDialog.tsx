import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountPayable, METODOS_PAGAMENTO } from '@/types/accountPayable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Fixed rates (no payment_settings table for now)
const TAXA_JUROS_MENSAL = 2; // 2% ao mês
const TAXA_MULTA = 2; // 2%

interface Props {
  account: AccountPayable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: LiquidacaoData) => Promise<boolean>;
}

export interface LiquidacaoData {
  accountPayableId: string;
  dataPagamento: Date;
  valorOriginal: number;
  juros: number;
  multa: number;
  desconto: number;
  valorPago: number;
  metodoPagamento: string;
  observacoes: string;
}

function fmt(v: number) {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

export function LiquidarContaDialog({ account, open, onOpenChange, onConfirm }: Props) {
  const [dataPagamento, setDataPagamento] = useState<Date>(new Date());
  const [desconto, setDesconto] = useState('0');
  const [valorPagoManual, setValorPagoManual] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('transferencia');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open && account) {
      setDataPagamento(new Date());
      setDesconto('0');
      setValorPagoManual('');
      setMetodoPagamento('transferencia');
      setObservacoes('');
    }
  }, [open, account]);

  const calcs = useMemo(() => {
    if (!account) return { diasAtraso: 0, juros: 0, multa: 0, totalComEncargos: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const venc = account.dataVencimento ? parseISO(account.dataVencimento) : null;
    let diasAtraso = 0;
    let juros = 0;
    let multa = 0;

    if (venc) {
      diasAtraso = differenceInDays(today, venc);
      if (diasAtraso > 0) {
        juros = (account.valorLiquido * (TAXA_JUROS_MENSAL / 100)) * (diasAtraso / 30);
        multa = account.valorLiquido * (TAXA_MULTA / 100);
      } else {
        diasAtraso = 0;
      }
    }

    const desc = parseFloat(desconto) || 0;
    const totalComEncargos = account.valorLiquido + juros + multa - desc;

    return { diasAtraso, juros, multa, totalComEncargos: Math.max(0, totalComEncargos) };
  }, [account, desconto]);

  const valorFinal = useMemo(() => {
    if (valorPagoManual.trim()) return parseFloat(valorPagoManual) || 0;
    return calcs.totalComEncargos;
  }, [valorPagoManual, calcs.totalComEncargos]);

  if (!account) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const ok = await onConfirm({
        accountPayableId: account.id,
        dataPagamento,
        valorOriginal: account.valorLiquido,
        juros: calcs.juros,
        multa: calcs.multa,
        desconto: parseFloat(desconto) || 0,
        valorPago: valorFinal,
        metodoPagamento,
        observacoes: observacoes.trim(),
      });
      if (ok) onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Liquidar Conta</DialogTitle>
        </DialogHeader>

        {/* Account info */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
          <div><span className="text-muted-foreground">Fornecedor:</span> <strong>{account.supplierName || '-'}</strong></div>
          <div><span className="text-muted-foreground">Descrição:</span> {account.descricao || '-'}</div>
          <div><span className="text-muted-foreground">Valor Original:</span> <strong>{fmt(account.valorLiquido)}</strong></div>
          {account.dataVencimento && (
            <div><span className="text-muted-foreground">Vencimento:</span> {format(parseISO(account.dataVencimento), 'dd/MM/yyyy')}</div>
          )}
        </div>

        <Separator />

        {/* Date */}
        <div className="space-y-2">
          <Label>Data de Pagamento</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataPagamento && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataPagamento ? format(dataPagamento, 'dd/MM/yyyy') : 'Selecionar data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataPagamento} onSelect={(d) => d && setDataPagamento(d)} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        {/* Calculated values */}
        <div className="space-y-2">
          <Label>Valor Original</Label>
          <Input value={fmt(account.valorLiquido)} readOnly className="bg-muted" />
        </div>

        {calcs.diasAtraso > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2 text-sm">
            <p className="font-medium text-destructive">{calcs.diasAtraso} dia(s) de atraso</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Juros ({TAXA_JUROS_MENSAL}%/mês):</span>
                <p className="font-mono">{fmt(calcs.juros)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Multa ({TAXA_MULTA}%):</span>
                <p className="font-mono">{fmt(calcs.multa)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Desconto (€)</Label>
          <Input type="number" min="0" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Valor a Pagar</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={valorPagoManual || calcs.totalComEncargos.toFixed(2)}
            onChange={(e) => setValorPagoManual(e.target.value)}
            className="font-bold text-lg"
          />
          <p className="text-xs text-muted-foreground">Calculado: {fmt(calcs.totalComEncargos)}</p>
        </div>

        <div className="space-y-2">
          <Label>Método de Pagamento</Label>
          <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METODOS_PAGAMENTO.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações sobre o pagamento..." rows={2} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || valorFinal <= 0}>
            {isSubmitting ? 'Processando...' : 'Confirmar Liquidação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
