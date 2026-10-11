import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

/**
 * Os núcleos de negócio da empresa (Clariza Labs) — tabela lb_nucleos.
 *
 * São a dimensão que atravessa tudo no Labs: um projeto, uma avença ou uma
 * oportunidade pertencem a um núcleo, e a rentabilidade lê-se por núcleo.
 * Fora do Labs a lista vem vazia e nenhum ecrã mostra o seletor.
 */
export interface Nucleo {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

export function useNucleos() {
  const { empresa } = useEmpresa();
  const eLabs = empresa?.vertical === 'labs';

  const { data: nucleos = [], isLoading } = useQuery<Nucleo[]>({
    queryKey: ['lb_nucleos', empresa?.id],
    enabled: !!empresa?.id && eLabs,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await (supabase.from('lb_nucleos' as any) as any)
        .select('id, codigo, nome, descricao, ordem, ativo')
        .eq('empresa_id', empresa!.id)
        .order('ordem');
      if (error) throw error;
      return (data || []) as Nucleo[];
    },
  });

  const porId = (id?: string | null) => nucleos.find(n => n.id === id) ?? null;
  const porCodigo = (codigo?: string | null) => nucleos.find(n => n.codigo === codigo) ?? null;

  return { nucleos: nucleos.filter(n => n.ativo), todos: nucleos, eLabs, isLoading, porId, porCodigo };
}
