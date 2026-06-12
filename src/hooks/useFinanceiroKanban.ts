import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FasePagamento = 'pendente' | 'comprovativo_enviado' | 'confirmado';
export type FaseRecebimento = 'aguardando' | 'fatura_enviada' | 'parcial' | 'recebido';
export type FaseCobranca = 'em_debito' | 'primeira_cobranca' | 'segunda_cobranca' | 'em_acordo' | 'liquidado';

export interface PagamentoCard {
  id: string;
  numero: string;
  titulo: string;
  fornecedorId: string | null;
  fornecedorNome: string | null;
  valorEstimado: number | null;
  dataNecessidade: string | null;
  estado: string;
  fasePagamento: FasePagamento;
}

export interface RecebimentoCard {
  id: string;          // service_id (string, e.g. "S001")
  clienteNome: string;
  servico: string;
  numeroFatura: string | null;
  valorTotal: number;
  liquidado: number;
  saldo: number;
  dataDate: string | null;
  email: string | null;
  faseRecebimento: FaseRecebimento;
}

export interface CobrancaCard {
  id: string;          // service_id
  clienteNome: string;
  servico: string;
  numeroFatura: string | null;
  valorTotal: number;
  liquidado: number;
  saldo: number;
  dataDate: string | null;
  email: string | null;
  telefone: string | null;
  faseCobranca: FaseCobranca;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFinanceiroKanban(empresaId: string | undefined) {
  const [pagamentos, setPagamentos] = useState<PagamentoCard[]>([]);
  const [recebimentos, setRecebimentos] = useState<RecebimentoCard[]>([]);
  const [cobrancas, setCobrancas] = useState<CobrancaCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    try {
      // Lane 1: NEs where payment is in progress (ordered, received, not yet confirmed)
      const { data: nes } = await (supabase as any)
        .from('notas_encomenda')
        .select('id, numero, titulo, fornecedor_id, fornecedor_nome, valor_estimado, data_necessidade, estado, fase_pagamento')
        .eq('empresa_id', empresaId)
        .in('estado', ['encomendada', 'recebida'])
        .neq('fase_pagamento', 'confirmado')
        .order('created_at', { ascending: false });

      setPagamentos((nes ?? []).map((r: any): PagamentoCard => ({
        id: r.id,
        numero: r.numero,
        titulo: r.titulo,
        fornecedorId: r.fornecedor_id,
        fornecedorNome: r.fornecedor_nome,
        valorEstimado: r.valor_estimado != null ? Number(r.valor_estimado) : null,
        dataNecessidade: r.data_necessidade,
        estado: r.estado,
        fasePagamento: (r.fase_pagamento as FasePagamento) ?? 'pendente',
      })));

      // Lanes 2 & 3: services with outstanding balance
      const { data: svcs } = await supabase
        .from('services')
        .select('service_id, cliente, servico, numero_fatura, valor_com_iva, liquidado, data_date, email, telefone, fase_recebimento, fase_cobranca')
        .eq('empresa_id', empresaId)
        .eq('tipo_servico', 'fatura')
        .gt('valor_com_iva', 0);

      const allSvcs: any[] = svcs ?? [];

      // Lane 2: recently issued invoices not yet paid (fase != 'recebido')
      const recRows = allSvcs.filter((r: any) => {
        const saldo = Number(r.valor_com_iva) - Number(r.liquidado ?? 0);
        const fase = r.fase_recebimento ?? 'aguardando';
        return saldo > 0 && fase !== 'recebido';
      });

      setRecebimentos(recRows.map((r: any): RecebimentoCard => ({
        id: r.service_id,
        clienteNome: r.cliente,
        servico: r.servico,
        numeroFatura: r.numero_fatura,
        valorTotal: Number(r.valor_com_iva),
        liquidado: Number(r.liquidado ?? 0),
        saldo: Number(r.valor_com_iva) - Number(r.liquidado ?? 0),
        dataDate: r.data_date,
        email: r.email,
        faseRecebimento: (r.fase_recebimento as FaseRecebimento) ?? 'aguardando',
      })));

      // Lane 3: overdue invoices (fase_cobranca driven, exclude liquidado)
      const cobRows = allSvcs.filter((r: any) => {
        const saldo = Number(r.valor_com_iva) - Number(r.liquidado ?? 0);
        const fase = r.fase_cobranca ?? 'em_debito';
        return saldo > 0 && fase !== 'liquidado';
      });

      setCobrancas(cobRows.map((r: any): CobrancaCard => ({
        id: r.service_id,
        clienteNome: r.cliente,
        servico: r.servico,
        numeroFatura: r.numero_fatura,
        valorTotal: Number(r.valor_com_iva),
        liquidado: Number(r.liquidado ?? 0),
        saldo: Number(r.valor_com_iva) - Number(r.liquidado ?? 0),
        dataDate: r.data_date,
        email: r.email,
        telefone: r.telefone,
        faseCobranca: (r.fase_cobranca as FaseCobranca) ?? 'em_debito',
      })));
    } finally {
      setIsLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const movePagamento = async (neId: string, fase: FasePagamento): Promise<void> => {
    await (supabase as any).from('notas_encomenda')
      .update({ fase_pagamento: fase, updated_at: new Date().toISOString() })
      .eq('id', neId);
    setPagamentos(prev => prev.map(p => p.id === neId ? { ...p, fasePagamento: fase } : p));
  };

  const moveRecebimento = async (serviceId: string, fase: FaseRecebimento): Promise<void> => {
    await supabase.from('services').update({ fase_recebimento: fase } as any).eq('service_id', serviceId);
    setRecebimentos(prev => prev.map(r => r.id === serviceId ? { ...r, faseRecebimento: fase } : r));
  };

  const moveCobranca = async (serviceId: string, fase: FaseCobranca): Promise<void> => {
    await supabase.from('services').update({ fase_cobranca: fase } as any).eq('service_id', serviceId);
    setCobrancas(prev => prev.map(c => c.id === serviceId ? { ...c, faseCobranca: fase } : c));
  };

  return {
    pagamentos, recebimentos, cobrancas, isLoading, refresh: fetchAll,
    movePagamento, moveRecebimento, moveCobranca,
  };
}
