import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlanoPagamento, PpEstado } from '@/types/planoPagamento';
import { useToast } from '@/hooks/use-toast';

function mapPp(r: any): PlanoPagamento {
  return {
    id: r.id, empresaId: r.empresa_id, propostaId: r.proposta_id,
    osId: r.os_id, descricao: r.descricao,
    percentagem: r.percentagem !== null ? Number(r.percentagem) : null,
    valor: Number(r.valor), fase: r.fase, estado: r.estado,
    dataPrevista: r.data_prevista, dataPagamento: r.data_pagamento,
    notas: r.notas, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export function usePlanoPagamentos(empresaId: string | undefined) {
  const [items, setItems] = useState<PlanoPagamento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from('plano_pagamentos').select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (!error) setItems((data ?? []).map(mapPp));
    setIsLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchByProposta = async (propostaId: string): Promise<PlanoPagamento[]> => {
    const { data } = await (supabase as any)
      .from('plano_pagamentos').select('*')
      .eq('proposta_id', propostaId)
      .order('created_at');
    return (data ?? []).map(mapPp);
  };

  const createBatch = async (
    rows: Array<{
      empresaId: string; propostaId: string | null; osId: string | null;
      descricao: string; percentagem: number | null; valor: number;
      fase: string; estado: string; dataPrevista: string | null;
    }>
  ): Promise<boolean> => {
    try {
      const insert = rows.map(r => ({
        empresa_id: r.empresaId, proposta_id: r.propostaId,
        os_id: r.osId, descricao: r.descricao,
        percentagem: r.percentagem, valor: r.valor,
        fase: r.fase, estado: r.estado,
        data_prevista: r.dataPrevista || null,
      }));
      const { error } = await (supabase as any).from('plano_pagamentos').insert(insert);
      if (error) throw error;
      await fetchAll();
      return true;
    } catch (e: any) {
      toast({ title: 'Erro ao guardar plano', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const updateEstado = async (
    id: string, estado: PpEstado, dataPagamento?: string
  ): Promise<boolean> => {
    try {
      const { error } = await (supabase as any).from('plano_pagamentos').update({
        estado,
        data_pagamento: dataPagamento ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      setItems(prev => prev.map(p =>
        p.id === id ? { ...p, estado, dataPagamento: dataPagamento ?? null } : p
      ));
      toast({ title: estado === 'pago' ? 'Prestação marcada como paga ✓' : 'Estado actualizado' });
      return true;
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const pendentes = items.filter(p => p.estado !== 'pago');
  const totalPendente = pendentes.reduce((s, p) => s + p.valor, 0);
  const totalPago = items.filter(p => p.estado === 'pago').reduce((s, p) => s + p.valor, 0);

  return {
    items, isLoading, fetchAll, fetchByProposta,
    createBatch, updateEstado,
    pendentes, totalPendente, totalPago,
  };
}
