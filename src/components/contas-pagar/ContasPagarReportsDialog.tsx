import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachWeekOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AccountPayable, CATEGORIAS_POR_TIPO, TIPO_LANCAMENTO_LABELS } from '@/types/accountPayable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Printer } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { exportSupplierStatement } from './supplierPdfExport';
import { useEmpresa } from '@/contexts/EmpresaContext';

const PIE_COLORS = ['hsl(219,96%,43%)', 'hsl(74,75%,54%)', 'hsl(49,100%,50%)', 'hsl(22,89%,54%)', 'hsl(280,60%,55%)', 'hsl(160,60%,45%)', 'hsl(340,70%,50%)'];

function fmt(v: number) {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function getCatLabel(cat: string): string {
  for (const cats of Object.values(CATEGORIAS_POR_TIPO)) {
    const found = cats.find(c => c.value === cat);
    if (found) return found.label;
  }
  return cat;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountPayable[];
}

function getYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => String(currentYear - i));
}

const MONTH_OPTIONS = [
  { value: 'all', label: 'Todos os Meses' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: format(new Date(2024, i, 1), 'MMMM', { locale: pt }),
  })),
];

export function ContasPagarReportsDialog({ open, onOpenChange, accounts }: Props) {
  const { empresa, getLogo } = useEmpresa();
  const [emissaoYear, setEmissaoYear] = useState(String(new Date().getFullYear()));
  const [emissaoMonth, setEmissaoMonth] = useState('all');
  const [vencimentoYear, setVencimentoYear] = useState('all');
  const [vencimentoMonth, setVencimentoMonth] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'em_debito' | 'liquidados'>('all');
  const [activeTab, setActiveTab] = useState('fluxo');

  const yearOptionsWithAll = useMemo(() => ['all', ...getYearOptions()], []);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      // Filtro por Emissão
      if (emissaoYear !== 'all') {
        if (a.dataEmissao.substring(0, 4) !== emissaoYear) return false;
        if (emissaoMonth !== 'all') {
          if (parseInt(a.dataEmissao.substring(5, 7)) !== parseInt(emissaoMonth)) return false;
        }
      } else if (emissaoMonth !== 'all') {
        if (parseInt(a.dataEmissao.substring(5, 7)) !== parseInt(emissaoMonth)) return false;
      }
      // Filtro por Vencimento
      if (vencimentoYear !== 'all') {
        const dv = a.dataVencimento || '';
        if (dv.substring(0, 4) !== vencimentoYear) return false;
        if (vencimentoMonth !== 'all') {
          if (parseInt(dv.substring(5, 7)) !== parseInt(vencimentoMonth)) return false;
        }
      } else if (vencimentoMonth !== 'all') {
        const dv = a.dataVencimento || '';
        if (parseInt(dv.substring(5, 7)) !== parseInt(vencimentoMonth)) return false;
      }
      // Filtro por Status
      if (statusFilter === 'liquidados' && a.status !== 'liquidado') return false;
      if (statusFilter === 'em_debito' && a.status === 'liquidado') return false;
      return true;
    });
  }, [accounts, emissaoYear, emissaoMonth, vencimentoYear, vencimentoMonth, statusFilter]);

  // Derive year/month for sub-reports (prefer emissão, fallback vencimento)
  const reportYear = emissaoYear !== 'all' ? emissaoYear : vencimentoYear !== 'all' ? vencimentoYear : String(new Date().getFullYear());
  const reportMonth = emissaoMonth !== 'all' ? emissaoMonth : vencimentoMonth !== 'all' ? vencimentoMonth : 'all';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Relatórios — Contas a Pagar</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-4 items-end flex-wrap">
          <span className="text-xs font-medium text-muted-foreground self-center">Emissão:</span>
          <div className="space-y-1">
            <Select value={emissaoYear} onValueChange={setEmissaoYear}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {getYearOptions().map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Select value={emissaoMonth} onValueChange={setEmissaoMonth}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <span className="text-xs font-medium text-muted-foreground self-center">Vencimento:</span>
          <div className="space-y-1">
            <Select value={vencimentoYear} onValueChange={setVencimentoYear}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {getYearOptions().map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Select value={vencimentoMonth} onValueChange={setVencimentoMonth}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <span className="text-sm text-muted-foreground">{filteredAccounts.length} lançamento(s)</span>
        </div>

        <Tabs defaultValue="fluxo" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="fornecedor">Por Fornecedor</TabsTrigger>
            <TabsTrigger value="categoria">Por Categoria</TabsTrigger>
          </TabsList>

          <TabsContent value="fluxo">
            <FluxoCaixaReport accounts={filteredAccounts} year={reportYear} month={reportMonth} />
          </TabsContent>
          <TabsContent value="fornecedor">
            <FornecedorReport accounts={filteredAccounts} allAccounts={accounts} year={reportYear} month={reportMonth} empresa={empresa} />
          </TabsContent>
          <TabsContent value="categoria">
            <CategoriaReport accounts={filteredAccounts} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// === Fluxo de Caixa ===
function FluxoCaixaReport({ accounts, year, month }: { accounts: AccountPayable[]; year: string; month: string }) {
  const data = useMemo(() => {
    if (month !== 'all') {
      // Weekly breakdown for single month
      const m = parseInt(month) - 1;
      const y = parseInt(year);
      const start = startOfMonth(new Date(y, m, 1));
      const end = endOfMonth(new Date(y, m, 1));
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

      return weeks.map((weekStart, i) => {
        const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const wStartStr = format(weekStart < start ? start : weekStart, 'yyyy-MM-dd');
        const wEndStr = format(wEnd > end ? end : wEnd, 'yyyy-MM-dd');

        const aPagar = accounts.filter(a => {
          const d = a.dataVencimento || a.dataEmissao;
          return d >= wStartStr && d <= wEndStr && a.status !== 'liquidado';
        }).reduce((s, a) => s + a.valorLiquido, 0);

        const pago = accounts.filter(a => {
          const d = a.dataPagamento || a.dataEmissao;
          return d >= wStartStr && d <= wEndStr && a.status === 'liquidado';
        }).reduce((s, a) => s + a.valorLiquido, 0);

        return {
          periodo: `Sem ${i + 1}`,
          aPagar,
          pago,
          saldo: pago - aPagar,
        };
      });
    } else {
      // Monthly breakdown for full year
      const y = parseInt(year);
      return Array.from({ length: 12 }, (_, i) => {
        const ms = `${year}-${String(i + 1).padStart(2, '0')}`;
        const aPagar = accounts.filter(a => {
          const d = a.dataVencimento || a.dataEmissao;
          return d.startsWith(ms) && a.status !== 'liquidado';
        }).reduce((s, a) => s + a.valorLiquido, 0);

        const pago = accounts.filter(a => {
          const d = a.dataPagamento || a.dataEmissao;
          return d.startsWith(ms) && a.status === 'liquidado';
        }).reduce((s, a) => s + a.valorLiquido, 0);

        return {
          periodo: format(new Date(y, i, 1), 'MMM', { locale: pt }),
          aPagar,
          pago,
          saldo: pago - aPagar,
        };
      });
    }
  }, [accounts, year, month]);

  const totals = useMemo(() => ({
    aPagar: data.reduce((s, d) => s + d.aPagar, 0),
    pago: data.reduce((s, d) => s + d.pago, 0),
    saldo: data.reduce((s, d) => s + d.saldo, 0),
  }), [data]);

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="periodo" className="text-xs" />
          <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} className="text-xs" />
          <Tooltip formatter={(v: number) => fmt(v)} />
          <Legend />
          <Bar dataKey="aPagar" name="A Pagar" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
          <Bar dataKey="pago" name="Pago" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">A Pagar</TableHead>
              <TableHead className="text-right">Pago</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.filter(d => d.aPagar > 0 || d.pago > 0).map(d => (
              <TableRow key={d.periodo}>
                <TableCell>{d.periodo}</TableCell>
                <TableCell className="text-right font-mono">{fmt(d.aPagar)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(d.pago)}</TableCell>
                <TableCell className={`text-right font-mono ${d.saldo < 0 ? 'text-destructive' : 'text-success'}`}>{fmt(d.saldo)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50">
              <TableCell>Total</TableCell>
              <TableCell className="text-right font-mono">{fmt(totals.aPagar)}</TableCell>
              <TableCell className="text-right font-mono">{fmt(totals.pago)}</TableCell>
              <TableCell className={`text-right font-mono ${totals.saldo < 0 ? 'text-destructive' : 'text-success'}`}>{fmt(totals.saldo)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// === Por Fornecedor ===
function FornecedorReport({ accounts, allAccounts, year, month, empresa }: { accounts: AccountPayable[]; allAccounts: AccountPayable[]; year: string; month: string; empresa: any }) {
  const { getLogo } = useEmpresa();
  const data = useMemo(() => {
    const map: Record<string, { id: string; name: string; total: number; pago: number; pendente: number }> = {};
    accounts.forEach(a => {
      const key = a.supplierId;
      if (!map[key]) map[key] = { id: key, name: a.supplierName || '-', total: 0, pago: 0, pendente: 0 };
      map[key].total += a.valorLiquido;
      if (a.status === 'liquidado') map[key].pago += a.valorLiquido;
      else map[key].pendente += a.valorLiquido;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [accounts]);

  

  const handlePdf = (supplierId: string, supplierName: string) => {
    const supplierAccounts = accounts.filter(a => a.supplierId === supplierId);
    exportSupplierStatement({ supplierName, accounts: supplierAccounts, year, month, empresa, logoUrl: getLogo() });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fornecedor</TableHead>
            <TableHead className="text-right">Total Transacionado</TableHead>
            <TableHead className="text-right">Total Pago</TableHead>
            <TableHead className="text-right">Total Pendente</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem dados</TableCell></TableRow>
          ) : data.map((d, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell className="text-right font-mono">{fmt(d.total)}</TableCell>
              <TableCell className="text-right font-mono text-success">{fmt(d.pago)}</TableCell>
              <TableCell className="text-right font-mono text-warning">{fmt(d.pendente)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Exportar extrato PDF" onClick={() => handlePdf(d.id, d.name)}>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {data.length > 0 && (
            <TableRow className="font-bold bg-muted/50">
              <TableCell>Total</TableCell>
              <TableCell className="text-right font-mono">{fmt(data.reduce((s, d) => s + d.total, 0))}</TableCell>
              <TableCell className="text-right font-mono text-success">{fmt(data.reduce((s, d) => s + d.pago, 0))}</TableCell>
              <TableCell className="text-right font-mono text-warning">{fmt(data.reduce((s, d) => s + d.pendente, 0))}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// === Por Categoria ===
function CategoriaReport({ accounts }: { accounts: AccountPayable[] }) {
  const data = useMemo(() => {
    const map: Record<string, { cat: string; total: number; qty: number }> = {};
    accounts.forEach(a => {
      const key = a.categoria;
      if (!map[key]) map[key] = { cat: key, total: 0, qty: 0 };
      map[key].total += a.valorLiquido;
      map[key].qty += 1;
    });
    const all = Object.values(map).sort((a, b) => b.total - a.total);
    const grandTotal = all.reduce((s, d) => s + d.total, 0);
    return all.map(d => ({ ...d, name: getCatLabel(d.cat), pct: grandTotal > 0 ? (d.total / grandTotal) * 100 : 0 }));
  }, [accounts]);

  return (
    <div className="space-y-4">
      {data.length > 0 && (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="total" label={({ name, pct }) => `${name} (${pct.toFixed(0)}%)`}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem dados</TableCell></TableRow>
            ) : data.map((d, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-right font-mono">{fmt(d.total)}</TableCell>
                <TableCell className="text-right">{d.qty}</TableCell>
                <TableCell className="text-right font-mono">{d.pct.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
