import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ShoppingBag, TrendingUp, TrendingDown, CalendarDays, Eye, Plus } from 'lucide-react';
import {
  useEcommerceRelatorios,
  useProdutosMonitorizados,
  useAjustesPreco,
} from '@/hooks/useEcommerceRelatorios';
import { format, parseISO, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';

const fmtEUR = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = parseISO(s);
  return isValid(d) ? format(d, 'dd/MM/yyyy', { locale: pt }) : '—';
};

export default function EcommerceInteligencia() {
  const [tab, setTab] = useState('relatorios');
  const { data: relatorios = [], isLoading: lr } = useEcommerceRelatorios();
  const { data: produtos = [], isLoading: lp } = useProdutosMonitorizados();
  const { data: ajustes = [], isLoading: la } = useAjustesPreco();

  const kpis = useMemo(() => {
    const subidas = ajustes.filter(a => (a.variacao_eur || 0) > 0).length;
    const descidas = ajustes.filter(a => (a.variacao_eur || 0) < 0).length;
    const proximas = produtos.filter(p => {
      if (!p.proxima_revisao) return false;
      const d = parseISO(p.proxima_revisao);
      const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 14;
    }).length;
    return { subidas, descidas, proximas };
  }, [ajustes, produtos]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Inteligência Competitiva
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise de preços, watchlist e revisões de mercado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Relatórios" value={relatorios.length} icon={Eye} />
        <KpiCard label="Produtos monitorizados" value={produtos.length} icon={ShoppingBag} />
        <KpiCard label="Subidas de preço" value={kpis.subidas} icon={TrendingUp} accent="text-emerald-600" />
        <KpiCard label="Revisões em ≤14 dias" value={kpis.proximas} icon={CalendarDays} accent="text-amber-600" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="ajustes">Ajustes de Preço</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="calendario">Calendário de Revisões</TabsTrigger>
        </TabsList>

        {/* ----- Relatórios ----- */}
        <TabsContent value="relatorios">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de análises competitivas</CardTitle>
            </CardHeader>
            <CardContent>
              {lr ? <p className="text-sm text-muted-foreground">A carregar…</p> :
                relatorios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum relatório registado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Resumo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatorios.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{fmtDate(r.data_analise)}</TableCell>
                          <TableCell className="font-medium">{r.titulo}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.resumo || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----- Ajustes ----- */}
        <TabsContent value="ajustes">
          <Card>
            <CardHeader>
              <CardTitle>Log de ajustes de preço</CardTitle>
            </CardHeader>
            <CardContent>
              {la ? <p className="text-sm text-muted-foreground">A carregar…</p> :
                ajustes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum ajuste registado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Ref.</TableHead>
                        <TableHead className="text-right">Anterior</TableHead>
                        <TableHead className="text-right">Novo</TableHead>
                        <TableHead className="text-right">Variação</TableHead>
                        <TableHead>Justificação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ajustes.map(a => {
                        const v = a.variacao_eur || 0;
                        const pct = a.variacao_pct || 0;
                        const positive = v > 0;
                        return (
                          <TableRow key={a.id}>
                            <TableCell>{fmtDate(a.data_ajuste)}</TableCell>
                            <TableCell className="font-medium">{a.produto_nome}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{a.referencia_interna || '—'}</TableCell>
                            <TableCell className="text-right">{fmtEUR(a.preco_anterior)}</TableCell>
                            <TableCell className="text-right font-semibold">{fmtEUR(a.preco_novo)}</TableCell>
                            <TableCell className="text-right">
                              <span className={`inline-flex items-center gap-1 ${positive ? 'text-emerald-600' : v < 0 ? 'text-red-600' : ''}`}>
                                {positive ? <TrendingUp className="h-3 w-3" /> : v < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                                {fmtEUR(v)} ({pct.toFixed(2)}%)
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{a.justificacao || '—'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----- Watchlist ----- */}
        <TabsContent value="watchlist">
          <Card>
            <CardHeader>
              <CardTitle>Produtos monitorizados</CardTitle>
            </CardHeader>
            <CardContent>
              {lp ? <p className="text-sm text-muted-foreground">A carregar…</p> :
                produtos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum produto na watchlist.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ref.</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Preço atual</TableHead>
                        <TableHead>Concorrentes</TableHead>
                        <TableHead>Próx. revisão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtos.map(p => {
                        const concorrentes = p.precos_concorrentes || [];
                        const min = concorrentes.length ? Math.min(...concorrentes.map(c => c.preco)) : null;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs">{p.referencia_interna || '—'}</TableCell>
                            <TableCell className="font-medium">{p.nome}</TableCell>
                            <TableCell><Badge variant="secondary">{p.categoria || '—'}</Badge></TableCell>
                            <TableCell className="text-right font-semibold">{fmtEUR(p.preco_atual)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {concorrentes.map((c, i) => (
                                  <Badge
                                    key={i}
                                    variant={min != null && c.preco === min ? 'default' : 'outline'}
                                    className="text-xs"
                                  >
                                    {c.concorrente}: {fmtEUR(c.preco)}
                                  </Badge>
                                ))}
                                {concorrentes.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                              </div>
                            </TableCell>
                            <TableCell>{fmtDate(p.proxima_revisao)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----- Calendário ----- */}
        <TabsContent value="calendario">
          <Card>
            <CardHeader>
              <CardTitle>Próximas revisões de preço</CardTitle>
            </CardHeader>
            <CardContent>
              {lp ? <p className="text-sm text-muted-foreground">A carregar…</p> :
                produtos.filter(p => p.proxima_revisao).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem revisões agendadas.</p>
                ) : (
                  <div className="space-y-2">
                    {produtos
                      .filter(p => p.proxima_revisao)
                      .sort((a, b) => (a.proxima_revisao || '').localeCompare(b.proxima_revisao || ''))
                      .map(p => {
                        const d = parseISO(p.proxima_revisao!);
                        const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        const tone =
                          diff < 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
                          diff <= 7 ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' :
                          'border-border';
                        return (
                          <div key={p.id} className={`flex items-center justify-between rounded-lg border-l-4 p-3 ${tone}`}>
                            <div>
                              <div className="font-medium">{p.nome}</div>
                              <div className="text-xs text-muted-foreground">{p.categoria || '—'} • {p.referencia_interna || '—'}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">{fmtDate(p.proxima_revisao)}</div>
                              <div className="text-xs text-muted-foreground">
                                {diff < 0 ? `${Math.abs(diff)} dias em atraso` : diff === 0 ? 'Hoje' : `em ${diff} dias`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${accent || ''}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${accent || 'text-muted-foreground/50'}`} />
      </CardContent>
    </Card>
  );
}
