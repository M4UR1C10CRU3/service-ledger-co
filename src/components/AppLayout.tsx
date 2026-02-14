import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { empresa } = useEmpresa();
  const [userName, setUserName] = useState('');

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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-sm font-medium text-foreground">
                {empresa?.nome || 'Selecione uma empresa'}
              </span>
            </div>
            {userName && (
              <span className="text-sm text-muted-foreground">
                Olá, <span className="font-medium text-foreground">{userName}</span>
              </span>
            )}
          </header>
          {/* Main content */}
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
