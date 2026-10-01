import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

// ─────────────────────────────────────────────────────────────────────────────
// As empresas do grupo da empresa ativa.
//
// O isolamento no Clariza é por GRUPO, não por empresa: as cinco do Grupo
// Obrajusta / Tudo Casa partilham fornecedores, clientes e colaboradores de
// propósito — poupa-lhes entrar e sair da sessão várias vezes por dia. A Elo
// Giro e a ITC são cada uma o seu próprio grupo.
//
// Os DOCUMENTOS (propostas, encomendas, ordens de serviço) continuam por
// empresa: cada uma é entidade legal com as suas séries de numeração.
// ─────────────────────────────────────────────────────────────────────────────

export interface EmpresaDoGrupo {
  id: string;
  nome: string;
  slug: string | null;
}

export function useGrupoEmpresas() {
  const { empresa } = useEmpresa();

  const { data: grupoId = null } = useQuery<string | null>({
    queryKey: ['grupo_id', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data } = await (supabase.from('empresas') as any)
        .select('grupo_id').eq('id', empresa!.id).maybeSingle();
      return (data?.grupo_id as string) ?? null;
    },
  });

  const { data: empresas = [], isLoading } = useQuery<EmpresaDoGrupo[]>({
    queryKey: ['grupo_empresas', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const sozinha: EmpresaDoGrupo[] = [
        { id: empresa!.id, nome: empresa!.nome, slug: (empresa as any).slug ?? null },
      ];

      const { data: atual, error } = await (supabase.from('empresas') as any)
        .select('grupo_id').eq('id', empresa!.id).maybeSingle();

      // Empresa sem grupo atribuído fica sozinha. Nunca se junta às outras
      // que também não têm — seria voltar a misturar tudo.
      if (error || !atual?.grupo_id) return sozinha;

      const { data: irmas } = await (supabase.from('empresas') as any)
        .select('id, nome, slug').eq('grupo_id', atual.grupo_id).order('nome');

      return irmas?.length ? (irmas as EmpresaDoGrupo[]) : sozinha;
    },
  });

  const ids = empresas.map(e => e.id);
  const nomePorId = new Map(empresas.map(e => [e.id, e.nome]));

  return {
    /** Grupo da empresa ativa. NULL enquanto não for atribuído — nunca tratar como "todos". */
    grupoId,
    empresas,
    /** Ids a usar no filtro dos dados-mestre. Nunca vazio quando há empresa ativa. */
    ids: ids.length ? ids : (empresa ? [empresa.id] : []),
    /** Para etiquetar a que empresa pertence cada registo numa lista partilhada. */
    nomePorId,
    partilhado: empresas.length > 1,
    isLoading,
  };
}
