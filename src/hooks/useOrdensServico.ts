import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OrdemServico, OsChecklistItem, OsFormData, OsEstado } from '@/types/ordemServico';
import { useToast } from '@/hooks/use-toast';
import { inserirNotificacaoInterna } from '@/hooks/useNotificacoesInternas';

// ── Nomes de coluna reais da tabela `ordens_servico` ────────────────────────
// O código usava responsavel_id / data_abertura / data_prevista / data_inicio /
// data_conclusao — nenhuma dessas colunas existe. A tabela foi renomeada em
// algum momento e o código nunca acompanhou, o que partiu a criação de OS e as
// transições de estado. Confirmado contra a base de dados real (não contra os
// tipos gerados) e corroborado pela tabela estar vazia: nunca se criou uma OS.
//
// Os nomes do lado da aplicação (responsavelId, dataAbertura…) mantêm-se — é
// vocabulário da app. Só a tradução para a BD é que estava errada.
const COL = {
  responsavelId:   'colaborador_id',
  responsavelNome: 'colaborador_nome',
  dataAbertura:    'data_criacao',
  dataPrevista:    'data_prevista_inicio',
  dataInicio:      'data_inicio_real',
  dataConclusao:   'data_conclusao_real',
} as const;

function mapOs(row: any): OrdemServico {
  return {
    id: row.id, empresaId: row.empresa_id, numero: row.numero,
    clienteId: row.cliente_id, clienteNome: row.cliente_nome,
    propostaId: row.proposta_id,
    responsavelId: row[COL.responsavelId],
    responsavelNome: row[COL.responsavelNome],
    estado: row.estado,
    prioridade: row.prioridade, titulo: row.titulo, descricao: row.descricao,
    observacoes: row.observacoes,
    dataAbertura: row[COL.dataAbertura],
    dataPrevista: row[COL.dataPrevista],
    dataInicio: row[COL.dataInicio],
    dataConclusao: row[COL.dataConclusao],
    valorEstimado: row.valor_estimado,
    valorFinal: row.valor_final, createdAt: row.created_at, updatedAt: row.updated_at,
    serviceId: row.service_id ?? null, propostaNumero: row.proposta_numero ?? null,
  };
}

/**
 * Traduz um payload em vocabulário da app para os nomes reais das colunas.
 * Quem chamar updateOrdem passa `dataPrevista`, não `data_prevista_inicio`.
 */
export function traduzColunasOs(payload: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    out[(COL as Record<string, string>)[k] ?? k] = v;
  }
  return out;
}

function mapChecklist(row: any): OsChecklistItem {
  return {
    id: row.id, osId: row.os_id, titulo: row.titulo,
    responsavelNome: row.responsavel_nome ?? null,
    prazo: row.prazo ?? null,
    concluido: row.concluido, concluidoEm: row.concluido_em ?? null,
    ordem: row.ordem, createdAt: row.created_at,
  };
}

export function useOrdensServico(empresaId: string | undefined) {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const fetchOrdens = useCallback(async () => {
    if (!empresaId) { setIsInitialized(true); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrdens((data ?? []).map(mapOs));
    } catch (e: any) {
      toast({ title: 'Erro ao carregar OS', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [empresaId]);

  useEffect(() => { fetchOrdens(); }, [fetchOrdens]);

  const applyTemplate = async (osId: string, templateId: string, dataAbertura: string) => {
    const { data: items } = await (supabase as any)
      .from('os_checklist_template_itens').select('*').eq('template_id', templateId).order('ordem');
    if (!items || items.length === 0) return;
    const base = new Date(dataAbertura + 'T00:00:00');
    const rows = items.map((it: any) => {
      let prazo: string | null = null;
      if (it.dias_offset != null) {
        const d = new Date(base); d.setDate(d.getDate() + it.dias_offset);
        prazo = d.toISOString().split('T')[0];
      }
      return {
        os_id: osId,
        titulo: it.titulo,
        responsavel_nome: it.responsavel_padrao,
        prazo,
        ordem: it.ordem,
      };
    });
    await (supabase as any).from('ordens_servico_checklist').insert(rows);
  };

  const createOrdem = async (form: OsFormData): Promise<OrdemServico | null> => {
    if (!empresaId) return null;
    try {
      const { data, error } = await supabase.from('ordens_servico').insert({
        empresa_id: empresaId,
        cliente_id: form.clienteId || null,
        cliente_nome: form.clienteNome,
        proposta_id: form.propostaId || null,
        [COL.responsavelId]: form.responsavelId || null,
        [COL.responsavelNome]: form.responsavelNome || null,
        estado: form.estado,
        prioridade: form.prioridade,
        titulo: form.titulo,
        descricao: form.descricao || null,
        observacoes: form.observacoes || null,
        [COL.dataAbertura]: form.dataAbertura,
        [COL.dataPrevista]: form.dataPrevista || null,
        valor_estimado: form.valorEstimado ? parseFloat(form.valorEstimado) : null,
        ...(form.templateId ? { template_id: form.templateId } : {}),
      }).select().single();
      if (error) throw error;
      const os = mapOs(data);
      if (form.templateId) {
        try { await applyTemplate(os.id, form.templateId, form.dataAbertura); } catch (e) { console.error(e); }
      }
      setOrdens(prev => [os, ...prev]);
      toast({ title: `OS criada: ${os.numero}` });

      // Notificação interna → produção
      inserirNotificacaoInterna({
        empresa_id: empresaId,
        tipo: 'os_criada',
        titulo: `OS ${os.numero} criada`,
        mensagem: `${form.clienteNome ? form.clienteNome + ' · ' : ''}${form.titulo}`,
        perfil_destino: 'producao',
        referencia_id: os.id,
        referencia_tipo: 'ordem_servico',
      }).catch(() => {}); // fire-and-forget; não bloqueia a criação

      return os;
    } catch (e: any) {
      toast({ title: 'Erro ao criar OS', description: e.message, variant: 'destructive' });
      return null;
    }
  };

  const updateOrdem = async (id: string, payload: Record<string, any>): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from('ordens_servico')
        .update({ ...traduzColunasOs(payload), updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
      if (error) throw error;
      setOrdens(prev => prev.map(o => o.id === id ? mapOs(data) : o));
      return true;
    } catch (e: any) {
      toast({ title: 'Erro ao actualizar OS', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const updateEstado = async (id: string, estado: OsEstado): Promise<boolean> => {
    const hoje = new Date().toISOString().split('T')[0];
    // Chaves em vocabulário da app — traduzidas por updateOrdem.
    const extra: Record<string, any> = { estado };
    if (estado === 'em_execucao') extra.dataInicio = hoje;
    if (estado === 'concluida' || estado === 'faturada') extra.dataConclusao = hoje;
    return updateOrdem(id, extra);
  };

  const deleteOrdem = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('ordens_servico').delete().eq('id', id);
      if (error) throw error;
      setOrdens(prev => prev.filter(o => o.id !== id));
      toast({ title: 'OS eliminada' });
      return true;
    } catch (e: any) {
      toast({ title: 'Erro ao eliminar OS', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const fetchChecklist = async (osId: string): Promise<OsChecklistItem[]> => {
    const { data } = await supabase.from('ordens_servico_checklist')
      .select('*').eq('os_id', osId).order('ordem');
    return (data ?? []).map(mapChecklist);
  };

  const addChecklistItem = async (
    osId: string,
    titulo: string,
    extra?: { responsavelNome?: string | null; prazo?: string | null }
  ): Promise<OsChecklistItem | null> => {
    const { data: existing } = await supabase.from('ordens_servico_checklist')
      .select('ordem').eq('os_id', osId).order('ordem', { ascending: false }).limit(1);
    const nextOrdem = existing?.length ? (existing[0] as any).ordem + 1 : 0;
    const { data, error } = await (supabase as any).from('ordens_servico_checklist')
      .insert({
        os_id: osId, titulo, ordem: nextOrdem,
        responsavel_nome: extra?.responsavelNome ?? null,
        prazo: extra?.prazo ?? null,
      }).select().single();
    if (error) return null;
    return mapChecklist(data);
  };

  const updateChecklistItem = async (itemId: string, patch: { responsavelNome?: string | null; prazo?: string | null; titulo?: string }): Promise<boolean> => {
    const payload: any = {};
    if (patch.responsavelNome !== undefined) payload.responsavel_nome = patch.responsavelNome;
    if (patch.prazo !== undefined) payload.prazo = patch.prazo;
    if (patch.titulo !== undefined) payload.titulo = patch.titulo;
    const { error } = await (supabase as any).from('ordens_servico_checklist').update(payload).eq('id', itemId);
    return !error;
  };

  const toggleChecklistItem = async (itemId: string, concluido: boolean): Promise<boolean> => {
    const { error } = await (supabase as any).from('ordens_servico_checklist')
      .update({ concluido, concluido_em: concluido ? new Date().toISOString() : null }).eq('id', itemId);
    return !error;
  };

  const deleteChecklistItem = async (itemId: string): Promise<boolean> => {
    const { error } = await supabase.from('ordens_servico_checklist')
      .delete().eq('id', itemId);
    return !error;
  };

  return {
    ordens, isLoading, isInitialized, fetchOrdens,
    createOrdem, updateOrdem, updateEstado, deleteOrdem, applyTemplate,
    fetchChecklist, addChecklistItem, updateChecklistItem, toggleChecklistItem, deleteChecklistItem,
  };
}
