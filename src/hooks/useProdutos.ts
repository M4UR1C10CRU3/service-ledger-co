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

  const addProduto = async (input: ProdutoInput): Promise<boolean> => {
    if (!empresa) return false;
    const { error } = await supabase.from('produtos').insert({
      empresa_id: empresa.id,
      ref_interna: input.refInterna.trim(),
      ref_fornecedor: input.refFornecedor?.trim() || null,
      descricao: input.descricao.trim(),
      categoria: input.categoria.trim(),
      unidade: input.unidade?.trim() || null,
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

    // Separate items into new vs updates
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

    // Batch insert in chunks of 500 (ignore duplicates for idempotent re-imports)
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

    // Updates still need to be individual
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
