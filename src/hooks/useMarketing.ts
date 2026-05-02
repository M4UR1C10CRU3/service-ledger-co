import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import type {
  MarketingTarefa,
  MarketingAnexo,
  MarketingComentario,
  MarketingStatus,
  MarketingPrioridade,
  MarketingTipoConteudo,
  MarketingCanal,
} from '@/types/marketing';

const BUCKET = 'marketing-entregas';

function mapTarefa(r: any): MarketingTarefa {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    titulo: r.titulo,
    descricao: r.descricao,
    tipoConteudo: r.tipo_conteudo,
    canal: r.canal,
    status: r.status,
    prioridade: r.prioridade,
    responsavelId: r.responsavel_id,
    responsavelNome: r.responsavel_nome,
    delegadoPorId: r.delegado_por_id,
    delegadoPorNome: r.delegado_por_nome,
    dataPrevista: r.data_prevista,
    dataPublicacao: r.data_publicacao,
    horaPublicacao: r.hora_publicacao,
    hashtags: r.hashtags,
    copyLegenda: r.copy_legenda,
    linkExterno: r.link_externo,
    briefing: r.briefing,
    observacoes: r.observacoes,
    ordemKanban: r.ordem_kanban ?? 0,
    arquivado: !!r.arquivado,
    arquivadoEm: r.arquivado_em,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    etapaAtual: r.etapa_atual,
    aprovadorId: r.aprovador_id,
    aprovadorNome: r.aprovador_nome,
    solicitanteId: r.solicitante_id,
    solicitanteNome: r.solicitante_nome,
    prazoBriefing: r.prazo_briefing,
    prazoCriacao: r.prazo_criacao,
    prazoRevisao: r.prazo_revisao,
    prazoAprovacao: r.prazo_aprovacao,
  };
}

function mapAnexo(r: any): MarketingAnexo {
  return {
    id: r.id,
    tarefaId: r.tarefa_id,
    empresaId: r.empresa_id,
    tipo: r.tipo,
    nome: r.nome,
    url: r.url,
    mimeType: r.mime_type,
    tamanhoBytes: r.tamanho_bytes ? Number(r.tamanho_bytes) : null,
    uploadedById: r.uploaded_by,
    uploadedByNome: r.uploaded_by_nome,
    createdAt: r.created_at,
  };
}

function mapComentario(r: any): MarketingComentario {
  return {
    id: r.id,
    tarefaId: r.tarefa_id,
    empresaId: r.empresa_id,
    autorId: r.autor_id,
    autorNome: r.autor_nome,
    conteudo: r.conteudo,
    tipo: r.tipo,
    createdAt: r.created_at,
  };
}

export interface MarketingTarefaInput {
  titulo: string;
  descricao?: string | null;
  tipoConteudo?: MarketingTipoConteudo | null;
  canal?: MarketingCanal | null;
  status?: MarketingStatus;
  prioridade?: MarketingPrioridade;
  responsavelNome?: string | null;
  delegadoPorNome?: string | null;
  dataPrevista?: string | null;
  dataPublicacao?: string | null;
  horaPublicacao?: string | null;
  hashtags?: string | null;
  copyLegenda?: string | null;
  linkExterno?: string | null;
  briefing?: string | null;
  observacoes?: string | null;
}

export function useMarketing() {
  const { empresa } = useEmpresa();
  const [tarefas, setTarefas] = useState<MarketingTarefa[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTarefas = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('marketing_tarefas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('ordem_kanban', { ascending: true })
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTarefas(data.map(mapTarefa));
    } else if (error) {
      console.error('[marketing] fetch tarefas:', error);
    }
    setIsLoading(false);
  }, [empresa]);

  useEffect(() => { fetchTarefas(); }, [fetchTarefas]);

  const createTarefa = async (input: MarketingTarefaInput): Promise<string | null> => {
    if (!empresa) return null;
    const { data: userResp } = await supabase.auth.getUser();
    const { data: row, error } = await supabase.from('marketing_tarefas').insert({
      empresa_id: empresa.id,
      titulo: input.titulo,
      descricao: input.descricao || null,
      tipo_conteudo: input.tipoConteudo || null,
      canal: input.canal || null,
      status: input.status || 'ideias',
      prioridade: input.prioridade || 'media',
      responsavel_nome: input.responsavelNome || null,
      delegado_por_nome: input.delegadoPorNome || null,
      data_prevista: input.dataPrevista || null,
      data_publicacao: input.dataPublicacao || null,
      hora_publicacao: input.horaPublicacao || null,
      hashtags: input.hashtags || null,
      copy_legenda: input.copyLegenda || null,
      link_externo: input.linkExterno || null,
      briefing: input.briefing || null,
      observacoes: input.observacoes || null,
      created_by: userResp?.user?.id || null,
    }).select('id').single();
    if (error || !row) { console.error('[marketing] create:', error); return null; }
    await fetchTarefas();
    return row.id;
  };

  const updateTarefa = async (id: string, updates: Partial<MarketingTarefaInput>): Promise<boolean> => {
    const dbUpdates: Record<string, any> = {};
    if (updates.titulo !== undefined) dbUpdates.titulo = updates.titulo;
    if (updates.descricao !== undefined) dbUpdates.descricao = updates.descricao;
    if (updates.tipoConteudo !== undefined) dbUpdates.tipo_conteudo = updates.tipoConteudo;
    if (updates.canal !== undefined) dbUpdates.canal = updates.canal;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.prioridade !== undefined) dbUpdates.prioridade = updates.prioridade;
    if (updates.responsavelNome !== undefined) dbUpdates.responsavel_nome = updates.responsavelNome;
    if (updates.delegadoPorNome !== undefined) dbUpdates.delegado_por_nome = updates.delegadoPorNome;
    if (updates.dataPrevista !== undefined) dbUpdates.data_prevista = updates.dataPrevista;
    if (updates.dataPublicacao !== undefined) dbUpdates.data_publicacao = updates.dataPublicacao;
    if (updates.horaPublicacao !== undefined) dbUpdates.hora_publicacao = updates.horaPublicacao;
    if (updates.hashtags !== undefined) dbUpdates.hashtags = updates.hashtags;
    if (updates.copyLegenda !== undefined) dbUpdates.copy_legenda = updates.copyLegenda;
    if (updates.linkExterno !== undefined) dbUpdates.link_externo = updates.linkExterno;
    if (updates.briefing !== undefined) dbUpdates.briefing = updates.briefing;
    if (updates.observacoes !== undefined) dbUpdates.observacoes = updates.observacoes;

    const { error } = await supabase.from('marketing_tarefas').update(dbUpdates).eq('id', id);
    if (error) { console.error('[marketing] update:', error); return false; }
    await fetchTarefas();
    return true;
  };

  const updateStatus = async (id: string, novoStatus: MarketingStatus): Promise<boolean> => {
    if (!empresa) return false;
    const tarefa = tarefas.find(t => t.id === id);
    if (!tarefa || tarefa.status === novoStatus) return true;

    const updates: Record<string, any> = { status: novoStatus };
    if (novoStatus === 'arquivado') {
      updates.arquivado = true;
      updates.arquivado_em = new Date().toISOString();
    } else if (tarefa.arquivado) {
      updates.arquivado = false;
      updates.arquivado_em = null;
    }

    const { error } = await supabase.from('marketing_tarefas').update(updates).eq('id', id);
    if (error) { console.error('[marketing] updateStatus:', error); return false; }

    // Registar mudança como comentário do sistema
    const { data: userResp } = await supabase.auth.getUser();
    const userName = userResp?.user?.email || 'Sistema';
    await supabase.from('marketing_comentarios').insert({
      tarefa_id: id,
      empresa_id: empresa.id,
      autor_id: userResp?.user?.id || null,
      autor_nome: userName,
      conteudo: `Status alterado de "${tarefa.status}" para "${novoStatus}".`,
      tipo: 'mudanca_status',
    });

    await fetchTarefas();
    return true;
  };

  const deleteTarefa = async (id: string): Promise<boolean> => {
    // limpar ficheiros do storage
    const { data: anexos } = await supabase
      .from('marketing_anexos')
      .select('tipo, url')
      .eq('tarefa_id', id);
    if (anexos) {
      const paths = anexos.filter(a => a.tipo === 'upload').map(a => a.url);
      if (paths.length > 0) {
        await supabase.storage.from(BUCKET).remove(paths);
      }
    }
    const { error } = await supabase.from('marketing_tarefas').delete().eq('id', id);
    if (error) { console.error('[marketing] delete:', error); return false; }
    await fetchTarefas();
    return true;
  };

  // ============= ANEXOS =============
  const fetchAnexos = async (tarefaId: string): Promise<MarketingAnexo[]> => {
    const { data, error } = await supabase
      .from('marketing_anexos')
      .select('*')
      .eq('tarefa_id', tarefaId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapAnexo);
  };

  const uploadAnexo = async (tarefaId: string, file: File): Promise<boolean> => {
    if (!empresa) return false;
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${empresa.id}/${tarefaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
    if (upErr) { console.error('[marketing] upload:', upErr); return false; }
    const { data: userResp } = await supabase.auth.getUser();
    const { error } = await supabase.from('marketing_anexos').insert({
      tarefa_id: tarefaId,
      empresa_id: empresa.id,
      tipo: 'upload',
      nome: file.name,
      url: path,
      mime_type: file.type || null,
      tamanho_bytes: file.size,
      uploaded_by: userResp?.user?.id || null,
      uploaded_by_nome: userResp?.user?.email || null,
    });
    if (error) { console.error('[marketing] anexo insert:', error); return false; }
    return true;
  };

  const addLinkAnexo = async (tarefaId: string, nome: string, url: string): Promise<boolean> => {
    if (!empresa) return false;
    const { data: userResp } = await supabase.auth.getUser();
    const { error } = await supabase.from('marketing_anexos').insert({
      tarefa_id: tarefaId,
      empresa_id: empresa.id,
      tipo: 'link',
      nome,
      url,
      uploaded_by: userResp?.user?.id || null,
      uploaded_by_nome: userResp?.user?.email || null,
    });
    if (error) { console.error('[marketing] addLink:', error); return false; }
    return true;
  };

  const deleteAnexo = async (anexo: MarketingAnexo): Promise<boolean> => {
    if (anexo.tipo === 'upload') {
      await supabase.storage.from(BUCKET).remove([anexo.url]);
    }
    const { error } = await supabase.from('marketing_anexos').delete().eq('id', anexo.id);
    if (error) { console.error('[marketing] deleteAnexo:', error); return false; }
    return true;
  };

  const getAnexoSignedUrl = async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error || !data) return null;
    return data.signedUrl;
  };

  // ============= COMENTÁRIOS =============
  const fetchComentarios = async (tarefaId: string): Promise<MarketingComentario[]> => {
    const { data, error } = await supabase
      .from('marketing_comentarios')
      .select('*')
      .eq('tarefa_id', tarefaId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map(mapComentario);
  };

  const addComentario = async (tarefaId: string, conteudo: string): Promise<boolean> => {
    if (!empresa) return false;
    const { data: userResp } = await supabase.auth.getUser();
    const { error } = await supabase.from('marketing_comentarios').insert({
      tarefa_id: tarefaId,
      empresa_id: empresa.id,
      autor_id: userResp?.user?.id || null,
      autor_nome: userResp?.user?.email || 'Utilizador',
      conteudo,
      tipo: 'comentario',
    });
    if (error) { console.error('[marketing] addComentario:', error); return false; }
    return true;
  };

  // ============= BULK CREATE (IA) =============
  const createTarefasBulk = async (inputs: MarketingTarefaInput[]): Promise<number> => {
    if (!empresa || inputs.length === 0) return 0;
    const { data: userResp } = await supabase.auth.getUser();
    const rows = inputs.map(input => ({
      empresa_id: empresa.id,
      titulo: input.titulo,
      descricao: input.descricao || null,
      tipo_conteudo: input.tipoConteudo || null,
      canal: input.canal || null,
      status: input.status || 'agendado',
      prioridade: input.prioridade || 'media',
      responsavel_nome: input.responsavelNome || null,
      delegado_por_nome: input.delegadoPorNome || null,
      data_prevista: input.dataPrevista || null,
      data_publicacao: input.dataPublicacao || null,
      hora_publicacao: input.horaPublicacao || null,
      hashtags: input.hashtags || null,
      copy_legenda: input.copyLegenda || null,
      link_externo: input.linkExterno || null,
      briefing: input.briefing || null,
      observacoes: input.observacoes || null,
      created_by: userResp?.user?.id || null,
    }));
    const { error, data } = await supabase.from('marketing_tarefas').insert(rows).select('id');
    if (error) { console.error('[marketing] bulk create:', error); return 0; }
    await fetchTarefas();
    return data?.length || 0;
  };

  // ============= AI GENERATE =============
  const generateWithAI = async (input: {
    briefing: string;
    dataInicio?: string;
    dataFim?: string;
    canais?: string[];
    qtdPublicacoes?: number;
    tom?: string;
  }): Promise<{ tarefas: MarketingTarefaInput[]; error?: string }> => {
    if (!empresa) return { tarefas: [], error: 'Empresa não selecionada' };
    const { data, error } = await supabase.functions.invoke('marketing-ai-generate', {
      body: {
        briefing: input.briefing,
        empresa_nome: empresa.nome,
        data_inicio: input.dataInicio,
        data_fim: input.dataFim,
        canais: input.canais,
        qtd_publicacoes: input.qtdPublicacoes,
        tom: input.tom,
      },
    });
    if (error) {
      console.error('[marketing] AI invoke error:', error);
      return { tarefas: [], error: error.message || 'Erro ao chamar IA' };
    }
    if (data?.error) {
      return { tarefas: [], error: data.error };
    }
    const raw = (data?.tarefas || []) as any[];
    const mapped: MarketingTarefaInput[] = raw.map(t => ({
      titulo: String(t.titulo || 'Sem título').slice(0, 200),
      tipoConteudo: t.tipo_conteudo,
      canal: t.canal,
      prioridade: t.prioridade || 'media',
      status: 'agendado',
      dataPublicacao: t.data_publicacao || null,
      horaPublicacao: t.hora_publicacao || null,
      briefing: t.briefing || null,
      copyLegenda: t.copy_legenda || null,
      hashtags: t.hashtags || null,
    }));
    return { tarefas: mapped };
  };

  return {
    tarefas, isLoading, fetchTarefas,
    createTarefa, updateTarefa, updateStatus, deleteTarefa,
    fetchAnexos, uploadAnexo, addLinkAnexo, deleteAnexo, getAnexoSignedUrl,
    fetchComentarios, addComentario,
    createTarefasBulk, generateWithAI,
  };
}
