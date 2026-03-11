import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

export interface ActivityRecord {
  id: string;
  data_hora: string;
  modulo: string;
  acao: string;
  descricao: string;
  entidade_tipo: string | null;
  entidade_ref: string | null;
}

export interface WeeklyActivitySummary {
  totalActions: number;
  moduleBreakdown: Record<string, number>;
  activeDays: string[];
  activitiesByDay: Record<string, ActivityRecord[]>;
}

export function useWeeklyActivities() {
  const { empresa } = useEmpresa();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActivities = useCallback(async (
    utilizadorId: string,
    startDate: string,
    endDate: string
  ): Promise<WeeklyActivitySummary | null> => {
    if (!empresa || !utilizadorId) return null;
    setIsLoading(true);

    try {
      const startISO = `${startDate}T00:00:00.000Z`;
      const endISO = `${endDate}T23:59:59.999Z`;

      const { data, error } = await (supabase.from('liberty_atividades') as any)
        .select('id, data_hora, modulo, acao, descricao, entidade_tipo, entidade_ref')
        .eq('empresa_id', empresa.id)
        .eq('utilizador_id', utilizadorId)
        .gte('data_hora', startISO)
        .lte('data_hora', endISO)
        .order('data_hora', { ascending: true })
        .limit(500);

      if (error) {
        console.error('Error fetching activities:', error);
        setActivities([]);
        return null;
      }

      const records: ActivityRecord[] = data || [];
      setActivities(records);

      // Aggregate
      const moduleBreakdown: Record<string, number> = {};
      const activitiesByDay: Record<string, ActivityRecord[]> = {};
      const activeDaysSet = new Set<string>();

      for (const r of records) {
        moduleBreakdown[r.modulo] = (moduleBreakdown[r.modulo] || 0) + 1;
        const dayKey = r.data_hora.split('T')[0];
        activeDaysSet.add(dayKey);
        if (!activitiesByDay[dayKey]) activitiesByDay[dayKey] = [];
        activitiesByDay[dayKey].push(r);
      }

      return {
        totalActions: records.length,
        moduleBreakdown,
        activeDays: Array.from(activeDaysSet).sort(),
        activitiesByDay,
      };
    } catch (e) {
      console.error('Error fetching weekly activities:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [empresa]);

  return { activities, isLoading, fetchActivities };
}
