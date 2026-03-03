import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useStockAtual, StockAtual, StockMovimento } from '@/hooks/useStockAtual';
import { useProdutos } from '@/hooks/useProdutos';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Package, AlertTriangle, TrendingUp, Download, Plus, Search, Minus, Settings2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 25;

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function getEstado(stock: StockAtual): 'normal' | 'abaixo' | 'rutura' {
  if (stock.quantidadeAtual <= 0) return 'rutura';
  if (stock.stockMinimo > 0 && stock.quantidadeAtual <= stock.stockMinimo) return 'abaixo';
  return 'normal';
}

function EstadoBadge({ estado }: { estado: 'normal' | 'abaixo' | 'rutura' }) {
  if (estado === 'rutura') return <Badge variant="destructive">Rutura</Badge>;
  if (estado === 'abaixo') return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Abaixo Mín.</Badge>;
  return <Badge className="bg-green-600 text-white hover:bg-green-700">Normal</Badge>;
}

function TipoBadge({ tipo }: { tipo: string }) {
  if (tipo === 'entrada') return <Badge className="bg-green-600 text-white hover:bg-green-700">Entrada</Badge>;
  if (tipo === 'saida') return <Badge variant="destructive">Saída</Badge>;
  return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Ajuste</Badge>;
}

export default function GestaoStocks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { empresa, isLoading: empresaLoading } = useEmpresa();
  const { stocks, movimentos, isLoading, registarSaida, ajustarStock } = useStockAtual();
  const { produtos } = useProdutos();

  useEffect(() => {
    if (empresaLoading) return;
    if (!empresa) {
      const saved = localStorage.getItem('selectedEmpresa');
      if (!saved) navigate('/empresa');
    }
  }, [empresa, empresaLoading, navigate]);

  // Stock tab state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [stockPage, setStockPage] = useState(1);

  // Movements tab state
  const [movSearch, setMovSearch] = useState('');
  const [movTipo, setMovTipo] = useState('all');
  const [movPage, setMovPage] = useState(1);

  // Dialogs
  const [isSaidaOpen, setIsSaidaOpen] = useState(false);
  const [isAjusteOpen, setIsAjusteOpen] = useState(false);

  // Saida form
  const [saidaProdutoSearch, setSaidaProdutoSearch] = useState('');
  const [saidaShowResults, setSaidaShowResults] = useState(false);
  const [saidaProdutoRef, setSaidaProdutoRef] = useState('');
  const [saidaProdutoDesc, setSaidaProdutoDesc] = useState('');
  const [saidaQtd, setSaidaQtd] = useState('');
  const [saidaTipo, setSaidaTipo] = useState('venda');
  const [saidaRefDoc, setSaidaRefDoc] = useState('');
  const [saidaObs, setSaidaObs] = useState('');

  // Ajuste form
  const [ajusteProdutoSearch, setAjusteProdutoSearch] = useState('');
  const [ajusteShowResults, setAjusteShowResults] = useState(false);
  const [ajusteProdutoRef, setAjusteProdutoRef] = useState('');
  const [ajusteProdutoDesc, setAjusteProdutoDesc] = useState('');
  const [ajusteStockAtual, setAjusteStockAtual] = useState(0);
  const [ajusteStockReal, setAjusteStockReal] = useState('');
  const [ajusteMotivo, setAjusteMotivo] = useState('inventario');
  const [ajusteObs, setAjusteObs] = useState('');

  // Categories from stocks
  const categorias = useMemo(() => {
    const cats = new Set<string>();
    stocks.forEach(s => { if (s.categoria) cats.add(s.categoria); });
    return Array.from(cats).sort();
  }, [stocks]);

  // Filtered stocks
  const filteredStocks = useMemo(() => {
    let result = stocks;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.produtoRef.toLowerCase().includes(q) ||
        (s.produtoDesc || '').toLowerCase().includes(q) ||
        (s.categoria || '').toLowerCase().includes(q)
      );
    }
    if (filterCategoria !== 'all') result = result.filter(s => s.categoria === filterCategoria);
    if (filterEstado !== 'all') {
      result = result.filter(s => getEstado(s) === filterEstado);
    }
    return result;
  }, [stocks, searchTerm, filterCategoria, filterEstado]);

  const stockTotalPages = Math.max(1, Math.ceil(filteredStocks.length / PAGE_SIZE));
  const paginatedStocks = filteredStocks.slice((stockPage - 1) * PAGE_SIZE, stockPage * PAGE_SIZE);

  // Filtered movements
  const filteredMovimentos = useMemo(() => {
    let result = movimentos;
    if (movSearch) {
      const q = movSearch.toLowerCase();
      result = result.filter(m =>
        m.produtoRef.toLowerCase().includes(q) ||
        (m.produtoDesc || '').toLowerCase().includes(q)
      );
    }
    if (movTipo !== 'all') result = result.filter(m => m.tipo === movTipo);
    return result;
  }, [movimentos, movSearch, movTipo]);

  const movTotalPages = Math.max(1, Math.ceil(filteredMovimentos.length / PAGE_SIZE));
  const paginatedMov = filteredMovimentos.slice((movPage - 1) * PAGE_SIZE, movPage * PAGE_SIZE);

  // Summary
  const totalArtigos = stocks.length;
  const artigosComStock = stocks.filter(s => s.quantidadeAtual > 0).length;
  const artigosRutura = stocks.filter(s => getEstado(s) === 'rutura').length;
  const valorTotal = stocks.reduce((sum, s) => sum + (s.quantidadeAtual * (s.ultimoPreco || 0)), 0);

  // Search produtos for dialogs
  const searchProdutos = (query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: { ref: string; desc: string; stock: number }[] = [];
    // From stock_atual
    for (const s of stocks) {
      if (s.produtoRef.toLowerCase().includes(q) || (s.produtoDesc || '').toLowerCase().includes(q)) {
        results.push({ ref: s.produtoRef, desc: s.produtoDesc || '', stock: s.quantidadeAtual });
      }
    }
    // From produtos (if not in stocks)
    for (const p of produtos) {
      if (!results.some(r => r.ref === p.refInterna)) {
        if (p.refInterna.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q)) {
          results.push({ ref: p.refInterna, desc: p.descricao, stock: 0 });
        }
      }
    }
    return results.slice(0, 15);
  };

  const saidaResults = useMemo(() => searchProdutos(saidaProdutoSearch), [saidaProdutoSearch, stocks, produtos]);
  const ajusteResults = useMemo(() => searchProdutos(ajusteProdutoSearch), [ajusteProdutoSearch, stocks, produtos]);

  const resetSaida = () => {
    setSaidaProdutoSearch(''); setSaidaProdutoRef(''); setSaidaProdutoDesc('');
    setSaidaQtd(''); setSaidaTipo('venda'); setSaidaRefDoc(''); setSaidaObs('');
  };

  const resetAjuste = () => {
    setAjusteProdutoSearch(''); setAjusteProdutoRef(''); setAjusteProdutoDesc('');
    setAjusteStockAtual(0); setAjusteStockReal(''); setAjusteMotivo('inventario'); setAjusteObs('');
  };

  const handleSaidaSubmit = async () => {
    if (!saidaProdutoRef || !saidaQtd || parseFloat(saidaQtd) <= 0) {
      toast({ title: 'Erro', description: 'Preencha artigo e quantidade.', variant: 'destructive' });
      return;
    }
    const ok = await registarSaida({
      produtoRef: saidaProdutoRef,
      produtoDesc: saidaProdutoDesc,
      quantidade: parseFloat(saidaQtd),
      origem: saidaTipo,
      referenciaDoc: saidaRefDoc,
      observacoes: saidaObs,
    });
    toast(ok
      ? { title: 'Saída registada', description: 'Stock atualizado com sucesso.' }
      : { title: 'Erro', description: 'Não foi possível registar a saída.', variant: 'destructive' }
    );
    if (ok) { setIsSaidaOpen(false); resetSaida(); }
  };

  const handleAjusteSubmit = async () => {
    if (!ajusteProdutoRef || ajusteStockReal === '') {
      toast({ title: 'Erro', description: 'Preencha artigo e stock real.', variant: 'destructive' });
      return;
    }
    const ok = await ajustarStock({
      produtoRef: ajusteProdutoRef,
      produtoDesc: ajusteProdutoDesc,
      novaQuantidade: parseFloat(ajusteStockReal),
      motivo: ajusteMotivo,
      observacoes: ajusteObs,
    });
    toast(ok
      ? { title: 'Stock ajustado', description: 'Ajuste registado com sucesso.' }
      : { title: 'Erro', description: 'Não foi possível ajustar o stock.', variant: 'destructive' }
    );
    if (ok) { setIsAjusteOpen(false); resetAjuste(); }
  };

  const handleExport = () => {
    const data = filteredStocks.map(s => ({
      'Ref. Interna': s.produtoRef,
      'Descrição': s.produtoDesc || '',
      'Categoria': s.categoria || '',
      'Stock Atual': s.quantidadeAtual,
      'Unidade': s.unidade || '',
      'Stock Mín.': s.stockMinimo,
      'Último Preço': s.ultimoPreco || 0,
      'Valor Total': s.quantidadeAtual * (s.ultimoPreco || 0),
      'Estado': getEstado(s) === 'normal' ? 'Normal' : getEstado(s) === 'abaixo' ? 'Abaixo Mín.' : 'Rutura',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, 'gestao_stocks.xlsx');
  };

  const openAjusteFor = (stock: StockAtual) => {
    setAjusteProdutoSearch(stock.produtoRef + ' - ' + (stock.produtoDesc || ''));
    setAjusteProdutoRef(stock.produtoRef);
    setAjusteProdutoDesc(stock.produtoDesc || '');
    setAjusteStockAtual(stock.quantidadeAtual);
    setAjusteStockReal('');
    setAjusteMotivo('inventario');
    setAjusteObs('');
    setIsAjusteOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Stocks</h1>
          <p className="text-sm text-muted-foreground">Controlo de inventário e movimentos de artigos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={() => { resetAjuste(); setIsAjusteOpen(true); }}>
            <Settings2 className="w-4 h-4 mr-2" /> Ajuste de Stock
          </Button>
          <Button size="sm" onClick={() => { resetSaida(); setIsSaidaOpen(true); }}>
            <Minus className="w-4 h-4 mr-2" /> Nova Saída
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Package className="w-8 h-8 text-primary" /><div><p className="text-sm text-muted-foreground">Total de Artigos</p><p className="text-2xl font-bold">{totalArtigos}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="w-8 h-8 text-green-600" /><div><p className="text-sm text-muted-foreground">Com Stock</p><p className="text-2xl font-bold text-green-600">{artigosComStock}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="w-8 h-8 text-destructive" /><div><p className="text-sm text-muted-foreground">Em Rutura</p><p className="text-2xl font-bold text-destructive">{artigosRutura}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div><p className="text-sm text-muted-foreground">Valor Total Stock</p><p className="text-2xl font-bold">{formatCurrency(valorTotal)}</p></div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock Atual</TabsTrigger>
          <TabsTrigger value="movimentos">Movimentos</TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Stock Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Pesquisar referência, descrição..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setStockPage(1); }} className="pl-9" />
                </div>
                <Select value={filterCategoria} onValueChange={v => { setFilterCategoria(v); setStockPage(1); }}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Categorias</SelectItem>
                    {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterEstado} onValueChange={v => { setFilterEstado(v); setStockPage(1); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="abaixo">Abaixo Mín.</SelectItem>
                    <SelectItem value="rutura">Rutura</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : paginatedStocks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum artigo em stock.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ref. Interna</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead className="text-right">Mín.</TableHead>
                          <TableHead className="text-right">Último Preço</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedStocks.map(s => {
                          const estado = getEstado(s);
                          return (
                            <TableRow key={s.id} className={s.quantidadeAtual < 0 ? 'bg-destructive/5' : ''}>
                              <TableCell className="font-medium">{s.produtoRef}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{s.produtoDesc}</TableCell>
                              <TableCell><Badge variant="outline">{s.categoria || '—'}</Badge></TableCell>
                              <TableCell className="text-right font-semibold">{s.quantidadeAtual}</TableCell>
                              <TableCell>{s.unidade || '—'}</TableCell>
                              <TableCell className="text-right">{s.stockMinimo}</TableCell>
                              <TableCell className="text-right">{s.ultimoPreco ? formatCurrency(s.ultimoPreco) : '—'}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(s.quantidadeAtual * (s.ultimoPreco || 0))}</TableCell>
                              <TableCell><EstadoBadge estado={estado} /></TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => openAjusteFor(s)} title="Ajustar Stock">
                                  <Settings2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {stockTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-muted-foreground">Página {stockPage} de {stockTotalPages} ({filteredStocks.length} artigos)</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={stockPage <= 1} onClick={() => setStockPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" disabled={stockPage >= stockTotalPages} onClick={() => setStockPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movimentos Tab */}
        <TabsContent value="movimentos">
          <Card>
            <CardHeader>
              <CardTitle>Movimentos de Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Pesquisar artigo..." value={movSearch} onChange={e => { setMovSearch(e.target.value); setMovPage(1); }} className="pl-9" />
                </div>
                <Select value={movTipo} onValueChange={v => { setMovTipo(v); setMovPage(1); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paginatedMov.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum movimento registado.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Artigo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Qtd.</TableHead>
                          <TableHead className="text-right">Custo Unit.</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead>Referência</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedMov.map(m => (
                          <TableRow key={m.id}>
                            <TableCell>{new Date(m.createdAt).toLocaleDateString('pt-PT')}</TableCell>
                            <TableCell>
                              <span className="font-medium">{m.produtoRef}</span>
                              {m.produtoDesc && <span className="text-muted-foreground ml-1 text-xs">— {m.produtoDesc}</span>}
                            </TableCell>
                            <TableCell><TipoBadge tipo={m.tipo} /></TableCell>
                            <TableCell className="text-right font-semibold">{m.quantidade}</TableCell>
                            <TableCell className="text-right">{m.custoUnitario != null ? formatCurrency(m.custoUnitario) : '—'}</TableCell>
                            <TableCell>{m.origem || '—'}</TableCell>
                            <TableCell>{m.referenciaDoc || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {movTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-muted-foreground">Página {movPage} de {movTotalPages}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={movPage <= 1} onClick={() => setMovPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" disabled={movPage >= movTotalPages} onClick={() => setMovPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Nova Saída Dialog */}
      <Dialog open={isSaidaOpen} onOpenChange={o => { setIsSaidaOpen(o); if (!o) resetSaida(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Saída de Stock</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 relative">
              <Label>Artigo *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={saidaProdutoSearch} onChange={e => { setSaidaProdutoSearch(e.target.value); setSaidaShowResults(true); }} onFocus={() => setSaidaShowResults(true)} placeholder="Pesquisar artigo..." className="pl-9" />
              </div>
              {saidaShowResults && saidaResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {saidaResults.map(r => (
                    <button key={r.ref} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm" onClick={() => {
                      setSaidaProdutoRef(r.ref); setSaidaProdutoDesc(r.desc);
                      setSaidaProdutoSearch(r.ref + ' - ' + r.desc); setSaidaShowResults(false);
                    }}>
                      <span className="font-medium">{r.ref}</span> — {r.desc}
                      <span className="text-xs text-muted-foreground ml-2">(Stock: {r.stock})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input type="number" min="0.001" step="1" value={saidaQtd} onChange={e => setSaidaQtd(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Saída *</Label>
                <Select value={saidaTipo} onValueChange={setSaidaTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="consumo_interno">Consumo Interno</SelectItem>
                    <SelectItem value="perda">Perda/Quebra</SelectItem>
                    <SelectItem value="devolucao">Devolução ao Fornecedor</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Referência do Documento</Label>
              <Input value={saidaRefDoc} onChange={e => setSaidaRefDoc(e.target.value)} placeholder="Nº fatura, guia, etc." />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={saidaObs} onChange={e => setSaidaObs(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaidaOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaidaSubmit}>Guardar Saída</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ajuste de Stock Dialog */}
      <Dialog open={isAjusteOpen} onOpenChange={o => { setIsAjusteOpen(o); if (!o) resetAjuste(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ajuste de Stock</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 relative">
              <Label>Artigo *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={ajusteProdutoSearch} onChange={e => {
                  setAjusteProdutoSearch(e.target.value); setAjusteShowResults(true);
                }} onFocus={() => setAjusteShowResults(true)} placeholder="Pesquisar artigo..." className="pl-9" />
              </div>
              {ajusteShowResults && ajusteResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {ajusteResults.map(r => (
                    <button key={r.ref} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm" onClick={() => {
                      setAjusteProdutoRef(r.ref); setAjusteProdutoDesc(r.desc); setAjusteStockAtual(r.stock);
                      setAjusteProdutoSearch(r.ref + ' - ' + r.desc); setAjusteShowResults(false);
                    }}>
                      <span className="font-medium">{r.ref}</span> — {r.desc}
                      <span className="text-xs text-muted-foreground ml-2">(Stock: {r.stock})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Stock no Sistema</Label>
                <Input readOnly value={ajusteStockAtual} className="bg-muted font-semibold" />
              </div>
              <div className="space-y-2">
                <Label>Stock Real *</Label>
                <Input type="number" step="1" value={ajusteStockReal} onChange={e => setAjusteStockReal(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Diferença</Label>
                <Input readOnly value={ajusteStockReal ? (parseFloat(ajusteStockReal) - ajusteStockAtual).toString() : '—'} className={`bg-muted font-semibold ${ajusteStockReal && parseFloat(ajusteStockReal) - ajusteStockAtual < 0 ? 'text-destructive' : 'text-green-600'}`} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={ajusteMotivo} onValueChange={setAjusteMotivo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventario">Inventário Físico</SelectItem>
                  <SelectItem value="erro_registo">Erro de Registo</SelectItem>
                  <SelectItem value="quebra">Quebra</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={ajusteObs} onChange={e => setAjusteObs(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAjusteOpen(false)}>Cancelar</Button>
            <Button onClick={handleAjusteSubmit}>Confirmar Ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
