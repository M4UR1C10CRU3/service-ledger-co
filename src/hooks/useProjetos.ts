import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import type { Projeto, ProjetoResumo, ProjetoFormData } from '@/types/agency';

const TABLE = 'ag_projetos' as any;
const VIEW = 'ag_v_projeto_resumo' as any;

function mapProjeto(r: any): Projeto {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    numero: r.numero,
    ano: r.ano,
    nome: r.nome,
    clienteId: r.cliente_id,
    clienteNome: r.cliente_nome,
    responsavelId: r.responsavel_id,
    responsavelNome: r.responsavel_nome,
    estado: r.estado,
    arquivado: r.arquivado,
    descricao: r.descricao,
    prazoDesejado: r.prazo_desejado,
    prazoEstimado: r.prazo_estimado,
    budget: r.budget != null ? Number(r.budget) : null,
    horasPrevistas: r.horas_previstas != null ? Number(r.horas_previstas) : null,
    quadroId: r.quadro_id,
    criadoEm: r.criado_em,
  };
}

function mapResumo(r: any): ProjetoResumo {
  return {
    ...mapProjeto({ ...r, id: r.projeto_id, criado_em: r.criado_em ?? null }),
    id: r.projeto_id,
    totalJobs: Number(r.total_jobs ?? 0),
    jobsConcluidos: Number(r.jobs_concluidos ?? 0),
    horasApontadas: Number(r.horas_apontadas ?? 0),
    custoReal: Number(r.custo_real ?? 0),
    margemPrevista: r.margem_prevista != null ? Number(r.margem_prevista) : null,
  };
}

export function useProjetos(incluirArquivados = false) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();
  const key = ['ag_projetos', empresa?.id, incluirArquivados];

  const { data: projetos = [], isLoading } = useQuery<ProjetoResumo[]>({
    queryKey: key,
    enabled: !!empresa?.id,
    queryFn: async () => {
      let q = (supabase.from(VIEW) as any)
        .select('*')
        .eq('empresa_id', empresa!.id)
        .order('numero', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      const linhas: ProjetoResumo[] = (data || []).map(mapResumo);

      // O núcleo (Clariza Labs) vive em ag_projetos e não na vista de resumo;
      // junta-se aqui para não ter de recriar a vista.
      if (empresa!.vertical === 'labs' && linhas.length) {
        const { data: nuc } = await (supabase.from(TABLE) as any)
          .select('id, nucleo_id').eq('empresa_id', empresa!.id);
        const mapa = Object.fromEntries((nuc || []).map((r: any) => [r.id, r.nucleo_id]));
        linhas.forEach(p => { p.nucleoId = mapa[p.id] ?? null; });
      }
      return incluirArquivados ? linhas : linhas.filter((p: ProjetoResumo) => !p.arquivado);
    },
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['ag_projetos'] });

  const criar = useMutation({
    mutationFn: async (form: ProjetoFormData) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const ano = new Date().getFullYear();
      // Numeração atómica — nunca SELECT MAX+1 (condição de corrida).
      const { data: num, error: errNum } = await (supabase.rpc as any)('ag_proximo_numero', {
        p_empresa_id: empresa.id, p_escopo: 'projeto', p_ano: ano,
      });
      if (errNum) throw errNum;

      const { data, error } = await (supabase.from(TABLE) as any).insert({
        empresa_id: empresa.id,
        numero: num,
        ano,
        nome: form.nome.trim(),
        cliente_id: form.clienteId,
        cliente_nome: form.clienteNome || null,
        responsavel_id: form.responsavelId,
        responsavel_nome: form.responsavelNome || null,
        estado: form.estado,
        descricao: form.descricao || null,
        prazo_desejado: form.prazoDesejado || null,
        prazo_estimado: form.prazoEstimado || null,
        budget: form.budget,
        horas_previstas: form.horasPrevistas,
        ...(form.nucleoId !== undefined ? { nucleo_id: form.nucleoId } : {}),
      }).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => { invalidar(); toast({ title: 'Projeto criado' }); },
    onError: (e: any) => toast({ title: 'Erro ao criar projeto', description: e.message, variant: 'destructive' }),
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: Partial<ProjetoFormData> }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const patch: any = {};
      if (form.nome !== undefined)            patch.nome = form.nome.trim();
      if (form.clienteId !== undefined)       patch.cliente_id = form.clienteId;
      if (form.clienteNome !== undefined)     patch.cliente_nome = form.clienteNome || null;
      if (form.responsavelId !== undefined)   patch.responsavel_id = form.responsavelId;
      if (form.responsavelNome !== undefined) patch.responsavel_nome = form.responsavelNome || null;
      if (form.estado !== undefined)          patch.estado = form.estado;
      if (form.descricao !== undefined)       patch.descricao = form.descricao || null;
      if (form.prazoDesejado !== undefined)   patch.prazo_desejado = form.prazoDesejado || null;
      if (form.prazoEstimado !== undefined)   patch.prazo_estimado = form.prazoEstimado || null;
      if (form.budget !== undefined)          patch.budget = form.budget;
      if (form.horasPrevistas !== undefined)  patch.horas_previstas = form.horasPrevistas;
      if (form.nucleoId !== undefined)        patch.nucleo_id = form.nucleoId;
      patch.atualizado_em = new Date().toISOString();

      // empresa_id no filtro = defesa em profundidade, além da RLS.
      const { error } = await (supabase.from(TABLE) as any)
        .update(patch).eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidar(); toast({ title: 'Projeto atualizado' }); },
    onError: (e: any) => toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' }),
  });

  const arquivar = useMutation({
    mutationFn: async ({ id, arquivado }: { id: string; arquivado: boolean }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(TABLE) as any)
        .update({ arquivado }).eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidar(); toast({ title: v.arquivado ? 'Projeto arquivado' : 'Projeto restaurado' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(TABLE) as any)
        .delete().eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidar(); toast({ title: 'Projeto eliminado' }); },
    onError: (e: any) => toast({ title: 'Não foi possível eliminar', description: e.message, variant: 'destructive' }),
  });

  return { projetos, isLoading, criar, atualizar, arquivar, eliminar };
}

/** Um projeto isolado, para a página de detalhe. */
export function useProjeto(id?: string) {
  const { empresa } = useEmpresa();
  const { data: projeto, isLoading } = useQuery<ProjetoResumo | null>({
    queryKey: ['ag_projeto', id, empresa?.id],
    enabled: !!id && !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(VIEW) as any)
        .select('*').eq('projeto_id', id).eq('empresa_id', empresa!.id).maybeSingle();
      if (error) throw error;
      return data ? mapResumo(data) : null;
    },
  });
  return { projeto: projeto ?? null, isLoading };
}
