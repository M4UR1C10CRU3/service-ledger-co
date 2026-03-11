import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

interface ActivityLogParams {
  modulo: string;
  acao: string;
  descricao: string;
  entidade_tipo?: string;
  entidade_id?: string;
  entidade_ref?: string;
  metadata?: Record<string, any>;
}

export function useActivityLogger() {
  const { empresa } = useEmpresa();

  const logActivity = useCallback(async (params: ActivityLogParams) => {
    try {
      if (!empresa) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let utilizadorNome = 'Utilizador';
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.nome) utilizadorNome = profile.nome;

      await (supabase.from('liberty_atividades') as any).insert({
        empresa_id: empresa.id,
        utilizador_id: user.id,
        utilizador_nome: utilizadorNome,
        data_hora: new Date().toISOString(),
        modulo: params.modulo,
        acao: params.acao,
        descricao: params.descricao,
        entidade_tipo: params.entidade_tipo || null,
        entidade_id: params.entidade_id || null,
        entidade_ref: params.entidade_ref || null,
        metadata: params.metadata || null,
      });
    } catch (e) {
      // Silencioso — nunca bloqueia a ação principal
      console.warn('Activity log failed (non-critical):', e);
    }
  }, [empresa]);

  return { logActivity };
}
