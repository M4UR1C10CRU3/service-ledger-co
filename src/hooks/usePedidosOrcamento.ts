import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { formatPoNumber } from '@/lib/empresaConfig';
import type {
  PedidoOrcamento, POLinha, POLinhaForm, POEstado, POFormData,
} from '@/types/pedidoOrcamento';

function mapPo(r: any): PedidoOrcamento {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    numeroPo: r.numero_po,
    numeroSequencial: r.numero_sequencial,
    ano: r.ano,
    clienteId: r.cliente_id,
    clienteNome: r.cliente_nome,
    clienteMorada: r.cliente_morada,
    clienteNif: r.cliente_nif,
    clienteTelefone: r.cliente_telefone,
    clienteEmail: r.cliente_email,
    vendedorId: r.vendedor_id,
    vendedorNome: r.vendedor_nome,
    titulo: r.titulo,
    descricaoNecessidade: r.descricao_necessidade,
    obra: r.obra,
    duracaoObra: r.duracao_obra,
    localExecucao: r.local_execucao,
    estado: r.estado as POEstado,
    validadeDias: r.validade_dias || 5,
    validadeTexto: r.validade_texto,
    condicoesPagamento: r.condicoes_pagamento,
    condicoesGerais: r.condicoes_gerais,
    observacoes: r.observacoes,
    propostaId: r.proposta_id,
    numeroProposta: r.numero_proposta,
    dataEmissao: r.data_emissao,
    horaEmissao: r.hora_emissao,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapLinha(r: any): POLinha {
  return {
    id: r.id,
    poId: r.po_id,
    empresaId: r.empresa_id,
    ordem: r.ordem,
    tipoLinha: r.tipo_linha,
    referencia: r.referencia,
    designacao: r.designacao,
    quantidade: Number(r.quantidade),
    unidade: r.unidade || 'und',
    observacaoLinha: r.observacao_linha,
  };
}

export function usePedidosOrcamento() {
  const { empresa } = useEmpresa();
  const [pedidos, setPedidos] = useState<PedidoOrcamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPedidos = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from('pedidos_orcamento')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: false });
    if (!error && data) setPedidos(data.map(mapPo));
    setIsLoading(false);
  }, [empresa]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  const getNextNumber = async (): Promise<{ seq: number; formatted: string }> => {
    if (!empresa) return { seq: 1, formatted: `PO ${new Date().getFullYear()}/1` };
    const ano = new Date().getFullYear();
    const { data } = await (supabase as any)
      .from('pedidos_orcamento')
      .select('numero_sequencial')
      .eq('empresa_id', empresa.id)
      .eq('ano', ano)
      .order('numero_sequencial', { ascending: false })
      .limit(1);
    const next = ((data?.[0] as any)?.numero_sequencial ?? 0) + 1;
    return { seq: next, formatted: formatPoNumber(empresa.slug, ano, next) };
  };

  const fetchLinhasPo = async (poId: string): Promise<POLinha[]> => {
    const { data, error } = await (supabase as any)
      .from('po_linhas').select('*').eq('po_id', poId).order('ordem');
    if (error || !data) return [];
    return data.map(mapLinha);
  };

  const savePedido = async (
    formData: POFormData,
    existingId?: string,
  ): Promise<string | null> => {
    if (!empresa) return null;
    const dataEmissao = formData.dataEmissao || new Date().toISOString().split('T')[0];

    const payload: any = {
      cliente_id: formData.clienteId,
      cliente_nome: formData.clienteNome,
      cliente_morada: formData.clienteMorada || null,
      cliente_nif: formData.clienteNif || null,
      cliente_telefone: formData.clienteTelefone || null,
      cliente_email: formData.clienteEmail || null,
      vendedor_nome: formData.vendedorNome || null,
      data_emissao: dataEmissao,
      titulo: formData.titulo || null,
      descricao_necessidade: formData.descricaoNecessidade || null,
      obra: formData.obra || null,
      duracao_obra: formData.duracaoObra || null,
      local_execucao: formData.localExecucao || null,
      validade_dias: formData.validadeDias || 5,
      validade_texto: formData.validadeTexto || null,
      condicoes_pagamento: formData.condicoesPagamento || null,
      condicoes_gerais: formData.condicoesGerais || null,
      observacoes: formData.observacoes || null,
    };

    let poId = existingId;
    if (existingId) {
      const { error } = await (supabase as any)
        .from('pedidos_orcamento').update(payload).eq('id', existingId);
      if (error) { console.error(error); return null; }
      await (supabase as any).from('po_linhas').delete().eq('po_id', existingId);
    } else {
      const { seq, formatted } = await getNextNumber();
      const ano = new Date().getFullYear();
      const now = new Date();
      const horaEmissao = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const { data: row, error } = await (supabase as any).from('pedidos_orcamento').insert({
        ...payload,
        empresa_id: empresa.id,
        numero_po: formatted,
        numero_sequencial: seq,
        ano,
        estado: 'recebido',
        hora_emissao: horaEmissao,
      }).select('id').single();
      if (error || !row) { console.error(error); return null; }
      poId = row.id;
    }

    if (poId && formData.linhas.length > 0) {
      const linhasInsert = formData.linhas.map((l, i) => ({
        po_id: poId,
        empresa_id: empresa.id,
        ordem: i,
        tipo_linha: l.tipoLinha,
        referencia: l.referencia || null,
        designacao: l.designacao || null,
        quantidade: l.quantidade,
        unidade: l.unidade,
        observacao_linha: l.observacaoLinha || null,
      }));
      await (supabase as any).from('po_linhas').insert(linhasInsert);
    }

    await fetchPedidos();
    return poId || null;
  };

  const updateEstado = async (poId: string, estado: POEstado): Promise<boolean> => {
    const { error } = await (supabase as any)
      .from('pedidos_orcamento').update({ estado }).eq('id', poId);
    if (error) { console.error(error); return false; }
    await fetchPedidos();
    return true;
  };

  const linkProposta = async (poId: string, propostaId: string, numeroProposta: string): Promise<boolean> => {
    const { error } = await (supabase as any)
      .from('pedidos_orcamento')
      .update({ proposta_id: propostaId, numero_proposta: numeroProposta, estado: 'proposta_elaborada' })
      .eq('id', poId);
    if (error) { console.error(error); return false; }
    await fetchPedidos();
    return true;
  };

  const deletePedido = async (poId: string): Promise<boolean> => {
    const po = pedidos.find(p => p.id === poId);
    if (po && !['recebido', 'em_analise'].includes(po.estado)) return false;
    const { error } = await (supabase as any).from('pedidos_orcamento').delete().eq('id', poId);
    if (error) { console.error(error); return false; }
    await fetchPedidos();
    return true;
  };

  return {
    pedidos, isLoading, fetchPedidos, getNextNumber,
    fetchLinhasPo, savePedido, updateEstado, linkProposta, deletePedido,
  };
}
