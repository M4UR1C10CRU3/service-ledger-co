import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

export interface SchoolClienteCorp {
  id: string;
  empresa_id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  responsavel: string | null;
  cargo_responsavel: string | null;
  endereco: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type SchoolClienteCorpInput = Omit<SchoolClienteCorp, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>;

const TABLE = 'school_clientes_corp' as any;

export function useSchoolClientesCorp() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery<SchoolClienteCorp[]>({
    queryKey: ['school_clientes_corp', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE).select('*')
        .eq('empresa_id', empresa!.id)
        .order('nome');
      if (error) throw error;
      return data as SchoolClienteCorp[];
    },
  });

  const createCliente = useMutation({
    mutationFn: async (input: SchoolClienteCorpInput) => {
      const { error } = await supabase.from(TABLE).insert({ ...input, empresa_id: empresa!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_clientes_corp'] }); toast({ title: 'Cliente corporativo criado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateCliente = useMutation({
    mutationFn: async ({ id, ...input }: SchoolClienteCorpInput & { id: string }) => {
      const { error } = await supabase.from(TABLE).update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).eq('empresa_id', empresa!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_clientes_corp'] }); toast({ title: 'Cliente actualizado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteCliente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('empresa_id', empresa!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_clientes_corp'] }); toast({ title: 'Cliente removido' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { clientes, isLoading, createCliente, updateCliente, deleteCliente };
}
