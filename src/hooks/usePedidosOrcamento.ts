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
    tipoPedido: (r.tipo_pedido || 'orcamentacao') as any,
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
    osId: r.os_id,
    numeroOs: r.numero_os,
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
    // Só para MOSTRAR no formulário — não reserva nada, senão cada pedido
    // começado e abandonado deixava um buraco na numeração.
    const { data } = await (supabase.rpc as any)('doc_numero_previsto', {
      p_empresa_id: empresa.id, p_tipo: 'pedido_orcamento', p_ano: ano,
    });
    const next = (data as number) ?? 1;
    return { seq: next, formatted: formatPoNumber(empresa.slug, ano, next) };
  };

  /**
   * O número definitivo, atribuído ao gravar. Antes lia-se o maior do ano e
   * somava-se um — dois utilizadores a gravar no mesmo segundo ficavam com o
   * mesmo número. A base resolve isso numa instrução indivisível.
   */
  const reservarNumero = async (): Promise<{ seq: number; formatted: string }> => {
    const ano = new Date().getFullYear();
    if (!empresa) return { seq: 1, formatted: `PO ${ano}/1` };
    const { data, error } = await (supabase.rpc as any)('doc_proximo_numero', {
      p_empresa_id: empresa.id, p_tipo: 'pedido_orcamento', p_ano: ano,
    });
    if (error) throw new Error(`Não foi possível reservar o número do pedido: ${error.message}`);
    const seq = data as number;
    return { seq, formatted: formatPoNumber(empresa.slug, ano, seq) };
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
      tipo_pedido: formData.tipoPedido || 'orcamentacao',
      cliente_id: formData.clienteId,
      cliente_nome: formData.clienteNome,
      cliente_morada: formData.clienteMorada || null,
      cliente_nif: formData.clienteNif || null,
      cliente_telefone: formData.clienteTelefone || null,
      cliente_email: formData.clienteEmail || null,
      vendedor_id: formData.vendedorId || null,
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
      const { seq, formatted } = await reservarNumero();
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

      // A oportunidade do Workflow Comercial é criada pelo trigger
      // fn_po_auto_create_oportunidade (migration 20260730120000_...sql) —
      // criá-la também aqui duplicava o registo para PDPs de orçamentação.
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

    // Progress the linked Workflow Comercial opportunity
    try {
      const { data: opp } = await (supabase as any)
        .from('followup_oportunidades').select('id, fase, empresa_id')
        .eq('po_id', poId).maybeSingle();
      if (opp?.id) {
        await (supabase as any).from('followup_oportunidades').update({
          fase: 'proposta_elaboracao', proposta_id: propostaId,
        }).eq('id', opp.id);
        await (supabase as any).from('followup_historico_fases').insert({
          oportunidade_id: opp.id, empresa_id: opp.empresa_id,
          fase_anterior: opp.fase, fase_nova: 'proposta_elaboracao',
          notas: `Proposta ${numeroProposta} criada a partir do PO`,
        });
      }
    } catch (e) { console.error('Workflow progression falhou', e); }

    await fetchPedidos();
    return true;
  };

  const linkOs = async (poId: string, osId: string, numeroOs: string): Promise<boolean> => {
    const { error } = await (supabase as any)
      .from('pedidos_orcamento')
      .update({ os_id: osId, numero_os: numeroOs, estado: 'os_criada' })
      .eq('id', poId);
    if (error) { console.error(error); return false; }

    // Progress the linked Workflow Comercial opportunity directly to "adjudicado"
    try {
      const { data: opp } = await (supabase as any)
        .from('followup_oportunidades').select('id, fase, empresa_id')
        .eq('po_id', poId).maybeSingle();
      if (opp?.id) {
        await (supabase as any).from('followup_oportunidades').update({
          fase: 'adjudicado',
        }).eq('id', opp.id);
        await (supabase as any).from('followup_historico_fases').insert({
          oportunidade_id: opp.id, empresa_id: opp.empresa_id,
          fase_anterior: opp.fase, fase_nova: 'adjudicado',
          notas: `OS ${numeroOs} criada diretamente (intervenção imediata)`,
        });
      }
    } catch (e) { console.error('Workflow progression falhou', e); }

    await fetchPedidos();
    return true;
  };

  // Nenhum PO se conseguia apagar (01/10/2026, RSPO 2026/9): o gatilho
  // fn_po_auto_create_oportunidade cria uma oportunidade no Workflow Comercial
  // por cada PO, com chave estrangeira SEM «on delete», e a base recusava. A
  // oportunidade não se apaga — só perde a ligação ao PO; nada se perde.
  const deletePedido = async (poId: string): Promise<{ ok: boolean; motivo?: string }> => {
    const sb = supabase as any;
    const po = pedidos.find(p => p.id === poId);
    if (po && !['recebido', 'em_analise'].includes(po.estado)) {
      return { ok: false, motivo: 'Só se eliminam pedidos «Recebido» ou «Em análise».' };
    }
    const { data: props } = await sb.from('propostas').select('numero_proposta').eq('po_id', poId);
    if (props?.length) {
      return { ok: false, motivo: `Tem a proposta ${props.map((p: any) => p.numero_proposta).join(', ')} ligada. Elimine ou desligue a proposta primeiro.` };
    }
    await sb.from('followup_oportunidades').update({ po_id: null }).eq('po_id', poId);
    const { data, error } = await sb.from('pedidos_orcamento').delete().eq('id', poId).select('id');
    if (error) { console.error(error); return { ok: false, motivo: error.message }; }
    if (!data?.length) return { ok: false, motivo: 'Sem permissão para eliminar este pedido.' };
    await fetchPedidos();
    return { ok: true };
  };

  return {
    pedidos, isLoading, fetchPedidos, getNextNumber,
    fetchLinhasPo, savePedido, updateEstado, linkProposta, linkOs, deletePedido,
  };
}
