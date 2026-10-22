import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { fraseDaAuditoria, moduloDe, tipoDeAcao, type RegistoAuditoria } from '@/lib/auditoriaFrases';

/**
 * Atividades de uma pessoa numa semana (Controlo de Ponto), lidas da AUDITORIA
 * (substitui `liberty_atividades`, 21/10/2026). `utilizadorId` é o id da conta
 * (`employees.utilizador_id` = auth user id = `auditoria.auth_uid`).
 * Só administradores leem a auditoria (regra na base); para os outros vem vazio.
 * Sem filtro de empresa: é tudo o que a pessoa fez e quem consulta pode ver.
 */

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

const inicioDoDia = (d: string) => { const [a, m, dia] = d.split('-').map(Number); return new Date(a, m - 1, dia).toISOString(); };
const fimDoDia = (d: string) => { const [a, m, dia] = d.split('-').map(Number); return new Date(a, m - 1, dia, 23, 59, 59, 999).toISOString(); };

export function useWeeklyActivities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActivities = useCallback(async (
    utilizadorId: string,
    startDate: string,
    endDate: string
  ): Promise<WeeklyActivitySummary | null> => {
    if (!utilizadorId) return null;
    setIsLoading(true);

    try {
      const { data, error } = await (supabase.from('auditoria' as any) as any)
        .select('*')
        .eq('auth_uid', utilizadorId)
        .eq('automatica', false)
        .or('campos.is.null,campos.neq.{ultimo_acesso}') // sem as entradas na aplicação
        .gte('quando', inicioDoDia(startDate))
        .lte('quando', fimDoDia(endDate))
        .order('quando', { ascending: true })
        .limit(1000);

      if (error) {
        console.error('Error fetching activities:', error);
        setActivities([]);
        return null;
      }

      const records: ActivityRecord[] = ((data ?? []) as RegistoAuditoria[]).map(r => ({
        id: String(r.id),
        data_hora: r.quando,
        modulo: moduloDe(r.tabela),
        acao: tipoDeAcao(r),
        descricao: fraseDaAuditoria(r),
        entidade_tipo: r.tabela,
        entidade_ref: r.rotulo,
      }));
      setActivities(records);

      const moduleBreakdown: Record<string, number> = {};
      const activitiesByDay: Record<string, ActivityRecord[]> = {};
      for (const r of records) {
        moduleBreakdown[r.modulo] = (moduleBreakdown[r.modulo] || 0) + 1;
        const dayKey = format(parseISO(r.data_hora), 'yyyy-MM-dd'); // dia local, não UTC
        (activitiesByDay[dayKey] ??= []).push(r);
      }

      return {
        totalActions: records.length,
        moduleBreakdown,
        activeDays: Object.keys(activitiesByDay).sort(),
        activitiesByDay,
      };
    } catch (e) {
      console.error('Error fetching weekly activities:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { activities, isLoading, fetchActivities };
}
