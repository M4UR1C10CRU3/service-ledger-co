import { supabase } from '@/integrations/supabase/client';

/**
 * Quem tem a sessão aberta, e o nome com que assina o que grava.
 *
 * A FICHA (`liberty_utilizadores`) vem primeiro — é o que a administração edita
 * quando alguém entra ou sai. O `profiles` e os metadados da conta são escritos
 * na criação e nunca mais mudam: numa conta reaproveitada por outra pessoa
 * (comercial4@… passou da Cristiana Batista para o André Tiago a 20/10/2026)
 * continuavam a assinar com o nome de quem já tinha saído.
 *
 * Mesma ordem do `useCurrentUser`, para quem não pode usar o hook.
 */
export async function nomeDaSessao(): Promise<{ id: string | null; nome: string }> {
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return { id: null, nome: 'Utilizador' };
  const [{ data: ficha }, { data: perfil }] = await Promise.all([
    (supabase.from('liberty_utilizadores') as any)
      .select('nome').eq('auth_user_id', u.id).maybeSingle(),
    supabase.from('profiles').select('nome').eq('id', u.id).maybeSingle(),
  ]);
  const nome =
    (ficha?.nome as string)?.trim() ||
    perfil?.nome?.trim() ||
    ((u.user_metadata as any)?.nome as string)?.trim() ||
    u.email ||
    'Utilizador';
  return { id: u.id, nome };
}
