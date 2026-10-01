import { ReactNode, useEffect, useState } from 'react';
import { Navigate, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePortalIdentidade } from '@/hooks/usePortalIdentidade';
import { Button } from '@/components/ui/button';
import { GraduationCap, LogOut, UserRound, BookOpen, Building2 } from 'lucide-react';

/**
 * O portal tem caminho próprio, separado do ERP.
 *
 * O guarda do ERP (ProtectedRoute) exige uma linha em liberty_utilizadores e
 * termina a sessão de quem não a tiver — um aluno que entrasse era expulso de
 * imediato. E o layout do ERP mostraria a um formando o menu de compras,
 * despesas e recursos humanos.
 *
 * Aqui a identidade vem da ficha de aluno ou de instrutor, e o ecrã só tem o
 * que diz respeito a essa pessoa.
 */

type Estado = 'a-verificar' | 'sem-sessao' | 'entrou';

export function PortalShell({ children, exige }: { children: ReactNode; exige?: 'aluno' | 'docente' | 'corporativo' }) {
  const [estado, setEstado] = useState<Estado>('a-verificar');
  const { data: identidade, isLoading } = usePortalIdentidade();
  const navigate = useNavigate();

  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (vivo) setEstado(data.session ? 'entrou' : 'sem-sessao');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (vivo) setEstado(s ? 'entrou' : 'sem-sessao');
    });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  if (estado === 'a-verificar' || (estado === 'entrou' && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (estado === 'sem-sessao') return <Navigate to="/portal/entrar" replace />;

  // Conta válida, mas sem ficha associada. Não deitamos a sessão abaixo: dizemos
  // o que se passa, que é o que resolve o problema de quem está do outro lado.
  if (identidade?.semFicha) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-4">
          <UserRound className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
          <h1 className="text-lg font-semibold">Conta ainda não associada</h1>
          <p className="text-sm text-muted-foreground">
            A sua conta foi criada, mas ainda não está ligada a nenhuma ficha de aluno
            ou instrutor. Peça à secretaria que registe este endereço de email na sua
            ficha e volte a entrar.
          </p>
          <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate('/portal/entrar'); }}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </div>
    );
  }

  const papeis = [
    identidade?.aluno       ? { to: '/portal/aluno',       label: 'Aluno',     icon: BookOpen }      : null,
    identidade?.docente     ? { to: '/portal/instrutor',   label: 'Instrutor', icon: GraduationCap } : null,
    identidade?.corporativo ? { to: '/portal/corporativo', label: 'Empresa',   icon: Building2 }     : null,
  ].filter(Boolean) as { to: string; label: string; icon: typeof BookOpen }[];

  // Pediram um portal que esta pessoa não tem. Manda-a para o que tem.
  if (exige === 'aluno'       && !identidade?.aluno)       return <Navigate to={papeis[0]?.to ?? '/portal/entrar'} replace />;
  if (exige === 'docente'     && !identidade?.docente)     return <Navigate to={papeis[0]?.to ?? '/portal/entrar'} replace />;
  if (exige === 'corporativo' && !identidade?.corporativo) return <Navigate to={papeis[0]?.to ?? '/portal/entrar'} replace />;

  // Quem acumula papéis tem várias fichas, e podem ter nomes diferentes.
  // Mostra-se a do papel em que a pessoa está, não sempre a primeira.
  const pessoa =
    exige === 'docente'     ? (identidade?.docente ?? identidade?.aluno) :
    exige === 'corporativo' ? (identidade?.corporativo ?? identidade?.aluno) :
    (identidade?.aluno ?? identidade?.docente ?? identidade?.corporativo);

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-6">
          <span className="font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" /> Portal
          </span>

          {/* O seletor só aparece a quem é as duas coisas. */}
          {papeis.length > 1 && (
            <nav className="flex gap-1">
              {papeis.map(p => (
                <NavLink key={p.to} to={p.to} className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`
                }>
                  <p.icon className="h-4 w-4 inline mr-1.5" />{p.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{pessoa?.nome}</span>
            <Button variant="ghost" size="sm"
              onClick={async () => { await supabase.auth.signOut(); navigate('/portal/entrar'); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
