import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBaseVertical } from '@/hooks/useBaseVertical';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { KanbanBoard, type KanbanColumnDef } from '@/components/shared/KanbanBoard';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CAMPOS_LABEL } from '@/hooks/useQuadroProcesso';
import { useProjeto } from '@/hooks/useProjetos';
import { useJobs, useJobEtapas, useJobTarefas } from '@/hooks/useJobs';
import { useApontamentos, useCronometro } from '@/hooks/useApontamentos';
import { useAgencyPais } from '@/hooks/useAgencyPais';
import { PROJETO_ESTADOS, emptyJobForm, formatJobNumero, formatDuracao, type JobFormData, type Job } from '@/types/agency';
import {
  ArrowLeft, Plus, Clock, Play, Square, Trash2, LayoutGrid, ListChecks, Timer, CalendarDays,
} from 'lucide-react';

export default function ProjetoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const base = useBaseVertical();
  const { projeto, isLoading } = useProjeto(id);
  const { etapas, semear } = useJobEtapas();
  const { jobs, criar, moverEtapa, atualizar, eliminar } = useJobs(id);
  const { apontamentos, registar, eliminar: eliminarApont, totalMinutos, custoTotal } = useApontamentos({ projetoId: id });
  const { ativo, iniciar, parar, decorridoSegundos } = useCronometro();
  const { eur } = useAgencyPais();

  const [jobAberto, setJobAberto] = useState(false);
  const [form, setForm] = useState<JobFormData>({ ...emptyJobForm });
  const [jobSelecionado, setJobSelecionado] = useState<Job | null>(null);
  const [horasAberto, setHorasAberto] = useState(false);
  const [horasForm, setHorasForm] = useState({ minutos: 60, descricao: '', jobId: '' });
  const [movimentoBloqueado, setMovimentoBloqueado] = useState<
    { job: string; destino: string; mensagem: string; campos: string[] } | null
  >(null);

  if (isLoading) return <p className="p-6 text-center text-muted-foreground">A carregar...</p>;
  if (!projeto) return <p className="p-6 text-center text-muted-foreground">Projeto não encontrado.</p>;

  const colunas: KanbanColumnDef[] = etapas.map(e => ({ key: e.id, label: e.nome, color: e.cor }));
  const pctBudget = projeto.budget ? Math.min(100, Math.round((projeto.custoReal / projeto.budget) * 100)) : 0;

  const criarJob = async () => {
    if (!form.titulo.trim() || !id) return;
    await criar.mutateAsync({ projeto: id, form: { ...form, etapaId: form.etapaId ?? etapas[0]?.id ?? null } });
    setForm({ ...emptyJobForm });
    setJobAberto(false);
  };

  const pararCronometro = async () => {
    const r = parar();
    if (!r || !id || !ativo) return;
    await registar.mutateAsync({
      projetoId: id, jobId: ativo.jobId, tarefaId: ativo.tarefaId,
      minutos: r.minutos, inicio: r.inicio, fim: r.fim,
      descricao: ativo.rotulo,
    });
  };

  const registarManual = async () => {
    if (!id || horasForm.minutos <= 0) return;
    await registar.mutateAsync({
      projetoId: id,
      jobId: horasForm.jobId || null,
      minutos: horasForm.minutos,
      descricao: horasForm.descricao || undefined,
    });
    setHorasForm({ minutos: 60, descricao: '', jobId: '' });
    setHorasAberto(false);
  };

  const hh = String(Math.floor(decorridoSegundos / 3600)).padStart(2, '0');
  const mm = String(Math.floor((decorridoSegundos % 3600) / 60)).padStart(2, '0');
  const ss = String(decorridoSegundos % 60).padStart(2, '0');

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${base}/projetos`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">#{projeto.numero}</span>
              <h1 className="text-2xl font-bold">{projeto.nome}</h1>
              <Badge variant="outline" className={PROJETO_ESTADOS[projeto.estado].cor}>
                {PROJETO_ESTADOS[projeto.estado].label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {projeto.clienteNome || 'Sem cliente associado'}
              {projeto.prazoEstimado && ` · prazo ${new Date(projeto.prazoEstimado).toLocaleDateString('pt-PT')}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setHorasAberto(true)}>
            <Clock className="h-4 w-4 mr-2" /> Lançar horas
          </Button>
          <Button onClick={() => setJobAberto(true)}><Plus className="h-4 w-4 mr-2" /> Novo Job</Button>
        </div>
      </div>

      {/* Cronómetro em curso */}
      {ativo && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 text-primary animate-pulse" />
              <div>
                <p className="text-sm font-medium">{ativo.rotulo}</p>
                <p className="text-2xl font-bold tabular-nums">{hh}:{mm}:{ss}</p>
              </div>
            </div>
            <Button onClick={pararCronometro} variant="default">
              <Square className="h-4 w-4 mr-2" /> Parar e registar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPIs do projeto */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Jobs</p>
          <p className="text-2xl font-bold tabular-nums">{projeto.jobsConcluidos}/{projeto.totalJobs}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Horas apontadas</p>
          <p className="text-2xl font-bold tabular-nums">{(totalMinutos / 60).toFixed(1)}h</p>
          {projeto.horasPrevistas ? (
            <p className="text-xs text-muted-foreground">de {projeto.horasPrevistas}h previstas</p>
          ) : null}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Custo real</p>
          <p className="text-2xl font-bold tabular-nums">{eur(custoTotal)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Budget</p>
          <p className="text-2xl font-bold tabular-nums">
            {projeto.budget != null ? eur(projeto.budget) : '—'}
          </p>
          {projeto.budget != null && (
            <p className={`text-xs ${pctBudget >= 100 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
              {pctBudget}% consumido
            </p>
          )}
        </CardContent></Card>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs"><LayoutGrid className="h-4 w-4 mr-1" /> Jobs</TabsTrigger>
          <TabsTrigger value="horas"><Clock className="h-4 w-4 mr-1" /> Horas</TabsTrigger>
          <TabsTrigger value="briefing"><ListChecks className="h-4 w-4 mr-1" /> Briefing</TabsTrigger>
        </TabsList>

        {/* JOBS — kanban */}
        <TabsContent value="jobs" className="mt-4">
          {etapas.length === 0 ? (
            <Card><CardContent className="py-12 text-center space-y-3">
              <p className="text-muted-foreground">Esta empresa ainda não tem etapas de trabalho definidas.</p>
              <Button variant="outline" onClick={() => semear.mutate()} disabled={semear.isPending}>
                Criar etapas iniciais (Briefing → Criação → Aprovação → Concluído)
              </Button>
            </CardContent></Card>
          ) : jobs.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Ainda não há jobs neste projeto.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setJobAberto(true)}>
                <Plus className="h-4 w-4 mr-2" /> Criar o primeiro job
              </Button>
            </CardContent></Card>
          ) : (
            <KanbanBoard<Job>
              columns={colunas}
              items={jobs}
              getColumnKey={j => j.etapaId ?? colunas[0]?.key ?? ''}
              onMove={async (jobId, etapaId) => {
                const destino = etapas.find(e => e.id === etapaId);
                if (!destino) return;
                const job = jobs.find(j => j.id === jobId);
                const origem = etapas.find(e => e.id === job?.etapaId);
                const r = await moverEtapa.mutateAsync({
                  id: jobId, etapa: destino, estadoOrigem: origem?.estadoCodigo ?? null,
                }).catch(() => null);
                if (r && !r.ok) {
                  setMovimentoBloqueado({
                    job: job?.titulo ?? 'Este job',
                    destino: destino.nome,
                    mensagem: r.mensagem ?? 'Ainda não pode avançar.',
                    campos: r.campos,
                  });
                }
              }}
              renderCard={j => (
                <Card className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setJobSelecionado(j)}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                        {formatJobNumero(projeto.numero, j.sequencial)}
                      </Badge>
                      {j.prazo && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(j.prazo).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-tight line-clamp-2">{j.titulo}</p>
                    {j.responsavelNome && (
                      <p className="text-xs text-muted-foreground truncate">{j.responsavelNome}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      {j.horasPrevistas ? (
                        <span className="text-xs text-muted-foreground">{j.horasPrevistas}h previstas</span>
                      ) : <span />}
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        title="Iniciar cronómetro"
                        onClick={e => {
                          e.stopPropagation();
                          if (!id) return;
                          iniciar({
                            projetoId: id, jobId: j.id, tarefaId: null,
                            rotulo: `${formatJobNumero(projeto.numero, j.sequencial)} — ${j.titulo}`,
                          });
                        }}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            />
          )}
        </TabsContent>

        {/* HORAS */}
        <TabsContent value="horas" className="mt-4">
          <Card><CardContent className="p-0">
            {apontamentos.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Ainda não há horas registadas neste projeto.</p>
            ) : (
              <div className="divide-y">
                {apontamentos.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.descricao || 'Sem descrição'}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.utilizadorNome} · {new Date(a.data).toLocaleDateString('pt-PT')}
                        {!a.faturavel && ' · não faturável'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold tabular-nums">{formatDuracao(a.minutos)}</span>
                      {a.custoHoraSnap != null && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {eur((a.minutos / 60) * a.custoHoraSnap)}
                        </span>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => eliminarApont.mutate(a.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* BRIEFING */}
        <TabsContent value="briefing" className="mt-4">
          <Card><CardContent className="p-6">
            {projeto.descricao
              ? <p className="text-sm whitespace-pre-wrap">{projeto.descricao}</p>
              : <p className="text-sm text-muted-foreground">Sem briefing registado.</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo: novo job */}
      <Dialog open={jobAberto} onOpenChange={setJobAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Job</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                     placeholder="Ex.: Cartaz A3 para montra" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.descricao}
                        onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Etapa</Label>
                <Select value={form.etapaId ?? etapas[0]?.id ?? ''}
                        onValueChange={v => setForm(f => ({ ...f, etapaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Etapa inicial" /></SelectTrigger>
                  <SelectContent>
                    {etapas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prazo</Label>
                <Input type="date" value={form.prazo}
                       onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Horas previstas</Label>
              <Input type="number" step="0.5" value={form.horasPrevistas ?? ''}
                     onChange={e => setForm(f => ({ ...f, horasPrevistas: e.target.value ? Number(e.target.value) : null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobAberto(false)}>Cancelar</Button>
            <Button onClick={criarJob} disabled={!form.titulo.trim() || criar.isPending}>
              {criar.isPending ? 'A criar...' : 'Criar Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: lançar horas manualmente */}
      <Dialog open={horasAberto} onOpenChange={setHorasAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lançar horas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Job (opcional)</Label>
              <Select value={horasForm.jobId} onValueChange={v => setHorasForm(f => ({ ...f, jobId: v }))}>
                <SelectTrigger><SelectValue placeholder="Horas ao projeto em geral" /></SelectTrigger>
                <SelectContent>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {formatJobNumero(projeto.numero, j.sequencial)} — {j.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Minutos *</Label>
              <Input type="number" min={1} value={horasForm.minutos}
                     onChange={e => setHorasForm(f => ({ ...f, minutos: Number(e.target.value) }))} />
              <p className="text-xs text-muted-foreground mt-1">
                {formatDuracao(horasForm.minutos || 0)}
              </p>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={horasForm.descricao}
                     onChange={e => setHorasForm(f => ({ ...f, descricao: e.target.value }))}
                     placeholder="O que foi feito" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHorasAberto(false)}>Cancelar</Button>
            <Button onClick={registarManual} disabled={horasForm.minutos <= 0 || registar.isPending}>
              {registar.isPending ? 'A registar...' : 'Registar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Painel do job selecionado */}
      <JobPainel
        job={jobSelecionado}
        projetoNumero={projeto.numero}
        onFechar={() => setJobSelecionado(null)}
        onEliminar={async (jid) => { await eliminar.mutateAsync(jid); setJobSelecionado(null); }}
        onIniciarCronometro={(j, tarefaId, rotulo) => {
          if (!id) return;
          iniciar({ projetoId: id, jobId: j.id, tarefaId, rotulo });
        }}
      />

      {/* A etapa de destino recusou o job — igual ao que acontece nos Quadros */}
      <AlertDialog open={!!movimentoBloqueado} onOpenChange={o => !o && setMovimentoBloqueado(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Ainda falta preencher para entrar em "{movimentoBloqueado?.destino}"
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{movimentoBloqueado?.mensagem}</p>
                {!!movimentoBloqueado?.campos.length && (
                  <ul className="space-y-1">
                    {movimentoBloqueado.campos.map(c => (
                      <li key={c} className="flex items-center gap-2 text-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        {CAMPOS_LABEL[c] ?? c}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs">
                  O job ficou onde estava. Abra-o para preencher o que falta.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setMovimentoBloqueado(null)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Painel lateral do job: sub-tarefas ──────────────────────────────────────

function JobPainel({
  job, projetoNumero, onFechar, onEliminar, onIniciarCronometro,
}: {
  job: Job | null;
  projetoNumero: number;
  onFechar: () => void;
  onEliminar: (id: string) => Promise<void>;
  onIniciarCronometro: (j: Job, tarefaId: string | null, rotulo: string) => void;
}) {
  const { tarefas, criar, alternar, eliminar } = useJobTarefas(job?.id);
  const [nova, setNova] = useState('');

  if (!job) return null;
  const numero = formatJobNumero(projetoNumero, job.sequencial);
  const feitas = tarefas.filter(t => t.concluida).length;

  return (
    <Dialog open={!!job} onOpenChange={v => { if (!v) onFechar(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">{numero}</Badge>
            {job.titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {job.descricao && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.descricao}</p>}

          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            {job.responsavelNome && <span>Responsável: {job.responsavelNome}</span>}
            {job.prazo && <span>· Prazo: {new Date(job.prazo).toLocaleDateString('pt-PT')}</span>}
            {job.horasPrevistas ? <span>· {job.horasPrevistas}h previstas</span> : null}
          </div>

          <Button variant="outline" size="sm" className="w-full"
                  onClick={() => onIniciarCronometro(job, null, `${numero} — ${job.titulo}`)}>
            <Play className="h-3.5 w-3.5 mr-2" /> Iniciar cronómetro neste job
          </Button>

          {/* Sub-tarefas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Tarefas {tarefas.length > 0 && `(${feitas}/${tarefas.length})`}
              </Label>
            </div>
            {tarefas.map(t => (
              <div key={t.id} className="flex items-center gap-2 group">
                <Checkbox checked={t.concluida}
                          onCheckedChange={c => alternar.mutate({ id: t.id, concluida: !!c })} />
                <span className={`text-sm flex-1 ${t.concluida ? 'line-through text-muted-foreground' : ''}`}>
                  {t.titulo}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        title="Cronometrar esta tarefa"
                        onClick={() => onIniciarCronometro(job, t.id, `${numero} — ${t.titulo}`)}>
                  <Play className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => eliminar.mutate(t.id)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Nova tarefa..." value={nova} onChange={e => setNova(e.target.value)}
                     onKeyDown={e => {
                       if (e.key === 'Enter' && nova.trim()) { criar.mutate(nova); setNova(''); }
                     }} />
              <Button variant="outline" size="icon"
                      onClick={() => { if (nova.trim()) { criar.mutate(nova); setNova(''); } }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="text-destructive" onClick={() => onEliminar(job.id)}>
            <Trash2 className="h-4 w-4 mr-2" /> Eliminar Job
          </Button>
          <Button variant="outline" onClick={onFechar}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
