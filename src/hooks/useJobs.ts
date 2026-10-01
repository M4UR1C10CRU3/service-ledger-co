import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import type { Job, JobEtapa, JobTarefa, JobFormData } from '@/types/agency';
import { ETAPAS_PADRAO } from '@/types/agency';
import { camposEmFaltaJob, descreveFalta, dispararAutomacoesJob } from '@/hooks/useQuadroProcesso';

const T_JOBS = 'ag_jobs' as any;
const T_ETAPAS = 'ag_job_etapas' as any;
const T_TAREFAS = 'ag_job_tarefas' as any;

function mapJob(r: any): Job {
  return {
    id: r.id, empresaId: r.empresa_id, projetoId: r.projeto_id,
    sequencial: r.sequencial, titulo: r.titulo, descricao: r.descricao,
    etapaId: r.etapa_id, responsavelId: r.responsavel_id, responsavelNome: r.responsavel_nome,
    prazo: r.prazo,
    horasPrevistas: r.horas_previstas != null ? Number(r.horas_previstas) : null,
    concluido: r.concluido, concluidoEm: r.concluido_em, criadoEm: r.criado_em,
  };
}

function mapTarefa(r: any): JobTarefa {
  return {
    id: r.id, empresaId: r.empresa_id, jobId: r.job_id, ordem: r.ordem,
    titulo: r.titulo, responsavelId: r.responsavel_id, responsavelNome: r.responsavel_nome,
    prazo: r.prazo,
    horasPrevistas: r.horas_previstas != null ? Number(r.horas_previstas) : null,
    concluida: r.concluida, concluidaEm: r.concluida_em,
  };
}

// ── Etapas (colunas do kanban, configuráveis por empresa) ────────────────────

export function useJobEtapas() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: etapas = [], isLoading } = useQuery<JobEtapa[]>({
    queryKey: ['ag_job_etapas', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(T_ETAPAS) as any)
        .select('*').eq('empresa_id', empresa!.id).eq('ativo', true).order('ordem');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id, empresaId: r.empresa_id, nome: r.nome, cor: r.cor,
        ordem: r.ordem, final: r.final, ativo: r.ativo,
        estadoCodigo: r.estado_codigo ?? null,
        camposObrigatorios: Array.isArray(r.campos_obrigatorios) ? r.campos_obrigatorios : [],
        bloqueada: !!r.bloqueada,
      }));
    },
  });

  /** Semeia as etapas iniciais numa empresa que ainda não tem nenhuma. */
  const semear = useMutation({
    mutationFn: async () => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const linhas = ETAPAS_PADRAO.map((e, i) => ({
        empresa_id: empresa.id, nome: e.nome, cor: e.cor, ordem: i, final: !!e.final,
        estado_codigo: e.estadoCodigo,
        campos_obrigatorios: e.camposObrigatorios ?? [],
      }));
      const { error } = await (supabase.from(T_ETAPAS) as any).insert(linhas);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ag_job_etapas'] });
      toast({ title: 'Etapas criadas' });
    },
    onError: (e: any) => toast({ title: 'Erro ao criar etapas', description: e.message, variant: 'destructive' }),
  });

  return { etapas, isLoading, semear };
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export function useJobs(projetoId?: string) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['ag_jobs', empresa?.id, projetoId ?? 'todos'],
    enabled: !!empresa?.id,
    queryFn: async () => {
      let q = (supabase.from(T_JOBS) as any)
        .select('*').eq('empresa_id', empresa!.id);
      if (projetoId) q = q.eq('projeto_id', projetoId);
      const { data, error } = await q.order('sequencial');
      if (error) throw error;
      return (data || []).map(mapJob);
    },
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['ag_jobs'] });
    qc.invalidateQueries({ queryKey: ['ag_projetos'] });
    qc.invalidateQueries({ queryKey: ['ag_projeto'] });
  };

  const criar = useMutation({
    mutationFn: async ({ projeto, form }: { projeto: string; form: JobFormData }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const ano = new Date().getFullYear();
      const { data: seq, error: errSeq } = await (supabase.rpc as any)('ag_proximo_numero', {
        p_empresa_id: empresa.id, p_escopo: `job:${projeto}`, p_ano: ano,
      });
      if (errSeq) throw errSeq;

      const { data, error } = await (supabase.from(T_JOBS) as any).insert({
        empresa_id: empresa.id,
        projeto_id: projeto,
        sequencial: seq,
        titulo: form.titulo.trim(),
        descricao: form.descricao || null,
        etapa_id: form.etapaId,
        responsavel_id: form.responsavelId,
        responsavel_nome: form.responsavelNome || null,
        prazo: form.prazo || null,
        horas_previstas: form.horasPrevistas,
      }).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => { invalidar(); toast({ title: 'Job criado' }); },
    onError: (e: any) => toast({ title: 'Erro ao criar job', description: e.message, variant: 'destructive' }),
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<JobFormData> & { concluido?: boolean } }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const p: any = {};
      if (patch.titulo !== undefined)          p.titulo = patch.titulo.trim();
      if (patch.descricao !== undefined)       p.descricao = patch.descricao || null;
      if (patch.etapaId !== undefined)         p.etapa_id = patch.etapaId;
      if (patch.responsavelId !== undefined)   p.responsavel_id = patch.responsavelId;
      if (patch.responsavelNome !== undefined) p.responsavel_nome = patch.responsavelNome || null;
      if (patch.prazo !== undefined)           p.prazo = patch.prazo || null;
      if (patch.horasPrevistas !== undefined)  p.horas_previstas = patch.horasPrevistas;
      if (patch.concluido !== undefined) {
        p.concluido = patch.concluido;
        p.concluido_em = patch.concluido ? new Date().toISOString() : null;
      }
      p.atualizado_em = new Date().toISOString();
      const { error } = await (supabase.from(T_JOBS) as any)
        .update(p).eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => invalidar(),
    onError: (e: any) => toast({ title: 'Erro ao atualizar job', description: e.message, variant: 'destructive' }),
  });

  /**
   * Mover no kanban. Se a etapa de destino for final, conclui o job.
   *
   * Passa pelo MESMO motor dos Quadros: a etapa de destino diz o que exige, e a
   * entrada dispara as automações da empresa. Devolve o que faltou em vez de
   * recusar em silêncio.
   */
  const moverEtapa = useMutation({
    mutationFn: async (
      { id, etapa, estadoOrigem }:
      { id: string; etapa: JobEtapa; estadoOrigem: string | null },
    ): Promise<{ ok: boolean; campos: string[]; mensagem?: string }> => {
      if (!empresa) throw new Error('Sem empresa ativa.');

      if (etapa.bloqueada) {
        return { ok: false, campos: [], mensagem: `"${etapa.nome}" não aceita jobs arrastados.` };
      }

      const faltam = await camposEmFaltaJob(id, etapa.id);
      if (faltam.length > 0) {
        return { ok: false, campos: faltam, mensagem: descreveFalta(faltam) };
      }

      const { error } = await (supabase.from(T_JOBS) as any).update({
        etapa_id: etapa.id,
        concluido: etapa.final,
        concluido_em: etapa.final ? new Date().toISOString() : null,
        atualizado_em: new Date().toISOString(),
      }).eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;

      await dispararAutomacoesJob({
        empresaId: empresa.id,
        jobId: id,
        estadoOrigem,
        estadoDestino: etapa.estadoCodigo ?? null,
      });

      return { ok: true, campos: [] };
    },
    onSuccess: () => invalidar(),
    onError: (e: any) => toast({ title: 'Erro ao mover job', description: e.message, variant: 'destructive' }),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(T_JOBS) as any)
        .delete().eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidar(); toast({ title: 'Job eliminado' }); },
    onError: (e: any) => toast({ title: 'Não foi possível eliminar', description: e.message, variant: 'destructive' }),
  });

  return { jobs, isLoading, criar, atualizar, moverEtapa, eliminar };
}

// ── Tarefas do job ───────────────────────────────────────────────────────────

export function useJobTarefas(jobId?: string) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: tarefas = [], isLoading } = useQuery<JobTarefa[]>({
    queryKey: ['ag_job_tarefas', jobId, empresa?.id],
    enabled: !!jobId && !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(T_TAREFAS) as any)
        .select('*').eq('job_id', jobId).eq('empresa_id', empresa!.id).order('ordem');
      if (error) throw error;
      return (data || []).map(mapTarefa);
    },
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['ag_job_tarefas', jobId] });

  const criar = useMutation({
    mutationFn: async (titulo: string) => {
      if (!empresa || !jobId) throw new Error('Sem job ativo.');
      const ordem = tarefas.length;
      const { error } = await (supabase.from(T_TAREFAS) as any).insert({
        empresa_id: empresa.id, job_id: jobId, ordem, titulo: titulo.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => invalidar(),
    onError: (e: any) => toast({ title: 'Erro ao criar tarefa', description: e.message, variant: 'destructive' }),
  });

  const alternar = useMutation({
    mutationFn: async ({ id, concluida }: { id: string; concluida: boolean }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(T_TAREFAS) as any).update({
        concluida, concluida_em: concluida ? new Date().toISOString() : null,
      }).eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => invalidar(),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<JobTarefa> }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const p: any = {};
      if (patch.titulo !== undefined)          p.titulo = patch.titulo;
      if (patch.responsavelId !== undefined)   p.responsavel_id = patch.responsavelId;
      if (patch.responsavelNome !== undefined) p.responsavel_nome = patch.responsavelNome;
      if (patch.prazo !== undefined)           p.prazo = patch.prazo || null;
      if (patch.horasPrevistas !== undefined)  p.horas_previstas = patch.horasPrevistas;
      const { error } = await (supabase.from(T_TAREFAS) as any)
        .update(p).eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => invalidar(),
    onError: (e: any) => toast({ title: 'Erro ao atualizar tarefa', description: e.message, variant: 'destructive' }),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(T_TAREFAS) as any)
        .delete().eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => invalidar(),
    onError: (e: any) => toast({ title: 'Erro ao eliminar tarefa', description: e.message, variant: 'destructive' }),
  });

  return { tarefas, isLoading, criar, alternar, atualizar, eliminar };
}
