import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import {
  DEFAULT_CHECKLIST_BY_FASE,
  type Oportunidade, type Contacto, type HistoricoFase,
  type FaseFollowup, type Sentimento, type TipoContacto,
  type ChecklistItem, type ChecklistItemForm,
} from '@/types/followup';

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
    poId: r.po_id,
    numeroPo: r.numero_po,
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

function mapChecklistItem(r: any): ChecklistItem {
  return {
    id: r.id,
    oportunidadeId: r.oportunidade_id,
    empresaId: r.empresa_id,
    ordem: r.ordem,
    texto: r.texto,
    concluido: !!r.concluido,
    responsavelId: r.responsavel_id,
    responsavelNome: r.responsavel_nome,
    prazo: r.prazo,
    prazoHora: r.prazo_hora,
    faseAssociada: r.fase_associada,
    concluidoPorNome: r.concluido_por_nome,
    concluidoEm: r.concluido_em,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
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
      const mapped = data.map(mapOportunidade);
      // Fetch checklist stats for all opportunities
      const oppIds = mapped.map(o => o.id);
      if (oppIds.length > 0) {
        const { data: stats } = await (supabase as any)
          .from('workflow_checklist_items')
          .select('oportunidade_id, concluido')
          .in('oportunidade_id', oppIds);
        if (stats) {
          const statsMap: Record<string, { total: number; done: number }> = {};
          for (const s of stats as any[]) {
            const k = s.oportunidade_id;
            statsMap[k] = statsMap[k] || { total: 0, done: 0 };
            statsMap[k].total += 1;
            if (s.concluido) statsMap[k].done += 1;
          }
          for (const o of mapped) {
            const st = statsMap[o.id];
            o.checklistTotal = st?.total ?? 0;
            o.checklistDone = st?.done ?? 0;
          }
        }
      }
      setOportunidades(mapped);
    }
    setIsLoading(false);
  }, [empresa]);

  useEffect(() => { fetchOportunidades(); }, [fetchOportunidades]);

  // ===== Checklist helpers =====

  const fetchChecklist = async (oportunidadeId: string): Promise<ChecklistItem[]> => {
    const { data, error } = await (supabase as any)
      .from('workflow_checklist_items')
      .select('*')
      .eq('oportunidade_id', oportunidadeId)
      .order('ordem', { ascending: true });
    if (error || !data) return [];
    return (data as any[]).map(mapChecklistItem);
  };

  const addChecklistItem = async (item: ChecklistItemForm): Promise<ChecklistItem | null> => {
    const { data, error } = await (supabase as any).from('workflow_checklist_items').insert({
      oportunidade_id: item.oportunidadeId,
      empresa_id: item.empresaId,
      ordem: item.ordem,
      texto: item.texto,
      responsavel_id: item.responsavelId || null,
      responsavel_nome: item.responsavelNome || null,
      prazo: item.prazo || null,
      prazo_hora: item.prazoHora || null,
      fase_associada: item.faseAssociada || null,
    }).select('*').single();
    if (error || !data) { console.error(error); return null; }
    await fetchOportunidades();
    return mapChecklistItem(data);
  };

  const updateChecklistItem = async (id: string, updates: Partial<ChecklistItemForm>): Promise<void> => {
    const payload: any = {};
    if (updates.texto !== undefined) payload.texto = updates.texto;
    if (updates.responsavelId !== undefined) payload.responsavel_id = updates.responsavelId;
    if (updates.responsavelNome !== undefined) payload.responsavel_nome = updates.responsavelNome;
    if (updates.prazo !== undefined) payload.prazo = updates.prazo;
    if (updates.prazoHora !== undefined) payload.prazo_hora = updates.prazoHora;
    if (updates.faseAssociada !== undefined) payload.fase_associada = updates.faseAssociada;
    if (updates.ordem !== undefined) payload.ordem = updates.ordem;
    const { error } = await (supabase as any).from('workflow_checklist_items').update(payload).eq('id', id);
    if (error) console.error(error);
  };

  const toggleChecklistItem = async (id: string, concluido: boolean, utilizadorNome: string): Promise<void> => {
    const payload: any = {
      concluido,
      concluido_por_nome: concluido ? utilizadorNome : null,
      concluido_em: concluido ? new Date().toISOString() : null,
    };
    const { error } = await (supabase as any).from('workflow_checklist_items').update(payload).eq('id', id);
    if (error) console.error(error);
    await fetchOportunidades();
  };

  const deleteChecklistItem = async (id: string): Promise<void> => {
    const { error } = await (supabase as any).from('workflow_checklist_items').delete().eq('id', id);
    if (error) console.error(error);
    await fetchOportunidades();
  };

  const reorderChecklistItems = async (items: { id: string; ordem: number }[]): Promise<void> => {
    await Promise.all(items.map(it =>
      (supabase as any).from('workflow_checklist_items').update({ ordem: it.ordem }).eq('id', it.id)
    ));
  };

  const addDefaultChecklistItems = async (oportunidadeId: string, fase: FaseFollowup): Promise<void> => {
    if (!empresa) return;
    const defaults = DEFAULT_CHECKLIST_BY_FASE[fase] || [];
    if (defaults.length === 0) return;
    // Find existing texts for this fase
    const { data: existing } = await (supabase as any)
      .from('workflow_checklist_items')
      .select('texto')
      .eq('oportunidade_id', oportunidadeId)
      .eq('fase_associada', fase);
    const existingTexts = new Set((existing as any[] || []).map(e => e.texto));
    // Find max ordem to append after
    const { data: maxRow } = await (supabase as any)
      .from('workflow_checklist_items')
      .select('ordem')
      .eq('oportunidade_id', oportunidadeId)
      .order('ordem', { ascending: false })
      .limit(1);
    let nextOrdem = ((maxRow as any[])?.[0]?.ordem ?? -1) + 1;
    const rows = defaults
      .filter(t => !existingTexts.has(t))
      .map((texto) => ({
        oportunidade_id: oportunidadeId,
        empresa_id: empresa.id,
        ordem: nextOrdem++,
        texto,
        fase_associada: fase,
      }));
    if (rows.length === 0) return;
    const { error } = await (supabase as any).from('workflow_checklist_items').insert(rows);
    if (error) console.error(error);
    await fetchOportunidades();
  };

  // ===== Oportunidade CRUD =====

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
    poId?: string | null;
    numeroPo?: string | null;
  }): Promise<string | null> => {
    if (!empresa) return null;
    const fase = data.fase || 'po_recebido';
    const { data: row, error } = await supabase.from('followup_oportunidades').insert({
      empresa_id: empresa.id,
      cliente_id: data.clienteId || null,
      cliente_nome: data.clienteNome || null,
      proposta_id: data.propostaId || null,
      titulo: data.titulo,
      fase,
      responsavel_nome: data.responsavelNome || null,
      probabilidade: data.probabilidade ?? 25,
      valor_estimado: data.valorEstimado ?? null,
      data_adjudicacao_esperada: data.dataAdjudicacaoEsperada || null,
      proximo_followup_data: data.proximoFollowupData || null,
      proximo_followup_tipo: data.proximoFollowupTipo || null,
      proximo_followup_notas: data.proximoFollowupNotas || null,
      ...(data.poId ? { po_id: data.poId } : {}),
      ...(data.numeroPo ? { numero_po: data.numeroPo } : {}),
    } as any).select('id').single();
    if (error || !row) { console.error(error); return null; }

    await supabase.from('followup_historico_fases').insert({
      oportunidade_id: row.id,
      empresa_id: empresa.id,
      fase_nova: fase,
      notas: 'Criação da oportunidade',
    });

    await addDefaultChecklistItems(row.id, fase);
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
    if (novaFase === 'adjudicado') {
      updates.data_adjudicacao_real = new Date().toISOString().split('T')[0];
      updates.probabilidade = 100;
    }
    if (novaFase === 'perdido' && motivo) updates.motivo_arquivo = motivo;

    const { error } = await supabase.from('followup_oportunidades').update(updates).eq('id', id);
    if (error) { console.error(error); return false; }

    await supabase.from('followup_historico_fases').insert({
      oportunidade_id: id,
      empresa_id: empresa.id,
      fase_anterior: opp.fase,
      fase_nova: novaFase,
      notas: motivo || null,
    });

    await addDefaultChecklistItems(id, novaFase);
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
      await supabase.from('followup_historico_fases').insert({
        oportunidade_id: oportunidadeId,
        empresa_id: empresa.id,
        fase_anterior: opp.fase,
        fase_nova: contacto.faseNova,
        contacto_id: row.id,
      });
      await addDefaultChecklistItems(oportunidadeId, contacto.faseNova);
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
    // checklist
    fetchChecklist, addChecklistItem, updateChecklistItem, toggleChecklistItem,
    deleteChecklistItem, reorderChecklistItems, addDefaultChecklistItems,
  };
}
