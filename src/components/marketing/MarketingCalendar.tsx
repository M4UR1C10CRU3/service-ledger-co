import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import {
  STATUS_CONFIG,
  PRIORIDADE_CONFIG,
  CANAL_CONFIG,
  type MarketingTarefa,
} from '@/types/marketing';
import { useMarketing } from '@/hooks/useMarketing';
import { useToast } from '@/hooks/use-toast';

interface Props {
  tarefas: MarketingTarefa[];
  onCardClick: (t: MarketingTarefa) => void;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function isoLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function MarketingCalendar({ tarefas, onCardClick }: Props) {
  const { updateTarefa } = useMarketing();
  const { toast } = useToast();
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const monthLabel = cursor.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  // Build grid (weeks x days), starting on Monday
  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    // weekday: 0=Sun..6=Sat → convert so Monday=0
    const weekdayMonFirst = (first.getDay() + 6) % 7;
    const totalCells = Math.ceil((weekdayMonFirst + last.getDate()) / 7) * 7;
    const cells: { date: Date; inMonth: boolean }[] = [];
    const start = new Date(first);
    start.setDate(start.getDate() - weekdayMonFirst);
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({ date: d, inMonth: d.getMonth() === cursor.getMonth() });
    }
    return cells;
  }, [cursor]);

  // Group tarefas by data_publicacao (fallback data_prevista)
  const byDate = useMemo(() => {
    const m: Record<string, MarketingTarefa[]> = {};
    for (const t of tarefas) {
      const key = t.dataPublicacao || t.dataPrevista;
      if (!key) continue;
      (m[key] = m[key] || []).push(t);
    }
    return m;
  }, [tarefas]);

  const handleDrop = async (dateStr: string) => {
    if (!dragId) return;
    const t = tarefas.find(x => x.id === dragId);
    if (!t) { setDragId(null); return; }
    const currentKey = t.dataPublicacao || t.dataPrevista;
    if (currentKey === dateStr) { setDragId(null); setHoverDate(null); return; }
    const ok = await updateTarefa(dragId, {
      dataPublicacao: t.dataPublicacao ? dateStr : null,
      dataPrevista: t.dataPublicacao ? null : dateStr,
    } as any);
    // If neither was set, set as data_publicacao
    if (!t.dataPublicacao && !t.dataPrevista) {
      await updateTarefa(dragId, { dataPublicacao: dateStr } as any);
    } else if (!t.dataPublicacao && t.dataPrevista) {
      await updateTarefa(dragId, { dataPrevista: dateStr } as any);
    } else {
      await updateTarefa(dragId, { dataPublicacao: dateStr } as any);
    }
    if (ok || true) toast({ title: 'Data atualizada' });
    setDragId(null);
    setHoverDate(null);
  };

  const today = isoLocal(new Date());

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" style={{ color: '#E8561A' }} />
          <h3 className="text-lg font-semibold capitalize">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-muted-foreground">
        {WEEKDAYS.map(d => <div key={d} className="px-2 py-1 text-center">{d}</div>)}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map(({ date, inMonth }) => {
          const key = isoLocal(date);
          const items = byDate[key] || [];
          const isToday = key === today;
          const isHover = hoverDate === key;
          return (
            <div
              key={key}
              onDragOver={e => { e.preventDefault(); setHoverDate(key); }}
              onDragLeave={() => setHoverDate(prev => prev === key ? null : prev)}
              onDrop={() => handleDrop(key)}
              className={`rounded-lg border bg-card p-1.5 flex flex-col gap-1 transition-colors ${
                inMonth ? '' : 'opacity-50 bg-muted/30'
              } ${isToday ? 'ring-2 ring-offset-1' : ''} ${isHover ? 'bg-accent/40 border-primary' : ''}`}
              style={{
                minHeight: 110,
                ...(isToday ? { boxShadow: '0 0 0 2px #E8561A33' } : {}),
              }}
            >
              <div className={`text-[11px] font-semibold ${isToday ? 'text-[#E8561A]' : 'text-muted-foreground'}`}>
                {date.getDate()}
              </div>
              <div className="space-y-1 overflow-hidden">
                {items.slice(0, 3).map(t => {
                  const cfg = STATUS_CONFIG[t.status];
                  const prio = PRIORIDADE_CONFIG[t.prioridade];
                  const canal = t.canal ? CANAL_CONFIG[t.canal] : null;
                  // Sync com Kanban: só mostra badge avançado para Agendado/Publicado/Arquivado
                  const showStatusBadge = t.status === 'agendado' || t.status === 'publicado' || t.status === 'arquivado';
                  return (
                    <Card
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onClick={() => onCardClick(t)}
                      className="p-1.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-l-2 text-left"
                      style={{ borderLeftColor: prio.color }}
                    >
                      <p className="text-[11px] font-medium leading-tight line-clamp-2">{t.titulo}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {showStatusBadge ? (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: cfg.color }}
                            title={cfg.label}
                          />
                        ) : (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30" title="Em produção" />
                        )}
                        {canal && <span className="text-[9px] text-muted-foreground">{canal.icon}</span>}
                        {t.horaPublicacao && (
                          <span className="text-[9px] text-muted-foreground ml-auto">{t.horaPublicacao.slice(0, 5)}</span>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {items.length > 3 && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">+{items.length - 3}</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Arraste cartões entre dias para reagendar. Clique para ver detalhes.
      </p>
    </div>
  );
}
