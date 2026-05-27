import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OrdemServico, OsChecklistItem, OsFormData, OsEstado } from '@/types/ordemServico';
import { useToast } from '@/hooks/use-toast';

function mapOs(row: any): OrdemServico {
  return {
    id: row.id, empresaId: row.empresa_id, numero: row.numero,
    clienteId: row.cliente_id, clienteNome: row.cliente_nome,
    propostaId: row.proposta_id, responsavelId: row.responsavel_id,
    responsavelNome: row.responsavel_nome, estado: row.estado,
    prioridade: row.prioridade, titulo: row.titulo, descricao: row.descricao,
    observacoes: row.observacoes, dataAbertura: row.data_abertura,
    dataPrevista: row.data_prevista, dataInicio: row.data_inicio,
    dataConclusao: row.data_conclusao, valorEstimado: row.valor_estimado,
    valorFinal: row.valor_final, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapChecklist(row: any): OsChecklistItem {
  return {
    id: row.id, osId: row.os_id, titulo: row.titulo,
    responsavelNome: row.responsavel_nome ?? null,
    prazo: row.prazo ?? null,
    concluido: row.concluido, concluidoEm: row.concluido_em ?? null,
    ordem: row.ordem, createdAt: row.created_at,
  };
}

export function useOrdensServico(empresaId: string | undefined) {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const fetchOrdens = useCallback(async () => {
    if (!empresaId) { setIsInitialized(true); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrdens((data ?? []).map(mapOs));
    } catch (e: any) {
      toast({ title: 'Erro ao carregar OS', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [empresaId]);

  useEffect(() => { fetchOrdens(); }, [fetchOrdens]);

  const applyTemplate = async (osId: string, templateId: string, dataAbertura: string) => {
    const { data: items } = await (supabase as any)
      .from('os_checklist_template_itens').select('*').eq('template_id', templateId).order('ordem');
    if (!items || items.length === 0) return;
    const base = new Date(dataAbertura + 'T00:00:00');
    const rows = items.map((it: any) => {
      let prazo: string | null = null;
      if (it.dias_offset != null) {
        const d = new Date(base); d.setDate(d.getDate() + it.dias_offset);
        prazo = d.toISOString().split('T')[0];
      }
      return {
        os_id: osId,
        titulo: it.titulo,
        responsavel_nome: it.responsavel_padrao,
        prazo,
        ordem: it.ordem,
      };
    });
    await (supabase as any).from('ordens_servico_checklist').insert(rows);
  };

  const createOrdem = async (form: OsFormData): Promise<OrdemServico | null> => {
    if (!empresaId) return null;
    try {
      const { data, error } = await supabase.from('ordens_servico').insert({
        empresa_id: empresaId,
        cliente_id: form.clienteId || null,
        cliente_nome: form.clienteNome,
        proposta_id: form.propostaId || null,
        responsavel_id: form.responsavelId || null,
        responsavel_nome: form.responsavelNome || null,
        estado: form.estado,
        prioridade: form.prioridade,
        titulo: form.titulo,
        descricao: form.descricao || null,
        observacoes: form.observacoes || null,
        data_abertura: form.dataAbertura,
        data_prevista: form.dataPrevista || null,
        valor_estimado: form.valorEstimado ? parseFloat(form.valorEstimado) : null,
        ...(form.templateId ? { template_id: form.templateId } : {}),
      }).select().single();
      if (error) throw error;
      const os = mapOs(data);
      if (form.templateId) {
        try { await applyTemplate(os.id, form.templateId, form.dataAbertura); } catch (e) { console.error(e); }
      }
      setOrdens(prev => [os, ...prev]);
      toast({ title: `OS criada: ${os.numero}` });
      return os;
    } catch (e: any) {
      toast({ title: 'Erro ao criar OS', description: e.message, variant: 'destructive' });
      return null;
    }
  };

  const updateOrdem = async (id: string, payload: Record<string, any>): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from('ordens_servico')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
      if (error) throw error;
      setOrdens(prev => prev.map(o => o.id === id ? mapOs(data) : o));
      return true;
    } catch (e: any) {
      toast({ title: 'Erro ao actualizar OS', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const updateEstado = async (id: string, estado: OsEstado): Promise<boolean> => {
    const extra: Record<string, any> = { estado };
    if (estado === 'em_execucao') extra.data_inicio = new Date().toISOString().split('T')[0];
    if (estado === 'concluida' || estado === 'faturada') extra.data_conclusao = new Date().toISOString().split('T')[0];
    return updateOrdem(id, extra);
  };

  const deleteOrdem = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('ordens_servico').delete().eq('id', id);
      if (error) throw error;
      setOrdens(prev => prev.filter(o => o.id !== id));
      toast({ title: 'OS eliminada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Erro ao eliminar OS', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const fetchChecklist = async (osId: string): Promise<OsChecklistItem[]> => {
    const { data } = await supabase.from('ordens_servico_checklist')
      .select('*').eq('os_id', osId).order('ordem');
    return (data ?? []).map(mapChecklist);
  };

  const addChecklistItem = async (osId: string, descricao: string): Promise<OsChecklistItem | null> => {
    const { data: existing } = await supabase.from('ordens_servico_checklist')
      .select('ordem').eq('os_id', osId).order('ordem', { ascending: false }).limit(1);
    const nextOrdem = existing?.length ? existing[0].ordem + 1 : 0;
    const { data, error } = await supabase.from('ordens_servico_checklist')
      .insert({ os_id: osId, descricao, ordem: nextOrdem }).select().single();
    if (error) return null;
    return mapChecklist(data);
  };

  const toggleChecklistItem = async (itemId: string, concluido: boolean): Promise<boolean> => {
    const { error } = await supabase.from('ordens_servico_checklist')
      .update({ concluido }).eq('id', itemId);
    return !error;
  };

  const deleteChecklistItem = async (itemId: string): Promise<boolean> => {
    const { error } = await supabase.from('ordens_servico_checklist')
      .delete().eq('id', itemId);
    return !error;
  };

  return {
    ordens, isLoading, isInitialized, fetchOrdens,
    createOrdem, updateOrdem, updateEstado, deleteOrdem,
    fetchChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem,
  };
}
