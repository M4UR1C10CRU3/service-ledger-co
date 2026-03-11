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

      // Load liberty_utilizadores record
      const { data: lutilizador } = await (supabase
        .from('liberty_utilizadores') as any)
        .select('*')
        .eq('auth_user_id', user.id)
        .eq('ativo', true)
        .eq('eliminado', false)
        .maybeSingle();

      if (!lutilizador) {
        // Auto-register current auth user as administrador if no record exists
        try {
          const userName = user.user_metadata?.nome || user.email?.split('@')[0] || 'Utilizador';
          const { data: newRecord } = await (supabase
            .from('liberty_utilizadores') as any)
            .insert({
              auth_user_id: user.id,
              nome: userName,
              email: user.email || '',
              perfil: 'administrador',
              empresa_padrao: empresa?.id || null,
              criado_por: user.id,
            })
            .select()
            .single();

          if (newRecord) {
            // Also create empresa association if empresa is selected
            if (empresa?.id) {
              await (supabase.from('liberty_utilizador_empresas') as any)
                .insert({ utilizador_id: newRecord.id, empresa_id: empresa.id });
            }
            setUtilizador(newRecord);
            setPerfil('administrador');
            setPermissoes({});
            setIsLoading(false);
            return;
          }
        } catch (autoRegError) {
          console.warn('Auto-register failed:', autoRegError);
        }

        // Fallback: allow all
        setPerfil(null);
        setPermissoes({});
        setUtilizador(null);
        setIsLoading(false);
        return;
      }

      setUtilizador(lutilizador);
      setPerfil(lutilizador.perfil);

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

      // Update ultimo_acesso
      await (supabase.from('liberty_utilizadores') as any)
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', lutilizador.id);

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
