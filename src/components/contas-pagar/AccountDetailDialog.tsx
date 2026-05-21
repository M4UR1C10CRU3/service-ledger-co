import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft } from 'lucide-react';
import { AccountPayable, TIPO_LANCAMENTO_LABELS, CATEGORIAS_POR_TIPO, STATUS_LABELS, METODOS_PAGAMENTO } from '@/types/accountPayable';
import { MoverContaDialog } from './MoverContaDialog';

interface Props {
  account: AccountPayable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved?: () => void;
}

function fmt(v: number) {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function getCatLabel(tipo: string, cat: string) {
  return CATEGORIAS_POR_TIPO[tipo]?.find(c => c.value === cat)?.label || cat;
}

function getMetodoLabel(m: string | null) {
  if (!m) return '-';
  return METODOS_PAGAMENTO.find(p => p.value === m)?.label || m;
}

export function AccountDetailDialog({ account, open, onOpenChange }: Props) {
  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da Conta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-medium">{account.supplierName || '-'}</span>
            <Badge variant="outline">{STATUS_LABELS[account.status] || account.status}</Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Tipo:</span> {TIPO_LANCAMENTO_LABELS[account.tipoLancamento]}</div>
            <div><span className="text-muted-foreground">Categoria:</span> {getCatLabel(account.tipoLancamento, account.categoria)}</div>
            <div><span className="text-muted-foreground">Nº Documento:</span> {account.numeroDocumento || '-'}</div>
            <div><span className="text-muted-foreground">Emissão:</span> {format(parseISO(account.dataEmissao), 'dd/MM/yyyy')}</div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Valor Bruto:</span> {fmt(account.valorBruto)}</div>
            <div><span className="text-muted-foreground">Desconto:</span> {fmt(account.desconto)}</div>
            <div><span className="text-muted-foreground">Acréscimo:</span> {fmt(account.acrescimo)}</div>
            <div><span className="text-muted-foreground font-semibold">Valor Líquido:</span> <strong>{fmt(account.valorLiquido)}</strong></div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Forma Pgto:</span> {account.formaPagamento === 'a_vista' ? 'À Vista' : 'A Prazo'}</div>
            <div><span className="text-muted-foreground">Método:</span> {getMetodoLabel(account.metodoPagamento)}</div>
            {account.dataPagamento && (
              <div><span className="text-muted-foreground">Data Pgto:</span> {format(parseISO(account.dataPagamento), 'dd/MM/yyyy')}</div>
            )}
            {account.dataVencimento && (
              <div><span className="text-muted-foreground">Vencimento:</span> {format(parseISO(account.dataVencimento), 'dd/MM/yyyy')}</div>
            )}
          </div>

          {(account.centroCusto || account.projeto || account.observacoes) && (
            <>
              <Separator />
              <div className="space-y-2">
                {account.centroCusto && <div><span className="text-muted-foreground">Centro Custo:</span> {account.centroCusto}</div>}
                {account.projeto && <div><span className="text-muted-foreground">Projeto:</span> {account.projeto}</div>}
                {account.observacoes && <div><span className="text-muted-foreground">Obs:</span> {account.observacoes}</div>}
              </div>
            </>
          )}

          {account.descricao && (
            <>
              <Separator />
              <div><span className="text-muted-foreground">Descrição:</span> {account.descricao}</div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
