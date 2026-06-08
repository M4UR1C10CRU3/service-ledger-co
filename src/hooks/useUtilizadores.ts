import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useToast } from '@/hooks/use-toast';

// All modules for permissions
export const ALL_MODULES = [
  { key: 'clientes', label: 'Clientes', group: 'Comercial' },
  { key: 'propostas', label: 'Propostas', group: 'Comercial' },
  { key: 'followup', label: 'Follow-up', group: 'Comercial' },
  { key: 'compras', label: 'Compras', group: 'Compras' },
  { key: 'fornecedores', label: 'Fornecedores', group: 'Compras' },
  { key: 'stocks', label: 'Gestão de Stocks', group: 'Compras' },
  { key: 'produtos', label: 'Produtos', group: 'Compras' },
  { key: 'vendas', label: 'Vendas / Serviços', group: 'Produção' },
  { key: 'ordens_servico', label: 'Ordens de Serviço', group: 'Produção' },
  { key: 'financeiro_receitas', label: 'Receitas', group: 'Financeiro' },
  { key: 'financeiro_despesas', label: 'Despesas', group: 'Financeiro' },
  { key: 'financeiro_debitos', label: 'Débitos / Cobranças', group: 'Financeiro' },
  { key: 'financeiro_fluxo', label: 'Fluxo de Caixa', group: 'Financeiro' },
  { key: 'rh_colaboradores', label: 'Colaboradores', group: 'Recursos Humanos' },
  { key: 'rh_ponto', label: 'Controlo de Ponto', group: 'Recursos Humanos' },
  { key: 'rh_subempreiteiros', label: 'Subempreiteiros', group: 'Recursos Humanos' },
  { key: 'rh_recrutamento', label: 'Recrutamento', group: 'Recursos Humanos' },
  { key: 'rh_avaliacoes', label: 'Avaliações', group: 'Recursos Humanos' },
  { key: 'relatorios', label: 'Relatórios Gerais', group: 'Relatórios' },
  { key: 'auditoria', label: 'Auditoria', group: 'Relatórios' },
  { key: 'configuracoes', label: 'Configurações Gerais', group: 'Configurações' },
  { key: 'utilizadores', label: 'Utilizadores', group: 'Configurações' },
];

// Profile presets
export const PROFILE_PRESETS: Record<string, Record<string, { ver: boolean; criar: boolean; editar: boolean; eliminar: boolean }>> = {
  administrador: Object.fromEntries(ALL_MODULES.map(m => [m.key, { ver: true, criar: true, editar: true, eliminar: true }])),
  gestor: Object.fromEntries(ALL_MODULES.map(m => {
    if (['configuracoes', 'utilizadores', 'auditoria'].includes(m.key)) return [m.key, { ver: false, criar: false, editar: false, eliminar: false }];
    const eliminar = ['clientes', 'propostas', 'followup', 'stocks'].includes(m.key);
    return [m.key, { ver: true, criar: true, editar: true, eliminar }];
  })),
  operacional: Object.fromEntries(ALL_MODULES.map(m => {
    if (['financeiro_fluxo', 'rh_colaboradores', 'configuracoes', 'utilizadores', 'auditoria'].includes(m.key))
      return [m.key, { ver: false, criar: false, editar: false, eliminar: false }];
    const canCreate = ['propostas', 'clientes', 'followup', 'compras', 'vendas', 'ordens_servico', 'rh_ponto'].includes(m.key);
    return [m.key, { ver: true, criar: canCreate, editar: canCreate, eliminar: false }];
  })),
};

export interface LibertyUtilizador {
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
  criado_em: string;
}

export interface UtilizadorPermissao {
  modulo: string;
  perm_ver: boolean;
  perm_criar: boolean;
  perm_editar: boolean;
  perm_eliminar: boolean;
}

export function useUtilizadores() {
  const { empresa } = useEmpresa();
  const { logActivity } = useActivityLogger();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all utilizadores
  const { data: utilizadores = [], isLoading } = useQuery({
    queryKey: ['liberty-utilizadores'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('liberty_utilizadores') as any)
        .select('*')
        .eq('eliminado', false)
        .order('nome');
      if (error) throw error;
      return (data || []) as LibertyUtilizador[];
    },
  });

  // Fetch empresas of a utilizador
  const fetchUtilizadorEmpresas = useCallback(async (utilizadorId: string): Promise<string[]> => {
    const { data } = await (supabase
      .from('liberty_utilizador_empresas') as any)
      .select('empresa_id')
      .eq('utilizador_id', utilizadorId);
    return (data || []).map((d: any) => d.empresa_id);
  }, []);

  // Fetch permissions of a utilizador
  const fetchUtilizadorPermissoes = useCallback(async (utilizadorId: string, empresaId: string): Promise<UtilizadorPermissao[]> => {
    const { data } = await (supabase
      .from('liberty_utilizador_permissoes') as any)
      .select('modulo, perm_ver, perm_criar, perm_editar, perm_eliminar')
      .eq('utilizador_id', utilizadorId)
      .eq('empresa_id', empresaId);
    return (data || []) as UtilizadorPermissao[];
  }, []);

  // Create utilizador
  const createUtilizador = useCallback(async (params: {
    nome: string;
    email: string;
    password: string;
    telefone?: string;
    cargo?: string;
    perfil: string;
    empresaIds: string[];
    empresaPadrao: string;
  }) => {
    // ─── IMPORTANTE: Usar Edge Function com service_role para criar o utilizador auth.
    // NÃO usar supabase.auth.signUp() directamente — em Supabase JS v2 com
    // enable_confirmations=false isso substitui a sessão do admin pela do novo utilizador,
    // fazendo o admin perder acesso imediatamente.
    const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-create-user', {
      body: { email: params.email, password: params.password, nome: params.nome },
    });
    if (fnError) throw new Error(fnError.message);
    if (!fnData?.user) throw new Error(fnData?.error || 'Falha ao criar utilizador de autenticação');

    const newAuthUser = fnData.user;

    // Create liberty_utilizadores record
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: lutilizador, error: luError } = await (supabase
      .from('liberty_utilizadores') as any)
      .insert({
        auth_user_id: newAuthUser.id,
        nome: params.nome,
        email: params.email,
        telefone: params.telefone || null,
        cargo: params.cargo || null,
        perfil: params.perfil,
        empresa_padrao: params.empresaPadrao,
        criado_por: currentUser?.id || null,
      })
      .select()
      .single();
    if (luError) throw luError;

    // Create empresa associations
    if (params.empresaIds.length > 0) {
      await (supabase.from('liberty_utilizador_empresas') as any)
        .insert(params.empresaIds.map(eid => ({
          utilizador_id: lutilizador.id,
          empresa_id: eid,
        })));
    }

    // Create default permissions based on profile
    const preset = PROFILE_PRESETS[params.perfil] || PROFILE_PRESETS.operacional;
    for (const eid of params.empresaIds) {
      const permsToInsert = ALL_MODULES.map(m => ({
        utilizador_id: lutilizador.id,
        empresa_id: eid,
        modulo: m.key,
        perm_ver: preset[m.key]?.ver ?? false,
        perm_criar: preset[m.key]?.criar ?? false,
        perm_editar: preset[m.key]?.editar ?? false,
        perm_eliminar: preset[m.key]?.eliminar ?? false,
      }));
      await (supabase.from('liberty_utilizador_permissoes') as any).insert(permsToInsert);
    }

    logActivity({
      modulo: 'Configurações',
      acao: 'criou_utilizador',
      descricao: `Criou o utilizador ${params.nome} com perfil ${params.perfil}`,
      entidade_tipo: 'utilizador',
      entidade_id: lutilizador.id,
    });

    queryClient.invalidateQueries({ queryKey: ['liberty-utilizadores'] });
    toast({ title: 'Utilizador criado', description: `${params.nome} foi adicionado ao sistema.` });
    return lutilizador;
  }, [logActivity, queryClient, toast]);

  // Update utilizador
  const updateUtilizador = useCallback(async (id: string, params: Partial<{
    nome: string;
    telefone: string;
    cargo: string;
    perfil: string;
    ativo: boolean;
    empresaIds: string[];
    empresaPadrao: string;
  }>) => {
    const updateData: any = { atualizado_em: new Date().toISOString() };
    if (params.nome !== undefined) updateData.nome = params.nome;
    if (params.telefone !== undefined) updateData.telefone = params.telefone;
    if (params.cargo !== undefined) updateData.cargo = params.cargo;
    if (params.perfil !== undefined) updateData.perfil = params.perfil;
    if (params.ativo !== undefined) updateData.ativo = params.ativo;
    if (params.empresaPadrao !== undefined) updateData.empresa_padrao = params.empresaPadrao;

    await (supabase.from('liberty_utilizadores') as any)
      .update(updateData)
      .eq('id', id);

    // Update empresas if provided
    if (params.empresaIds) {
      await (supabase.from('liberty_utilizador_empresas') as any)
        .delete()
        .eq('utilizador_id', id);
      if (params.empresaIds.length > 0) {
        await (supabase.from('liberty_utilizador_empresas') as any)
          .insert(params.empresaIds.map(eid => ({
            utilizador_id: id,
            empresa_id: eid,
          })));
      }
    }

    logActivity({
      modulo: 'Configurações',
      acao: 'editou_utilizador',
      descricao: `Atualizou o utilizador ${params.nome || id}`,
      entidade_tipo: 'utilizador',
      entidade_id: id,
    });

    queryClient.invalidateQueries({ queryKey: ['liberty-utilizadores'] });
    toast({ title: 'Utilizador atualizado' });
  }, [logActivity, queryClient, toast]);

  // Save permissions
  const savePermissoes = useCallback(async (utilizadorId: string, empresaId: string, perms: Record<string, { ver: boolean; criar: boolean; editar: boolean; eliminar: boolean }>) => {
    // Delete existing
    await (supabase.from('liberty_utilizador_permissoes') as any)
      .delete()
      .eq('utilizador_id', utilizadorId)
      .eq('empresa_id', empresaId);

    // Insert new
    const rows = Object.entries(perms).map(([modulo, p]) => ({
      utilizador_id: utilizadorId,
      empresa_id: empresaId,
      modulo,
      perm_ver: p.ver,
      perm_criar: p.criar,
      perm_editar: p.editar,
      perm_eliminar: p.eliminar,
    }));

    await (supabase.from('liberty_utilizador_permissoes') as any).insert(rows);

    logActivity({
      modulo: 'Configurações',
      acao: 'atualizou_permissoes',
      descricao: `Atualizou permissões do utilizador`,
      entidade_tipo: 'utilizador',
      entidade_id: utilizadorId,
    });

    toast({ title: 'Permissões guardadas' });
  }, [logActivity, toast]);

  // Soft delete
  const deleteUtilizador = useCallback(async (id: string, nome: string) => {
    await (supabase.from('liberty_utilizadores') as any)
      .update({ eliminado: true, ativo: false })
      .eq('id', id);

    logActivity({
      modulo: 'Configurações',
      acao: 'eliminou_utilizador',
      descricao: `Eliminou o utilizador ${nome}`,
      entidade_tipo: 'utilizador',
      entidade_id: id,
    });

    queryClient.invalidateQueries({ queryKey: ['liberty-utilizadores'] });
    toast({ title: 'Utilizador eliminado' });
  }, [logActivity, queryClient, toast]);

  return {
    utilizadores,
    isLoading,
    createUtilizador,
    updateUtilizador,
    savePermissoes,
    deleteUtilizador,
    fetchUtilizadorEmpresas,
    fetchUtilizadorPermissoes,
  };
}
