import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketing } from '@/hooks/useMarketing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Calendar, TrendingUp, Megaphone } from 'lucide-react';
import { STATUS_CONFIG, CANAL_CONFIG, parseCanais, type MarketingTarefa } from '@/types/marketing';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function getPubDate(t: MarketingTarefa): string | null {
  return t.dataPublicacao || t.dataPrevista || null;
}

function parseLocal(d: string): Date {
  return new Date(d + 'T00:00:00');
}

export function MarketingEditorialSection() {
  const navigate = useNavigate();
  const { tarefas, isLoading } = useMarketing();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const stats = useMemo(() => {
    const inMonth = tarefas.filter(t => {
      const d = getPubDate(t);
      if (!d) return false;
      const date = parseLocal(d);
      return date.getFullYear() === year && date.getMonth() === month;
    });

    const publicados = inMonth.filter(t => t.status === 'publicado').length;
    const planeados = inMonth.length;
    const pct = planeados > 0 ? Math.round((publicados / planeados) * 100) : 0;

    // Cadência semanal — agrupar por semana ISO do mês (semana 1 = primeira semana com dia 1)
    const semanas: { semana: number; count: number; label: string }[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    // Bucketize por semana do mês (1-5)
    const buckets: Record<number, number> = {};
    for (let d = 1; d <= totalDays; d++) {
      buckets[Math.ceil(d / 7)] = 0;
    }
    inMonth
      .filter(t => t.status === 'publicado')
      .forEach(t => {
        const date = parseLocal(getPubDate(t)!);
        const w = Math.ceil(date.getDate() / 7);
        buckets[w] = (buckets[w] || 0) + 1;
      });
    Object.entries(buckets).forEach(([k, v]) => {
      semanas.push({ semana: Number(k), count: v, label: `S${k}` });
    });

    // Atrasados — data no passado mas não publicado/arquivado
    const atrasados = tarefas.filter(t => {
      if (t.status === 'publicado' || t.status === 'arquivado') return false;
      const d = getPubDate(t);
      if (!d) return false;
      return d < todayStr;
    });

    // Estado resumido
    const porEstado: Record<string, number> = {};
    tarefas.forEach(t => {
      if (t.arquivado) return;
      porEstado[t.status] = (porEstado[t.status] || 0) + 1;
    });

    // Próximas 5 publicações agendadas
    const proximas = tarefas
      .filter(t => {
        if (t.status === 'publicado' || t.status === 'arquivado') return false;
        const d = getPubDate(t);
        return d && d >= todayStr;
      })
      .sort((a, b) => {
        const da = getPubDate(a)!;
        const db = getPubDate(b)!;
        if (da === db) return (a.horaPublicacao || '').localeCompare(b.horaPublicacao || '');
        return da.localeCompare(db);
      })
      .slice(0, 5);

    return { publicados, planeados, pct, semanas, atrasados, porEstado, proximas };
  }, [tarefas, todayStr, year, month]);

  const progressColor =
    stats.pct >= 80 ? 'bg-green-500'
    : stats.pct >= 50 ? 'bg-yellow-500'
    : 'bg-red-500';

  const progressTextColor =
    stats.pct >= 80 ? 'text-green-600'
    : stats.pct >= 50 ? 'text-yellow-600'
    : 'text-red-600';

  const maxBar = Math.max(4, ...stats.semanas.map(s => s.count));

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">📣 Marketing Editorial</h2>
        <Card><CardContent className="p-6 text-sm text-muted-foreground">A carregar…</CardContent></Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> Marketing Editorial
        </h2>
        <Button variant="ghost" size="sm" onClick={() => navigate('/marketing')}>
          Ver módulo →
        </Button>
      </div>

      {/* Alerta de atrasados */}
      {stats.atrasados.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>{stats.atrasados.length}</strong> post{stats.atrasados.length > 1 ? 's' : ''} passaram a data de publicação sem ser{stats.atrasados.length > 1 ? 'em' : ''} marcados como publicados
            </p>
          </div>
          <Button size="sm" variant="ghost" className="text-amber-700 hover:bg-amber-100"
            onClick={() => navigate('/marketing')}
          >
            Ver posts →
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progresso mensal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Progresso de {MESES[month]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{stats.publicados}</span> publicados / <span className="font-semibold text-foreground">{stats.planeados}</span> planeados
                </p>
                <p className={`text-2xl font-bold ${progressTextColor}`}>{stats.pct}%</p>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${progressColor} transition-all`}
                  style={{ width: `${Math.min(100, stats.pct)}%` }}
                />
              </div>
            </div>

            {/* Cadência semanal */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Cadência semanal (meta: 4 posts/semana)</p>
              <div className="relative h-28 flex items-end gap-3 px-2 pt-2">
                {/* Linha de meta */}
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-primary/40 z-0"
                  style={{ bottom: `${(4 / maxBar) * 100}%` }}
                />
                {stats.semanas.map(s => {
                  const h = (s.count / maxBar) * 100;
                  const color = s.count >= 4 ? 'bg-green-500' : s.count > 0 ? 'bg-yellow-500' : 'bg-muted-foreground/30';
                  return (
                    <div key={s.semana} className="flex-1 flex flex-col items-center gap-1 z-10 h-full justify-end">
                      <span className="text-xs font-medium">{s.count}</span>
                      <div className={`w-full ${color} rounded-t transition-all`} style={{ height: `${h}%` }} />
                      <span className="text-[10px] text-muted-foreground">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estado resumido + próximas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Pipeline Editorial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estado resumido compacto */}
            <div className="grid grid-cols-3 gap-2">
              {(['ideias','em_producao','em_revisao','em_aprovacao','agendado','publicado'] as const).map(s => {
                const cfg = STATUS_CONFIG[s];
                const count = stats.porEstado[s] || 0;
                return (
                  <button
                    key={s}
                    onClick={() => navigate('/marketing')}
                    className="rounded-md border bg-card hover:bg-accent transition px-2 py-2 text-left"
                  >
                    <div className="text-xs text-muted-foreground truncate">{cfg.label}</div>
                    <div className="text-lg font-bold" style={{ color: cfg.color }}>{count}</div>
                  </button>
                );
              })}
            </div>

            {/* Próximas publicações */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Próximas publicações</p>
              {stats.proximas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem publicações agendadas</p>
              ) : (
                <div className="space-y-2">
                  {stats.proximas.map(t => {
                    const d = getPubDate(t)!;
                    const cfg = STATUS_CONFIG[t.status];
                    const canais = parseCanais(t.canal);
                    return (
                      <button
                        key={t.id}
                        onClick={() => navigate('/marketing')}
                        className="w-full flex items-center gap-3 rounded-md border bg-card hover:bg-accent transition px-3 py-2 text-left"
                      >
                        <div className="text-xs text-muted-foreground shrink-0 w-20">
                          <div className="font-medium text-foreground">{parseLocal(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</div>
                          {t.horaPublicacao && <div>{t.horaPublicacao.slice(0,5)}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{t.titulo}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{canais.map(c => CANAL_CONFIG[c]?.icon).join(' ') || '—'}</span>
                          </div>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium shrink-0"
                          style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
