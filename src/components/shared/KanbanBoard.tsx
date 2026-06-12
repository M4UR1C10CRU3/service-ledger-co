import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KanbanColumnDef {
  key: string;
  label: string;
  color: string;       // hex color for the column dot indicator
  locked?: boolean;    // prevent dropping INTO this column via drag
}

export interface KanbanBoardProps<TItem extends { id: string }> {
  columns: KanbanColumnDef[];
  items: TItem[];
  getColumnKey: (item: TItem) => string;
  renderCard: (item: TItem) => React.ReactNode;
  onMove: (itemId: string, toColumnKey: string) => Promise<void>;
  /** Optional title shown above columns — use for swim-lane labelling */
  laneTitle?: string;
  /** Colour strip shown on the left of the lane title bar */
  laneTitleColor?: string;
  emptyMessage?: string;
  columnWidth?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KanbanBoard<TItem extends { id: string }>({
  columns,
  items,
  getColumnKey,
  renderCard,
  onMove,
  laneTitle,
  laneTitleColor = '#6366f1',
  emptyMessage = 'Sem itens',
  columnWidth = 280,
}: KanbanBoardProps<TItem>) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const handleDrop = async (colKey: string) => {
    setDragOverCol(null);
    if (!dragId) return;
    const item = items.find(i => i.id === dragId);
    if (!item || getColumnKey(item) === colKey) { setDragId(null); return; }
    const col = columns.find(c => c.key === colKey);
    if (col?.locked) { setDragId(null); return; }
    await onMove(dragId, colKey);
    setDragId(null);
  };

  return (
    <div className="space-y-2">
      {laneTitle && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ borderLeft: `4px solid ${laneTitleColor}`, background: `${laneTitleColor}12` }}
        >
          <span className="text-sm font-bold" style={{ color: laneTitleColor }}>{laneTitle}</span>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {columns.map(col => {
          const colItems = items.filter(i => getColumnKey(i) === col.key);
          const isOver = dragOverCol === col.key;

          return (
            <div
              key={col.key}
              style={{ width: columnWidth, flexShrink: 0 }}
              className={`rounded-xl border flex flex-col transition-colors ${
                isOver && !col.locked
                  ? 'bg-muted/60 border-primary/40'
                  : 'bg-muted/30'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(col.key)}
            >
              {/* Column header */}
              <div className="p-3 border-b flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                <span className="text-sm font-semibold truncate flex-1">{col.label}</span>
                <Badge variant="secondary" className="text-xs ml-auto">{colItems.length}</Badge>
              </div>

              {/* Cards */}
              <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[60vh]">
                {colItems.map(item => (
                  <div
                    key={item.id}
                    draggable={!col.locked}
                    onDragStart={() => setDragId(item.id)}
                    onDragEnd={() => { setDragId(null); setDragOverCol(null); }}
                    className={`transition-opacity ${dragId === item.id ? 'opacity-50' : 'opacity-100'}`}
                  >
                    {renderCard(item)}
                  </div>
                ))}

                {colItems.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">{emptyMessage}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
