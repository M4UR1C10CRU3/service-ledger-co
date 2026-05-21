import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

export interface ProximaCobranca {
  id: string;
  propostaId: string;
  descricao: string;
  valor: number;
  dataPrevista: string;
  estado: string;
}

export interface OsRecente {
  id: string;
  numeroOs: string;
  clienteNome: string;
  estado: string;
  prioridade: string;
  createdAt: string;
}

export interface DashboardExecutivoMetrics {
  cobrancasPagas30d: number;
  cobrancasPendentes: number;
  cobrancasVencidas: number;
  cobrancasProximas30d: number;
  osEmExecucao: number;
  osAbertas: number;
  neCurso: number;
  extrasAprovar: number;
  extrasAprovarValor: number;
  propostasEnviadas: number;
  proximasCobrancas: ProximaCobranca[];
  osRecentes: OsRecente[];
}

const EMPTY: DashboardExecutivoMetrics = {
  cobrancasPagas30d: 0, cobrancasPendentes: 0,
  cobrancasVencidas: 0, cobrancasProximas30d: 0,
  osEmExecucao: 0, osAbertas: 0, neCurso: 0,
  extrasAprovar: 0, extrasAprovarValor: 0,
  propostasEnviadas: 0, proximasCobrancas: [], osRecentes: [],
};

const sum = (rows: any[] | null) =>
  (rows || []).reduce((s, r) => s + Number(r.valor), 0);

export function useDashboardExecutivo() {
  const { empresa } = useEmpresa();
  const [metrics, setMetrics] = useState<DashboardExecutivoMetrics>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);

    const eid    = empresa.id;
    const today  = new Date().toISOString().split('T')[0];
    const in30d  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const ago30d = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const pendentes = ['pendente', 'aguarda_comprovativo'];

    // 11 queries paralelas — cada uma pede só o que precisa
    const [
      ppPagas,
      ppPendentesRows,
      ppVencidasRows,
      ppProximas30dRows,
      osExecRes,
      osAbertasRes,
      neCursoRes,
      teAprovar,
      propEnvRes,
      ppList,
      osList,
    ] = await Promise.all([
      // Plano pagamentos — valores (1 coluna, filtrados por estado+data)
      supabase.from('plano_pagamentos').select('valor')
        .eq('empresa_id', eid).eq('estado', 'pago').gte('data_prevista', ago30d),

      supabase.from('plano_pagamentos').select('valor')
        .eq('empresa_id', eid).in('estado', pendentes).gte('data_prevista', today),

      supabase.from('plano_pagamentos').select('valor')
        .eq('empresa_id', eid).in('estado', pendentes).lt('data_prevista', today),

      supabase.from('plano_pagamentos').select('valor')
        .eq('empresa_id', eid).in('estado', pendentes)
        .gte('data_prevista', today).lte('data_prevista', in30d),

      // OS — só contagens (sem descarregar linhas)
      supabase.from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', eid).eq('estado', 'em_execucao'),

      supabase.from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', eid).in('estado', ['nova', 'aprovada', 'em_execucao']),

      // NE — só contagem
      supabase.from('notas_encomenda')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', eid)
        .neq('estado', 'cancelada').neq('estado', 'faturada'),

      // Trabalhos extra — id + valor apenas para pendentes
      supabase.from('trabalhos_extra').select('id, valor')
        .eq('empresa_id', eid).eq('estado', 'pendente_aprovacao'),

      // Propostas — só contagem
      supabase.from('propostas')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', eid).eq('estado', 'enviada'),

      // Listas para tabelas (limitadas, colunas específicas)
      supabase.from('plano_pagamentos')
        .select('id, proposta_id, descricao, valor, data_prevista, estado')
        .eq('empresa_id', eid).in('estado', pendentes)
        .order('data_prevista').limit(10),

      supabase.from('ordens_servico')
        .select('id, numero_os, cliente_nome, estado, prioridade, created_at')
        .eq('empresa_id', eid).neq('estado', 'cancelada')
        .order('created_at', { ascending: false }).limit(8),
    ]);

    const te = teAprovar.data || [];

    setMetrics({
      cobrancasPagas30d:   sum(ppPagas.data),
      cobrancasPendentes:  sum(ppPendentesRows.data),
      cobrancasVencidas:   sum(ppVencidasRows.data),
      cobrancasProximas30d: sum(ppProximas30dRows.data),
      osEmExecucao:  osExecRes.count    ?? 0,
      osAbertas:     osAbertasRes.count ?? 0,
      neCurso:       neCursoRes.count   ?? 0,
      extrasAprovar:      te.length,
      extrasAprovarValor: sum(te),
      propostasEnviadas:  propEnvRes.count ?? 0,
      proximasCobrancas: (ppList.data || []).map(r => ({
        id: r.id,
        propostaId: r.proposta_id,
        descricao: r.descricao || '—',
        valor: Number(r.valor),
        dataPrevista: r.data_prevista,
        estado: r.estado,
      })),
      osRecentes: (osList.data || []).map(r => ({
        id: r.id,
        numeroOs: r.numero_os,
        clienteNome: r.cliente_nome || '—',
        estado: r.estado,
        prioridade: r.prioridade || 'normal',
        createdAt: r.created_at,
      })),
    });

    setIsLoading(false);
  }, [empresa]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  return { metrics, isLoading, refetch: fetchMetrics };
}
