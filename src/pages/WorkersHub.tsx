import { useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw,
  ExternalLink, XCircle, AlertCircle, Info, Bot, Zap,
  ChevronRight, CircleDot, Check,
} from 'lucide-react';
import { useWorkersHub } from '@/hooks/useWorkersHub';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Worker, WorkerExecucao, WorkerAlerta } from '@/types/workers';

// ── Helpers ────────────────────────────────────────────────────────────────────

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatarDuracao(ms: number | null): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WorkerExecucao['status'] | 'sem_dados' }) {
  const map = {
    ok:       { label: 'OK',       class: 'bg-green-500/15 text-green-400 border-green-500/30', icon: CheckCircle2 },
    aviso:    { label: 'Aviso',    class: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: AlertCircle },
    erro:     { label: 'Erro',     class: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
    a_correr: { label: 'A correr', class: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: CircleDot },
    sem_dados:{ label: 'Sem dados',class: 'bg-muted/50 text-muted-foreground border-muted', icon: Clock },
  };
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.class}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ── Severidade icon ────────────────────────────────────────────────────────────

function SeveridadeIcon({ sev }: { sev: WorkerAlerta['severidade'] }) {
  if (sev === 'critico')     return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
  if (sev === 'moderado')    return <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0" />;
  return <Info className="h-4 w-4 text-blue-400 shrink-0" />;
}

// ── Worker Detail Dialog ───────────────────────────────────────────────────────

interface WorkerDetailProps {
  worker: Worker;
  execucoes: WorkerExecucao[];
  alertas: WorkerAlerta[];
  onClose: () => void;
  onResolverAlerta: (id: string) => void;
}

function WorkerDetail({ worker, execucoes, alertas, onClose, onResolverAlerta }: WorkerDetailProps) {
  const ultimaExec = execucoes[0];
  const n8nUrl = `http://185.166.39.17:5678/workflow/${worker.workflow_id}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">{worker.nome}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{worker.descricao}</p>
              </div>
            </div>
            {worker.workflow_id && (
              <a href={n8nUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2 shrink-0">
                  <Zap className="h-3.5 w-3.5" />
                  Abrir no n8n
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            )}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {worker.schedule ?? 'Sem agendamento'}
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              {worker.plataforma.toUpperCase()}
            </span>
            {ultimaExec && (
              <StatusBadge status={ultimaExec.status} />
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="execucoes" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="execucoes">
              Execuções ({execucoes.length})
            </TabsTrigger>
            <TabsTrigger value="alertas">
              Alertas {alertas.length > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                  {alertas.length}
                </span>
              )}
            </TabsTrigger>
            {ultimaExec?.dados && Object.keys(ultimaExec.dados).length > 0 && (
              <TabsTrigger value="dados">Dados</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="execucoes" className="flex-1 min-h-0 mt-0 px-6 pb-6">
            <ScrollArea className="h-[400px] mt-4">
              {execucoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Sem execuções registadas.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    O histórico aparece aqui após o worker correr.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {execucoes.map(exec => (
                    <div
                      key={exec.id}
                      className="rounded-xl border border-border bg-card p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={exec.status} />
                          <span className="text-xs text-muted-foreground">
                            {formatarData(exec.iniciado_em)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {exec.duracao_ms != null && (
                            <span>{formatarDuracao(exec.duracao_ms)}</span>
                          )}
                          {exec.alertas_gerados > 0 && (
                            <span className="flex items-center gap-1 text-yellow-400">
                              <AlertTriangle className="h-3 w-3" />
                              {exec.alertas_gerados} alertas
                            </span>
                          )}
                        </div>
                      </div>
                      {exec.resumo && (
                        <p className="text-sm text-foreground/80">{exec.resumo}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="alertas" className="flex-1 min-h-0 mt-0 px-6 pb-6">
            <ScrollArea className="h-[400px] mt-4">
              {alertas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-400/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Sem alertas activos.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alertas.map(alerta => (
                    <div
                      key={alerta.id}
                      className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                    >
                      <SeveridadeIcon sev={alerta.severidade} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{alerta.mensagem}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tempoRelativo(alerta.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 shrink-0"
                        onClick={() => onResolverAlerta(alerta.id)}
                      >
                        <Check className="h-3 w-3" />
                        Resolver
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="dados" className="flex-1 min-h-0 mt-0 px-6 pb-6">
            <ScrollArea className="h-[400px] mt-4">
              {ultimaExec?.dados ? (
                <pre className="text-xs bg-muted/40 rounded-xl p-4 overflow-auto font-mono leading-relaxed">
                  {JSON.stringify(ultimaExec.dados, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground mt-4">Sem dados.</p>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Worker Card ────────────────────────────────────────────────────────────────

interface WorkerCardProps {
  worker: Worker;
  ultimaExec: WorkerExecucao | undefined;
  numAlertas: number;
  onClick: () => void;
}

function WorkerCard({ worker, ultimaExec, numAlertas, onClick }: WorkerCardProps) {
  const status = ultimaExec?.status ?? 'sem_dados';

  const borderColor = {
    ok:        'border-green-500/20',
    aviso:     'border-yellow-500/30',
    erro:      'border-red-500/30',
    a_correr:  'border-blue-500/30',
    sem_dados: 'border-border',
  }[status];

  return (
    <Card
      className={`cursor-pointer border ${borderColor} hover:border-primary/40 transition-all duration-200 hover:shadow-md hover:shadow-primary/5`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4.5 w-4.5 text-primary" style={{ height: '1.125rem', width: '1.125rem' }} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{worker.nome}</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                {worker.plataforma} · {worker.schedule ?? '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {numAlertas > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5">
                <AlertTriangle className="h-3 w-3" />
                {numAlertas}
              </span>
            )}
            <StatusBadge status={status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {ultimaExec ? (
          <div className="space-y-1">
            <p className="text-sm text-foreground/70 leading-snug line-clamp-2">
              {ultimaExec.resumo ?? 'Execução sem resumo.'}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {tempoRelativo(ultimaExec.iniciado_em)}
              {ultimaExec.duracao_ms != null && (
                <span>· {formatarDuracao(ultimaExec.duracao_ms)}</span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">
            Aguarda primeira execução.
          </p>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
            {worker.empresa_ids?.map(e => (
              <Badge key={e} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{e}</Badge>
            ))}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Detalhes <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function WorkersHub() {
  const {
    workers, alertas, isLoading,
    resolverAlerta, getUltimaExecucao, getExecucoesWorker, getAlertasWorker,
    totalCriticos, totalModerados, workersOk, refresh,
  } = useWorkersHub();

  const [workerSelecionado, setWorkerSelecionado] = useState<Worker | null>(null);

  const alertasCriticos = alertas.filter(a => a.severidade === 'critico');

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-primary" />
            Workers Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitorização em tempo real dos workers de automação
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'A carregar...' : 'Atualizar'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Workers</p>
            <p className="text-2xl font-bold mt-1">{workers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">OK hoje</p>
            <p className="text-2xl font-bold mt-1 text-green-400">{workersOk}</p>
          </CardContent>
        </Card>
        <Card className={totalCriticos > 0 ? 'border-red-500/30' : 'border-border'}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Críticos</p>
            <p className={`text-2xl font-bold mt-1 ${totalCriticos > 0 ? 'text-red-400' : ''}`}>
              {totalCriticos}
            </p>
          </CardContent>
        </Card>
        <Card className={totalModerados > 0 ? 'border-yellow-500/20' : 'border-border'}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avisos</p>
            <p className={`text-2xl font-bold mt-1 ${totalModerados > 0 ? 'text-yellow-400' : ''}`}>
              {totalModerados}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Banner alertas críticos */}
      {alertasCriticos.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
            <XCircle className="h-4 w-4" />
            {alertasCriticos.length} alerta{alertasCriticos.length > 1 ? 's' : ''} crítico{alertasCriticos.length > 1 ? 's' : ''}
          </div>
          {alertasCriticos.slice(0, 3).map(a => (
            <div key={a.id} className="flex items-start gap-3 pl-6">
              <p className="text-sm text-red-300/80 flex-1">{a.mensagem}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs shrink-0 text-red-400 hover:text-red-300"
                onClick={() => resolverAlerta(a.id)}
              >
                Resolver
              </Button>
            </div>
          ))}
          {alertasCriticos.length > 3 && (
            <p className="text-xs text-red-400/60 pl-6">
              + {alertasCriticos.length - 3} mais — clique no worker para ver todos.
            </p>
          )}
        </div>
      )}

      {/* Workers Grid */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Workers ({workers.length})
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm text-muted-foreground">Sem workers configurados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workers.map(worker => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                ultimaExec={getUltimaExecucao(worker.id)}
                numAlertas={getAlertasWorker(worker.id).length}
                onClick={() => setWorkerSelecionado(worker)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Todos os alertas activos */}
      {alertas.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Alertas activos ({alertas.length})
          </h2>
          <div className="space-y-2">
            {alertas.map(alerta => {
              const worker = workers.find(w => w.id === alerta.worker_id);
              return (
                <div
                  key={alerta.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <SeveridadeIcon sev={alerta.severidade} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{alerta.mensagem}</span>
                      {worker && (
                        <Badge variant="secondary" className="text-[10px]">{worker.nome}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tempoRelativo(alerta.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 shrink-0"
                    onClick={() => resolverAlerta(alerta.id)}
                  >
                    <Check className="h-3 w-3" />
                    Resolver
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Worker Detail Dialog */}
      {workerSelecionado && (
        <WorkerDetail
          worker={workerSelecionado}
          execucoes={getExecucoesWorker(workerSelecionado.id)}
          alertas={getAlertasWorker(workerSelecionado.id)}
          onClose={() => setWorkerSelecionado(null)}
          onResolverAlerta={resolverAlerta}
        />
      )}
    </div>
  );
}
