import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type FlowType = 'numerario' | 'multibanco' | 'transferencia';
export type MovementType = 'entrada' | 'saida';
export type SourceType = 'venda' | 'recebimento' | 'pagamento_fornecedor' | 'pagamento_despesa' | 'ajuste_manual' | 'sangria' | 'reforco' | 'transferencia_interna';

export interface CashFlow {
  id: string;
  empresa_id: string;
  flow_type: FlowType;
  movement_type: MovementType;
  amount: number;
  source_type: SourceType;
  source_id: string | null;
  description: string;
  reference: string | null;
  transaction_date: string;
  notes: string | null;
  balance_after: number;
  created_at: string;
}

export interface CashFlowFormData {
  flow_type: FlowType;
  movement_type: MovementType;
  amount: string;
  source_type: SourceType;
  description: string;
  reference: string;
  transaction_date: string;
  notes: string;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function useFluxoCaixa(empresaId: string | undefined) {
  const { toast } = useToast();
  const [movements, setMovements] = useState<CashFlow[]>([]);
  const [balances, setBalances] = useState<Record<FlowType, number>>({
    numerario: 0, multibanco: 0, transferencia: 0,
  });
  const [recentByFlow, setRecentByFlow] = useState<Record<FlowType, CashFlow[]>>({
    numerario: [], multibanco: [], transferencia: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!empresaId || isInitialized) return;
    const findLastDate = async () => {
      const { data } = await supabase
        .from('cash_flows')
        .select('transaction_date')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .limit(1);
      setSelectedDate(data?.[0]?.transaction_date || todayISO());
      setIsInitialized(true);
    };
    findLastDate();
  }, [empresaId, isInitialized]);

  const loadData = useCallback(async (from: string, to: string) => {
    if (!empresaId || !from) return;
    setIsLoading(true);
    try {
      const { data: movs } = await supabase
        .from('cash_flows')
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('transaction_date', from)
        .lte('transaction_date', to)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });
      setMovements((movs as CashFlow[]) || []);

      const flows: FlowType[] = ['numerario', 'multibanco', 'transferencia'];
      const newBalances: Record<FlowType, number> = { numerario: 0, multibanco: 0, transferencia: 0 };
      const newRecent: Record<FlowType, CashFlow[]> = { numerario: [], multibanco: [], transferencia: [] };

      await Promise.all(flows.map(async (ft) => {
        const [{ data: allMovs }, { data: recentMovs }] = await Promise.all([
          supabase.from('cash_flows').select('movement_type, amount')
            .eq('empresa_id', empresaId).eq('flow_type', ft)
            .lte('transaction_date', to).is('deleted_at', null),
          supabase.from('cash_flows').select('*')
            .eq('empresa_id', empresaId).eq('flow_type', ft)
            .is('deleted_at', null)
            .order('transaction_date', { ascending: false })
            .order('created_at', { ascending: false }).limit(15),
        ]);
        if (allMovs) {
          newBalances[ft] = allMovs.reduce((sum, m) =>
            sum + (m.movement_type === 'entrada' ? Number(m.amount) : -Number(m.amount)), 0);
        }
        newRecent[ft] = (recentMovs as CashFlow[]) || [];
      }));

      setBalances(newBalances);
      setRecentByFlow(newRecent);
    } catch (err) {
      console.error('Error loading cash flow data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId]);

  const saveMovement = useCallback(async (
    payload: Omit<CashFlowFormData, 'amount'> & { amount: number },
    editingId: string | null
  ): Promise<boolean> => {
    if (!empresaId) return false;
    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('cash_flows').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Lançamento atualizado com sucesso' });
      } else {
        const { error } = await supabase.from('cash_flows').insert({ ...payload, empresa_id: empresaId });
        if (error) throw error;
        toast({ title: 'Lançamento registado com sucesso' });
      }
      return true;
    } catch (err) {
      console.error('Error saving movement:', err);
      toast({ title: 'Erro ao registar lançamento', variant: 'destructive' });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [empresaId, toast]);

  const dayStats = useMemo(() => {
    const stats: Record<FlowType, { entradas: number; saidas: number }> = {
      numerario: { entradas: 0, saidas: 0 },
      multibanco: { entradas: 0, saidas: 0 },
      transferencia: { entradas: 0, saidas: 0 },
    };
    for (const m of movements) {
      const ft = m.flow_type as FlowType;
      if (m.movement_type === 'entrada') stats[ft].entradas += Number(m.amount);
      else stats[ft].saidas += Number(m.amount);
    }
    return stats;
  }, [movements]);

  const saldoGeral = balances.numerario + balances.multibanco + balances.transferencia;

  return {
    movements,
    balances,
    recentByFlow,
    dayStats,
    saldoGeral,
    isLoading,
    isInitialized,
    selectedDate,
    setSelectedDate,
    isSaving,
    loadData,
    saveMovement,
  };
}
