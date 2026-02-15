import { useState, useMemo } from 'react';
import { useServices } from '@/hooks/useServices';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useClientes } from '@/hooks/useClientes';
import { ServiceWithCalculations, Liquidacao } from '@/types/service';
import { formatEUR } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Search, Download, Filter, ChevronLeft, ChevronRight,
  Eye, TrendingUp, Users, Calculator, Banknote, CreditCard,
  Building2, CheckCircle2, CircleDot, ArrowUpRight,
} from 'lucide-react';

// Tipo para receita individual (uma liquidação com dados do serviço)
interface Receita {
  liquidacao: Liquidacao;
  service: ServiceWithCalculations;
  clienteEmail?: string;
}

type PeriodoFilter = 'all' | 'hoje' | 'mes_atual' | 'mes_anterior';

const formaPagamentoConfig: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  numerario: { label: 'Numerário', icon: <Banknote className="h-3.5 w-3.5" />, badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  multibanco: { label: 'Multibanco', icon: <CreditCard className="h-3.5 w-3.5" />, badgeClass: 'bg-blue-100 text-blue-700 border-blue-300' },
  transferencia: { label: 'Transferência', icon: <Building2 className="h-3.5 w-3.5" />, badgeClass: 'bg-purple-100 text-purple-700 border-purple-300' },
  cheque: { label: 'Cheque', icon: <Banknote className="h-3.5 w-3.5" />, badgeClass: 'bg-amber-100 text-amber-700 border-amber-300' },
};

function parseDateDDMMYYYY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  return new Date(y, m - 1, d);
}

function isInMonth(dateStr: string, targetYear: number, targetMonth: number): boolean {
  const d = parseDateDDMMYYYY(dateStr);
  if (!d) return false;
  return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
}

function isToday(dateStr: string): boolean {
  const d = parseDateDDMMYYYY(dateStr);
  if (!d) return false;
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

const Receitas = () => {
  const { empresa } = useEmpresa();
  const { services: servicesWithCalculations, isInitialized } = useServices(empresa?.id);
  const { clientes } = useClientes();

  const [search, setSearch] = useState('');
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFilter>('all');
  const [metodoFilter, setMetodoFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [detailReceita, setDetailReceita] = useState<Receita | null>(null);

  // Helper: find client email
  const getClienteEmail = (clienteName: string): string | undefined => {
    const cliente = clientes.find(c => c.nome.toLowerCase() === clienteName.toLowerCase());
    return cliente?.email;
  };

  // Build flat list of receitas from all liquidações
  const allReceitas = useMemo((): Receita[] => {
    const result: Receita[] = [];
    for (const service of servicesWithCalculations) {
      for (const liq of service.liquidacoes) {
        result.push({
          liquidacao: liq,
          service,
          clienteEmail: service.email || getClienteEmail(service.cliente),
        });
      }
    }
    // Sort by payment date descending
    result.sort((a, b) => {
      const dateA = parseDateDDMMYYYY(a.liquidacao.dataPagamento);
      const dateB = parseDateDDMMYYYY(b.liquidacao.dataPagamento);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });
    return result;
  }, [servicesWithCalculations, clientes]);

  // Filtered receitas
  const receitasFiltradas = useMemo(() => {
    let result = allReceitas;

    // Period filter
    if (periodoFilter === 'hoje') {
      result = result.filter(r => isToday(r.liquidacao.dataPagamento));
    } else if (periodoFilter === 'mes_atual') {
      const now = new Date();
      result = result.filter(r => isInMonth(r.liquidacao.dataPagamento, now.getFullYear(), now.getMonth()));
    } else if (periodoFilter === 'mes_anterior') {
      const prev = new Date();
      prev.setMonth(prev.getMonth() - 1);
      result = result.filter(r => isInMonth(r.liquidacao.dataPagamento, prev.getFullYear(), prev.getMonth()));
    }

    // Payment method filter
    if (metodoFilter !== 'all') {
      result = result.filter(r => r.liquidacao.formaPagamento === metodoFilter);
    }

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.service.cliente.toLowerCase().includes(q) ||
        r.service.servico.toLowerCase().includes(q) ||
        r.service.id.includes(q) ||
        (r.service.numeroFatura || '').toLowerCase().includes(q) ||
        (r.liquidacao.observacoes || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [allReceitas, periodoFilter, metodoFilter, search]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);

    const totalAcumulado = allReceitas.reduce((s, r) => s + r.liquidacao.valor, 0);
    const qtdTotal = allReceitas.length;

    const receitasHoje = allReceitas.filter(r => isToday(r.liquidacao.dataPagamento));
    const totalHoje = receitasHoje.reduce((s, r) => s + r.liquidacao.valor, 0);

    const receitasMes = allReceitas.filter(r => isInMonth(r.liquidacao.dataPagamento, now.getFullYear(), now.getMonth()));
    const totalMes = receitasMes.reduce((s, r) => s + r.liquidacao.valor, 0);

    const clientesUnicos = new Set(allReceitas.map(r => r.service.cliente)).size;
    const media = qtdTotal > 0 ? totalAcumulado / qtdTotal : 0;

    return {
      totalAcumulado, qtdTotal,
      totalHoje, qtdHoje: receitasHoje.length,
      totalMes, qtdMes: receitasMes.length,
      clientesUnicos, media,
    };
  }, [allReceitas]);

  // Pagination
  const totalPages = Math.ceil(receitasFiltradas.length / pageSize);
  const paginatedReceitas = receitasFiltradas.slice((page - 1) * pageSize, page * pageSize);
  const totalPagina = paginatedReceitas.reduce((s, r) => s + r.liquidacao.valor, 0);

  if (!isInitialized) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">A carregar dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Receitas</h1>
          <p className="text-sm text-muted-foreground">Valores recebidos de clientes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={`border-l-4 border-l-emerald-500 cursor-pointer transition-shadow hover:shadow-md ${periodoFilter === 'mes_atual' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => { setPeriodoFilter(periodoFilter === 'mes_atual' ? 'all' : 'mes_atual'); setPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">🟢</span>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Este Mês</Badge>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatEUR(stats.totalMes)}</div>
            <p className="text-sm text-muted-foreground">{stats.qtdMes} recebimento{stats.qtdMes !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card
          className={`border-l-4 border-l-blue-500 cursor-pointer transition-shadow hover:shadow-md ${periodoFilter === 'hoje' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => { setPeriodoFilter(periodoFilter === 'hoje' ? 'all' : 'hoje'); setPage(1); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">📅</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Hoje</Badge>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatEUR(stats.totalHoje)}</div>
            <p className="text-sm text-muted-foreground">{stats.qtdHoje} recebimento{stats.qtdHoje !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">📊</span>
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Total Acumulado</Badge>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatEUR(stats.totalAcumulado)}</div>
            <p className="text-sm text-muted-foreground">{stats.qtdTotal} recebimento{stats.qtdTotal !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary bar */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              <span className="text-muted-foreground">Total em receitas:</span>
              <span className="font-bold text-foreground">{formatEUR(stats.totalAcumulado)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Clientes:</span>
              <span className="font-bold text-foreground">{stats.clientesUnicos}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-amber-600" />
              <span className="text-muted-foreground">Média por recebimento:</span>
              <span className="font-bold text-foreground">{formatEUR(stats.media)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar cliente, serviço, nº fatura..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={periodoFilter} onValueChange={v => { setPeriodoFilter(v as PeriodoFilter); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="hoje">📅 Hoje</SelectItem>
                <SelectItem value="mes_atual">🟢 Este Mês</SelectItem>
                <SelectItem value="mes_anterior">📆 Mês Anterior</SelectItem>
              </SelectContent>
            </Select>
            <Select value={metodoFilter} onValueChange={v => { setMetodoFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os métodos</SelectItem>
                <SelectItem value="numerario">💵 Numerário</SelectItem>
                <SelectItem value="multibanco">💳 Multibanco</SelectItem>
                <SelectItem value="transferencia">🏦 Transferência</SelectItem>
                <SelectItem value="cheque">📝 Cheque</SelectItem>
              </SelectContent>
            </Select>
            {(search || periodoFilter !== 'all' || metodoFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setPeriodoFilter('all'); setMetodoFilter('all'); setPage(1); }}>
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Mostrando {paginatedReceitas.length} de {receitasFiltradas.length} receitas
        {receitasFiltradas.length !== allReceitas.length && ` (${allReceitas.length} total)`}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Pgt.</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Nº Fatura</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Valor Recebido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReceitas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-8 w-8 text-emerald-400" />
                      <p className="font-medium">Nenhuma receita encontrada</p>
                      <p className="text-sm">
                        {search || periodoFilter !== 'all' || metodoFilter !== 'all'
                          ? 'Tente ajustar os filtros'
                          : 'Nenhum pagamento registado ainda.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReceitas.map(receita => {
                  const metodo = receita.liquidacao.formaPagamento;
                  const cfg = metodo ? formaPagamentoConfig[metodo] : null;
                  const isParcial = receita.service.executadoEmDebito > 0;

                  return (
                    <TableRow key={receita.liquidacao.id} className="group">
                      <TableCell className="text-sm text-foreground">
                        {receita.liquidacao.dataPagamento}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground text-sm">{receita.service.cliente}</p>
                          {receita.clienteEmail && (
                            <p className="text-xs text-muted-foreground">{receita.clienteEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground">{receita.service.servico}</p>
                        {receita.service.resumo && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{receita.service.resumo}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-muted-foreground">
                          {receita.service.numeroFatura || receita.service.fatura || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {cfg ? (
                          <Badge variant="outline" className={`text-xs ${cfg.badgeClass}`}>
                            {cfg.icon}
                            <span className="ml-1">{cfg.label}</span>
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold text-emerald-600">
                        {formatEUR(receita.liquidacao.valor)}
                      </TableCell>
                      <TableCell>
                        {isParcial ? (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                            <CircleDot className="h-3 w-3 mr-1" />
                            Parcial
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Pago
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDetailReceita(receita)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {paginatedReceitas.length > 0 && (
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell colSpan={5} className="text-right text-sm text-muted-foreground">
                    Total desta página:
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-emerald-700">
                    {formatEUR(totalPagina)}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mostrar:</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>por página</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailReceita} onOpenChange={open => !open && setDetailReceita(null)}>
        <DialogContent className="max-w-lg">
          {detailReceita && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                  Detalhes da Receita
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoBlock label="Cliente" value={detailReceita.service.cliente} />
                  <InfoBlock label="Serviço" value={detailReceita.service.servico} />
                  <InfoBlock label="Data Pagamento" value={detailReceita.liquidacao.dataPagamento} />
                  <InfoBlock label="Nº Fatura" value={detailReceita.service.numeroFatura || detailReceita.service.fatura || '—'} />
                  <InfoBlock label="Valor Total (c/ IVA)" value={formatEUR(detailReceita.service.valorComIVA)} />
                  <InfoBlock label="Valor Recebido" value={formatEUR(detailReceita.liquidacao.valor)} highlight />
                  <InfoBlock label="Total Liquidado" value={formatEUR(detailReceita.service.liquidado)} />
                  <InfoBlock label="Em Débito" value={formatEUR(detailReceita.service.executadoEmDebito)} />
                  <InfoBlock
                    label="Método"
                    value={
                      detailReceita.liquidacao.formaPagamento
                        ? (formaPagamentoConfig[detailReceita.liquidacao.formaPagamento]?.label || detailReceita.liquidacao.formaPagamento)
                        : '—'
                    }
                  />
                  <InfoBlock label="Email" value={detailReceita.clienteEmail || 'Não cadastrado'} />
                </div>
                {detailReceita.liquidacao.observacoes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm text-foreground">{detailReceita.liquidacao.observacoes}</p>
                  </div>
                )}
                {detailReceita.service.resumo && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Resumo do Serviço</p>
                    <p className="text-sm text-foreground">{detailReceita.service.resumo}</p>
                  </div>
                )}
                {/* All liquidações for this service */}
                {detailReceita.service.liquidacoes.length > 1 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Todas as liquidações deste serviço</p>
                    <div className="space-y-1">
                      {detailReceita.service.liquidacoes.map(l => (
                        <div
                          key={l.id}
                          className={`flex justify-between text-sm p-2 rounded ${l.id === detailReceita.liquidacao.id ? 'bg-emerald-50 border border-emerald-200' : 'bg-muted/50'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{l.dataPagamento}</span>
                            {l.formaPagamento && (
                              <Badge variant="outline" className="text-xs">
                                {formaPagamentoConfig[l.formaPagamento]?.label || l.formaPagamento}
                              </Badge>
                            )}
                          </div>
                          <span className="font-mono text-emerald-600">{formatEUR(l.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailReceita(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function InfoBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-emerald-600 font-bold' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

export default Receitas;
