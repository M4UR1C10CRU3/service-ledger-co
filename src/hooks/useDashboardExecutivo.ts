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

export function useDashboardExecutivo() {
  const { empresa } = useEmpresa();
  const [metrics, setMetrics] = useState<DashboardExecutivoMetrics>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);

    const today = new Date().toISOString().split('T')[0];
    const in30d = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const ago30d = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const eid = empresa.id;

    const [ppRes, osRes, neRes, teRes, propRes, ppProxRes, osRecRes] = await Promise.all([
      supabase.from('plano_pagamentos')
        .select('valor, estado, data_prevista')
        .eq('empresa_id', eid),
      supabase.from('ordens_servico')
        .select('id, estado')
        .eq('empresa_id', eid),
      supabase.from('notas_encomenda')
        .select('id, estado')
        .eq('empresa_id', eid),
      supabase.from('trabalhos_extra')
        .select('id, valor, estado')
        .eq('empresa_id', eid),
      supabase.from('propostas')
        .select('id, estado')
        .eq('empresa_id', eid),
      supabase.from('plano_pagamentos')
        .select('id, proposta_id, descricao, valor, data_prevista, estado')
        .eq('empresa_id', eid)
        .in('estado', ['pendente', 'aguarda_comprovativo'])
        .order('data_prevista')
        .limit(10),
      supabase.from('ordens_servico')
        .select('id, numero_os, cliente_nome, estado, prioridade, created_at')
        .eq('empresa_id', eid)
        .neq('estado', 'cancelada')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const pp = ppRes.data || [];
    const os = osRes.data || [];
    const ne = neRes.data || [];
    const te = teRes.data || [];
    const prop = propRes.data || [];

    const isPending = (r: any) => r.estado === 'pendente' || r.estado === 'aguarda_comprovativo';

    setMetrics({
      cobrancasPagas30d: pp
        .filter(r => r.estado === 'pago' && r.data_prevista >= ago30d)
        .reduce((s, r) => s + Number(r.valor), 0),

      cobrancasPendentes: pp
        .filter(isPending)
        .reduce((s, r) => s + Number(r.valor), 0),

      cobrancasVencidas: pp
        .filter(r => isPending(r) && r.data_prevista && r.data_prevista < today)
        .reduce((s, r) => s + Number(r.valor), 0),

      cobrancasProximas30d: pp
        .filter(r => isPending(r) && r.data_prevista && r.data_prevista >= today && r.data_prevista <= in30d)
        .reduce((s, r) => s + Number(r.valor), 0),

      osEmExecucao: os.filter(r => r.estado === 'em_execucao').length,
      osAbertas: os.filter(r => ['nova', 'aprovada', 'em_execucao'].includes(r.estado)).length,

      neCurso: ne.filter(r => !['cancelada', 'faturada'].includes(r.estado)).length,

      extrasAprovar: te.filter(r => r.estado === 'pendente_aprovacao').length,
      extrasAprovarValor: te
        .filter(r => r.estado === 'pendente_aprovacao')
        .reduce((s, r) => s + Number(r.valor), 0),

      propostasEnviadas: prop.filter(r => r.estado === 'enviada').length,

      proximasCobrancas: (ppProxRes.data || []).map(r => ({
        id: r.id,
        propostaId: r.proposta_id,
        descricao: r.descricao || '—',
        valor: Number(r.valor),
        dataPrevista: r.data_prevista,
        estado: r.estado,
      })),

      osRecentes: (osRecRes.data || []).map(r => ({
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
