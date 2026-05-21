import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PpModelo, PpModeloLinha } from '@/types/planoPagamento';
import { useToast } from '@/hooks/use-toast';

function mapModelo(r: any): PpModelo {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    nome: r.nome,
    descricao: r.descricao,
    isDefault: r.is_default,
    linhas: (r.linhas ?? []) as PpModeloLinha[],
    createdAt: r.created_at,
  };
}

export function usePlanoPagamentosModelos(empresaId: string | undefined) {
  const [modelos, setModelos] = useState<PpModelo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchModelos = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    const { data } = await (supabase as any)
      .from('plano_pagamentos_modelos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at');
    setModelos((data ?? []).map(mapModelo));
    setIsLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchModelos(); }, [fetchModelos]);

  const saveModelo = async (nome: string, linhas: PpModeloLinha[]): Promise<boolean> => {
    if (!empresaId) return false;
    try {
      const { error } = await (supabase as any).from('plano_pagamentos_modelos').insert({
        empresa_id: empresaId,
        nome,
        linhas,
        is_default: false,
      });
      if (error) throw error;
      await fetchModelos();
      toast({ title: `Modelo "${nome}" guardado ✓` });
      return true;
    } catch (e: any) {
      toast({ title: 'Erro ao guardar modelo', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const deleteModelo = async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any).from('plano_pagamentos_modelos').delete().eq('id', id);
      if (error) throw error;
      setModelos(prev => prev.filter(m => m.id !== id));
      toast({ title: 'Modelo eliminado' });
      return true;
    } catch (e: any) {
      toast({ title: 'Erro ao eliminar', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  return { modelos, isLoading, fetchModelos, saveModelo, deleteModelo };
}
