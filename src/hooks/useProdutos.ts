import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

export interface Produto {
  id: string;
  empresaId: string;
  refInterna: string;
  refFornecedor: string | null;
  descricao: string;
  categoria: string;
  unidade: string | null;
  origem: string;
  fornecedor1Id: string | null;
  fornecedor2Id: string | null;
  fornecedor3Id: string | null;
  precoCusto: number;
  ivaCusto: number;
  margem: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProdutoInput {
  refInterna: string;
  refFornecedor?: string | null;
  descricao: string;
  categoria: string;
  unidade?: string | null;
  origem?: string;
  fornecedor1Id?: string | null;
  fornecedor2Id?: string | null;
  fornecedor3Id?: string | null;
  precoCusto?: number;
  ivaCusto?: number;
  margem?: number;
}

function mapRow(r: any): Produto {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    refInterna: r.ref_interna,
    refFornecedor: r.ref_fornecedor,
    descricao: r.descricao,
    categoria: r.categoria,
    unidade: r.unidade,
    origem: r.origem || 'manual',
    fornecedor1Id: r.fornecedor_1_id ?? null,
    fornecedor2Id: r.fornecedor_2_id ?? null,
    fornecedor3Id: r.fornecedor_3_id ?? null,
    precoCusto: Number(r.preco_custo ?? 0),
    ivaCusto: Number(r.iva_custo ?? 23),
    margem: Number(r.margem ?? 30),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function useProdutos() {
  const { empresa } = useEmpresa();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProdutos = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);

    const pageSize = 1000;
    let from = 0;
    const allRows: any[] = [];

    while (true) {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('ref_interna')
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Error fetching produtos:', error);
        break;
      }

      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    setProdutos(allRows.map(mapRow));
    setIsLoading(false);
  }, [empresa]);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  const buildPayload = (input: ProdutoInput) => ({
    ref_interna: input.refInterna.trim(),
    ref_fornecedor: input.refFornecedor?.trim() || null,
    descricao: input.descricao.trim(),
    categoria: input.categoria.trim(),
    unidade: input.unidade?.trim() || null,
    fornecedor_1_id: input.fornecedor1Id || null,
    fornecedor_2_id: input.fornecedor2Id || null,
    fornecedor_3_id: input.fornecedor3Id || null,
    preco_custo: input.precoCusto ?? 0,
    iva_custo: input.ivaCusto ?? 23,
    margem: input.margem ?? 30,
  });

  const addProduto = async (input: ProdutoInput): Promise<boolean> => {
    if (!empresa) return false;
    const { error } = await supabase.from('produtos').insert({
      empresa_id: empresa.id,
      ...buildPayload(input),
      origem: input.origem || 'manual',
    });
    if (error) {
      console.error('Error adding produto:', error);
      return false;
    }
    await fetchProdutos();
    return true;
  };

  const updateProduto = async (id: string, input: Partial<ProdutoInput>): Promise<boolean> => {
    const updateData: any = {};
    if (input.refInterna !== undefined) updateData.ref_interna = input.refInterna.trim();
    if (input.refFornecedor !== undefined) updateData.ref_fornecedor = input.refFornecedor?.trim() || null;
    if (input.descricao !== undefined) updateData.descricao = input.descricao.trim();
    if (input.categoria !== undefined) updateData.categoria = input.categoria.trim();
    if (input.unidade !== undefined) updateData.unidade = input.unidade?.trim() || null;
    if (input.fornecedor1Id !== undefined) updateData.fornecedor_1_id = input.fornecedor1Id || null;
    if (input.fornecedor2Id !== undefined) updateData.fornecedor_2_id = input.fornecedor2Id || null;
    if (input.fornecedor3Id !== undefined) updateData.fornecedor_3_id = input.fornecedor3Id || null;
    if (input.precoCusto !== undefined) updateData.preco_custo = input.precoCusto;
    if (input.ivaCusto !== undefined) updateData.iva_custo = input.ivaCusto;
    if (input.margem !== undefined) updateData.margem = input.margem;

    const { error } = await supabase.from('produtos').update(updateData).eq('id', id);
    if (error) {
      console.error('Error updating produto:', error);
      return false;
    }
    await fetchProdutos();
    return true;
  };

  const deleteProduto = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) {
      console.error('Error deleting produto:', error);
      return false;
    }
    await fetchProdutos();
    return true;
  };

  const bulkUpsert = async (items: ProdutoInput[]): Promise<{ added: number; updated: number; errors: number }> => {
    if (!empresa) return { added: 0, updated: 0, errors: 0 };
    let added = 0, updated = 0, errors = 0;

    const existingMap = new Map(produtos.map(p => [p.refInterna, p]));
    const toInsert: any[] = [];
    const toUpdate: { id: string; data: any }[] = [];

    for (const item of items) {
      const ref = item.refInterna.trim();
      const existing = existingMap.get(ref);
      if (!existing) {
        toInsert.push({
          empresa_id: empresa.id,
          ref_interna: ref,
          ref_fornecedor: item.refFornecedor?.trim() || null,
          descricao: item.descricao.trim(),
          categoria: item.categoria.trim(),
          origem: item.origem || 'excel',
        });
      } else {
        const descChanged = existing.descricao !== item.descricao.trim();
        const refChanged = (existing.refFornecedor || '') !== (item.refFornecedor?.trim() || '');
        const catChanged = existing.categoria !== item.categoria.trim();
        if (descChanged || refChanged || catChanged) {
          const updateData: any = {};
          if (descChanged) updateData.descricao = item.descricao.trim();
          if (refChanged) updateData.ref_fornecedor = item.refFornecedor?.trim() || null;
          if (catChanged) updateData.categoria = item.categoria.trim();
          toUpdate.push({ id: existing.id, data: updateData });
        }
      }
    }

    const CHUNK_SIZE = 500;
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      const { error, data } = await supabase
        .from('produtos')
        .upsert(chunk, { onConflict: 'empresa_id,ref_interna', ignoreDuplicates: true })
        .select('id');

      if (error) {
        console.error('Batch upsert error:', error);
        errors += chunk.length;
      } else {
        added += data?.length || 0;
      }
    }

    for (const item of toUpdate) {
      const { error } = await supabase.from('produtos').update(item.data).eq('id', item.id);
      if (error) { errors++; } else { updated++; }
    }

    await fetchProdutos();
    return { added, updated, errors };
  };

  const bulkDelete = async (ids: string[]): Promise<number> => {
    let deleted = 0;
    for (const id of ids) {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (!error) deleted++;
    }
    await fetchProdutos();
    return deleted;
  };

  return { produtos, isLoading, addProduto, updateProduto, deleteProduto, bulkUpsert, bulkDelete, refreshProdutos: fetchProdutos };
}
