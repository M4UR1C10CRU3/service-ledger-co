import { useState, useEffect, useCallback } from 'react';
import { formatDateToISO } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

interface AlertAccount {
  id: string;
  supplierName: string;
  descricao: string | null;
  valorLiquido: number;
  dataVencimento: string;
  status: string;
  daysUntilDue: number; // negative = overdue
}

const fmt = (v: number) =>
  v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

const formatDatePT = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export function NotificationBell() {
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertAccount[]>([]);
  const [open, setOpen] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!empresa?.id) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDateToISO(today);

    // Get accounts due within 2 days or already overdue
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const limitStr = formatDateToISO(twoDaysFromNow);

    const { data, error } = await supabase
      .from('accounts_payable')
      .select('id, descricao, valor_liquido, data_vencimento, status, supplier_id, suppliers(razao_social)')
      .eq('empresa_id', empresa.id)
      .in('status', ['pendente', 'parcial', 'vencido'])
      .not('data_vencimento', 'is', null)
      .lte('data_vencimento', limitStr)
      .order('data_vencimento', { ascending: true });

    if (error || !data) return;

    const mapped: AlertAccount[] = data.map((row: any) => {
      const dueDate = new Date(row.data_vencimento);
      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: row.id,
        supplierName: row.suppliers?.razao_social || 'Fornecedor desconhecido',
        descricao: row.descricao,
        valorLiquido: Number(row.valor_liquido) || 0,
        dataVencimento: row.data_vencimento,
        status: row.status,
        daysUntilDue,
      };
    });

    setAlerts(mapped);
  }, [empresa?.id]);

  useEffect(() => {
    fetchAlerts();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const overdueAlerts = alerts.filter(a => a.daysUntilDue < 0);
  const nearDueAlerts = alerts.filter(a => a.daysUntilDue >= 0);
  const totalAlerts = alerts.length;

  const handleViewAll = () => {
    setOpen(false);
    navigate('/despesas?filter=critico');
  };

  const handleClickAlert = (alert: AlertAccount) => {
    setOpen(false);
    navigate('/despesas?filter=critico');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {totalAlerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground min-w-[18px] h-[18px] px-1">
              {totalAlerts}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Notificações</span>
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {totalAlerts}
              </Badge>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          {totalAlerts === 0 ? (
            <div className="py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação pendente</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Todas as contas estão em dia ✓</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Overdue section */}
              {overdueAlerts.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-destructive/5">
                    <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3" />
                      Vencidas ({overdueAlerts.length})
                    </p>
                  </div>
                  {overdueAlerts.map(alert => (
                    <button
                      key={alert.id}
                      onClick={() => handleClickAlert(alert)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{alert.supplierName}</p>
                          {alert.descricao && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{alert.descricao}</p>
                          )}
                          <p className="text-xs text-destructive mt-1">
                            🔴 Vencida há {Math.abs(alert.daysUntilDue)} dia{Math.abs(alert.daysUntilDue) !== 1 ? 's' : ''} — {formatDatePT(alert.dataVencimento)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-destructive whitespace-nowrap">
                          {fmt(alert.valorLiquido)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Near due section */}
              {nearDueAlerts.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-amber-500/5">
                    <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Próximas do vencimento ({nearDueAlerts.length})
                    </p>
                  </div>
                  {nearDueAlerts.map(alert => (
                    <button
                      key={alert.id}
                      onClick={() => handleClickAlert(alert)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{alert.supplierName}</p>
                          {alert.descricao && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{alert.descricao}</p>
                          )}
                          <p className="text-xs text-amber-600 mt-1">
                            🟡 {alert.daysUntilDue === 0 ? 'Vence hoje' : `Vence em ${alert.daysUntilDue} dia${alert.daysUntilDue !== 1 ? 's' : ''}`} — {formatDatePT(alert.dataVencimento)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-amber-600 whitespace-nowrap">
                          {fmt(alert.valorLiquido)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {totalAlerts > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs text-primary hover:text-primary"
              onClick={handleViewAll}
            >
              Ver todas as contas críticas
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
