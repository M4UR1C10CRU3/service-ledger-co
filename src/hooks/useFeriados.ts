import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

export interface Feriado {
  id: string;
  empresa_id: string;
  data: string;
  descricao: string;
  created_at: string;
}

export function useFeriados() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const feriadosQuery = useQuery({
    queryKey: ['feriados', empresa?.id],
    queryFn: async () => {
      if (!empresa) return [];
      const { data, error } = await supabase
        .from('feriados' as any)
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('data', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Feriado[];
    },
    enabled: !!empresa,
  });

  const addFeriado = useMutation({
    mutationFn: async (feriado: { data: string; descricao: string }) => {
      if (!empresa) throw new Error('Empresa não selecionada');
      const { error } = await supabase
        .from('feriados' as any)
        .insert({ empresa_id: empresa.id, data: feriado.data, descricao: feriado.descricao } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast({ title: 'Feriado adicionado com sucesso!' });
    },
    onError: (err: any) => {
      const msg = err.message?.includes('duplicate') ? 'Já existe um feriado nesta data.' : err.message;
      toast({ title: 'Erro ao adicionar feriado', description: msg, variant: 'destructive' });
    },
  });

  const deleteFeriado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feriados' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast({ title: 'Feriado removido!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    },
  });

  const isFeriado = (date: string): Feriado | undefined => {
    return feriadosQuery.data?.find(f => f.data === date);
  };

  return {
    feriados: feriadosQuery.data || [],
    isLoading: feriadosQuery.isLoading,
    addFeriado,
    deleteFeriado,
    isFeriado,
  };
}
