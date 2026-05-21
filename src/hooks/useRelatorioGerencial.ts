import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';

export type PeriodoTipo = 'mes_atual' | 'mes_anterior' | 'trimestre' | 'ano' | 'personalizado';

export interface PeriodoRange {
  inicio: string;
  fim: string;
  label: string;
}

export function getPeriodoRange(tipo: PeriodoTipo, custom?: { inicio: string; fim: string }): PeriodoRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  switch (tipo) {
    case 'mes_atual': {
      const inicio = `${y}-${pad(m + 1)}-01`;
      const fim = fmt(new Date(y, m + 1, 0));
      return { inicio, fim, label: `${monthNames[m]} ${y}` };
    }
    case 'mes_anterior': {
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      const inicio = `${py}-${pad(pm + 1)}-01`;
      const fim = fmt(new Date(py, pm + 1, 0));
      return { inicio, fim, label: `${monthNames[pm]} ${py}` };
    }
    case 'trimestre': {
      const q = Math.floor(m / 3);
      const inicio = `${y}-${pad(q * 3 + 1)}-01`;
      const fim = fmt(new Date(y, q * 3 + 3, 0));
      return { inicio, fim, label: `Q${q + 1} ${y}` };
    }
    case 'ano': {
      return { inicio: `${y}-01-01`, fim: `${y}-12-31`, label: `Ano ${y}` };
    }
    case 'personalizado': {
      if (custom) return { ...custom, label: `${custom.inicio} → ${custom.fim}` };
      return { inicio: `${y}-01-01`, fim: fmt(now), label: 'Personalizado' };
    }
  }
}

export interface RelatorioData {
  periodo: PeriodoRange;
  geradoEm: string;
  empresaNome: string;
  cobrancasPagas: number;
  cobrancasPendentes: number;
  cobrancasVencidas: number;
  totalCobrancas: number;
  osConcluidas: number;
  osFaturadas: number;
  osAbertas: number;
  osTotal: number;
  propostasEnviadas: number;
  propostasAceites: number;
  valorAdjudicado: number;
  extrasAprovados: number;
  valorExtrasAprovados: number;
  extrasAprovar: number;
  valorExtrasAprovar: number;
  neRecebidas: number;
  neCurso: number;
}

export function useRelatorioGerencial() {
  const { empresa } = useEmpresa();
  const [data, setData] = useState<RelatorioData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const gerar = useCallback(async (periodo: PeriodoRange) => {
    if (!empresa) return;
    setIsLoading(true);

    const eid = empresa.id;
    const { inicio, fim } = periodo;

    const [ppRes, osRes, propRes, teRes, neRes] = await Promise.all([
      supabase.from('plano_pagamentos').select('valor, estado, data_prevista').eq('empresa_id', eid),
      supabase.from('ordens_servico').select('id, estado, created_at').eq('empresa_id', eid),
      supabase.from('propostas').select('id, estado, total_com_iva, created_at').eq('empresa_id', eid),
      supabase.from('trabalhos_extra').select('id, valor, estado, created_at').eq('empresa_id', eid),
      supabase.from('notas_encomenda').select('id, estado, created_at').eq('empresa_id', eid),
    ]);

    const pp = ppRes.data || [];
    const os = osRes.data || [];
    const prop = propRes.data || [];
    const te = teRes.data || [];
    const ne = neRes.data || [];

    const inPeriod = (dateStr: string | null) =>
      dateStr && dateStr >= inicio && dateStr <= fim + 'T23:59:59';

    const today = new Date().toISOString().split('T')[0];
    const isPending = (r: any) => r.estado === 'pendente' || r.estado === 'aguarda_comprovativo';

    setData({
      periodo,
      geradoEm: new Date().toLocaleString('pt-PT'),
      empresaNome: empresa.nome,

      cobrancasPagas: pp.filter(r => r.estado === 'pago' && inPeriod(r.data_prevista)).reduce((s, r) => s + Number(r.valor), 0),
      cobrancasPendentes: pp.filter(r => isPending(r) && (!r.data_prevista || r.data_prevista >= today)).reduce((s, r) => s + Number(r.valor), 0),
      cobrancasVencidas: pp.filter(r => isPending(r) && r.data_prevista && r.data_prevista < today).reduce((s, r) => s + Number(r.valor), 0),
      totalCobrancas: pp.reduce((s, r) => s + Number(r.valor), 0),

      osConcluidas: os.filter(r => r.estado === 'concluida' && inPeriod(r.created_at)).length,
      osFaturadas: os.filter(r => r.estado === 'faturada' && inPeriod(r.created_at)).length,
      osAbertas: os.filter(r => ['nova', 'aprovada', 'em_execucao'].includes(r.estado)).length,
      osTotal: os.length,

      propostasEnviadas: prop.filter(r => r.estado === 'enviada' && inPeriod(r.created_at)).length,
      propostasAceites: prop.filter(r => r.estado === 'aceite' && inPeriod(r.created_at)).length,
      valorAdjudicado: prop.filter(r => r.estado === 'aceite').reduce((s, r) => s + Number(r.total_com_iva), 0),

      extrasAprovados: te.filter(r => r.estado === 'aprovado' && inPeriod(r.created_at)).length,
      valorExtrasAprovados: te.filter(r => r.estado === 'aprovado').reduce((s, r) => s + Number(r.valor), 0),
      extrasAprovar: te.filter(r => r.estado === 'pendente_aprovacao').length,
      valorExtrasAprovar: te.filter(r => r.estado === 'pendente_aprovacao').reduce((s, r) => s + Number(r.valor), 0),

      neRecebidas: ne.filter(r => r.estado === 'recebida' && inPeriod(r.created_at)).length,
      neCurso: ne.filter(r => !['cancelada', 'faturada', 'recebida'].includes(r.estado)).length,
    });

    setIsLoading(false);
  }, [empresa]);

  return { data, isLoading, gerar };
}
