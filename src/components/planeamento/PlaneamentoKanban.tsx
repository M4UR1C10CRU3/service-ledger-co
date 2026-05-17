import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/utils';
import {
  PLANEAMENTO_COLUNAS, PRIORIDADE_CONFIG, AREA_COLORS,
  type PlaneamentoCard, type PlaneamentoColuna,
} from '@/types/planeamento';

interface Props {
  cards: PlaneamentoCard[];
  onMove: (id: string, coluna: PlaneamentoColuna) => Promise<boolean>;
  onOpen: (card: PlaneamentoCard) => void;
}

export function PlaneamentoKanban({ cards, onMove, onOpen }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);

  const fmt = (s: string | null) => {
    if (!s) return null;
    try { return format(parseLocalDate(s) || new Date(s), 'dd/MM', { locale: pt }); }
    catch { return s; }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 520 }}>
      {PLANEAMENTO_COLUNAS.map(col => {
        const items = cards.filter(c => c.coluna === col.id);
        return (
          <div
            key={col.id}
            className="flex-shrink-0 w-[280px] rounded-xl border bg-muted/30 flex flex-col"
            onDragOver={e => e.preventDefault()}
            onDrop={async () => { if (dragId) { await onMove(dragId, col.id); setDragId(null); } }}
          >
            <div className="p-3 border-b flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-sm font-semibold">{col.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
            </div>
            <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[68vh]">
              {items.map(c => {
                const prio = PRIORIDADE_CONFIG[c.prioridade];
                return (
                  <Card
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onClick={() => onOpen(c)}
                    className="p-3 cursor-pointer hover:shadow-md transition border-l-4"
                    style={{ borderLeftColor: prio.color }}
                  >
                    <div className="text-sm font-medium line-clamp-2 mb-2">{c.titulo}</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {c.area_negocio && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${AREA_COLORS[c.area_negocio] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {c.area_negocio}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${prio.bg}`}>{prio.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <User className="h-3 w-3" />
                        {c.responsavel_nome || '—'}
                      </span>
                      {c.prazo_estimado && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {fmt(c.prazo_estimado)}
                        </span>
                      )}
                    </div>
                    {c.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">#{t}</span>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
