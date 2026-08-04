import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useProjetos } from '@/hooks/useProjetos';
import { useClientes } from '@/hooks/useClientes';
import { useAgencyPais } from '@/hooks/useAgencyPais';
import { PROJETO_ESTADOS, emptyProjetoForm, type ProjetoFormData, type ProjetoEstado } from '@/types/agency';
import { FolderKanban, Plus, Search, Archive, Clock, Euro, TrendingUp } from 'lucide-react';

export default function Projetos() {
  const navigate = useNavigate();
  const { projetos, isLoading, criar, atualizar } = useProjetos();
  const { clientes } = useClientes();
  const { eur, isLoading: loadingPais } = useAgencyPais();

  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjetoFormData>({ ...emptyProjetoForm });

  const filtrados = useMemo(() => projetos.filter(p => {
    if (estadoFiltro !== 'todos' && p.estado !== estadoFiltro) return false;
    if (search) {
      const q = search.toLowerCase();
      const alvo = `${p.numero} ${p.nome} ${p.clienteNome ?? ''}`.toLowerCase();
      if (!alvo.includes(q)) return false;
    }
    return true;
  }), [projetos, search, estadoFiltro]);

  const kpis = useMemo(() => ({
    ativos: projetos.filter(p => p.estado === 'ativo').length,
    horas: projetos.reduce((s, p) => s + p.horasApontadas, 0),
    custo: projetos.reduce((s, p) => s + p.custoReal, 0),
    budget: projetos.reduce((s, p) => s + (p.budget ?? 0), 0),
  }), [projetos]);

  const abrirNovo = () => {
    setEditandoId(null);
    setForm({ ...emptyProjetoForm });
    setAberto(true);
  };

  const abrirEdicao = (id: string) => {
    const p = projetos.find(x => x.id === id);
    if (!p) return;
    setEditandoId(id);
    setForm({
      nome: p.nome,
      clienteId: p.clienteId,
      clienteNome: p.clienteNome ?? '',
      responsavelId: p.responsavelId,
      responsavelNome: p.responsavelNome ?? '',
      estado: p.estado,
      descricao: p.descricao ?? '',
      prazoDesejado: p.prazoDesejado ?? '',
      prazoEstimado: p.prazoEstimado ?? '',
      budget: p.budget,
      horasPrevistas: p.horasPrevistas,
    });
    setAberto(true);
  };

  const guardar = async () => {
    if (!form.nome.trim()) return;
    if (editandoId) await atualizar.mutateAsync({ id: editandoId, form });
    else await criar.mutateAsync(form);
    setAberto(false);
  };

  const escolherCliente = (id: string) => {
    const c = clientes.find(x => x.id === id);
    setForm(f => ({ ...f, clienteId: id, clienteNome: c?.nome ?? '' }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Projetos</h1>
            <p className="text-sm text-muted-foreground">
              O centro do trabalho da agência — cada projeto agrega jobs, horas e custo
            </p>
          </div>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" /> Novo Projeto</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Projetos ativos</p>
          <p className="text-2xl font-bold">{kpis.ativos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Horas apontadas</p>
          <p className="text-2xl font-bold tabular-nums">{kpis.horas.toFixed(1)}h</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Euro className="h-3 w-3" /> Custo real</p>
          <p className="text-2xl font-bold tabular-nums">{eur(kpis.custo)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Budget total</p>
          <p className="text-2xl font-bold tabular-nums">{eur(kpis.budget)}</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Procurar por nº, nome ou cliente..."
                 value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os estados</SelectItem>
            {Object.entries(PROJETO_ESTADOS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading || loadingPais ? (
            <p className="text-center py-12 text-muted-foreground">A carregar...</p>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-16">
              <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                {projetos.length === 0 ? 'Ainda não há projetos.' : 'Nenhum projeto corresponde ao filtro.'}
              </p>
              {projetos.length === 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={abrirNovo}>
                  <Plus className="h-4 w-4 mr-2" /> Criar o primeiro projeto
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">Nº</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[150px]">Jobs</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map(p => {
                    const pct = p.totalJobs > 0 ? Math.round((p.jobsConcluidos / p.totalJobs) * 100) : 0;
                    const estouro = p.budget != null && p.custoReal > p.budget;
                    return (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40"
                                onClick={() => navigate(`/agency/projetos/${p.id}`)}>
                        <TableCell className="font-mono text-sm text-muted-foreground">{p.numero}</TableCell>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="text-sm">{p.clienteNome || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={PROJETO_ESTADOS[p.estado].cor}>
                            {PROJETO_ESTADOS[p.estado].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.totalJobs === 0 ? (
                            <span className="text-xs text-muted-foreground">sem jobs</span>
                          ) : (
                            <div className="space-y-1">
                              <Progress value={pct} className="h-1.5" />
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {p.jobsConcluidos}/{p.totalJobs}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {p.horasApontadas.toFixed(1)}h
                          {p.horasPrevistas ? (
                            <span className="text-muted-foreground"> / {p.horasPrevistas}h</span>
                          ) : null}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums text-sm ${estouro ? 'text-red-600 font-semibold' : ''}`}>
                          {eur(p.custoReal)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {p.budget != null ? eur(p.budget) : '—'}
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

      {/* Diálogo criar/editar */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editandoId ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do projeto *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                     placeholder="Ex.: Campanha de Natal 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <Select value={form.clienteId ?? ''} onValueChange={escolherCliente}>
                  <SelectTrigger><SelectValue placeholder="Escolher cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v as ProjetoEstado }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJETO_ESTADOS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição / briefing inicial</Label>
              <Textarea rows={3} value={form.descricao}
                        onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prazo desejado pelo cliente</Label>
                <Input type="date" value={form.prazoDesejado}
                       onChange={e => setForm(f => ({ ...f, prazoDesejado: e.target.value }))} />
              </div>
              <div>
                <Label>Prazo estimado internamente</Label>
                <Input type="date" value={form.prazoEstimado}
                       onChange={e => setForm(f => ({ ...f, prazoEstimado: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Budget</Label>
                <Input type="number" step="0.01" value={form.budget ?? ''}
                       onChange={e => setForm(f => ({ ...f, budget: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div>
                <Label>Horas previstas</Label>
                <Input type="number" step="0.5" value={form.horasPrevistas ?? ''}
                       onChange={e => setForm(f => ({ ...f, horasPrevistas: e.target.value ? Number(e.target.value) : null }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.nome.trim() || criar.isPending || atualizar.isPending}>
              {criar.isPending || atualizar.isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
