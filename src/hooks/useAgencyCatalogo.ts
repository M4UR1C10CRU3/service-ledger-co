import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import type { ItemCategoria, ItemCatalogo, TextoPadrao, TipoTexto } from '@/types/agency';

const T_CAT = 'ag_item_categorias' as any;
const T_ITEM = 'ag_itens_catalogo' as any;
const T_TEXTO = 'ag_textos_padrao' as any;

/** Catálogo pré-cadastrado de peças e serviços que alimenta as propostas. */
export function useCatalogo() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: categorias = [] } = useQuery<ItemCategoria[]>({
    queryKey: ['ag_item_categorias', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(T_CAT) as any)
        .select('*').eq('empresa_id', empresa!.id).eq('ativo', true).order('ordem');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id, empresaId: r.empresa_id, nome: r.nome, ordem: r.ordem, ativo: r.ativo,
      }));
    },
  });

  const { data: itens = [], isLoading } = useQuery<ItemCatalogo[]>({
    queryKey: ['ag_itens_catalogo', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(T_ITEM) as any)
        .select('*').eq('empresa_id', empresa!.id).eq('ativo', true).order('designacao');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id, empresaId: r.empresa_id, categoriaId: r.categoria_id,
        codigo: r.codigo, designacao: r.designacao, descricao: r.descricao,
        unidade: r.unidade,
        precoUnitario: r.preco_unitario != null ? Number(r.preco_unitario) : null,
        horasPrevistasPadrao: r.horas_previstas_padrao != null ? Number(r.horas_previstas_padrao) : null,
        ativo: r.ativo,
      }));
    },
  });

  const inval = () => {
    qc.invalidateQueries({ queryKey: ['ag_itens_catalogo'] });
    qc.invalidateQueries({ queryKey: ['ag_item_categorias'] });
  };

  const criarCategoria = useMutation({
    mutationFn: async (nome: string) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(T_CAT) as any)
        .insert({ empresa_id: empresa.id, nome: nome.trim(), ordem: categorias.length });
      if (error) throw error;
    },
    onSuccess: inval,
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const guardarItem = useMutation({
    mutationFn: async (item: Partial<ItemCatalogo> & { designacao: string }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const row = {
        empresa_id: empresa.id,
        categoria_id: item.categoriaId ?? null,
        codigo: item.codigo || null,
        designacao: item.designacao.trim(),
        descricao: item.descricao || null,
        unidade: item.unidade || 'und',
        preco_unitario: item.precoUnitario ?? null,
        horas_previstas_padrao: item.horasPrevistasPadrao ?? null,
      };
      if (item.id) {
        const { data, error } = await (supabase.from(T_ITEM) as any)
          .update(row).eq('id', item.id).eq('empresa_id', empresa.id).select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('A alteração não foi aceite pela base de dados.');
      } else {
        const { error } = await (supabase.from(T_ITEM) as any).insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => { inval(); toast({ title: 'Item guardado' }); },
    onError: (e: any) => toast({ title: 'Erro ao guardar item', description: e.message, variant: 'destructive' }),
  });

  const removerItem = useMutation({
    mutationFn: async (id: string) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      // Desativa em vez de apagar — o item pode estar referenciado em propostas.
      const { error } = await (supabase.from(T_ITEM) as any)
        .update({ ativo: false }).eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => { inval(); toast({ title: 'Item removido do catálogo' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { categorias, itens, isLoading, criarCategoria, guardarItem, removerItem };
}

/** Textos reutilizáveis (introdução, considerações, condições…). */
export function useTextosPadrao(tipo?: TipoTexto) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: textos = [], isLoading } = useQuery<TextoPadrao[]>({
    queryKey: ['ag_textos_padrao', empresa?.id, tipo ?? 'todos'],
    enabled: !!empresa?.id,
    queryFn: async () => {
      let q = (supabase.from(T_TEXTO) as any)
        .select('*').eq('empresa_id', empresa!.id).eq('ativo', true);
      if (tipo) q = q.eq('tipo', tipo);
      const { data, error } = await q.order('nome');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id, empresaId: r.empresa_id, tipo: r.tipo,
        nome: r.nome, conteudo: r.conteudo, padrao: r.padrao, ativo: r.ativo,
      }));
    },
  });

  const guardar = useMutation({
    mutationFn: async (t: Partial<TextoPadrao> & { tipo: TipoTexto; nome: string; conteudo: string }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const row = {
        empresa_id: empresa.id, tipo: t.tipo, nome: t.nome.trim(),
        conteudo: t.conteudo, padrao: t.padrao ?? false,
      };
      if (t.id) {
        const { error } = await (supabase.from(T_TEXTO) as any)
          .update(row).eq('id', t.id).eq('empresa_id', empresa.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from(T_TEXTO) as any).insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ag_textos_padrao'] });
      toast({ title: 'Texto guardado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(T_TEXTO) as any)
        .update({ ativo: false }).eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ag_textos_padrao'] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  /** O texto marcado como padrão para um tipo — pré-preenche a proposta. */
  const padraoDe = (t: TipoTexto) => textos.find(x => x.tipo === t && x.padrao)?.conteudo ?? '';

  return { textos, isLoading, guardar, remover, padraoDe };
}
