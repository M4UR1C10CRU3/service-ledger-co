import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { planeamentoAnexoPath } from '@/lib/storagePaths';
import { useToast } from '@/hooks/use-toast';
import type {
  PlaneamentoCard, PlaneamentoColuna, PlaneamentoConsulta,
  PlaneamentoChecklistItem, PlaneamentoAnexo, PlaneamentoHistorico,
} from '@/types/planeamento';

const TABLE_CARDS = 'planeamento_cards' as any;
const TABLE_CONSULTAS = 'planeamento_consultas' as any;
const TABLE_CHECKLIST = 'planeamento_checklist' as any;
const TABLE_ANEXOS = 'planeamento_anexos' as any;
const TABLE_HISTORICO = 'planeamento_historico' as any;
const BUCKET = 'planeamento-anexos';

async function currentUserName(): Promise<{ id: string | null; nome: string }> {
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  return { id: u?.id ?? null, nome: (u?.user_metadata as any)?.nome || u?.email || 'Utilizador' };
}

export function usePlaneamento() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const [cards, setCards] = useState<PlaneamentoCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const { data, error } = await (supabase.from(TABLE_CARDS) as any)
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      toast({ title: 'Erro ao carregar cards', description: error.message, variant: 'destructive' });
    } else {
      setCards((data || []) as PlaneamentoCard[]);
    }
    setLoading(false);
  }, [empresa?.id, toast]);

  useEffect(() => { loadCards(); }, [loadCards]);

  const logHistorico = async (card_id: string, tipo: string, descricao: string, metadata?: any) => {
    if (!empresa?.id) return;
    const u = await currentUserName();
    await (supabase.from(TABLE_HISTORICO) as any).insert({
      empresa_id: empresa.id, card_id, tipo, descricao, metadata: metadata || null,
      utilizador_id: u.id, utilizador_nome: u.nome,
    });
  };

  const createCard = async (payload: Partial<PlaneamentoCard>): Promise<string | null> => {
    if (!empresa?.id) return null;
    const u = await currentUserName();
    const { data, error } = await (supabase.from(TABLE_CARDS) as any).insert({
      empresa_id: empresa.id,
      titulo: payload.titulo || 'Novo card',
      descricao: payload.descricao ?? null,
      objetivo: payload.objetivo ?? null,
      problema_oportunidade: payload.problema_oportunidade ?? null,
      impacto_esperado: payload.impacto_esperado ?? null,
      coluna: payload.coluna || 'ideia',
      area_negocio: payload.area_negocio ?? null,
      areas_afetadas: payload.areas_afetadas || [],
      prioridade: payload.prioridade || 'media',
      responsavel_id: payload.responsavel_id ?? null,
      responsavel_nome: payload.responsavel_nome ?? null,
      responsaveis_extra: payload.responsaveis_extra || [],
      prazo_estimado: payload.prazo_estimado ?? null,
      tags: payload.tags || [],
      created_by: u.id, created_by_nome: u.nome,
    }).select().single();
    if (error) {
      toast({ title: 'Erro ao criar card', description: error.message, variant: 'destructive' });
      return null;
    }
    await logHistorico(data.id, 'criacao', `Card criado por ${u.nome}`);
    await loadCards();
    return data.id as string;
  };

  const updateCard = async (id: string, patch: Partial<PlaneamentoCard>): Promise<boolean> => {
    const { error } = await (supabase.from(TABLE_CARDS) as any).update(patch).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return false;
    }
    await loadCards();
    return true;
  };

  const moveCard = async (id: string, novaColuna: PlaneamentoColuna): Promise<boolean> => {
    const card = cards.find(c => c.id === id);
    if (!card || card.coluna === novaColuna) return false;
    const patch: any = { coluna: novaColuna };
    if (novaColuna === 'implementacao' && !card.data_inicio_real) {
      patch.data_inicio_real = new Date().toISOString().slice(0, 10);
    }
    if (novaColuna === 'concluido' && !card.data_conclusao_real) {
      patch.data_conclusao_real = new Date().toISOString().slice(0, 10);
    }
    const { error } = await (supabase.from(TABLE_CARDS) as any).update(patch).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao mover', description: error.message, variant: 'destructive' });
      return false;
    }
    await logHistorico(id, 'movimento', `Movido de "${card.coluna}" para "${novaColuna}"`, { de: card.coluna, para: novaColuna });
    await loadCards();
    return true;
  };

  const duplicateCard = async (id: string): Promise<string | null> => {
    const c = cards.find(x => x.id === id);
    if (!c) return null;
    const newId = await createCard({
      ...c,
      titulo: `${c.titulo} (Cópia)`,
      coluna: 'ideia',
      data_inicio_real: null, data_conclusao_real: null, data_conclusao_prevista: null,
      decisao_final: null, data_decisao: null,
    } as any);
    return newId;
  };

  const archiveCard = async (id: string): Promise<boolean> => moveCard(id, 'arquivado');

  const deleteCard = async (id: string): Promise<boolean> => {
    const { error } = await (supabase.from(TABLE_CARDS) as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao eliminar', description: error.message, variant: 'destructive' });
      return false;
    }
    await loadCards();
    return true;
  };

  // ---- Consultas
  const listConsultas = async (cardId: string): Promise<PlaneamentoConsulta[]> => {
    const { data } = await (supabase.from(TABLE_CONSULTAS) as any).select('*').eq('card_id', cardId).order('data_consulta', { ascending: false });
    return (data || []) as PlaneamentoConsulta[];
  };
  const createConsulta = async (cardId: string, payload: Partial<PlaneamentoConsulta>) => {
    if (!empresa?.id) return false;
    const u = await currentUserName();
    const { error } = await (supabase.from(TABLE_CONSULTAS) as any).insert({
      empresa_id: empresa.id, card_id: cardId,
      entidade: payload.entidade, tipo: payload.tipo || 'Outra',
      data_consulta: payload.data_consulta, resumo: payload.resumo,
      created_by: u.id, created_by_nome: u.nome,
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return false; }
    await logHistorico(cardId, 'consulta', `Consulta adicionada: ${payload.entidade}`);
    return true;
  };
  const deleteConsulta = async (id: string, cardId: string) => {
    await (supabase.from(TABLE_CONSULTAS) as any).delete().eq('id', id);
    await logHistorico(cardId, 'consulta', 'Consulta removida');
  };

  // ---- Checklist
  const listChecklist = async (cardId: string): Promise<PlaneamentoChecklistItem[]> => {
    const { data } = await (supabase.from(TABLE_CHECKLIST) as any).select('*').eq('card_id', cardId).order('ordem');
    return (data || []) as PlaneamentoChecklistItem[];
  };
  const createChecklistItem = async (cardId: string, titulo: string, responsavel_nome?: string, prazo?: string) => {
    if (!empresa?.id) return;
    await (supabase.from(TABLE_CHECKLIST) as any).insert({
      empresa_id: empresa.id, card_id: cardId, titulo, responsavel_nome, prazo,
    });
  };
  const toggleChecklistItem = async (id: string, concluido: boolean) => {
    await (supabase.from(TABLE_CHECKLIST) as any).update({
      concluido, concluido_em: concluido ? new Date().toISOString() : null,
    }).eq('id', id);
  };
  const deleteChecklistItem = async (id: string) => {
    await (supabase.from(TABLE_CHECKLIST) as any).delete().eq('id', id);
  };

  // ---- Anexos
  const listAnexos = async (cardId: string): Promise<PlaneamentoAnexo[]> => {
    const { data } = await (supabase.from(TABLE_ANEXOS) as any).select('*').eq('card_id', cardId).order('created_at', { ascending: false });
    return (data || []) as PlaneamentoAnexo[];
  };
  const uploadAnexo = async (cardId: string, file: File, consultaId?: string | null) => {
    if (!empresa?.id) return false;
    const u = await currentUserName();
    const path = planeamentoAnexoPath(empresa.id, cardId, file.name);
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
    if (upErr) { toast({ title: 'Erro upload', description: upErr.message, variant: 'destructive' }); return false; }
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
    const { error } = await (supabase.from(TABLE_ANEXOS) as any).insert({
      empresa_id: empresa.id, card_id: cardId, consulta_id: consultaId || null,
      nome: file.name, url: signed?.signedUrl || path, storage_path: path,
      mime_type: file.type, tamanho_bytes: file.size,
      uploaded_by: u.id, uploaded_by_nome: u.nome,
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return false; }
    await logHistorico(cardId, 'anexo', `Anexo: ${file.name}`);
    return true;
  };
  const deleteAnexo = async (anexo: PlaneamentoAnexo) => {
    if (anexo.storage_path) await supabase.storage.from(BUCKET).remove([anexo.storage_path]);
    await (supabase.from(TABLE_ANEXOS) as any).delete().eq('id', anexo.id);
    await logHistorico(anexo.card_id, 'anexo', `Removido: ${anexo.nome}`);
  };

  // ---- Histórico
  const listHistorico = async (cardId: string): Promise<PlaneamentoHistorico[]> => {
    const { data } = await (supabase.from(TABLE_HISTORICO) as any).select('*').eq('card_id', cardId).order('created_at', { ascending: false });
    return (data || []) as PlaneamentoHistorico[];
  };
  const addComment = async (cardId: string, texto: string) => {
    await logHistorico(cardId, 'comentario', texto);
  };

  return {
    cards, loading, reload: loadCards,
    createCard, updateCard, moveCard, duplicateCard, archiveCard, deleteCard,
    listConsultas, createConsulta, deleteConsulta,
    listChecklist, createChecklistItem, toggleChecklistItem, deleteChecklistItem,
    listAnexos, uploadAnexo, deleteAnexo,
    listHistorico, addComment,
  };
}
