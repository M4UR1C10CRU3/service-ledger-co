import { format, differenceInDays, parseISO } from 'date-fns';
import { ArrowUpDown, Eye, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { AccountPayable, TIPO_LANCAMENTO_LABELS, CATEGORIAS_POR_TIPO } from '@/types/accountPayable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export type SortField = 'supplierName' | 'dataEmissao' | 'valorLiquido' | 'dataVencimento' | 'status';
export type SortDir = 'asc' | 'desc';

interface Props {
  accounts: AccountPayable[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onView: (a: AccountPayable) => void;
  onLiquidar: (a: AccountPayable) => void;
  onEdit: (a: AccountPayable) => void;
  onDelete: (a: AccountPayable) => void;
}

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function getCategoriaLabel(tipo: string, cat: string): string {
  const list = CATEGORIAS_POR_TIPO[tipo];
  if (!list) return cat;
  return list.find(c => c.value === cat)?.label || cat;
}

function getStatusInfo(account: AccountPayable): { label: string; className: string; daysInfo: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (account.status === 'liquidado') {
    const paidDate = account.dataPagamento ? format(parseISO(account.dataPagamento), 'dd/MM/yyyy') : '-';
    return {
      label: 'Liquidado',
      className: 'bg-success/15 text-success border-success/30',
      daysInfo: `Pago em ${paidDate}`,
    };
  }

  if (account.status === 'parcial') {
    const venc = account.dataVencimento ? parseISO(account.dataVencimento) : null;
    const days = venc ? differenceInDays(venc, today) : 0;
    return {
      label: 'Parcial',
      className: 'bg-primary/15 text-primary border-primary/30',
      daysInfo: venc ? (days > 0 ? `Vence em ${days} dias` : days === 0 ? 'Vence hoje' : `${Math.abs(days)} dias de atraso`) : '-',
    };
  }

  if (account.status === 'cancelado') {
    return { label: 'Cancelado', className: 'bg-muted text-muted-foreground border-border', daysInfo: '-' };
  }

  // pendente or vencido — calculate from dataVencimento
  const venc = account.dataVencimento ? parseISO(account.dataVencimento) : null;
  if (!venc) {
    return { label: 'Pendente', className: 'bg-primary/15 text-primary border-primary/30', daysInfo: '-' };
  }

  const days = differenceInDays(venc, today);

  if (days < 0) {
    return {
      label: 'Vencido',
      className: 'bg-destructive/15 text-destructive border-destructive/30',
      daysInfo: `${Math.abs(days)} dias de atraso`,
    };
  }
  if (days === 0) {
    return {
      label: 'Vence Hoje',
      className: 'bg-danger/15 text-danger border-danger/30',
      daysInfo: 'Vence hoje',
    };
  }
  if (days <= 7) {
    return {
      label: 'Pendente',
      className: 'bg-warning/15 text-warning border-warning/30',
      daysInfo: `Vence em ${days} dias`,
    };
  }

  return {
    label: 'Pendente',
    className: 'bg-primary/15 text-primary border-primary/30',
    daysInfo: `Vence em ${days} dias`,
  };
}

function SortableHead({ label, field, currentField, currentDir, onSort }: {
  label: string; field: SortField; currentField: SortField; currentDir: SortDir; onSort: (f: SortField) => void;
}) {
  return (
    <TableHead className="cursor-pointer select-none" onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${currentField === field ? 'text-primary' : 'text-muted-foreground/50'}`} />
      </div>
    </TableHead>
  );
}

export function AccountsPayableTable({ accounts, sortField, sortDir, onSort, onView, onLiquidar, onEdit, onDelete }: Props) {
  if (accounts.length === 0) return null;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Status</TableHead>
            <SortableHead label="Vencimento" field="dataVencimento" currentField={sortField} currentDir={sortDir} onSort={onSort} />
            <SortableHead label="Fornecedor" field="supplierName" currentField={sortField} currentDir={sortDir} onSort={onSort} />
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <SortableHead label="Valor" field="valorLiquido" currentField={sortField} currentDir={sortDir} onSort={onSort} />
            <TableHead>Info</TableHead>
            <TableHead className="w-[140px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => {
            const statusInfo = getStatusInfo(a);
            const canLiquidar = a.status === 'pendente' || a.status === 'parcial' || a.status === 'vencido';
            const dateDisplay = a.status === 'liquidado'
              ? (a.dataPagamento ? format(parseISO(a.dataPagamento), 'dd/MM/yyyy') : '-')
              : (a.dataVencimento ? format(parseISO(a.dataVencimento), 'dd/MM/yyyy') : '-');

            return (
              <TableRow key={a.id}>
                <TableCell>
                  <Badge className={`${statusInfo.className} border text-xs`} variant="outline">
                    {statusInfo.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{dateDisplay}</TableCell>
                <TableCell className="font-medium max-w-[150px] truncate">{a.supplierName || '-'}</TableCell>
                <TableCell className="text-sm max-w-[150px] truncate">{a.descricao || '-'}</TableCell>
                <TableCell className="text-sm">{getCategoriaLabel(a.tipoLancamento, a.categoria)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(a.valorLiquido)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{statusInfo.daysInfo}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onView(a)} title="Ver detalhes">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canLiquidar && (
                      <Button variant="ghost" size="icon" onClick={() => onLiquidar(a)} title="Liquidar" className="text-success hover:text-success">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onEdit(a)} title="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(a)} title="Remover">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
