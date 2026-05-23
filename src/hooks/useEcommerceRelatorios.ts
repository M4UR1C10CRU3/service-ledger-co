import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

export interface EcommerceRelatorio {
  id: string;
  empresa_id: string;
  titulo: string;
  data_analise: string;
  resumo: string | null;
  relatorio: any;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrecoConcorrente {
  concorrente: string;
  preco: number;
  url?: string;
}

export interface EcommerceProdutoMonitorizado {
  id: string;
  empresa_id: string;
  referencia_interna: string | null;
  nome: string;
  categoria: string | null;
  preco_atual: number | null;
  precos_concorrentes: PrecoConcorrente[];
  proxima_revisao: string | null;
  notas: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EcommerceAjustePreco {
  id: string;
  empresa_id: string;
  produto_id: string | null;
  produto_nome: string;
  referencia_interna: string | null;
  preco_anterior: number;
  preco_novo: number;
  variacao_eur: number | null;
  variacao_pct: number | null;
  justificacao: string | null;
  data_ajuste: string;
  ajustado_por: string | null;
  created_at: string;
}

const tbl = supabase as any;

/* -------------------- Relatórios -------------------- */
export function useEcommerceRelatorios() {
  const { empresa } = useEmpresa();
  return useQuery({
    queryKey: ['ecommerce_relatorios', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async (): Promise<EcommerceRelatorio[]> => {
      const { data, error } = await tbl
        .from('ecommerce_relatorios')
        .select('*')
        .eq('empresa_id', empresa!.id)
        .order('data_analise', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateRelatorio() {
  const qc = useQueryClient();
  const { empresa } = useEmpresa();
  return useMutation({
    mutationFn: async (payload: Partial<EcommerceRelatorio>) => {
      const { data, error } = await tbl
        .from('ecommerce_relatorios')
        .insert({ ...payload, empresa_id: empresa!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecommerce_relatorios'] }),
  });
}

/* -------------------- Produtos Monitorizados -------------------- */
export function useProdutosMonitorizados() {
  const { empresa } = useEmpresa();
  return useQuery({
    queryKey: ['ecommerce_produtos_monitorizados', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async (): Promise<EcommerceProdutoMonitorizado[]> => {
      const { data, error } = await tbl
        .from('ecommerce_produtos_monitorizados')
        .select('*')
        .eq('empresa_id', empresa!.id)
        .order('proxima_revisao', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        precos_concorrentes: Array.isArray(d.precos_concorrentes) ? d.precos_concorrentes : [],
      }));
    },
  });
}

export function useUpsertProdutoMonitorizado() {
  const qc = useQueryClient();
  const { empresa } = useEmpresa();
  return useMutation({
    mutationFn: async (payload: Partial<EcommerceProdutoMonitorizado>) => {
      const row = { ...payload, empresa_id: empresa!.id };
      const { data, error } = payload.id
        ? await tbl.from('ecommerce_produtos_monitorizados').update(row).eq('id', payload.id).select().single()
        : await tbl.from('ecommerce_produtos_monitorizados').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecommerce_produtos_monitorizados'] }),
  });
}

export function useDeleteProdutoMonitorizado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tbl.from('ecommerce_produtos_monitorizados').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecommerce_produtos_monitorizados'] }),
  });
}

/* -------------------- Ajustes de Preço -------------------- */
export function useAjustesPreco() {
  const { empresa } = useEmpresa();
  return useQuery({
    queryKey: ['ecommerce_ajustes_preco', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async (): Promise<EcommerceAjustePreco[]> => {
      const { data, error } = await tbl
        .from('ecommerce_ajustes_preco')
        .select('*')
        .eq('empresa_id', empresa!.id)
        .order('data_ajuste', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateAjustePreco() {
  const qc = useQueryClient();
  const { empresa } = useEmpresa();
  return useMutation({
    mutationFn: async (payload: Partial<EcommerceAjustePreco>) => {
      const { data, error } = await tbl
        .from('ecommerce_ajustes_preco')
        .insert({ ...payload, empresa_id: empresa!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecommerce_ajustes_preco'] });
      qc.invalidateQueries({ queryKey: ['ecommerce_produtos_monitorizados'] });
    },
  });
}
