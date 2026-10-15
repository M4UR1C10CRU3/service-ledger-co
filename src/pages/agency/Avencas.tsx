import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAvencas } from '@/hooks/useAvencas';
import { useClientes } from '@/hooks/useClientes';
import { useAgencyPais } from '@/hooks/useAgencyPais';
import { useNucleos } from '@/hooks/useNucleos';
import { AVENCA_ESTADOS, type ContratoAvenca } from '@/types/agency';
import { Repeat, Plus, AlertTriangle, CalendarClock, Euro } from 'lucide-react';

const vazio = {
  designacao: '', clienteId: null as string | null, clienteNome: '',
  valorMensal: 0, horasContratadas: null as number | null,
  periodicidade: 'mensal' as ContratoAvenca['periodicidade'],
  dataInicio: new Date().toISOString().split('T')[0],
  mesesDuracao: 12 as number | null, observacoes: '',
  nucleoId: undefined as string | null | undefined,
};

export default function Avencas() {
  const { avencas, isLoading, guardar, gerarPeriodos } = useAvencas();
  const { clientes } = useClientes();
  const { eur, t } = useAgencyPais();
  // Clariza Labs: cada avença pertence a um núcleo (Growth, Infra, Produto…).
  const { nucleos, eLabs, porId } = useNucleos();

  const [aberto, setAberto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...vazio });

  const kpis = useMemo(() => {
    const ativas = avencas.filter(a => a.estado === 'ativo');
    return {
      ativas: ativas.length,
      recorrente: ativas.reduce((s, a) => s + a.valorMensal, 0),
      excedidas: avencas.filter(a => a.horasSaldo != null && a.horasSaldo < 0).length,
    };
  }, [avencas]);

  const abrirNovo = () => { setEditId(null); setForm({ ...vazio, ...(eLabs ? { nucleoId: null } : {}) }); setAberto(true); };
  const abrirEdicao = (a: typeof avencas[number]) => {
    setEditId(a.id);
    setForm({
      designacao: a.designacao, clienteId: a.clienteId, clienteNome: a.clienteNome ?? '',
      valorMensal: a.valorMensal, horasContratadas: a.horasContratadas,
      periodicidade: a.periodicidade, dataInicio: a.dataInicio,
      mesesDuracao: a.mesesDuracao, observacoes: a.observacoes ?? '',
      nucleoId: eLabs ? (a.nucleoId ?? null) : undefined,
    });
    setAberto(true);
  };

  const submeter = async () => {
    if (!form.designacao.trim() || !form.valorMensal) return;
    await guardar.mutateAsync({ id: editId ?? undefined, ...form });
    setAberto(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Repeat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('avencaContrato')}s</h1>
            <p className="text-sm text-muted-foreground">
              Receita recorrente e controlo de horas contratadas vs consumidas
            </p>
          </div>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" /> Nova {t('avenca')}</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Contratos ativos</p>
          <p className="text-2xl font-bold tabular-nums">{kpis.ativas}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Euro className="h-3 w-3" /> Receita recorrente / mês</p>
          <p className="text-2xl font-bold tabular-nums">{eur(kpis.recorrente)}</p>
        </CardContent></Card>
        <Card className={kpis.excedidas > 0 ? 'border-red-300 dark:border-red-900' : ''}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Horas excedidas
            </p>
            <p className={`text-2xl font-bold tabular-nums ${kpis.excedidas > 0 ? 'text-red-600' : ''}`}>
              {kpis.excedidas}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-12 text-muted-foreground">A carregar...</p>
          ) : avencas.length === 0 ? (
            <div className="text-center py-16">
              <Repeat className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Ainda não há contratos de avença.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={abrirNovo}>
                <Plus className="h-4 w-4 mr-2" /> Criar o primeiro contrato
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Cliente</TableHead>
                    {eLabs && <TableHead>Núcleo</TableHead>}
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Valor / mês</TableHead>
                    <TableHead className="w-[200px]">Horas consumidas</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avencas.map(a => {
                    const pct = a.horasContratadas
                      ? Math.min(100, Math.round((a.horasConsumidas / a.horasContratadas) * 100))
                      : 0;
                    const excedeu = a.horasSaldo != null && a.horasSaldo < 0;
                    return (
                      <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => abrirEdicao(a)}>
                        <TableCell className="font-medium">{a.designacao}</TableCell>
                        <TableCell className="text-sm">{a.clienteNome || '—'}</TableCell>
                        {eLabs && <TableCell className="text-sm text-muted-foreground">{porId(a.nucleoId)?.nome ?? '—'}</TableCell>}
                        <TableCell>
                          <Badge variant="outline" className={AVENCA_ESTADOS[a.estado].cor}>
                            {AVENCA_ESTADOS[a.estado].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{eur(a.valorMensal)}</TableCell>
                        <TableCell>
                          {a.horasContratadas ? (
                            <div className="space-y-1">
                              <Progress value={pct} className={`h-1.5 ${excedeu ? '[&>div]:bg-red-500' : ''}`} />
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {a.horasConsumidas.toFixed(1)}h de {a.horasContratadas}h
                              </span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">sem limite definido</span>}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${excedeu ? 'text-red-600' : ''}`}>
                          {a.horasSaldo != null ? (
                            <span className="inline-flex items-center gap-1">
                              {excedeu && <AlertTriangle className="h-3 w-3" />}
                              {a.horasSaldo.toFixed(1)}h
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" title="Gerar períodos de faturação"
                                  onClick={() => gerarPeriodos.mutate(a.id)}>
                            <CalendarClock className="h-3.5 w-3.5 mr-1" /> Períodos
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar contrato' : `Nova ${t('avenca')}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Designação *</Label>
              <Input value={form.designacao} placeholder="Ex.: Gestão de redes sociais 2026"
                     onChange={e => setForm(f => ({ ...f, designacao: e.target.value }))} />
            </div>
            {eLabs && (
              <div>
                <Label>Núcleo</Label>
                <Select value={form.nucleoId ?? 'sem'}
                        onValueChange={v => setForm(f => ({ ...f, nucleoId: v === 'sem' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Escolher núcleo" /></SelectTrigger>
                  <SelectContent>
                    {nucleos.map(n => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}
                    <SelectItem value="sem">Sem núcleo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Cliente</Label>
              <Select value={form.clienteId ?? ''} onValueChange={v => {
                const c = clientes.find(x => x.id === v);
                setForm(f => ({ ...f, clienteId: v, clienteNome: c?.nome ?? '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Escolher cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor por período *</Label>
                <Input type="number" step="0.01" value={form.valorMensal || ''}
                       onChange={e => setForm(f => ({ ...f, valorMensal: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Horas contratadas / período</Label>
                <Input type="number" step="0.5" value={form.horasContratadas ?? ''}
                       onChange={e => setForm(f => ({ ...f, horasContratadas: e.target.value ? Number(e.target.value) : null }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Periodicidade</Label>
                <Select value={form.periodicidade}
                        onValueChange={v => setForm(f => ({ ...f, periodicidade: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Início *</Label>
                <Input type="date" value={form.dataInicio}
                       onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
              </div>
              <div>
                <Label>Duração (meses)</Label>
                <Input type="number" value={form.mesesDuracao ?? ''}
                       onChange={e => setForm(f => ({ ...f, mesesDuracao: e.target.value ? Number(e.target.value) : null }))} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes}
                        onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={submeter} disabled={!form.designacao.trim() || !form.valorMensal || guardar.isPending}>
              {guardar.isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
