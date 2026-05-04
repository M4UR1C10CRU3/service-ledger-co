import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Eye } from 'lucide-react';
import { useMarketing } from '@/hooks/useMarketing';
import { useUtilizadores } from '@/hooks/useUtilizadores';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import type { MarketingTarefa } from '@/types/marketing';
import { MarketingDetailDialog } from './MarketingDetailDialog';

/**
 * Pop-up exibido uma vez por sessão (por empresa) ao utilizador que tem tarefas
 * de marketing aguardando a sua aprovação (status `em_revisao` e ele é o aprovador).
 * Também atualiza o título da página com a contagem de pendências.
 */
export function MarketingApprovalAlert() {
  const { tarefas } = useMarketing();
  const { utilizadores } = useUtilizadores();
  const { empresa } = useEmpresa();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [shownKey, setShownKey] = useState<string | null>(null);
  const [detailTarefa, setDetailTarefa] = useState<MarketingTarefa | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUserId(data.user?.id || null));
  }, []);

  // Nome do utilizador atual em liberty_utilizadores
  const currentUserNome = useMemo(() => {
    if (!authUserId) return null;
    const u = utilizadores.find((x: any) => x.auth_user_id === authUserId);
    return u?.nome || null;
  }, [authUserId, utilizadores]);

  // Tarefas aguardando aprovação deste utilizador
  const pendentes = useMemo(() => {
    if (!currentUserNome) return [];
    return tarefas.filter(t =>
      t.status === 'em_revisao' &&
      !t.arquivado &&
      (t.aprovadorNome || '').trim() === currentUserNome.trim()
    );
  }, [tarefas, currentUserNome]);

  // Mostrar uma vez por sessão (por empresa)
  useEffect(() => {
    if (!empresa?.id || !currentUserNome || pendentes.length === 0) return;
    const key = `mkt-approval-shown:${empresa.id}:${currentUserNome}`;
    if (shownKey === key) return;
    try {
      const already = sessionStorage.getItem(key);
      if (!already) {
        setOpen(true);
        sessionStorage.setItem(key, '1');
      }
      setShownKey(key);
    } catch { /* ignore */ }
  }, [empresa?.id, currentUserNome, pendentes.length, shownKey]);

  if (!currentUserNome || pendentes.length === 0) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" style={{ color: '#E8561A' }} />
              {pendentes.length === 1
                ? 'Tem 1 publicação a aguardar a sua aprovação'
                : `Tem ${pendentes.length} publicações a aguardar a sua aprovação`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto py-2">
            {pendentes.map(t => (
              <div
                key={t.id}
                className="border rounded-md p-3 flex items-start justify-between gap-3 hover:bg-muted/40 transition"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.titulo}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                    {t.solicitanteNome && <span>Solicitante: {t.solicitanteNome}</span>}
                    {t.prazoAprovacao && (
                      <span>
                        Prazo: {t.prazoAprovacao}{t.horaAprovacao ? ` ${t.horaAprovacao.slice(0, 5)}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setDetailTarefa(t); }}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> Abrir
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Badge variant="secondary" className="mr-auto">
              Pode rever depois — este aviso só reaparece no próximo login
            </Badge>
            <Button onClick={() => setOpen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarketingDetailDialog
        tarefa={detailTarefa}
        open={!!detailTarefa}
        onOpenChange={(v) => { if (!v) setDetailTarefa(null); }}
      />
    </>
  );
}
