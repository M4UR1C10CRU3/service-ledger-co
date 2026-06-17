import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentUser {
  authId: string | null;
  nome: string;
}

let cached: CurrentUser | null = null;

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<CurrentUser>(cached || { authId: null, nome: 'Utilizador' });

  useEffect(() => {
    if (cached) return;
    let active = true;
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !active) return;
      let nome = 'Utilizador';
      const { data: profile } = await supabase.from('profiles').select('nome').eq('id', authUser.id).maybeSingle();
      if (profile?.nome) nome = profile.nome;
      const result = { authId: authUser.id, nome };
      cached = result;
      if (active) setUser(result);
    })();
    return () => { active = false; };
  }, []);

  return user;
}
