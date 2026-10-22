import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

/**
 * Regista na AUDITORIA (tabela `auditoria`) uma ação que não escreve em tabela
 * nenhuma — exportar dados, por exemplo. Substitui o registo antigo
 * `liberty_atividades` (21/10/2026).
 *
 * Criar, alterar e apagar já ficam registados pela própria base (gatilho em
 * cada tabela): NÃO chamar isto para essas ações, senão aparecem duas vezes.
 * Quem fez vem sempre da sessão, do lado da base (`auditoria_evento`).
 */
interface ActivityLogParams {
  acao: string;
  descricao: string;
  /** Tabela a que o evento se refere (decide o módulo no relatório). */
  tabela?: string;
  entidade_id?: string;
  entidade_ref?: string;
  metadata?: Record<string, unknown>;
  /** Mantidos por compatibilidade com as chamadas antigas; o módulo vem da tabela. */
  modulo?: string;
  entidade_tipo?: string;
}

export function useActivityLogger() {
  const { empresa } = useEmpresa();

  const logActivity = useCallback(async (params: ActivityLogParams) => {
    try {
      const { error } = await (supabase.rpc as any)('auditoria_evento', {
        p_acao: params.acao,
        p_descricao: params.descricao,
        p_tabela: params.tabela ?? null,
        p_registo_id: params.entidade_id ?? null,
        p_rotulo: params.entidade_ref ?? null,
        p_empresa_id: empresa?.id ?? null,
        p_dados: params.metadata ?? null,
      });
      if (error) console.warn('Registo de atividade falhou (não crítico):', error.message);
    } catch (e) {
      // Silencioso — nunca bloqueia a ação principal
      console.warn('Registo de atividade falhou (não crítico):', e);
    }
  }, [empresa]);

  return { logActivity };
}
