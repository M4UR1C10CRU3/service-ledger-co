import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

export interface Article {
  id: string;
  empresaId: string;
  referenceCode: string;
  description: string;
  supplierId: string | null;
  currentStock: number;
  costPrice: number;
}

export function useArticles() {
  const { empresa } = useEmpresa();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('reference_code');

    if (!error && data) {
      setArticles(data.map((r: any) => ({
        id: r.id,
        empresaId: r.empresa_id,
        referenceCode: r.reference_code,
        description: r.description,
        supplierId: r.supplier_id,
        currentStock: Number(r.current_stock),
        costPrice: Number(r.cost_price),
      })));
    }
    setIsLoading(false);
  }, [empresa]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const addArticle = async (data: { referenceCode: string; description: string; supplierId?: string; costPrice?: number }): Promise<Article | null> => {
    if (!empresa) return null;
    const { data: row, error } = await supabase.from('articles').insert({
      empresa_id: empresa.id,
      reference_code: data.referenceCode.trim(),
      description: data.description.trim(),
      supplier_id: data.supplierId || null,
      cost_price: data.costPrice || 0,
    }).select().single();

    if (!error && row) {
      await fetchArticles();
      return {
        id: row.id,
        empresaId: row.empresa_id,
        referenceCode: row.reference_code,
        description: row.description,
        supplierId: row.supplier_id,
        currentStock: Number(row.current_stock),
        costPrice: Number(row.cost_price),
      };
    }
    return null;
  };

  const updateArticleStock = async (articleId: string, quantityToAdd: number, newCostPrice: number, supplierId: string, accountPayableId?: string): Promise<boolean> => {
    if (!empresa) return false;

    // Get current article
    const article = articles.find(a => a.id === articleId);
    if (!article) return false;

    // Update article stock, cost price and supplier
    const { error: updateErr } = await supabase.from('articles').update({
      current_stock: article.currentStock + quantityToAdd,
      cost_price: newCostPrice,
      supplier_id: supplierId,
    }).eq('id', articleId);

    if (updateErr) return false;

    // Record stock movement
    const { error: movErr } = await supabase.from('stock_movements').insert({
      empresa_id: empresa.id,
      article_id: articleId,
      movement_type: 'entrada',
      quantity: quantityToAdd,
      unit_cost: newCostPrice,
      account_payable_id: accountPayableId || null,
      notes: `Entrada via compra - ${quantityToAdd} unidade(s)`,
    });

    if (movErr) console.error('Error recording stock movement:', movErr);

    await fetchArticles();
    return true;
  };

  return { articles, isLoading, addArticle, updateArticleStock, refreshArticles: fetchArticles };
}
