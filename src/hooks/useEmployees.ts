import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

export interface Employee {
  id: string;
  empresa_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  birth_date: string | null;
  photo_url: string | null;
  street: string | null;
  street_number: string | null;
  freguesia: string | null;
  concelho: string | null;
  codigo_postal: string | null;
  complemento: string | null;
  pais: string | null;
  job_position_id: string | null;
  department: string | null;
  monthly_salary: number | null;
  nif: string | null;
  activities_summary: string | null;
  admission_date: string | null;
  linkedin: string | null;
  facebook: string | null;
  instagram: string | null;
  nacionalidade: string | null;
  cartao_cidadao: string | null;
  autorizacao_residencia: string | null;
  passaporte: string | null;
  niss: string | null;
  utente: string | null;
  workdays_per_week: number | null;
  daily_hours: number | null;
  work_schedule: Record<string, boolean> | null;
  daily_hours_schedule: Record<string, number> | null;
  default_entry_time: string | null;
  default_lunch_exit_time: string | null;
  default_lunch_return_time: string | null;
  default_exit_time: string | null;
  benefits: any;
  status: string;
  created_at: string;
  updated_at: string;
  job_position?: { id: string; name: string } | null;
  utilizador_id?: string | null;
}

export interface JobPosition {
  id: string;
  empresa_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
}

export function useJobPositions() {
  return useQuery({
    queryKey: ['job-positions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_positions')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as JobPosition[];
    },
  });
}

export function useEmployees() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: ['employees', empresa?.id],
    queryFn: async () => {
      if (!empresa) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('*, job_position:job_positions(id, name)')
        .eq('empresa_id', empresa.id)
        .order('full_name');
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!empresa,
  });

  const createEmployee = useMutation({
    mutationFn: async (employee: Partial<Employee>) => {
      if (!empresa) throw new Error('Empresa não selecionada');
      const { error } = await supabase
        .from('employees')
        .insert({ ...employee, empresa_id: empresa.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Colaborador cadastrado com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' });
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Employee> & { id: string }) => {
      const { error } = await supabase
        .from('employees')
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Colaborador atualizado com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Colaborador removido com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    },
  });

  const createJobPosition = useMutation({
    mutationFn: async (position: { name: string; description?: string }) => {
      const { error } = await supabase
        .from('job_positions')
        .insert({ ...position, empresa_id: empresa?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-positions'] });
      toast({ title: 'Função cadastrada com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao cadastrar função', description: err.message, variant: 'destructive' });
    },
  });

  return {
    employees: employeesQuery.data || [],
    isLoading: employeesQuery.isLoading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    createJobPosition,
  };
}
