import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotaEncomenda, NeItem, NeChecklistItem, NeFormData, NeEstado, NeItemForm, NE_CHECKLIST_DEFAULT } from '@/types/notaEncomenda';
import { useToast } from '@/hooks/use-toast';

function mapNe(r: any): NotaEncomenda {
  return {
    id: r.id, empresaId: r.empresa_id, numero: r.numero,
    propostaId: r.proposta_id, osId: r.os_id,
    fornecedorId: r.fornecedor_id, fornecedorNome: r.fornecedor_nome,
    estado: r.estado, prioridade: r.prioridade, titulo: r.titulo,
    descricao: r.descricao, observacoes: r.observacoes,
    dataCriacao: r.data_criacao, dataNecessidade: r.data_necessidade,
    dataEnvio: r.data_envio, dataRecepcao: r.data_recepcao,
    valorEstimado: r.valor_estimado !== null ? Number(r.valor_estimado) : null,
    valorFinal: r.valor_final !== null ? Number(r.valor_final) : null,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function mapItem(r: any): NeItem {
  return {
    id: r.id, neId: r.ne_id, descricao: r.descricao, referencia: r.referencia,
    quantidade: Number(r.quantidade), unidade: r.unidade,
    precoUnit: r.preco_unit !== null ? Number(r.preco_unit) : null,
    total: r.total !== null ? Number(r.total) : null,
    observacoes: r.observacoes, ordem: r.ordem, createdAt: r.created_at,
  };
}
function mapChecklist(r: any): NeChecklistItem {
  return { id: r.id, neId: r.ne_id, descricao: r.descricao, concluido: r.concluido, ordem: r.ordem, createdAt: r.created_at };
}

export function useNotasEncomenda(empresaId: string | undefined) {
  const [notas, setNotas] = useState<NotaEncomenda[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const fetchNotas = useCallback(async () => {
    if (!empresaId) { setIsInitialized(true); return; }
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('notas_encomenda').select('*').eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotas((data ?? []).map(mapNe));
    } catch (e: any) {
      toast({ title: 'Erro ao carregar NE', description: e.message, variant: 'destructive' });
    } finally { setIsLoading(false); setIsInitialized(true); }
  }, [empresaId]);

  useEffect(() => { fetchNotas(); }, [fetchNotas]);

  const createNota = async (form: NeFormData, items: NeItemForm[]): Promise<NotaEncomenda | null> => {
    if (!empresaId) return null;
    try {
      const { data, error } = await (supabase as any).from('notas_encomenda').insert({
        empresa_id: empresaId,
        fornecedor_id: form.fornecedorId || null,
        fornecedor_nome: form.fornecedorNome || null,
        proposta_id: form.propostaId || null,
        os_id: form.osId || null,
        estado: 'rascunho', prioridade: form.prioridade, titulo: form.titulo,
        descricao: form.descricao || null, observacoes: form.observacoes || null,
        data_criacao: form.dataCriacao,
        data_necessidade: form.dataNecessidade || null,
        valor_estimado: form.valorEstimado ? parseFloat(form.valorEstimado) : null,
      }).select().single();
      if (error) throw error;
      const ne = mapNe(data);
      if (items.length > 0) {
        await (supabase as any).from('notas_encomenda_items').insert(
          items.map((it, i) => ({
            ne_id: ne.id, descricao: it.descricao, referencia: it.referencia || null,
            quantidade: parseFloat(it.quantidade) || 1, unidade: it.unidade || 'und',
            preco_unit: it.precoUnit ? parseFloat(it.precoUnit) : null, ordem: i,
          }))
        );
      }
      await (supabase as any).from('notas_encomenda_checklist').insert(
        NE_CHECKLIST_DEFAULT.map((desc, i) => ({ ne_id: ne.id, descricao: desc, ordem: i }))
      );
      setNotas(prev => [ne, ...prev]);
      toast({ title: `NE criada: ${ne.numero}` });
      return ne;
    } catch (e: any) {
      toast({ title: 'Erro ao criar NE', description: e.message, variant: 'destructive' });
      return null;
    }
  };

  const updateNota = async (id: string, payload: Record<string, any>): Promise<boolean> => {
    try {
      const { data, error } = await (supabase as any).from('notas_encomenda')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
      if (error) throw error;
      setNotas(prev => prev.map(n => n.id === id ? mapNe(data) : n));
      return true;
    } catch (e: any) {
      toast({ title: 'Erro ao actualizar NE', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const updateEstado = async (id: string, estado: NeEstado): Promise<boolean> => {
    const extra: Record<string, any> = { estado };
    if (estado === 'enviada') extra.data_envio = new Date().toISOString().split('T')[0];
    if (estado === 'recebida') extra.data_recepcao = new Date().toISOString().split('T')[0];
    return updateNota(id, extra);
  };

  const deleteNota = async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any).from('notas_encomenda').delete().eq('id', id);
      if (error) throw error;
      setNotas(prev => prev.filter(n => n.id !== id));
      toast({ title: 'NE eliminada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const fetchItems = async (neId: string): Promise<NeItem[]> => {
    const { data } = await (supabase as any).from('notas_encomenda_items').select('*').eq('ne_id', neId).order('ordem');
    return (data ?? []).map(mapItem);
  };

  const fetchChecklist = async (neId: string): Promise<NeChecklistItem[]> => {
    const { data } = await (supabase as any).from('notas_encomenda_checklist').select('*').eq('ne_id', neId).order('ordem');
    return (data ?? []).map(mapChecklist);
  };

  const toggleChecklistItem = async (itemId: string, concluido: boolean): Promise<boolean> => {
    const { error } = await (supabase as any).from('notas_encomenda_checklist').update({ concluido }).eq('id', itemId);
    return !error;
  };

  const addChecklistItem = async (neId: string, descricao: string): Promise<NeChecklistItem | null> => {
    const { data: ex } = await (supabase as any).from('notas_encomenda_checklist').select('ordem').eq('ne_id', neId).order('ordem', { ascending: false }).limit(1);
    const nextOrdem = ex?.length ? ex[0].ordem + 1 : 0;
    const { data, error } = await (supabase as any).from('notas_encomenda_checklist').insert({ ne_id: neId, descricao, ordem: nextOrdem }).select().single();
    if (error) return null;
    return mapChecklist(data);
  };

  return {
    notas, isLoading, isInitialized, fetchNotas,
    createNota, updateNota, updateEstado, deleteNota,
    fetchItems, fetchChecklist, toggleChecklistItem, addChecklistItem,
  };
}
