import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    let authTimeout: NodeJS.Timeout;
    let sessionResolved = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        }
        // Ignore events with null session that aren't SIGNED_OUT
        // (e.g. TOKEN_REFRESHED failures, rate limit 429s)
        
        sessionResolved = true;
        setLoading(false);
        setAuthChecked(true);
      }
    );

    // Then check for existing session — but don't overwrite if listener already resolved
    const checkSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (mounted && !sessionResolved) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
          setAuthChecked(true);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        if (mounted && !sessionResolved) {
          setLoading(false);
          setAuthChecked(true);
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
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(authTimeout);
    };
  }, []);

  // Show loading only while auth is being checked
  if (loading && !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
