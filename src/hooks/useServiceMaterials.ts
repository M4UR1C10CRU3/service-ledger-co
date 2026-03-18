import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

export interface MaterialLine {
  id?: string;
  produtoRef: string;
  produtoDesc: string;
  quantidade: number;
  unidade: string | null;
  stockDisponivel: number;
}

export interface SavedMaterial {
  id: string;
  produtoRef: string;
  produtoDesc: string | null;
  quantidade: number;
  createdAt: string;
}

export function useServiceMaterials() {
  const { empresa } = useEmpresa();
  const [isLoading, setIsLoading] = useState(false);

  /** Load materials already registered for a given sale (by services.id UUID) */
  const loadMaterials = useCallback(async (vendaId: string): Promise<SavedMaterial[]> => {
    if (!empresa) return [];
    const { data, error } = await supabase
      .from('stock_movimentos')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('venda_id', vendaId)
      .eq('tipo', 'saida')
      .eq('origem', 'venda')
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      produtoRef: r.produto_ref,
      produtoDesc: r.produto_desc,
      quantidade: Math.abs(Number(r.quantidade)),
      createdAt: r.created_at,
    }));
  }, [empresa]);

  /** Count materials for multiple sales at once (batch) */
  const countMaterialsForServices = useCallback(async (serviceUuids: string[]): Promise<Record<string, number>> => {
    if (!empresa || serviceUuids.length === 0) return {};
    const { data, error } = await supabase
      .from('stock_movimentos')
      .select('venda_id')
      .eq('empresa_id', empresa.id)
      .eq('tipo', 'saida')
      .eq('origem', 'venda')
      .in('venda_id', serviceUuids);

    if (error || !data) return {};
    const counts: Record<string, number> = {};
    for (const row of data) {
      const vid = (row as any).venda_id;
      if (vid) counts[vid] = (counts[vid] || 0) + 1;
    }
    return counts;
  }, [empresa]);

  /** Get real-time stock for a product ref */
  const getStockDisponivel = useCallback(async (produtoRef: string): Promise<number> => {
    if (!empresa) return 0;
    const { data } = await supabase
      .from('stock_atual')
      .select('quantidade_atual')
      .eq('empresa_id', empresa.id)
      .eq('produto_ref', produtoRef)
      .limit(1)
      .single();
    return data ? Number(data.quantidade_atual) || 0 : 0;
  }, [empresa]);

  /** Search products by ref or description */
  const searchProdutos = useCallback(async (query: string): Promise<Array<{ refInterna: string; descricao: string; unidade: string | null }>> => {
    if (!empresa || !query || query.length < 2) return [];
    const { data } = await supabase
      .from('produtos')
      .select('ref_interna, descricao, unidade')
      .eq('empresa_id', empresa.id)
      .or(`ref_interna.ilike.%${query}%,descricao.ilike.%${query}%`)
      .limit(20);
    return (data || []).map((r: any) => ({
      refInterna: r.ref_interna,
      descricao: r.descricao,
      unidade: r.unidade,
    }));
  }, [empresa]);

  /** Save material exits for a sale */
  const saveMaterials = useCallback(async (
    vendaId: string,
    serviceIdCode: string,
    materials: MaterialLine[]
  ): Promise<boolean> => {
    if (!empresa || materials.length === 0) return false;
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      for (const mat of materials) {
        // Create stock movement
        const { error: movErr } = await supabase.from('stock_movimentos').insert({
          empresa_id: empresa.id,
          produto_ref: mat.produtoRef,
          produto_desc: mat.produtoDesc,
          tipo: 'saida',
          quantidade: -Math.abs(mat.quantidade),
          origem: 'venda',
          referencia_doc: serviceIdCode,
          venda_id: vendaId,
          utilizador_id: userId,
        });
        if (movErr) {
          console.error('Error creating material movement:', movErr);
          continue;
        }

        // Update stock_atual
        const { data: existing } = await supabase
          .from('stock_atual')
          .select('*')
          .eq('empresa_id', empresa.id)
          .eq('produto_ref', mat.produtoRef)
          .limit(1);

        if (existing && existing[0]) {
          const currentQty = Number(existing[0].quantidade_atual) || 0;
          await supabase.from('stock_atual').update({
            quantidade_atual: currentQty - Math.abs(mat.quantidade),
            ultima_saida: new Date().toISOString(),
          }).eq('id', existing[0].id);
        } else {
          await supabase.from('stock_atual').insert({
            empresa_id: empresa.id,
            produto_ref: mat.produtoRef,
            produto_desc: mat.produtoDesc,
            quantidade_atual: -Math.abs(mat.quantidade),
            ultima_saida: new Date().toISOString(),
          });
        }
      }
      return true;
    } catch (err) {
      console.error('Error saving materials:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [empresa]);

  /** Update an existing material movement (adjust stock accordingly) */
  const updateMaterial = useCallback(async (
    materialId: string,
    newProdutoRef: string,
    newProdutoDesc: string,
    newQuantidade: number,
  ): Promise<boolean> => {
    if (!empresa) return false;
    setIsLoading(true);
    try {
      // Get the current movement to calculate stock diff
      const { data: current } = await supabase
        .from('stock_movimentos')
        .select('*')
        .eq('id', materialId)
        .single();
      if (!current) return false;

      const oldRef = current.produto_ref;
      const oldQty = Math.abs(Number(current.quantidade));
      const newQty = Math.abs(newQuantidade);
      const refChanged = oldRef !== newProdutoRef;

      // Update the movement record
      const { error: updErr } = await supabase.from('stock_movimentos').update({
        produto_ref: newProdutoRef,
        produto_desc: newProdutoDesc,
        quantidade: -newQty,
      }).eq('id', materialId);
      if (updErr) { console.error('Error updating movement:', updErr); return false; }

      // Reverse old stock impact
      const { data: oldStock } = await supabase
        .from('stock_atual')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('produto_ref', oldRef)
        .limit(1);

      if (oldStock && oldStock[0]) {
        const restored = Number(oldStock[0].quantidade_atual) + oldQty;
        await supabase.from('stock_atual').update({ quantidade_atual: restored }).eq('id', oldStock[0].id);
      }

      // Apply new stock impact
      const { data: newStock } = await supabase
        .from('stock_atual')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('produto_ref', newProdutoRef)
        .limit(1);

      if (newStock && newStock[0]) {
        const deducted = Number(newStock[0].quantidade_atual) - newQty;
        await supabase.from('stock_atual').update({
          quantidade_atual: deducted,
          ultima_saida: new Date().toISOString(),
        }).eq('id', newStock[0].id);
      } else if (refChanged) {
        await supabase.from('stock_atual').insert({
          empresa_id: empresa.id,
          produto_ref: newProdutoRef,
          produto_desc: newProdutoDesc,
          quantidade_atual: -newQty,
          ultima_saida: new Date().toISOString(),
        });
      }

      return true;
    } catch (err) {
      console.error('Error updating material:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [empresa]);

  /** Delete a material movement and restore stock */
  const deleteMaterial = useCallback(async (materialId: string): Promise<boolean> => {
    if (!empresa) return false;
    setIsLoading(true);
    try {
      const { data: current } = await supabase
        .from('stock_movimentos')
        .select('*')
        .eq('id', materialId)
        .single();
      if (!current) return false;

      const oldRef = current.produto_ref;
      const oldQty = Math.abs(Number(current.quantidade));

      // Delete the movement
      const { error: delErr } = await supabase.from('stock_movimentos').delete().eq('id', materialId);
      if (delErr) { console.error('Error deleting movement:', delErr); return false; }

      // Restore stock
      const { data: stockRow } = await supabase
        .from('stock_atual')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('produto_ref', oldRef)
        .limit(1);

      if (stockRow && stockRow[0]) {
        const restored = Number(stockRow[0].quantidade_atual) + oldQty;
        await supabase.from('stock_atual').update({ quantidade_atual: restored }).eq('id', stockRow[0].id);
      }

      return true;
    } catch (err) {
      console.error('Error deleting material:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [empresa]);

  return {
    loadMaterials,
    countMaterialsForServices,
    getStockDisponivel,
    searchProdutos,
    saveMaterials,
    updateMaterial,
    deleteMaterial,
    isLoading,
  };
}
