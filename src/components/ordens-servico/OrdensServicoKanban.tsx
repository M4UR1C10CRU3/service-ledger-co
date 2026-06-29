import { OrdemServico, OS_ESTADOS, OS_ESTADOS_ORDEM, OS_PRIORIDADES } from '@/types/ordemServico';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatEUR = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

const formatDatePT = (iso: string | null | undefined) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

interface Props {
  ordens: OrdemServico[];
  onSelect: (os: OrdemServico) => void;
}

export function OrdensServicoKanban({ ordens, onSelect }: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 pb-4 min-h-[200px]">
        {OS_ESTADOS_ORDEM.map((estado) => {
          const cfg = OS_ESTADOS[estado];
          const cards = ordens.filter((o) => o.estado === estado);
          return (
            <div key={estado} className="min-w-[260px] w-[260px] flex flex-col gap-2">
              {/* Column header */}
              <div
                className={cn(
                  'rounded-lg border px-3 py-2 flex items-center justify-between',
                  cfg.bg,
                  cfg.border,
                )}
              >
                <span className={cn('font-semibold text-sm', cfg.color)}>{cfg.label}</span>
                <Badge variant="outline" className="bg-background">{cards.length}</Badge>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {cards.map((os) => (
                  <Card
                    key={os.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onSelect(os)}
                  >
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-mono">{os.numero}</span>
                        <span className={cn('text-xs font-medium', OS_PRIORIDADES[os.prioridade].color)}>
                          {OS_PRIORIDADES[os.prioridade].label}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate">{os.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate">{os.clienteNome}</p>
                      {os.responsavelNome && (
                        <p className="text-xs text-muted-foreground truncate">
                          Resp: {os.responsavelNome}
                        </p>
                      )}
                      {os.dataPrevista && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Previsto: {formatDatePT(os.dataPrevista)}</span>
                        </div>
                      )}
                      {os.valorEstimado != null && os.valorEstimado > 0 && (
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <Euro className="h-3 w-3" />
                          <span>{formatEUR(os.valorEstimado)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {cards.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 italic">Sem OS</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
