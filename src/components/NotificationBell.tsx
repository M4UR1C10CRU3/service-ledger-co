import { useState, useEffect, useCallback } from 'react';
import { formatDateToISO } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, ArrowRight, Phone, Megaphone, CheckCheck, Briefcase, Wrench, CreditCard, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useNotificacoesInternas } from '@/hooks/useNotificacoesInternas';

interface AlertAccount {
  id: string;
  supplierName: string;
  descricao: string | null;
  valorLiquido: number;
  dataVencimento: string;
  status: string;
  daysUntilDue: number;
}

interface FollowupAlert {
  id: string;
  clienteNome: string;
  followupDate: string;
  valorDebito: number | null;
  emailType: string | null;
  minutesUntil: number;
}

interface MarketingApproval {
  id: string;
  titulo: string;
  prazoAprovacao: string | null;
  horaAprovacao: string | null;
  solicitanteNome: string | null;
}

const fmt = (v: number) =>
  v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

const formatDatePT = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const formatDateTimePT = (d: string) => {
  const date = new Date(d);
  return date.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getMeioLabel = (emailType: string | null) => {
  if (!emailType) return 'Contacto';
  if (emailType.includes('whatsapp')) return 'WhatsApp';
  if (emailType.includes('telefone')) return 'Telefone';
  if (emailType.includes('presencial')) return 'Presencial';
  return 'E-mail';
};

// ── Tipo icon/colour map ───────────────────────────────────────────────────────

const NOTIF_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  proposta_aceite:      { icon: <Briefcase className="h-3 w-3" />, color: 'text-green-700',  bg: 'bg-green-500/10' },
  os_criada:            { icon: <Wrench className="h-3 w-3" />,    color: 'text-blue-700',   bg: 'bg-blue-500/10'  },
  pagamento_confirmado: { icon: <CreditCard className="h-3 w-3" />,color: 'text-amber-700',  bg: 'bg-amber-500/10' },
  te_aprovado:          { icon: <CheckCheck className="h-3 w-3" />,color: 'text-purple-700', bg: 'bg-purple-500/10'},
};

const notifMeta = (tipo: string) =>
  NOTIF_META[tipo] ?? { icon: <Info className="h-3 w-3" />, color: 'text-muted-foreground', bg: 'bg-muted/50' };

const fmtRelTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Agora';
  if (m < 60) return `há ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const { notifs, unreadCount, marcarLida, marcarTodasLidas } = useNotificacoesInternas();
  const [alerts, setAlerts] = useState<AlertAccount[]>([]);
  const [followupAlerts, setFollowupAlerts] = useState<FollowupAlert[]>([]);
  const [marketingApprovals, setMarketingApprovals] = useState<MarketingApproval[]>([]);
  const [open, setOpen] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!empresa?.id) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDateToISO(today);

    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const limitStr = formatDateToISO(twoDaysFromNow);

    // Fetch accounts payable alerts
    const { data, error } = await supabase
      .from('accounts_payable')
      .select('id, descricao, valor_liquido, data_vencimento, status, supplier_id, suppliers(razao_social)')
      .eq('empresa_id', empresa.id)
      .in('status', ['pendente', 'parcial', 'vencido'])
      .not('data_vencimento', 'is', null)
      .lte('data_vencimento', limitStr)
      .order('data_vencimento', { ascending: true });

    if (!error && data) {
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
    }

    // Fetch follow-up alerts for debt collection contacts
    const now = new Date();
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const { data: followups, error: fError } = await supabase
      .from('email_history')
      .select('id, cliente_nome, followup_date, valor_debito, email_type')
      .eq('empresa_id', empresa.id)
      .not('followup_date', 'is', null)
      .lte('followup_date', oneDayFromNow.toISOString())
      .order('followup_date', { ascending: true });

    if (!fError && followups) {
      const mapped: FollowupAlert[] = (followups as any[]).map(row => {
        const fDate = new Date(row.followup_date);
        const diffMs = fDate.getTime() - now.getTime();
        const minutesUntil = Math.round(diffMs / 60000);
        return {
          id: row.id,
          clienteNome: row.cliente_nome,
          followupDate: row.followup_date,
          valorDebito: row.valor_debito ? Number(row.valor_debito) : null,
          emailType: row.email_type,
          minutesUntil,
        };
      });
      setFollowupAlerts(mapped);
    }

    // Fetch marketing approval pending for current user
    const { data: authResp } = await supabase.auth.getUser();
    const authId = authResp?.user?.id;
    if (authId) {
      const { data: lu } = await (supabase.from('liberty_utilizadores') as any)
        .select('nome')
        .eq('auth_user_id', authId)
        .eq('eliminado', false)
        .maybeSingle();
      const nome = lu?.nome;
      if (nome) {
        const { data: mkts } = await supabase
          .from('marketing_tarefas')
          .select('id, titulo, prazo_aprovacao, hora_aprovacao, solicitante_nome, status, aprovador_nome, arquivado')
          .eq('empresa_id', empresa.id)
          .in('status', ['em_revisao', 'em_aprovacao'])
          .eq('aprovador_nome', nome)
          .eq('arquivado', false);
        if (mkts) {
          setMarketingApprovals((mkts as any[]).map(m => ({
            id: m.id,
            titulo: m.titulo,
            prazoAprovacao: m.prazo_aprovacao,
            horaAprovacao: m.hora_aprovacao,
            solicitanteNome: m.solicitante_nome,
          })));
        }
      } else {
        setMarketingApprovals([]);
      }
    }
  }, [empresa?.id]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const overdueAlerts = alerts.filter(a => a.daysUntilDue < 0);
  const nearDueAlerts = alerts.filter(a => a.daysUntilDue >= 0);
  const overdueFollowups = followupAlerts.filter(f => f.minutesUntil <= 0);
  const upcomingFollowups = followupAlerts.filter(f => f.minutesUntil > 0);
  const totalAlerts = alerts.length + followupAlerts.length + marketingApprovals.length + unreadCount;

  const handleViewAll = () => {
    setOpen(false);
    navigate('/despesas?filter=critico');
  };

  const handleClickAlert = () => {
    setOpen(false);
    navigate('/despesas?filter=critico');
  };

  const handleClickFollowup = () => {
    setOpen(false);
    navigate('/debitos');
  };

  const handleClickMarketing = () => {
    setOpen(false);
    navigate('/marketing');
  };

  const getFollowupTimeLabel = (f: FollowupAlert) => {
    if (f.minutesUntil <= -1440) {
      const days = Math.abs(Math.round(f.minutesUntil / 1440));
      return `⏰ Atrasado há ${days} dia${days !== 1 ? 's' : ''}`;
    }
    if (f.minutesUntil <= -60) {
      const hours = Math.abs(Math.round(f.minutesUntil / 60));
      return `⏰ Atrasado há ${hours} hora${hours !== 1 ? 's' : ''}`;
    }
    if (f.minutesUntil <= 0) {
      return '⏰ Agora!';
    }
    if (f.minutesUntil <= 60) {
      return `🔔 Em ${f.minutesUntil} min`;
    }
    if (f.minutesUntil <= 1440) {
      const hours = Math.round(f.minutesUntil / 60);
      return `🔔 Em ${hours} hora${hours !== 1 ? 's' : ''}`;
    }
    return `🔔 ${formatDateTimePT(f.followupDate)}`;
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
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2" onClick={marcarTodasLidas}>
              <CheckCheck className="h-3 w-3 mr-1" /> Marcar lidas
            </Button>
          )}
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
              {/* ── Clariza internal notifications ── */}
              {notifs.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-primary/8 border-b border-border/60">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Bell className="h-3 w-3" />
                      Clariza — Actividade recente ({notifs.length})
                    </p>
                  </div>
                  {notifs.map(n => {
                    const meta = notifMeta(n.tipo);
                    return (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
                      >
                        {/* Tipo icon */}
                        <div className={`mt-0.5 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full ${meta.bg}`}>
                          <span className={meta.color}>{meta.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-tight">{n.titulo}</p>
                          {n.mensagem && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground/70 mt-1">{fmtRelTime(n.criada_em)}</p>
                        </div>

                        {/* Mark as read */}
                        <button
                          onClick={() => marcarLida(n.id)}
                          title="Marcar como lida"
                          className="flex-shrink-0 mt-0.5 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Marketing approvals section */}
              {marketingApprovals.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-purple-500/10">
                    <p className="text-xs font-semibold text-purple-600 flex items-center gap-1.5">
                      <Megaphone className="h-3 w-3" />
                      Marketing — A aguardar a sua aprovação ({marketingApprovals.length})
                    </p>
                  </div>
                  {marketingApprovals.map(m => (
                    <button
                      key={m.id}
                      onClick={handleClickMarketing}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                    >
                      <p className="text-sm font-medium text-foreground truncate">{m.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.solicitanteNome ? `Solicitante: ${m.solicitanteNome}` : 'Aguarda aprovação'}
                      </p>
                      {m.prazoAprovacao && (
                        <p className="text-xs text-purple-600 mt-1">
                          Prazo: {formatDatePT(m.prazoAprovacao)}{m.horaAprovacao ? ` ${m.horaAprovacao.slice(0, 5)}` : ''}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Follow-up overdue section */}
              {overdueFollowups.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-orange-500/10">
                    <p className="text-xs font-semibold text-orange-600 flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      Cobranças — Contactar agora ({overdueFollowups.length})
                    </p>
                  </div>
                  {overdueFollowups.map(f => (
                    <button
                      key={f.id}
                      onClick={handleClickFollowup}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{f.clienteNome}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Via {getMeioLabel(f.emailType)}
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            {getFollowupTimeLabel(f)} — {formatDateTimePT(f.followupDate)}
                          </p>
                        </div>
                        {f.valorDebito && (
                          <span className="text-sm font-semibold text-orange-600 whitespace-nowrap">
                            {fmt(f.valorDebito)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Follow-up upcoming section */}
              {upcomingFollowups.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-blue-500/10">
                    <p className="text-xs font-semibold text-blue-600 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Cobranças — Próximos contactos ({upcomingFollowups.length})
                    </p>
                  </div>
                  {upcomingFollowups.map(f => (
                    <button
                      key={f.id}
                      onClick={handleClickFollowup}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{f.clienteNome}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Via {getMeioLabel(f.emailType)}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            {getFollowupTimeLabel(f)}
                          </p>
                        </div>
                        {f.valorDebito && (
                          <span className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                            {fmt(f.valorDebito)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Overdue accounts section */}
              {overdueAlerts.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-destructive/5">
                    <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3" />
                      Contas vencidas ({overdueAlerts.length})
                    </p>
                  </div>
                  {overdueAlerts.map(alert => (
                    <button
                      key={alert.id}
                      onClick={handleClickAlert}
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
                      onClick={handleClickAlert}
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
