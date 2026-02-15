import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

export interface CostCenter {
  id: string;
  empresaId: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
}

export function useCostCenters() {
  const { empresa } = useEmpresa();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCostCenters = useCallback(async () => {
    setIsLoading(true);
    // Get global (empresa_id IS NULL) + company-specific
    const query = supabase
      .from('cost_centers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    const { data, error } = await query;

    if (!error && data) {
      const filtered = data.filter(
        (cc: any) => cc.empresa_id === null || cc.empresa_id === empresa?.id
      );
      setCostCenters(
        filtered.map((cc: any) => ({
          id: cc.id,
          empresaId: cc.empresa_id,
          name: cc.name,
          description: cc.description,
          isActive: cc.is_active,
        }))
      );
    }
    setIsLoading(false);
  }, [empresa]);

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  const addCostCenter = async (name: string, description?: string): Promise<boolean> => {
    const { error } = await supabase.from('cost_centers').insert({
      empresa_id: empresa?.id || null,
      name: name.trim(),
      description: description?.trim() || null,
    });
    if (!error) {
      await fetchCostCenters();
      return true;
    }
    return false;
  };

  return { costCenters, isLoading, addCostCenter, refreshCostCenters: fetchCostCenters };
}
