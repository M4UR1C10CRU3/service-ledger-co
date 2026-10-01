import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentUser {
  authId: string | null;
  nome: string;
  /** Falso enquanto o nome verdadeiro ainda não chegou. */
  pronto: boolean;
}

let cached: CurrentUser | null = null;

/**
 * O utilizador autenticado e o seu nome.
 *
 * O nome só chega depois de uma ida à base de dados, e até lá havia aqui o
 * texto "Utilizador". Quem comentava nos primeiros instantes depois de abrir
 * a aplicação gravava esse valor de reserva no comentário — e ficava lá para
 * sempre, porque o nome é copiado no momento da escrita. Foram 152 casos.
 *
 * Duas defesas:
 *  · `pronto` diz se o nome já é o verdadeiro, para quem grava poder esperar;
 *  · o nome cai para o email antes de cair para "Utilizador", que pelo menos
 *    identifica a pessoa.
 */
export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<CurrentUser>(
    cached || { authId: null, nome: 'Utilizador', pronto: false },
  );

  useEffect(() => {
    if (cached) return;
    let active = true;
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !active) return;

      // A FICHA vem primeiro, e é a fonte de verdade.
      //
      // Antes começava-se pelo `profiles`. Mas a política de leitura dessa
      // tabela exige `user_has_empresa_access(empresa_id)`, e um perfil com a
      // empresa por preencher não é legível nem pelo próprio dono. Quando isso
      // acontecia, caía-se para os metadados da conta de autenticação — que são
      // escritos na criação e nunca mais mexidos. Numa conta reaproveitada por
      // outra pessoa, lá continuava o nome de quem já tinha saído, e cada
      // comentário novo ficava assinado com ele. Foram 69 assim.
      //
      // `liberty_utilizadores` é o que a administração edita quando alguém entra
      // ou sai, portanto é o que reflete a realidade.
      const [{ data: ficha }, { data: profile }] = await Promise.all([
        (supabase.from('liberty_utilizadores') as any)
          .select('nome').eq('auth_user_id', authUser.id).maybeSingle(),
        supabase.from('profiles').select('nome').eq('id', authUser.id).maybeSingle(),
      ]);

      const nome =
        (ficha?.nome as string)?.trim() ||
        profile?.nome?.trim() ||
        ((authUser.user_metadata as any)?.nome as string)?.trim() ||
        authUser.email ||
        'Utilizador';

      const result = { authId: authUser.id, nome, pronto: true };
      cached = result;
      if (active) setUser(result);
    })();
    return () => { active = false; };
  }, []);

  return user;
}
