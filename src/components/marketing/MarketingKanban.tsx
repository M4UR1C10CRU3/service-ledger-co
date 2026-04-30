import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, Calendar } from 'lucide-react';
import {
  STATUS_ORDER,
  STATUS_CONFIG,
  PRIORIDADE_CONFIG,
  TIPO_CONTEUDO_CONFIG,
  CANAL_CONFIG,
  type MarketingTarefa,
  type MarketingStatus,
} from '@/types/marketing';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/utils';

interface Props {
  tarefas: MarketingTarefa[];
  onUpdateStatus: (id: string, status: MarketingStatus) => Promise<boolean>;
  onView: (t: MarketingTarefa) => void;
  onEdit: (t: MarketingTarefa) => void;
  onDelete: (t: MarketingTarefa) => void;
  onAddInColumn: (status: MarketingStatus) => void;
}

export function MarketingKanban({ tarefas, onUpdateStatus, onView, onEdit, onDelete, onAddInColumn }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);

  const handleDrop = async (status: MarketingStatus) => {
    if (!dragId) return;
    await onUpdateStatus(dragId, status);
    setDragId(null);
  };

  const fmtDate = (s: string | null) => {
    if (!s) return null;
    try {
      return format(parseLocalDate(s) || new Date(s), 'dd/MM', { locale: pt });
    } catch {
      return s;
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
      {STATUS_ORDER.map(status => {
        const cfg = STATUS_CONFIG[status];
        const items = tarefas.filter(t => t.status === status);
        return (
          <div
            key={status}
            className="flex-shrink-0 w-[290px] rounded-xl border bg-muted/30 flex flex-col"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(status)}
          >
            <div className="p-3 border-b flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-sm font-semibold">{cfg.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 ml-1"
                onClick={() => onAddInColumn(status)}
                title="Adicionar nesta coluna"
              >
                <span className="text-base leading-none">+</span>
              </Button>
            </div>
            <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[65vh]">
              {items.map(t => {
                const prio = PRIORIDADE_CONFIG[t.prioridade];
                const tipoLabel = t.tipoConteudo ? TIPO_CONTEUDO_CONFIG[t.tipoConteudo] : null;
                const canalLabel = t.canal ? CANAL_CONFIG[t.canal] : null;
                return (
                  <Card
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-l-4"
                    style={{ borderLeftColor: prio.color }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">{t.titulo}</p>
                      <Badge className={`${prio.badgeClass} text-[10px] shrink-0 px-1.5 py-0`}>{prio.label}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {tipoLabel && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                          {tipoLabel.icon} {tipoLabel.label}
                        </span>
                      )}
                      {canalLabel && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                          {canalLabel.icon} {canalLabel.label}
                        </span>
                      )}
                    </div>

                    {t.responsavelNome && (
                      <p className="text-[11px] text-muted-foreground mt-2 truncate">
                        👤 {t.responsavelNome}
                      </p>
                    )}

                    {(t.dataPrevista || t.dataPublicacao) && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {t.dataPublicacao
                          ? <span>Publica: {fmtDate(t.dataPublicacao)}</span>
                          : <span>Previsto: {fmtDate(t.dataPrevista)}</span>}
                      </div>
                    )}

                    <div className="flex gap-1 mt-2 border-t pt-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onView(t)} title="Ver detalhes">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(t)} title="Editar">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto text-destructive hover:text-destructive"
                        onClick={() => onDelete(t)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Sem tarefas</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
