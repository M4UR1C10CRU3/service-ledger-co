import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

export interface TimeRecord {
  id: string;
  empresa_id: string;
  employee_id: string;
  record_date: string;
  entry_time: string | null;
  lunch_exit_time: string | null;
  lunch_return_time: string | null;
  exit_time: string | null;
  worked_hours: number;
  expected_hours: number;
  overtime_hours: number;
  balance: number;
  day_type: string;
  observations: string | null;
  created_at: string;
  updated_at: string;
  employee?: { id: string; full_name: string; photo_url: string | null; department: string | null; job_position: { name: string } | null } | null;
}

export function useTimeRecords(employeeId?: string, startDate?: string, endDate?: string) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const recordsQuery = useQuery({
    queryKey: ['time-records', empresa?.id, employeeId, startDate, endDate],
    queryFn: async () => {
      if (!empresa) return [];
      let query = supabase
        .from('time_records')
        .select('*, employee:employees(id, full_name, photo_url, department, job_position:job_positions(name))')
        .order('record_date', { ascending: false });

      // O ponto é da PESSOA: há um só registo por colaborador e dia (UNIQUE employee_id+record_date),
      // mesmo que tenha sido lançado noutra empresa do grupo. Com um colaborador escolhido não se filtra
      // pela empresa — senão um dia lançado noutra empresa fica invisível (caso 11/09/2026).
      if (employeeId) query = query.eq('employee_id', employeeId);
      else query = query.eq('empresa_id', empresa.id);
      if (startDate) query = query.gte('record_date', startDate);
      if (endDate) query = query.lte('record_date', endDate);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as TimeRecord[];
    },
    enabled: !!empresa,
  });

  const upsertRecord = useMutation({
    mutationFn: async (record: Partial<TimeRecord>) => {
      if (!empresa) throw new Error('Empresa não selecionada');
      
      // Check if record exists for this employee+date
      const { data: existing } = await supabase
        .from('time_records')
        .select('id')
        .eq('employee_id', record.employee_id!)
        .eq('record_date', record.record_date!)
        .maybeSingle();

      if (existing) {
        // Passa o registo para a empresa em que se está a trabalhar e confirma que gravou:
        // uma escrita recusada pela RLS devolve sucesso com 0 linhas.
        const { data: gravado, error } = await supabase
          .from('time_records')
          .update({ ...record, empresa_id: empresa.id } as any)
          .eq('id', existing.id)
          .select('id');
        if (error) throw error;
        if (!gravado || gravado.length === 0) throw new Error('O registo deste dia não pôde ser atualizado (sem permissão).');
      } else {
        const { error } = await supabase
          .from('time_records')
          .insert({ ...record, empresa_id: empresa.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-records'] });
      toast({ title: 'Ponto registado com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao registar ponto', description: err.message, variant: 'destructive' });
    },
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-records'] });
      toast({ title: 'Registo removido!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    },
  });

  return {
    records: recordsQuery.data || [],
    isLoading: recordsQuery.isLoading,
    upsertRecord,
    deleteRecord,
  };
}
