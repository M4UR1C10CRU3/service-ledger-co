import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/NotificationBell';
import { MarketingApprovalAlert } from '@/components/marketing/MarketingApprovalAlert';
import { useNotificacoesAlertas } from '@/hooks/useNotificacoesAlertas';
import { segmentoVertical } from '@/lib/verticais';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { empresa, getLogo } = useEmpresa();
  useNotificacoesAlertas();
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  // O nome do topo vem da FICHA (`liberty_utilizadores`), como em useCurrentUser.
  // O `profiles` e os metadados da conta são escritos na criação e nunca mais
  // mudam: numa conta reaproveitada (comercial4@… passou da Cristiana Batista
  // para o André Tiago a 20/10/2026) o topo continuava a mostrar quem já saiu.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const [{ data: ficha }, { data: perfil }] = await Promise.all([
        (supabase.from('liberty_utilizadores') as any)
          .select('nome').eq('auth_user_id', session.user.id).maybeSingle(),
        supabase.from('profiles').select('nome').eq('id', session.user.id).maybeSingle(),
      ]);
      const nome = (ficha?.nome as string)?.trim() || perfil?.nome?.trim() || '';
      if (nome) setUserName(nome);
    });
  }, []);

  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  /** Segmento da empresa ativa. Texto, para dar contexto na barra de topo. */
  const segmento = segmentoVertical(empresa?.vertical);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar — 65px e fundo próprio, como no protótipo.
              O conteúdo é o que já existia: recolher a barra lateral, onde se
              está, notificações, configurações e o utilizador. Não se
              acrescentou pesquisa global nem "criar novo" — não existem na
              aplicação, e um botão que não faz nada é pior que nenhum. */}
          <header className="h-[65px] border-b border-border bg-[hsl(var(--topbar-background,var(--card)))]
                             flex items-center justify-between px-4 md:px-[30px] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <div className="hidden sm:flex items-baseline gap-2 min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">
                  {empresa?.nome || 'Selecione uma empresa'}
                </span>
                {segmento && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[12px] text-muted-foreground truncate">{segmento}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <NotificationBell />

              {/* Settings */}
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => navigate('/configuracoes')}>
                <Settings className="h-4 w-4" />
              </Button>

              {/* User avatar */}
              {userName && (
                <div className="flex items-center gap-2.5 ml-1 pl-2 border-l border-border">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-foreground leading-tight">{userName}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Administrador</p>
                  </div>
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: empresa?.corPrimaria || 'hsl(var(--primary))' }}
                  >
                    {initials}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
      {/* Global popup: avisa aprovador de marketing 1x por sessão */}
      <MarketingApprovalAlert />
    </SidebarProvider>
  );
}
