import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Quadro } from '@/types/quadros';
import { useToast } from '@/hooks/use-toast';

export function useQuadros(empresaId: string | undefined) {
  const [quadros, setQuadros] = useState<Quadro[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchQuadros = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('quadros')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('arquivado', false)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      setQuadros((data as Quadro[]) || []);
    } catch {
      toast({ title: 'Erro ao carregar quadros', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, toast]);

  useEffect(() => { fetchQuadros(); }, [fetchQuadros]);

  const createQuadro = async (nome: string, cor: string, descricao?: string): Promise<Quadro | null> => {
    if (!empresaId) return null;
    const { data, error } = await supabase
      .from('quadros')
      .insert({ empresa_id: empresaId, nome, cor, descricao: descricao || null })
      .select()
      .single();
    if (error) {
      toast({ title: 'Erro ao criar quadro', variant: 'destructive' });
      return null;
    }
    await fetchQuadros();
    return data as Quadro;
  };

  const archiveQuadro = async (id: string) => {
    const { error } = await supabase.from('quadros').update({ arquivado: true }).eq('id', id);
    if (error) { toast({ title: 'Erro ao arquivar', variant: 'destructive' }); return; }
    setQuadros(prev => prev.filter(q => q.id !== id));
    toast({ title: 'Quadro arquivado' });
  };

  return { quadros, isLoading, createQuadro, archiveQuadro, refresh: fetchQuadros };
}
