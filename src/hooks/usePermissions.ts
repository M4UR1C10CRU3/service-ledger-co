import { useCallback } from 'react';
import { usePermissionsContext } from '@/contexts/PermissionsContext';

export function usePermissions() {
  const { perfil, permissoes, isLoading, utilizador } = usePermissionsContext();

  const can = useCallback((modulo: string, acao: 'ver' | 'criar' | 'editar' | 'eliminar'): boolean => {
    // While loading, allow everything (don't block UI during load)
    if (isLoading) return true;

    // SECURITY: If no liberty_utilizadores record exists, deny everything.
    // ProtectedRoute will sign the user out.
    if (!utilizador) return false;

    // Administrador always has access
    if (perfil === 'administrador') return true;

    const moduloPerms = permissoes[modulo];
    if (!moduloPerms) return false;

    switch (acao) {
      case 'ver': return moduloPerms.perm_ver;
      case 'criar': return moduloPerms.perm_criar;
      case 'editar': return moduloPerms.perm_editar;
      case 'eliminar': return moduloPerms.perm_eliminar;
      default: return false;
    }
  }, [perfil, permissoes, isLoading, utilizador]);

  const canAny = useCallback((modulo: string): boolean => can(modulo, 'ver'), [can]);

  const isAdmin = perfil === 'administrador';

  return { can, canAny, perfil, isAdmin, isLoading, utilizador };
}
