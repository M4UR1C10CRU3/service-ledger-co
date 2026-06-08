import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificacaoInterna {
  id: string;
  empresa_id: string;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  perfil_destino: string | null;
  referencia_id: string | null;
  referencia_tipo: string | null;
  lida: boolean;
  criada_em: string;
  lida_em: string | null;
}

// ── Standalone helper (import this in components / other hooks) ───────────────

export async function inserirNotificacaoInterna(data: {
  empresa_id: string;
  tipo: string;
  titulo: string;
  mensagem?: string;
  perfil_destino?: string;       // 'financeiro' | 'compras' | 'producao' | 'todos'
  referencia_id?: string;
  referencia_tipo?: string;
}): Promise<void> {
  const { error } = await supabase.from('notificacoes_internas').insert(data);
  if (error) console.warn('[Clariza] inserirNotificacaoInterna:', error.message);
}

// ── Hook (use in NotificationBell for Realtime + display) ────────────────────

export function useNotificacoesInternas() {
  const { empresa } = useEmpresa();
  const { perfil } = usePermissionsContext();
  const { toast } = useToast();
  const [notifs, setNotifs] = useState<NotificacaoInterna[]>([]);

  // Admins see all; others only see their perfil + 'todos'
  const matchesPerfil = (n: NotificacaoInterna) => {
    if (perfil === 'administrador') return true;
    return !n.perfil_destino || n.perfil_destino === 'todos' || n.perfil_destino === perfil;
  };

  const fetchNotifs = useCallback(async () => {
    if (!empresa?.id) return;
    const { data } = await supabase
      .from('notificacoes_internas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('lida', false)
      .order('criada_em', { ascending: false })
      .limit(50);
    if (data) setNotifs((data as NotificacaoInterna[]).filter(matchesPerfil));
  }, [empresa?.id, perfil]);

  useEffect(() => {
    fetchNotifs();
    if (!empresa?.id) return;

    const channel = supabase
      .channel(`clariza-notifs-${empresa.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes_internas', filter: `empresa_id=eq.${empresa.id}` },
        payload => {
          const n = payload.new as NotificacaoInterna;
          if (!matchesPerfil(n)) return;
          setNotifs(prev => [n, ...prev]);
          toast({
            title: n.titulo,
            description: n.mensagem ?? undefined,
            duration: 6000,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [empresa?.id, perfil]);

  const marcarLida = async (id: string) => {
    await supabase.from('notificacoes_internas')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq('id', id);
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const marcarTodasLidas = async () => {
    if (!notifs.length) return;
    await supabase.from('notificacoes_internas')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .in('id', notifs.map(n => n.id));
    setNotifs([]);
  };

  return {
    notifs,
    unreadCount: notifs.length,
    marcarLida,
    marcarTodasLidas,
    fetchNotifs,
  };
}
