import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

interface ModuloPermissoes {
  perm_ver: boolean;
  perm_criar: boolean;
  perm_editar: boolean;
  perm_eliminar: boolean;
}

interface LibertyUtilizador {
  id: string;
  auth_user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: string | null;
  perfil: string;
  ativo: boolean;
  eliminado: boolean;
  empresa_padrao: string | null;
  ultimo_acesso: string | null;
}

interface PermissionsContextType {
  perfil: string | null;
  permissoes: Record<string, ModuloPermissoes>;
  isLoading: boolean;
  utilizador: LibertyUtilizador | null;
  reloadPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType>({
  perfil: null,
  permissoes: {},
  isLoading: true,
  utilizador: null,
  reloadPermissions: async () => {},
});

export const usePermissionsContext = () => useContext(PermissionsContext);

/**
 * Carimba a data de entrada do utilizador.
 *
 * Não bloqueia o arranque da aplicação — se falhar, o utilizador entra na
 * mesma e fica o aviso na consola. Mas verifica o número de linhas: nesta
 * base de dados uma escrita recusada devolve sucesso com zero linhas, e sem
 * o `.select()` o erro passava despercebido outra vez.
 */
/** Quem já ficou carimbado neste carregamento da página. As permissões
 *  recarregam várias vezes ao entrar (sessão, empresa restaurada, troca de
 *  empresa) e cada vez gravava um acesso novo — duas a quatro linhas na
 *  auditoria por cada entrada. Terminar sessão limpa, para a próxima contar. */
let acessoRegistado: string | null = null;

function registarAcesso(utilizadorId: string) {
  if (acessoRegistado === utilizadorId) return;
  acessoRegistado = utilizadorId;
  void (async () => {
    const { data, error } = await (supabase.from('liberty_utilizadores') as any)
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq('id', utilizadorId)
      .select('id');
    if (error || !data?.length) {
      console.warn('Não foi possível registar o acesso do utilizador', error);
    }
  })();
}

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
  const { empresa } = useEmpresa();
  const [perfil, setPerfil] = useState<string | null>(null);
  const [permissoes, setPermissoes] = useState<Record<string, ModuloPermissoes>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [utilizador, setUtilizador] = useState<LibertyUtilizador | null>(null);

  const loadPermissions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPerfil(null);
        setPermissoes({});
        setUtilizador(null);
        setIsLoading(false);
        return;
      }

      // Load liberty_utilizadores record (must be active and not deleted)
      const { data: lutilizador } = await (supabase
        .from('liberty_utilizadores') as any)
        .select('*')
        .eq('auth_user_id', user.id)
        .eq('ativo', true)
        .eq('eliminado', false)
        .maybeSingle();

      if (!lutilizador) {
        // Sem linha em liberty_utilizadores não há acesso ao ERP nenhum: não se
        // auto-regista ninguém, e o perfil fica vazio.
        //
        // Mas terminar a sessão aqui apagava também a de quem entra pelo portal.
        // Este fornecedor envolve a aplicação toda, incluindo /portal, e um
        // aluno era desligado antes de o portal chegar a aparecer. Quem tem
        // ficha de aluno ou de instrutor mantém a sessão — sem ganhar
        // permissão nenhuma sobre o ERP, que continua guardado pelo
        // ProtectedRoute e pelas regras da base de dados.
        const [{ data: aluno }, { data: docente }, { data: corp }] = await Promise.all([
          (supabase.from('school_alunos') as any).select('id').eq('auth_user_id', user.id).maybeSingle(),
          (supabase.from('school_docentes') as any).select('id').eq('auth_user_id', user.id).maybeSingle(),
          (supabase.from('school_corp_contactos') as any).select('id').eq('auth_user_id', user.id).eq('ativo', true).maybeSingle(),
        ]);

        if (!aluno && !docente && !corp) {
          await supabase.auth.signOut();
        }

        setPerfil(null);
        setPermissoes({});
        setUtilizador(null);
        setIsLoading(false);
        return;
      }

      setUtilizador(lutilizador);
      setPerfil(lutilizador.perfil);

      // O carimbo do acesso tem de vir ANTES de qualquer saída antecipada.
      // Estava lá em baixo, a seguir às permissões, e os administradores —
      // que saem mais cedo por não precisarem delas — nunca lá chegavam: o
      // ecrã de Utilizadores mostrava "Nunca" a toda a gente menos aos
      // operacionais. Sem auditoria de acessos não há auditoria nenhuma.
      registarAcesso(lutilizador.id);

      // Administrador doesn't need to load permissions
      if (lutilizador.perfil === 'administrador') {
        setPermissoes({});
        setIsLoading(false);
        return;
      }

      // Load permissions for current empresa
      if (empresa) {
        const { data: perms } = await (supabase
          .from('liberty_utilizador_permissoes') as any)
          .select('modulo, perm_ver, perm_criar, perm_editar, perm_eliminar')
          .eq('utilizador_id', lutilizador.id)
          .eq('empresa_id', empresa.id);

        const permMap: Record<string, ModuloPermissoes> = {};
        if (perms) {
          for (const p of perms) {
            permMap[p.modulo] = {
              perm_ver: p.perm_ver,
              perm_criar: p.perm_criar,
              perm_editar: p.perm_editar,
              perm_eliminar: p.perm_eliminar,
            };
          }
        }
        setPermissoes(permMap);
      }

      setIsLoading(false);
    } catch (e) {
      console.warn('Failed to load permissions:', e);
      setIsLoading(false);
    }
  }, [empresa]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Reload on auth change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        if (event === 'SIGNED_OUT') acessoRegistado = null;
        loadPermissions();
      }
    });
    return () => subscription.unsubscribe();
  }, [loadPermissions]);

  return (
    <PermissionsContext.Provider value={{ perfil, permissoes, isLoading, utilizador, reloadPermissions: loadPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
};
