import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { OrdemServico, OsChecklistItem, OsEstado, OsFormData } from '@/types/ordemServico';

function mapRow(row: any): OrdemServico {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    numero: row.numero,
    titulo: row.titulo,
    descricao: row.descricao ?? undefined,
    estado: row.estado,
    prioridade: row.prioridade,
    clienteId: row.cliente_id ?? undefined,
    clienteNome: row.cliente_nome,
    clienteTelefone: row.cliente_telefone ?? undefined,
    clienteEmail: row.cliente_email ?? undefined,
    propostaId: row.proposta_id ?? undefined,
    propostaNumero: row.proposta_numero ?? undefined,
    colaboradorId: row.colaborador_id ?? undefined,
    colaboradorNome: row.colaborador_nome ?? undefined,
    valorEstimado: parseFloat(row.valor_estimado ?? 0),
    valorFinal: parseFloat(row.valor_final ?? 0),
    dataCriacao: row.data_criacao,
    dataPrevistaInicio: row.data_prevista_inicio ?? undefined,
    dataPrevistaConclusao: row.data_prevista_conclusao ?? undefined,
    dataInicioReal: row.data_inicio_real ?? undefined,
    dataConclusaoReal: row.data_conclusao_real ?? undefined,
    serviceId: row.service_id ?? undefined,
    observacoes: row.observacoes ?? undefined,
    notasInternas: row.notas_internas ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChecklistRow(row: any): OsChecklistItem {
  return {
    id: row.id,
    osId: row.os_id,
    titulo: row.titulo,
    responsavelNome: row.responsavel_nome ?? undefined,
    prazo: row.prazo ?? undefined,
    concluido: row.concluido,
    concluidoEm: row.concluido_em ?? undefined,
    ordem: row.ordem,
  };
}

export function useOrdensServico() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrdens = useCallback(async () => {
    if (!empresa?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('ordens_servico')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrdens((data ?? []).map(mapRow));
    } catch (e) {
      console.error('useOrdensServico fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [empresa?.id]);

  useEffect(() => { fetchOrdens(); }, [fetchOrdens]);

  const createOrdem = async (form: OsFormData): Promise<OrdemServico | null> => {
    if (!empresa?.id) return null;
    try {
      const { data, error } = await (supabase as any)
        .from('ordens_servico')
        .insert({
          empresa_id: empresa.id,
          titulo: form.titulo,
          descricao: form.descricao || null,
          estado: form.estado,
          prioridade: form.prioridade,
          cliente_id: form.clienteId || null,
          cliente_nome: form.clienteNome,
          cliente_telefone: form.clienteTelefone || null,
          cliente_email: form.clienteEmail || null,
          proposta_id: form.propostaId || null,
          proposta_numero: form.propostaNumero || null,
          colaborador_id: form.colaboradorId || null,
          colaborador_nome: form.colaboradorNome || null,
          valor_estimado: parseFloat(form.valorEstimado) || 0,
          data_prevista_inicio: form.dataPrevistaInicio || null,
          data_prevista_conclusao: form.dataPrevistaConclusao || null,
          observacoes: form.observacoes || null,
          notas_internas: form.notasInternas || null,
        })
        .select()
        .single();
      if (error) throw error;
      toast({ title: `OS ${data.numero} criada com sucesso` });
      fetchOrdens();
      return mapRow(data);
    } catch (e) {
      console.error('createOrdem error:', e);
      toast({ title: 'Erro ao criar Ordem de Serviço', variant: 'destructive' });
      return null;
    }
  };

  const updateOrdem = async (id: string, form: Partial<OsFormData>): Promise<void> => {
    try {
      const updates: any = {};
      if (form.titulo !== undefined) updates.titulo = form.titulo;
      if (form.descricao !== undefined) updates.descricao = form.descricao || null;
      if (form.prioridade !== undefined) updates.prioridade = form.prioridade;
      if (form.colaboradorId !== undefined) updates.colaborador_id = form.colaboradorId || null;
      if (form.colaboradorNome !== undefined) updates.colaborador_nome = form.colaboradorNome || null;
      if (form.clienteTelefone !== undefined) updates.cliente_telefone = form.clienteTelefone || null;
      if (form.clienteEmail !== undefined) updates.cliente_email = form.clienteEmail || null;
      if (form.valorEstimado !== undefined) updates.valor_estimado = parseFloat(form.valorEstimado) || 0;
      if (form.dataPrevistaInicio !== undefined) updates.data_prevista_inicio = form.dataPrevistaInicio || null;
      if (form.dataPrevistaConclusao !== undefined) updates.data_prevista_conclusao = form.dataPrevistaConclusao || null;
      if (form.observacoes !== undefined) updates.observacoes = form.observacoes || null;
      if (form.notasInternas !== undefined) updates.notas_internas = form.notasInternas || null;
      const { error } = await (supabase as any).from('ordens_servico').update(updates).eq('id', id);
      if (error) throw error;
      fetchOrdens();
    } catch (e) {
      console.error('updateOrdem error:', e);
      toast({ title: 'Erro ao atualizar OS', variant: 'destructive' });
    }
  };

  const updateEstado = async (id: string, estado: OsEstado): Promise<void> => {
    try {
      const updates: any = { estado };
      if (estado === 'em_execucao') updates.data_inicio_real = new Date().toISOString().split('T')[0];
      if (estado === 'concluida') updates.data_conclusao_real = new Date().toISOString().split('T')[0];
      const { error } = await (supabase as any).from('ordens_servico').update(updates).eq('id', id);
      if (error) throw error;
      fetchOrdens();
    } catch (e) {
      console.error('updateEstado error:', e);
      toast({ title: 'Erro ao atualizar estado', variant: 'destructive' });
    }
  };

  const deleteOrdem = async (id: string): Promise<void> => {
    try {
      const { error } = await (supabase as any).from('ordens_servico').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'OS eliminada', variant: 'destructive' });
      fetchOrdens();
    } catch (e) {
      console.error('deleteOrdem error:', e);
      toast({ title: 'Erro ao eliminar OS', variant: 'destructive' });
    }
  };

  const fetchChecklist = async (osId: string): Promise<OsChecklistItem[]> => {
    const { data, error } = await (supabase as any)
      .from('ordens_servico_checklist')
      .select('*')
      .eq('os_id', osId)
      .order('ordem');
    if (error) return [];
    return (data ?? []).map(mapChecklistRow);
  };

  const addChecklistItem = async (osId: string, titulo: string, responsavelNome?: string, prazo?: string): Promise<void> => {
    const { data: existing } = await (supabase as any)
      .from('ordens_servico_checklist')
      .select('ordem')
      .eq('os_id', osId)
      .order('ordem', { ascending: false })
      .limit(1);
    const nextOrdem = existing?.[0]?.ordem != null ? existing[0].ordem + 1 : 0;
    await (supabase as any).from('ordens_servico_checklist').insert({
      os_id: osId, titulo, responsavel_nome: responsavelNome || null,
      prazo: prazo || null, ordem: nextOrdem,
    });
  };

  const toggleChecklistItem = async (itemId: string, concluido: boolean): Promise<void> => {
    await (supabase as any).from('ordens_servico_checklist').update({
      concluido,
      concluido_em: concluido ? new Date().toISOString() : null,
    }).eq('id', itemId);
  };

  const deleteChecklistItem = async (itemId: string): Promise<void> => {
    await (supabase as any).from('ordens_servico_checklist').delete().eq('id', itemId);
  };

  return {
    ordens, isLoading, fetchOrdens,
    createOrdem, updateOrdem, updateEstado, deleteOrdem,
    fetchChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem,
  };
}
