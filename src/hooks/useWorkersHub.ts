import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Worker, WorkerExecucao, WorkerAlerta } from '@/types/workers';

export const useWorkersHub = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [execucoes, setExecucoes] = useState<WorkerExecucao[]>([]);
  const [alertas, setAlertas] = useState<WorkerAlerta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    const [{ data: w }, { data: e }, { data: a }] = await Promise.all([
      supabase.from('workers').select('*').order('nome'),
      supabase
        .from('worker_execucoes')
        .select('*')
        .order('iniciado_em', { ascending: false })
        .limit(100),
      supabase
        .from('worker_alertas')
        .select('*')
        .eq('resolvido', false)
        .order('created_at', { ascending: false }),
    ]);
    if (w) setWorkers(w as Worker[]);
    if (e) setExecucoes(e as WorkerExecucao[]);
    if (a) setAlertas(a as WorkerAlerta[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel('workers_hub_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_execucoes' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_alertas' }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  const resolverAlerta = async (id: string) => {
    await supabase
      .from('worker_alertas')
      .update({ resolvido: true, resolvido_em: new Date().toISOString() })
      .eq('id', id);
    setAlertas(prev => prev.filter(a => a.id !== id));
  };

  const getUltimaExecucao = (workerId: string): WorkerExecucao | undefined =>
    execucoes.find(e => e.worker_id === workerId);

  const getExecucoesWorker = (workerId: string): WorkerExecucao[] =>
    execucoes.filter(e => e.worker_id === workerId);

  const getAlertasWorker = (workerId: string): WorkerAlerta[] =>
    alertas.filter(a => a.worker_id === workerId);

  return {
    workers,
    execucoes,
    alertas,
    isLoading,
    resolverAlerta,
    getUltimaExecucao,
    getExecucoesWorker,
    getAlertasWorker,
    totalCriticos: alertas.filter(a => a.severidade === 'critico').length,
    totalModerados: alertas.filter(a => a.severidade === 'moderado').length,
    workersOk: workers.filter(w => getUltimaExecucao(w.id)?.status === 'ok').length,
    refresh: loadAll,
  };
};
