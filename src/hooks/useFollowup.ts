import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import type { Oportunidade, Contacto, HistoricoFase, FaseFollowup, Sentimento, TipoContacto } from '@/types/followup';

function mapOportunidade(r: any): Oportunidade {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    clienteId: r.cliente_id,
    clienteNome: r.cliente_nome,
    propostaId: r.proposta_id,
    titulo: r.titulo,
    fase: r.fase as FaseFollowup,
    responsavelId: r.responsavel_id,
    responsavelNome: r.responsavel_nome,
    probabilidade: r.probabilidade ?? 25,
    valorEstimado: r.valor_estimado ? Number(r.valor_estimado) : null,
    dataAdjudicacaoEsperada: r.data_adjudicacao_esperada,
    dataAdjudicacaoReal: r.data_adjudicacao_real,
    motivoArquivo: r.motivo_arquivo,
    sentimentoAtual: (r.sentimento_atual || 'desconhecido') as Sentimento,
    dataUltimoContacto: r.data_ultimo_contacto,
    proximoFollowupData: r.proximo_followup_data,
    proximoFollowupTipo: r.proximo_followup_tipo,
    proximoFollowupNotas: r.proximo_followup_notas,
    notasInternas: r.notas_internas,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    numeroProposta: r.propostas?.numero_proposta,
    totalComIva: r.propostas?.total_com_iva ? Number(r.propostas.total_com_iva) : undefined,
  };
}

function mapContacto(r: any): Contacto {
  return {
    id: r.id,
    oportunidadeId: r.oportunidade_id,
    empresaId: r.empresa_id,
    dataContacto: r.data_contacto,
    tipoContacto: r.tipo_contacto as TipoContacto,
    resultado: r.resultado,
    feedbackCliente: r.feedback_cliente,
    sentimento: (r.sentimento || 'desconhecido') as Sentimento,
    probabilidadeApos: r.probabilidade_apos,
    faseAnterior: r.fase_anterior,
    faseNova: r.fase_nova,
    proximoFollowupData: r.proximo_followup_data,
    proximoFollowupTipo: r.proximo_followup_tipo,
    proximoFollowupNotas: r.proximo_followup_notas,
    utilizadorId: r.utilizador_id,
    utilizadorNome: r.utilizador_nome,
    createdAt: r.created_at,
  };
}

function mapHistorico(r: any): HistoricoFase {
  return {
    id: r.id,
    oportunidadeId: r.oportunidade_id,
    empresaId: r.empresa_id,
    faseAnterior: r.fase_anterior,
    faseNova: r.fase_nova,
    dataTransicao: r.data_transicao,
    utilizadorId: r.utilizador_id,
    utilizadorNome: r.utilizador_nome,
    contactoId: r.contacto_id,
    notas: r.notas,
  };
}

export function useFollowup() {
  const { empresa } = useEmpresa();
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOportunidades = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('followup_oportunidades')
      .select('*, propostas(numero_proposta, total_com_iva)')
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setOportunidades(data.map(mapOportunidade));
    }
    setIsLoading(false);
  }, [empresa]);

  useEffect(() => { fetchOportunidades(); }, [fetchOportunidades]);

  const createOportunidade = async (data: {
    clienteId?: string | null;
    clienteNome?: string;
    propostaId?: string | null;
    titulo: string;
    fase?: FaseFollowup;
    responsavelNome?: string;
    probabilidade?: number;
    valorEstimado?: number | null;
    dataAdjudicacaoEsperada?: string | null;
    proximoFollowupData?: string | null;
    proximoFollowupTipo?: string | null;
    proximoFollowupNotas?: string | null;
  }): Promise<string | null> => {
    if (!empresa) return null;
    const { data: row, error } = await supabase.from('followup_oportunidades').insert({
      empresa_id: empresa.id,
      cliente_id: data.clienteId || null,
      cliente_nome: data.clienteNome || null,
      proposta_id: data.propostaId || null,
      titulo: data.titulo,
      fase: data.fase || 'contacto_inicial',
      responsavel_nome: data.responsavelNome || null,
      probabilidade: data.probabilidade ?? 25,
      valor_estimado: data.valorEstimado ?? null,
      data_adjudicacao_esperada: data.dataAdjudicacaoEsperada || null,
      proximo_followup_data: data.proximoFollowupData || null,
      proximo_followup_tipo: data.proximoFollowupTipo || null,
      proximo_followup_notas: data.proximoFollowupNotas || null,
    }).select('id').single();
    if (error || !row) { console.error(error); return null; }

    // Record initial phase
    await supabase.from('followup_historico_fases').insert({
      oportunidade_id: row.id,
      empresa_id: empresa.id,
      fase_nova: data.fase || 'contacto_inicial',
      notas: 'Criação da oportunidade',
    });

    await fetchOportunidades();
    return row.id;
  };

  const updateOportunidade = async (id: string, updates: Record<string, any>): Promise<boolean> => {
    const { error } = await supabase.from('followup_oportunidades').update(updates).eq('id', id);
    if (error) { console.error(error); return false; }
    await fetchOportunidades();
    return true;
  };

  const updateFase = async (id: string, novaFase: FaseFollowup, motivo?: string): Promise<boolean> => {
    if (!empresa) return false;
    const opp = oportunidades.find(o => o.id === id);
    if (!opp) return false;
    const updates: Record<string, any> = { fase: novaFase };
    if (novaFase === 'adjudicado') updates.data_adjudicacao_real = new Date().toISOString().split('T')[0];
    if (novaFase === 'arquivado' && motivo) updates.motivo_arquivo = motivo;
    if (novaFase === 'adjudicado') updates.probabilidade = 100;

    const { error } = await supabase.from('followup_oportunidades').update(updates).eq('id', id);
    if (error) { console.error(error); return false; }

    await supabase.from('followup_historico_fases').insert({
      oportunidade_id: id,
      empresa_id: empresa.id,
      fase_anterior: opp.fase,
      fase_nova: novaFase,
      notas: motivo || null,
    });

    await fetchOportunidades();
    return true;
  };

  const deleteOportunidade = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('followup_oportunidades').delete().eq('id', id);
    if (error) { console.error(error); return false; }
    await fetchOportunidades();
    return true;
  };

  const fetchContactos = async (oportunidadeId: string): Promise<Contacto[]> => {
    const { data, error } = await supabase
      .from('followup_contactos')
      .select('*')
      .eq('oportunidade_id', oportunidadeId)
      .order('data_contacto', { ascending: false });
    if (error || !data) return [];
    return data.map(mapContacto);
  };

  const createContacto = async (oportunidadeId: string, contacto: {
    dataContacto?: string;
    tipoContacto: TipoContacto;
    resultado?: string;
    feedbackCliente?: string;
    sentimento?: Sentimento;
    probabilidadeApos?: number;
    faseNova?: FaseFollowup | null;
    proximoFollowupData?: string | null;
    proximoFollowupTipo?: string | null;
    proximoFollowupNotas?: string | null;
  }): Promise<boolean> => {
    if (!empresa) return false;
    const opp = oportunidades.find(o => o.id === oportunidadeId);
    if (!opp) return false;

    const { data: row, error } = await supabase.from('followup_contactos').insert({
      oportunidade_id: oportunidadeId,
      empresa_id: empresa.id,
      data_contacto: contacto.dataContacto || new Date().toISOString(),
      tipo_contacto: contacto.tipoContacto,
      resultado: contacto.resultado || null,
      feedback_cliente: contacto.feedbackCliente || null,
      sentimento: contacto.sentimento || 'desconhecido',
      probabilidade_apos: contacto.probabilidadeApos ?? opp.probabilidade,
      fase_anterior: contacto.faseNova ? opp.fase : null,
      fase_nova: contacto.faseNova || null,
      proximo_followup_data: contacto.proximoFollowupData || null,
      proximo_followup_tipo: contacto.proximoFollowupTipo || null,
      proximo_followup_notas: contacto.proximoFollowupNotas || null,
    }).select('id').single();

    if (error || !row) { console.error(error); return false; }

    // Update opportunity
    const oppUpdates: Record<string, any> = {
      data_ultimo_contacto: contacto.dataContacto || new Date().toISOString(),
      probabilidade: contacto.probabilidadeApos ?? opp.probabilidade,
      sentimento_atual: contacto.sentimento || opp.sentimentoAtual,
    };
    if (contacto.proximoFollowupData) {
      oppUpdates.proximo_followup_data = contacto.proximoFollowupData;
      oppUpdates.proximo_followup_tipo = contacto.proximoFollowupTipo || null;
      oppUpdates.proximo_followup_notas = contacto.proximoFollowupNotas || null;
    }
    if (contacto.faseNova) {
      oppUpdates.fase = contacto.faseNova;
      if (contacto.faseNova === 'adjudicado') {
        oppUpdates.data_adjudicacao_real = new Date().toISOString().split('T')[0];
        oppUpdates.probabilidade = 100;
      }
      // Record phase change
      await supabase.from('followup_historico_fases').insert({
        oportunidade_id: oportunidadeId,
        empresa_id: empresa.id,
        fase_anterior: opp.fase,
        fase_nova: contacto.faseNova,
        contacto_id: row.id,
      });
    }

    await supabase.from('followup_oportunidades').update(oppUpdates).eq('id', oportunidadeId);
    await fetchOportunidades();
    return true;
  };

  const fetchHistorico = async (oportunidadeId: string): Promise<HistoricoFase[]> => {
    const { data, error } = await supabase
      .from('followup_historico_fases')
      .select('*')
      .eq('oportunidade_id', oportunidadeId)
      .order('data_transicao', { ascending: false });
    if (error || !data) return [];
    return data.map(mapHistorico);
  };

  return {
    oportunidades, isLoading, fetchOportunidades,
    createOportunidade, updateOportunidade, updateFase, deleteOportunidade,
    fetchContactos, createContacto, fetchHistorico,
  };
}
