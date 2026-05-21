import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrabalhoExtra, TeEstado, TeFormData } from '@/types/trabalhoExtra';
import { useToast } from '@/hooks/use-toast';

function mapTe(r: any): TrabalhoExtra {
  return {
    id: r.id, empresaId: r.empresa_id, osId: r.os_id,
    descricao: r.descricao, quantidade: Number(r.quantidade),
    precoUnit: Number(r.preco_unit), total: Number(r.total),
    estado: r.estado, aprovadoPor: r.aprovado_por,
    dataAprovacao: r.data_aprovacao, observacoes: r.observacoes,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export function useTrabalhoExtra(empresaId: string | undefined) {
  const [items, setItems] = useState<TrabalhoExtra[]>([]);
  const { toast } = useToast();

  const fetchByOs = useCallback(async (osId: string): Promise<TrabalhoExtra[]> => {
    const { data } = await supabase
      .from('trabalhos_extra').select('*').eq('os_id', osId).order('created_at');
    const result = (data ?? []).map(mapTe);
    setItems(result);
    return result;
  }, []);

  const addExtra = async (osId: string, form: TeFormData): Promise<TrabalhoExtra | null> => {
    if (!empresaId) return null;
    try {
      const { data, error } = await supabase.from('trabalhos_extra').insert({
        empresa_id: empresaId, os_id: osId,
        descricao: form.descricao,
        quantidade: parseFloat(form.quantidade) || 1,
        preco_unit: parseFloat(form.precoUnit) || 0,
        observacoes: form.observacoes || null,
      }).select().single();
      if (error) throw error;
      const te = mapTe(data);
      setItems(prev => [...prev, te]);
      toast({ title: 'Trabalho extra registado ✓' });
      return te;
    } catch (e: any) {
      toast({ title: 'Erro ao registar extra', description: e.message, variant: 'destructive' });
      return null;
    }
  };

  const updateEstado = async (id: string, estado: TeEstado, aprovadoPor?: string): Promise<boolean> => {
    try {
      const payload: any = { estado, updated_at: new Date().toISOString() };
      if (estado === 'aprovado') {
        payload.aprovado_por = aprovadoPor || null;
        payload.data_aprovacao = new Date().toISOString().split('T')[0];
      }
      const { data, error } = await supabase.from('trabalhos_extra')
        .update(payload).eq('id', id).select().single();
      if (error) throw error;
      setItems(prev => prev.map(t => t.id === id ? mapTe(data) : t));
      const labels: Record<TeEstado, string> = {
        aprovado: 'Extra aprovado ✓', rejeitado: 'Extra rejeitado',
        faturado: 'Extra faturado ✓', pendente_aprovacao: 'Estado actualizado',
      };
      toast({ title: labels[estado] });
      return true;
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const deleteExtra = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('trabalhos_extra').delete().eq('id', id);
    if (!error) setItems(prev => prev.filter(t => t.id !== id));
    return !error;
  };

  const totalAprovado = items
    .filter(t => t.estado === 'aprovado' || t.estado === 'faturado')
    .reduce((s, t) => s + t.total, 0);
  const totalPendente = items
    .filter(t => t.estado === 'pendente_aprovacao')
    .reduce((s, t) => s + t.total, 0);

  return { items, fetchByOs, addExtra, updateEstado, deleteExtra, totalAprovado, totalPendente };
}
