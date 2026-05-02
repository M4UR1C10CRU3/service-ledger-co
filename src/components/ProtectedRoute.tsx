import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

type AccessState = 'checking' | 'allowed' | 'denied';

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [accessState, setAccessState] = useState<AccessState>('checking');

  // Validate access against liberty_utilizadores (must exist, ativo=true, eliminado=false)
  const validateAccess = async (currentUser: User | null) => {
    if (!currentUser) {
      setAccessState('denied');
      return;
    }
    try {
      const { data, error } = await (supabase
        .from('liberty_utilizadores') as any)
        .select('id, ativo, eliminado')
        .eq('auth_user_id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('Access validation error:', error);
        setAccessState('denied');
        await supabase.auth.signOut();
        return;
      }

      if (!data || data.eliminado === true || data.ativo === false) {
        toast({
          title: 'Acesso bloqueado',
          description: 'A sua conta não tem acesso autorizado ao Liberty. Contacte o administrador.',
          variant: 'destructive',
        });
        await supabase.auth.signOut();
        setAccessState('denied');
        return;
      }

      setAccessState('allowed');
    } catch (err) {
      console.error('Access check failed:', err);
      await supabase.auth.signOut();
      setAccessState('denied');
    }
  };

  useEffect(() => {
    let mounted = true;
    let authTimeout: NodeJS.Timeout;
    let sessionResolved = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setAccessState('denied');
        } else if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          // Defer the supabase call to avoid deadlocks inside the listener
          setTimeout(() => {
            if (mounted) validateAccess(currentSession.user);
          }, 0);
        }

        sessionResolved = true;
        setLoading(false);
        setAuthChecked(true);
      }
    );

    const checkSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) console.error('Error getting session:', error);

        if (mounted && !sessionResolved) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            await validateAccess(currentSession.user);
          } else {
            setAccessState('denied');
          }
          setLoading(false);
          setAuthChecked(true);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        if (mounted && !sessionResolved) {
          setLoading(false);
          setAuthChecked(true);
          setAccessState('denied');
        }
      }
    };

    checkSession();

    authTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(prev => {
          if (prev) {
            console.warn('Auth check timeout - forcing completion');
            setAuthChecked(true);
            return false;
          }
          return prev;
        });
      }
    }, 8000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(authTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if ((loading && !authChecked) || (user && accessState === 'checking')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">A verificar acesso...</p>
        </div>
      </div>
    );
  }

  if (!user || !session || accessState === 'denied') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
