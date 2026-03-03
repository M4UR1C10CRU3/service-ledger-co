import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

export interface StockAtual {
  id: string;
  empresaId: string;
  produtoRef: string;
  produtoDesc: string | null;
  categoria: string | null;
  unidade: string | null;
  quantidadeAtual: number;
  stockMinimo: number;
  ultimoPreco: number | null;
  ultimaEntrada: string | null;
  ultimaSaida: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovimento {
  id: string;
  empresaId: string;
  produtoRef: string;
  produtoDesc: string | null;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  custoUnitario: number | null;
  origem: string | null;
  referenciaDoc: string | null;
  compraId: string | null;
  observacoes: string | null;
  utilizadorId: string | null;
  createdAt: string;
}

function mapStockRow(r: any): StockAtual {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    produtoRef: r.produto_ref,
    produtoDesc: r.produto_desc,
    categoria: r.categoria,
    unidade: r.unidade,
    quantidadeAtual: Number(r.quantidade_atual) || 0,
    stockMinimo: Number(r.stock_minimo) || 0,
    ultimoPreco: r.ultimo_preco != null ? Number(r.ultimo_preco) : null,
    ultimaEntrada: r.ultima_entrada,
    ultimaSaida: r.ultima_saida,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapMovRow(r: any): StockMovimento {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    produtoRef: r.produto_ref,
    produtoDesc: r.produto_desc,
    tipo: r.tipo,
    quantidade: Number(r.quantidade),
    custoUnitario: r.custo_unitario != null ? Number(r.custo_unitario) : null,
    origem: r.origem,
    referenciaDoc: r.referencia_doc,
    compraId: r.compra_id,
    observacoes: r.observacoes,
    utilizadorId: r.utilizador_id,
    createdAt: r.created_at,
  };
}

export function useStockAtual() {
  const { empresa } = useEmpresa();
  const [stocks, setStocks] = useState<StockAtual[]>([]);
  const [movimentos, setMovimentos] = useState<StockMovimento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStocks = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('stock_atual')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('produto_ref');
    if (!error && data) setStocks(data.map(mapStockRow));
    setIsLoading(false);
  }, [empresa]);

  const fetchMovimentos = useCallback(async () => {
    if (!empresa) return;
    const pageSize = 1000;
    let from = 0;
    const allRows: any[] = [];
    while (true) {
      const { data, error } = await supabase
        .from('stock_movimentos')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    setMovimentos(allRows.map(mapMovRow));
  }, [empresa]);

  useEffect(() => {
    fetchStocks();
    fetchMovimentos();
  }, [fetchStocks, fetchMovimentos]);

  /** Upsert stock_atual record and create a movement */
  const registarEntrada = async (params: {
    produtoRef: string;
    produtoDesc: string;
    categoria?: string;
    unidade?: string;
    quantidade: number;
    custoUnitario: number;
    origem: string;
    referenciaDoc?: string;
    compraId?: string;
  }): Promise<boolean> => {
    if (!empresa) return false;

    // Upsert stock_atual
    const existing = stocks.find(s => s.produtoRef === params.produtoRef);
    if (existing) {
      const { error } = await supabase.from('stock_atual').update({
        quantidade_atual: existing.quantidadeAtual + params.quantidade,
        ultimo_preco: params.custoUnitario,
        ultima_entrada: new Date().toISOString(),
        produto_desc: params.produtoDesc,
        categoria: params.categoria || existing.categoria,
        unidade: params.unidade || existing.unidade,
      }).eq('id', existing.id);
      if (error) { console.error('Stock update error:', error); return false; }
    } else {
      const { error } = await supabase.from('stock_atual').insert({
        empresa_id: empresa.id,
        produto_ref: params.produtoRef,
        produto_desc: params.produtoDesc,
        categoria: params.categoria || null,
        unidade: params.unidade || null,
        quantidade_atual: params.quantidade,
        ultimo_preco: params.custoUnitario,
        ultima_entrada: new Date().toISOString(),
      });
      if (error) { console.error('Stock insert error:', error); return false; }
    }

    // Create movement
    const { error: movErr } = await supabase.from('stock_movimentos').insert({
      empresa_id: empresa.id,
      produto_ref: params.produtoRef,
      produto_desc: params.produtoDesc,
      tipo: 'entrada',
      quantidade: params.quantidade,
      custo_unitario: params.custoUnitario,
      origem: params.origem,
      referencia_doc: params.referenciaDoc || null,
      compra_id: params.compraId || null,
    });
    if (movErr) console.error('Movement insert error:', movErr);

    await fetchStocks();
    await fetchMovimentos();
    return true;
  };

  const registarSaida = async (params: {
    produtoRef: string;
    produtoDesc: string;
    quantidade: number;
    origem: string;
    referenciaDoc?: string;
    observacoes?: string;
  }): Promise<boolean> => {
    if (!empresa) return false;

    const existing = stocks.find(s => s.produtoRef === params.produtoRef);
    const currentQty = existing?.quantidadeAtual ?? 0;

    if (existing) {
      const { error } = await supabase.from('stock_atual').update({
        quantidade_atual: currentQty - params.quantidade,
        ultima_saida: new Date().toISOString(),
      }).eq('id', existing.id);
      if (error) return false;
    } else {
      const { error } = await supabase.from('stock_atual').insert({
        empresa_id: empresa.id,
        produto_ref: params.produtoRef,
        produto_desc: params.produtoDesc,
        quantidade_atual: -params.quantidade,
        ultima_saida: new Date().toISOString(),
      });
      if (error) return false;
    }

    await supabase.from('stock_movimentos').insert({
      empresa_id: empresa.id,
      produto_ref: params.produtoRef,
      produto_desc: params.produtoDesc,
      tipo: 'saida',
      quantidade: -params.quantidade,
      origem: params.origem,
      referencia_doc: params.referenciaDoc || null,
      observacoes: params.observacoes || null,
    });

    await fetchStocks();
    await fetchMovimentos();
    return true;
  };

  const ajustarStock = async (params: {
    produtoRef: string;
    produtoDesc: string;
    novaQuantidade: number;
    motivo: string;
    observacoes?: string;
  }): Promise<boolean> => {
    if (!empresa) return false;

    const existing = stocks.find(s => s.produtoRef === params.produtoRef);
    const currentQty = existing?.quantidadeAtual ?? 0;
    const diferenca = params.novaQuantidade - currentQty;

    if (existing) {
      const { error } = await supabase.from('stock_atual').update({
        quantidade_atual: params.novaQuantidade,
      }).eq('id', existing.id);
      if (error) return false;
    } else {
      const { error } = await supabase.from('stock_atual').insert({
        empresa_id: empresa.id,
        produto_ref: params.produtoRef,
        produto_desc: params.produtoDesc,
        quantidade_atual: params.novaQuantidade,
      });
      if (error) return false;
    }

    await supabase.from('stock_movimentos').insert({
      empresa_id: empresa.id,
      produto_ref: params.produtoRef,
      produto_desc: params.produtoDesc,
      tipo: 'ajuste',
      quantidade: diferenca,
      origem: params.motivo,
      observacoes: params.observacoes || null,
    });

    await fetchStocks();
    await fetchMovimentos();
    return true;
  };

  const updateStockMinimo = async (id: string, minimo: number): Promise<boolean> => {
    const { error } = await supabase.from('stock_atual').update({ stock_minimo: minimo }).eq('id', id);
    if (error) return false;
    await fetchStocks();
    return true;
  };

  return {
    stocks, movimentos, isLoading,
    registarEntrada, registarSaida, ajustarStock, updateStockMinimo,
    refreshStocks: fetchStocks, refreshMovimentos: fetchMovimentos,
  };
}
