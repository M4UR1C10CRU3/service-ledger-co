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

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { empresa, getLogo } = useEmpresa();
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('profiles')
          .select('nome')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setUserName(data.nome);
          });
      }
    });
  }, []);

  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Professional top bar */}
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden sm:block">
                <span className="text-sm font-semibold text-foreground">
                  {empresa?.nome || 'Selecione uma empresa'}
                </span>
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
