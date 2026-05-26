import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import type { Proposta, PropostaLinha, PropostaFormData, PropostaEstado } from '@/types/proposta';
import { formatPropostaNumber } from '@/lib/empresaConfig';

function mapProposta(r: any): Proposta {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    numeroProposta: r.numero_proposta,
    numeroSequencial: r.numero_sequencial,
    ano: r.ano,
    clienteId: r.cliente_id,
    clienteNome: r.cliente_nome,
    clienteMorada: r.cliente_morada,
    clienteNif: r.cliente_nif,
    vendedorId: r.vendedor_id,
    vendedorNome: r.vendedor_nome,
    dataEmissao: r.data_emissao,
    horaEmissao: r.hora_emissao,
    dataValidade: r.data_validade,
    validadeDias: r.validade_dias || 30,
    estado: r.estado as PropostaEstado,
    titulo: r.titulo,
    descricaoGeral: r.descricao_geral,
    taxaIva: Number(r.taxa_iva),
    totalSemIva: Number(r.total_sem_iva),
    valorIva: Number(r.valor_iva),
    totalComIva: Number(r.total_com_iva),
    condicoesGerais: r.condicoes_gerais,
    validadeTexto: r.validade_texto,
    duracao: r.duracao,
    condicoesPagamento: r.condicoes_pagamento,
    observacoes: r.observacoes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    poId: r.po_id ?? null,
    numeroPo: r.numero_po ?? null,
  };
}

function mapLinha(r: any): PropostaLinha {
  return {
    id: r.id,
    propostaId: r.proposta_id,
    empresaId: r.empresa_id,
    ordem: r.ordem,
    tipoLinha: r.tipo_linha,
    referencia: r.referencia,
    designacao: r.designacao,
    quantidade: Number(r.quantidade),
    unidade: r.unidade || 'und',
    precoUnitario: Number(r.preco_unitario),
    descontoPct: Number(r.desconto_pct),
    totalLinha: Number(r.total_linha),
    produtoId: r.produto_id,
  };
}

export function usePropostas() {
  const { empresa } = useEmpresa();
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPropostas = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('propostas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setPropostas(data.map(mapProposta));
    }
    setIsLoading(false);
  }, [empresa]);

  useEffect(() => { fetchPropostas(); }, [fetchPropostas]);

  const getNextNumber = async (): Promise<{ seq: number; formatted: string }> => {
    if (!empresa) return { seq: 1, formatted: `${new Date().getFullYear()}BO1/1` };
    const ano = new Date().getFullYear();
    const { data } = await supabase
      .from('propostas')
      .select('numero_sequencial')
      .eq('empresa_id', empresa.id)
      .eq('ano', ano)
      .order('numero_sequencial', { ascending: false })
      .limit(1);
    const next = ((data?.[0] as any)?.numero_sequencial ?? 0) + 1;
    return { seq: next, formatted: formatPropostaNumber(empresa.slug, ano, next) };
  };

  const fetchLinhas = async (propostaId: string): Promise<PropostaLinha[]> => {
    const { data, error } = await supabase
      .from('propostas_linhas')
      .select('*')
      .eq('proposta_id', propostaId)
      .order('ordem');
    if (error || !data) return [];
    return data.map(mapLinha);
  };

  const saveProposta = async (
    formData: PropostaFormData,
    estado: PropostaEstado,
    existingId?: string
  ): Promise<string | null> => {
    if (!empresa) return null;

    // Calculate totals
    const totalSemIva = formData.linhas
      .filter(l => l.tipoLinha === 'artigo')
      .reduce((sum, l) => sum + l.totalLinha, 0);
    const valorIva = totalSemIva * (formData.taxaIva / 100);
    const totalComIva = totalSemIva + valorIva;

    const dataEmissao = formData.dataEmissao || new Date().toISOString().split('T')[0];
    const validadeDias = formData.validadeDias || 30;
    const dataValidade = new Date(new Date(dataEmissao).getTime() + validadeDias * 86400000)
      .toISOString().split('T')[0];

    if (existingId) {
      // Update
      const { error } = await supabase.from('propostas').update({
        cliente_id: formData.clienteId,
        cliente_nome: formData.clienteNome,
        cliente_morada: formData.clienteMorada,
        cliente_nif: formData.clienteNif,
        vendedor_nome: formData.vendedorNome,
        data_emissao: dataEmissao,
        validade_dias: validadeDias,
        data_validade: dataValidade,
        estado,
        titulo: formData.titulo,
        descricao_geral: formData.descricaoGeral,
        taxa_iva: formData.taxaIva,
        total_sem_iva: totalSemIva,
        valor_iva: valorIva,
        total_com_iva: totalComIva,
        condicoes_gerais: formData.condicoesGerais,
        validade_texto: formData.validadeTexto,
        duracao: formData.duracao,
        condicoes_pagamento: formData.condicoesPagamento,
        observacoes: formData.observacoes,
      }).eq('id', existingId);
      if (error) { console.error(error); return null; }

      // Replace lines
      await supabase.from('propostas_linhas').delete().eq('proposta_id', existingId);
      if (formData.linhas.length > 0) {
        const linhasInsert = formData.linhas.map((l, i) => ({
          proposta_id: existingId,
          empresa_id: empresa.id,
          ordem: i,
          tipo_linha: l.tipoLinha,
          referencia: l.referencia || null,
          designacao: l.designacao || null,
          quantidade: l.quantidade,
          unidade: l.unidade,
          preco_unitario: l.precoUnitario,
          desconto_pct: l.descontoPct,
          total_linha: l.totalLinha,
          produto_id: l.produtoId || null,
        }));
        await supabase.from('propostas_linhas').insert(linhasInsert);
      }
      await fetchPropostas();
      return existingId;
    } else {
      // Create
      const { seq, formatted } = await getNextNumber();
      const ano = new Date().getFullYear();
      const now = new Date();
      const horaEmissao = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

      const { data: row, error } = await supabase.from('propostas').insert({
        empresa_id: empresa.id,
        numero_proposta: formatted,
        numero_sequencial: seq,
        ano,
        cliente_id: formData.clienteId,
        cliente_nome: formData.clienteNome,
        cliente_morada: formData.clienteMorada,
        cliente_nif: formData.clienteNif,
        vendedor_nome: formData.vendedorNome,
        data_emissao: dataEmissao,
        hora_emissao: horaEmissao,
        validade_dias: validadeDias,
        data_validade: dataValidade,
        estado,
        titulo: formData.titulo,
        descricao_geral: formData.descricaoGeral,
        taxa_iva: formData.taxaIva,
        total_sem_iva: totalSemIva,
        valor_iva: valorIva,
        total_com_iva: totalComIva,
        condicoes_gerais: formData.condicoesGerais,
        validade_texto: formData.validadeTexto,
        duracao: formData.duracao,
        condicoes_pagamento: formData.condicoesPagamento,
        observacoes: formData.observacoes,
      }).select('id').single();

      if (error || !row) { console.error(error); return null; }

      if (formData.linhas.length > 0) {
        const linhasInsert = formData.linhas.map((l, i) => ({
          proposta_id: row.id,
          empresa_id: empresa.id,
          ordem: i,
          tipo_linha: l.tipoLinha,
          referencia: l.referencia || null,
          designacao: l.designacao || null,
          quantidade: l.quantidade,
          unidade: l.unidade,
          preco_unitario: l.precoUnitario,
          desconto_pct: l.descontoPct,
          total_linha: l.totalLinha,
          produto_id: l.produtoId || null,
        }));
        await supabase.from('propostas_linhas').insert(linhasInsert);
      }
      await fetchPropostas();
      return row.id;
    }
  };

  const deleteProposta = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('propostas').delete().eq('id', id);
    if (error) { console.error(error); return false; }
    await fetchPropostas();
    return true;
  };

  const duplicateProposta = async (id: string): Promise<string | null> => {
    const original = propostas.find(p => p.id === id);
    if (!original || !empresa) return null;

    const linhas = await fetchLinhas(id);
    const { seq, formatted } = await getNextNumber();
    const ano = new Date().getFullYear();
    const now = new Date();
    const horaEmissao = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const dataEmissao = now.toISOString().split('T')[0];
    const dataValidade = new Date(now.getTime() + (original.validadeDias || 30) * 86400000).toISOString().split('T')[0];

    const { data: row, error } = await supabase.from('propostas').insert({
      empresa_id: empresa.id,
      numero_proposta: formatted,
      numero_sequencial: seq,
      ano,
      cliente_id: original.clienteId,
      cliente_nome: original.clienteNome,
      cliente_morada: original.clienteMorada,
      cliente_nif: original.clienteNif,
      vendedor_nome: original.vendedorNome,
      data_emissao: dataEmissao,
      hora_emissao: horaEmissao,
      validade_dias: original.validadeDias,
      data_validade: dataValidade,
      estado: 'rascunho',
      titulo: original.titulo,
      descricao_geral: original.descricaoGeral,
      taxa_iva: original.taxaIva,
      total_sem_iva: original.totalSemIva,
      valor_iva: original.valorIva,
      total_com_iva: original.totalComIva,
      condicoes_gerais: original.condicoesGerais,
      validade_texto: original.validadeTexto,
      duracao: original.duracao,
      condicoes_pagamento: original.condicoesPagamento,
      observacoes: original.observacoes,
    }).select('id').single();

    if (error || !row) { console.error(error); return null; }

    if (linhas.length > 0) {
      const linhasInsert = linhas.map(l => ({
        proposta_id: row.id,
        empresa_id: empresa.id,
        ordem: l.ordem,
        tipo_linha: l.tipoLinha,
        referencia: l.referencia,
        designacao: l.designacao,
        quantidade: l.quantidade,
        unidade: l.unidade,
        preco_unitario: l.precoUnitario,
        desconto_pct: l.descontoPct,
        total_linha: l.totalLinha,
        produto_id: l.produtoId,
      }));
      await supabase.from('propostas_linhas').insert(linhasInsert);
    }

    await fetchPropostas();
    return row.id;
  };

  const updateEstado = async (id: string, estado: PropostaEstado): Promise<boolean> => {
    const { error } = await supabase.from('propostas').update({ estado }).eq('id', id);
    if (error) { console.error(error); return false; }
    await fetchPropostas();
    return true;
  };

  return {
    propostas, isLoading, fetchPropostas, getNextNumber,
    fetchLinhas, saveProposta, deleteProposta, duplicateProposta, updateEstado,
  };
}
