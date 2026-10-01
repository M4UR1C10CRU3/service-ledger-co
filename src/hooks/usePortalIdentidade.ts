import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Quem é a pessoa que entrou no portal.
 *
 * A identificação é pela CONTA (auth_user_id), não pelo email. Os portais
 * procuravam a ficha pelo email do utilizador, o que se parte assim que alguém
 * muda de endereço e confunde duas pessoas que partilhem um. O email serve uma
 * vez só, para ligar a conta à ficha; a partir daí manda a ligação.
 *
 * Uma pessoa pode ser as duas coisas — instrutor numa escola e aluno noutra —,
 * por isso devolvem-se ambos os papéis.
 */

export interface FichaPortal {
  id: string;
  empresa_id: string;
  nome: string;
  email: string | null;
}

export interface IdentidadePortal {
  aluno: FichaPortal | null;
  docente: FichaPortal | null;
  /** Contacto de uma empresa cliente — o portal corporativo. */
  corporativo: FichaPortal | null;
  /** Sem ficha nenhuma: a conta existe mas não está associada a ninguém. */
  semFicha: boolean;
}

export function usePortalIdentidade() {
  return useQuery<IdentidadePortal>({
    queryKey: ['portal_identidade'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const vazio: IdentidadePortal = { aluno: null, docente: null, corporativo: null, semFicha: true };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return vazio;

      // Liga a conta à ficha com o mesmo email confirmado. É idempotente e
      // barato: nas visitas seguintes não encontra nada por ligar.
      try {
        await (supabase.rpc as any)('school_portal_vincular');
      } catch {
        // A ligação já estar feita não é motivo para travar a entrada.
      }

      const [{ data: aluno }, { data: docente }, { data: corp }] = await Promise.all([
        (supabase as any).from('school_alunos')
          .select('id, empresa_id, nome, email')
          .eq('auth_user_id', user.id).maybeSingle(),
        (supabase as any).from('school_docentes')
          .select('id, empresa_id, nome, email')
          .eq('auth_user_id', user.id).maybeSingle(),
        (supabase as any).from('school_corp_contactos')
          .select('id, empresa_id, nome, email')
          .eq('auth_user_id', user.id).eq('ativo', true).maybeSingle(),
      ]);

      return {
        aluno: (aluno as FichaPortal) ?? null,
        docente: (docente as FichaPortal) ?? null,
        corporativo: (corp as FichaPortal) ?? null,
        semFicha: !aluno && !docente && !corp,
      };
    },
  });
}
