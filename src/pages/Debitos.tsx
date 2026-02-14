import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '@/hooks/useServices';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useClientes } from '@/hooks/useClientes';
import { useToast } from '@/hooks/use-toast';
import { ServiceWithCalculations } from '@/types/service';
import { formatEUR } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle, Search, Mail, Download, Filter,
  ChevronLeft, ChevronRight, Eye, Clock, TrendingDown,
  Users, Calculator, Send, CheckCircle2, XCircle,
} from 'lucide-react';

type CategoriaAtraso = 'ate30' | '31a90' | 'acima90';

const categoryConfig: Record<CategoriaAtraso, {
  label: string;
  badgeClass: string;
  cardBorder: string;
  cardBg: string;
  icon: string;
}> = {
  ate30: {
    label: 'Até 30 dias',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cardBorder: 'border-l-emerald-500',
    cardBg: '',
    icon: '🟢',
  },
  '31a90': {
    label: '31 a 90 dias',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    cardBorder: 'border-l-amber-500',
    cardBg: '',
    icon: '🟡',
  },
  acima90: {
    label: 'Acima de 90 dias',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    cardBorder: 'border-l-red-500',
    cardBg: '',
    icon: '🔴',
  },
};

function getCategoria(dias: number): CategoriaAtraso {
  if (dias <= 30) return 'ate30';
  if (dias <= 90) return '31a90';
  return 'acima90';
}

const Debitos = () => {
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const { services: servicesWithCalculations, isInitialized } = useServices(empresa?.id);
  const { clientes } = useClientes();

  // Filters
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Email dialog
  const [emailDialog, setEmailDialog] = useState<{
    open: boolean;
    debitos: ServiceWithCalculations[];
    sending: boolean;
  }>({ open: false, debitos: [], sending: false });

  // Detail dialog
  const [detailService, setDetailService] = useState<ServiceWithCalculations | null>(null);

  // All services with debt > 0
  const debitosAll = useMemo(() => {
    return servicesWithCalculations
      .filter(s => s.executadoEmDebito > 0)
      .sort((a, b) => b.diasEmAtraso - a.diasEmAtraso);
  }, [servicesWithCalculations]);

  // Filtered
  const debitosFiltrados = useMemo(() => {
    let result = debitosAll;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.cliente.toLowerCase().includes(q) ||
        s.servico.toLowerCase().includes(q) ||
        s.id.includes(q) ||
        (s.numeroFatura || '').toLowerCase().includes(q)
      );
    }

    if (categoriaFilter !== 'all') {
      result = result.filter(s => getCategoria(s.diasEmAtraso) === categoriaFilter);
    }

    return result;
  }, [debitosAll, search, categoriaFilter]);

  // Stats by category
  const stats = useMemo(() => {
    const ate30 = debitosAll.filter(s => getCategoria(s.diasEmAtraso) === 'ate30');
    const de31a90 = debitosAll.filter(s => getCategoria(s.diasEmAtraso) === '31a90');
    const acima90 = debitosAll.filter(s => getCategoria(s.diasEmAtraso) === 'acima90');

    return {
      ate30: { count: ate30.length, total: ate30.reduce((s, d) => s + d.executadoEmDebito, 0) },
      '31a90': { count: de31a90.length, total: de31a90.reduce((s, d) => s + d.executadoEmDebito, 0) },
      acima90: { count: acima90.length, total: acima90.reduce((s, d) => s + d.executadoEmDebito, 0) },
      totalDebito: debitosAll.reduce((s, d) => s + d.executadoEmDebito, 0),
      totalClientes: new Set(debitosAll.map(d => d.cliente)).size,
    };
  }, [debitosAll]);

  // Pagination
  const totalPages = Math.ceil(debitosFiltrados.length / pageSize);
  const paginatedDebitos = debitosFiltrados.slice((page - 1) * pageSize, page * pageSize);

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === debitosFiltrados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(debitosFiltrados.map(d => d.id)));
    }
  };

  // Find client email
  const getClienteEmail = (clienteName: string): string | undefined => {
    const cliente = clientes.find(c => c.nome.toLowerCase() === clienteName.toLowerCase());
    return cliente?.email;
  };

  // Open email dialog
  const openEmailDialog = (debitos: ServiceWithCalculations[]) => {
    const withEmail = debitos.filter(d => {
      const email = d.email || getClienteEmail(d.cliente);
      return !!email;
    });
    if (withEmail.length === 0) {
      toast({ title: 'Sem emails', description: 'Nenhum dos clientes selecionados possui email cadastrado.', variant: 'destructive' });
      return;
    }
    setEmailDialog({ open: true, debitos: withEmail, sending: false });
  };

  // Send billing emails
  const handleSendEmails = async () => {
    if (!empresa) return;
    setEmailDialog(prev => ({ ...prev, sending: true }));

    let sent = 0;
    let failed = 0;

    for (const debito of emailDialog.debitos) {
      const email = debito.email || getClienteEmail(debito.cliente);
      if (!email) continue;

      try {
        // Log the email in history
        await supabase.from('email_history').insert({
          empresa_id: empresa.id,
          service_id: debito.id,
          cliente_nome: debito.cliente,
          cliente_email: email,
          email_subject: `Cobrança - ${empresa.nome} - ${debito.servico}`,
          email_type: 'cobranca',
          valor_debito: debito.executadoEmDebito,
          dias_atraso: debito.diasEmAtraso,
        });
        sent++;
      } catch {
        failed++;
      }
    }

    setEmailDialog({ open: false, debitos: [], sending: false });
    setSelectedIds(new Set());

    toast({
      title: 'Cobranças registadas',
      description: `${sent} cobrança(s) registada(s) com sucesso.${failed > 0 ? ` ${failed} falharam.` : ''}`,
    });
  };

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
          <h1 className="text-2xl font-bold text-foreground">Gestão de Débitos</h1>
          <p className="text-sm text-muted-foreground">Serviços com valores em aberto</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/historico-cobrancas')}>
            <Clock className="h-4 w-4 mr-1" />
            Histórico
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const selected = debitosFiltrados.filter(d => selectedIds.has(d.id));
            openEmailDialog(selected.length > 0 ? selected : []);
          }} disabled={selectedIds.size === 0}>
            <Mail className="h-4 w-4 mr-1" />
            Enviar Cobranças ({selectedIds.size})
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['ate30', '31a90', 'acima90'] as CategoriaAtraso[]).map(cat => {
          const cfg = categoryConfig[cat];
          const s = stats[cat];
          const isActive = categoriaFilter === cat;
          return (
            <Card
              key={cat}
              className={`border-l-4 ${cfg.cardBorder} cursor-pointer transition-shadow hover:shadow-md ${isActive ? 'ring-2 ring-primary' : ''}`}
              onClick={() => {
                setCategoriaFilter(isActive ? 'all' : cat);
                setPage(1);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <Badge variant="outline" className={cfg.badgeClass}>{cfg.label}</Badge>
                </div>
                <div className="text-2xl font-bold text-foreground">{formatEUR(s.total)}</div>
                <p className="text-sm text-muted-foreground">{s.count} débito{s.count !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary bar */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-danger" />
              <span className="text-muted-foreground">Total em débito:</span>
              <span className="font-bold text-foreground">{formatEUR(stats.totalDebito)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Clientes:</span>
              <span className="font-bold text-foreground">{stats.totalClientes}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-warning" />
              <span className="text-muted-foreground">Média:</span>
              <span className="font-bold text-foreground">
                {formatEUR(stats.totalClientes > 0 ? stats.totalDebito / stats.totalClientes : 0)}
              </span>
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
            <Select value={categoriaFilter} onValueChange={v => { setCategoriaFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="ate30">🟢 Até 30 dias</SelectItem>
                <SelectItem value="31a90">🟡 31 a 90 dias</SelectItem>
                <SelectItem value="acima90">🔴 Acima de 90 dias</SelectItem>
              </SelectContent>
            </Select>
            {(search || categoriaFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategoriaFilter('all'); setPage(1); }}>
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Mostrando {paginatedDebitos.length} de {debitosFiltrados.length} débitos
        {debitosFiltrados.length !== debitosAll.length && ` (${debitosAll.length} total)`}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.size === debitosFiltrados.length && debitosFiltrados.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Nº Fatura</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Em Débito</TableHead>
                <TableHead className="text-right">Atraso</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDebitos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                      <p className="font-medium">Sem débitos</p>
                      <p className="text-sm">Nenhum serviço com valores em aberto encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDebitos.map(debito => {
                  const cat = getCategoria(debito.diasEmAtraso);
                  const cfg = categoryConfig[cat];
                  const clienteEmail = debito.email || getClienteEmail(debito.cliente);

                  return (
                    <TableRow key={debito.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(debito.id)}
                          onCheckedChange={() => toggleSelect(debito.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${cfg.badgeClass}`}>
                          {cfg.icon} {debito.diasEmAtraso}d
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground text-sm">{debito.cliente}</p>
                          {clienteEmail && (
                            <p className="text-xs text-muted-foreground">{clienteEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground">{debito.servico}</p>
                        {debito.resumo && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{debito.resumo}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-muted-foreground">
                          {debito.numeroFatura || debito.fatura || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatEUR(debito.valorComIVA)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold text-danger">
                        {formatEUR(debito.executadoEmDebito)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-sm font-medium ${
                          cat === 'acima90' ? 'text-red-600' :
                          cat === '31a90' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {debito.diasEmAtraso} dias
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDetailService(debito)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEmailDialog([debito])}
                            disabled={!clienteEmail}
                            title={clienteEmail ? 'Enviar cobrança' : 'Cliente sem email'}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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

      {/* Email Confirmation Dialog */}
      <Dialog open={emailDialog.open} onOpenChange={open => !emailDialog.sending && setEmailDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Confirmar Envio de Cobranças
            </DialogTitle>
            <DialogDescription>
              Será registada a cobrança para os seguintes clientes:
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {emailDialog.debitos.map(d => {
              const email = d.email || getClienteEmail(d.cliente);
              return (
                <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                  <div>
                    <p className="font-medium">{d.cliente}</p>
                    <p className="text-xs text-muted-foreground">{email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-danger">{formatEUR(d.executadoEmDebito)}</p>
                    <p className="text-xs text-muted-foreground">{d.diasEmAtraso} dias</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-lg bg-warning-lighter p-3 text-sm">
            <p className="font-medium text-warning-foreground">⚠️ Nota</p>
            <p className="text-warning-foreground/80 mt-1">
              O envio de emails requer configuração do serviço de email. Nesta fase, as cobranças serão registadas no histórico para acompanhamento.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog({ open: false, debitos: [], sending: false })} disabled={emailDialog.sending}>
              Cancelar
            </Button>
            <Button onClick={handleSendEmails} disabled={emailDialog.sending}>
              {emailDialog.sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  A enviar...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Registar Cobranças ({emailDialog.debitos.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailService} onOpenChange={open => !open && setDetailService(null)}>
        <DialogContent className="max-w-lg">
          {detailService && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes do Débito</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoBlock label="Cliente" value={detailService.cliente} />
                  <InfoBlock label="Serviço" value={detailService.servico} />
                  <InfoBlock label="Data" value={detailService.data} />
                  <InfoBlock label="Nº Fatura" value={detailService.numeroFatura || detailService.fatura || '—'} />
                  <InfoBlock label="Valor Total (c/ IVA)" value={formatEUR(detailService.valorComIVA)} />
                  <InfoBlock label="Valor Liquidado" value={formatEUR(detailService.liquidado)} />
                  <InfoBlock label="Em Débito" value={formatEUR(detailService.executadoEmDebito)} highlight />
                  <InfoBlock label="Dias em Atraso" value={`${detailService.diasEmAtraso} dias`} />
                  <InfoBlock label="Email" value={detailService.email || getClienteEmail(detailService.cliente) || 'Não cadastrado'} />
                  <InfoBlock label="Telefone" value={detailService.telefone || '—'} />
                </div>
                {detailService.resumo && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Resumo</p>
                    <p className="text-sm text-foreground">{detailService.resumo}</p>
                  </div>
                )}
                {/* Liquidações */}
                {detailService.liquidacoes.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Liquidações</p>
                    <div className="space-y-1">
                      {detailService.liquidacoes.map(l => (
                        <div key={l.id} className="flex justify-between text-sm p-2 rounded bg-muted/50">
                          <span>{l.dataPagamento}</span>
                          <span className="font-mono text-success">{formatEUR(l.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailService(null)}>Fechar</Button>
                <Button onClick={() => { setDetailService(null); openEmailDialog([detailService]); }}
                  disabled={!(detailService.email || getClienteEmail(detailService.cliente))}>
                  <Mail className="h-4 w-4 mr-1" /> Enviar Cobrança
                </Button>
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
      <p className={`text-sm font-medium ${highlight ? 'text-danger font-bold' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

export default Debitos;
