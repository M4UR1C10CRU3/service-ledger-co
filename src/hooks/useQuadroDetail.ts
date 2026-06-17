import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Quadro, QuadroLista, QuadroCartao, Etiqueta, Comentario, Utilizador } from '@/types/quadros';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const CARD_SELECT =
  '*, cartao_etiqueta_rel(etiqueta_id, cartao_etiquetas(id, nome, cor)), ' +
  'cartao_checklists(id, cartao_id, titulo, posicao, criado_em, cartao_checklist_items(id, checklist_id, texto, concluido, posicao, criado_em)), ' +
  'cartao_membros(cartao_id, utilizador_id, nome)';

function mapCard(card: any): QuadroCartao {
  return {
    ...card,
    etiquetas: (card.cartao_etiqueta_rel || []).map((r: any) => r.cartao_etiquetas).filter(Boolean),
    checklists: (card.cartao_checklists || [])
      .sort((a: any, b: any) => a.posicao - b.posicao)
      .map((cl: any) => ({ ...cl, items: (cl.cartao_checklist_items || []).sort((a: any, b: any) => a.posicao - b.posicao) })),
    membros: card.cartao_membros || [],
  };
}

export function useQuadroDetail(quadroId: string | undefined, empresaId: string | undefined) {
  const [quadro, setQuadro] = useState<Quadro | null>(null);
  const [listas, setListas] = useState<QuadroLista[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const me = useCurrentUser();
  const meRef = useRef(me);
  meRef.current = me;

  const fetchAll = useCallback(async () => {
    if (!quadroId || !empresaId) return;
    try {
      const { data: q } = await supabase.from('quadros').select('*').eq('id', quadroId).single();
      if (!q) { setIsLoading(false); return; }
      setQuadro(q as Quadro);

      const { data: ls } = await supabase
        .from('quadro_listas').select('*')
        .eq('quadro_id', quadroId).eq('arquivado', false).order('posicao');
      const listaIds = (ls || []).map((l: any) => l.id);

      const cardsByLista: Record<string, QuadroCartao[]> = {};
      if (listaIds.length > 0) {
        const { data: cards } = await supabase
          .from('quadro_cartoes').select(CARD_SELECT)
          .in('lista_id', listaIds).eq('arquivado', false).order('posicao');
        (cards || []).forEach((card: any) => {
          const mapped = mapCard(card);
          (cardsByLista[card.lista_id] ||= []).push(mapped);
        });
      }
      setListas((ls || []).map((l: any) => ({ ...l, cartoes: cardsByLista[l.id] || [] })));

      const { data: ets } = await supabase.from('cartao_etiquetas').select('*').eq('quadro_id', quadroId);
      setEtiquetas((ets as Etiqueta[]) || []);
    } catch {
      toast({ title: 'Erro ao carregar quadro', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [quadroId, empresaId, toast]);

  useEffect(() => { setIsLoading(true); fetchAll(); }, [fetchAll]);

  // ── Empresa utilizadores (membros disponíveis) ──────────────────────────────
  const fetchUtilizadores = useCallback(async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('liberty_utilizador_empresas')
      .select('liberty_utilizadores(id, nome, email, cargo, ativo, eliminado)')
      .eq('empresa_id', empresaId);
    const us = (data || [])
      .map((r: any) => r.liberty_utilizadores)
      .filter((u: any) => u && u.ativo && !u.eliminado)
      .map((u: any) => ({ id: u.id, nome: u.nome, email: u.email, cargo: u.cargo }))
      .sort((a: Utilizador, b: Utilizador) => a.nome.localeCompare(b.nome));
    setUtilizadores(us);
  }, [empresaId]);

  useEffect(() => { fetchUtilizadores(); }, [fetchUtilizadores]);

  // ── Atividade (feed automático) ─────────────────────────────────────────────
  const logAtividade = useCallback(async (cartaoId: string, texto: string) => {
    try {
      await supabase.from('cartao_comentarios').insert({
        cartao_id: cartaoId, texto, tipo: 'atividade',
        autor_id: meRef.current.authId, autor_nome: meRef.current.nome,
      });
    } catch { /* não-crítico */ }
  }, []);

  // ── Quadro ops ──────────────────────────────────────────────────────────────
  const updateQuadro = async (updates: Partial<Pick<Quadro, 'nome' | 'descricao' | 'cor'>>) => {
    if (!quadroId) return;
    await supabase.from('quadros').update({ ...updates, atualizado_em: new Date().toISOString() }).eq('id', quadroId);
    setQuadro(prev => prev ? { ...prev, ...updates } : prev);
  };

  const archiveQuadro = async () => {
    if (!quadroId) return;
    await supabase.from('quadros').update({ arquivado: true }).eq('id', quadroId);
  };

  // ── Lista ops ─────────────────────────────────────────────────────────────
  const addLista = async (nome: string) => {
    if (!quadroId) return;
    const maxPos = listas.length > 0 ? Math.max(...listas.map(l => l.posicao)) + 1 : 0;
    const { data } = await supabase.from('quadro_listas').insert({ quadro_id: quadroId, nome, posicao: maxPos }).select().single();
    if (data) setListas(prev => [...prev, { ...(data as any), cartoes: [] }]);
  };

  const updateLista = async (id: string, nome: string) => {
    await supabase.from('quadro_listas').update({ nome }).eq('id', id);
    setListas(prev => prev.map(l => l.id === id ? { ...l, nome } : l));
  };

  const archiveLista = async (id: string) => {
    await supabase.from('quadro_listas').update({ arquivado: true }).eq('id', id);
    setListas(prev => prev.filter(l => l.id !== id));
  };

  // Persiste a ordem das listas (posicao = índice)
  const persistListaOrder = useCallback(async (ordered: QuadroLista[]) => {
    await Promise.all(ordered.map((l, i) => l.posicao === i
      ? Promise.resolve()
      : supabase.from('quadro_listas').update({ posicao: i }).eq('id', l.id)));
  }, []);

  // Persiste posições/lista de cartões nas listas afetadas (posicao = índice)
  const persistCartaoOrder = useCallback(async (affectedListaIds: string[], state: QuadroLista[]) => {
    const ops: Promise<any>[] = [];
    affectedListaIds.forEach(lid => {
      const lista = state.find(l => l.id === lid);
      if (!lista) return;
      lista.cartoes.forEach((c, i) => {
        if (c.posicao !== i || c.lista_id !== lid) {
          ops.push(supabase.from('quadro_cartoes').update({ lista_id: lid, posicao: i }).eq('id', c.id) as any);
        }
      });
    });
    await Promise.all(ops);
  }, []);

  // ── Card ops ──────────────────────────────────────────────────────────────
  const addCartao = async (listaId: string, titulo: string) => {
    if (!empresaId) return;
    const lista = listas.find(l => l.id === listaId);
    const maxPos = lista && lista.cartoes.length > 0 ? Math.max(...lista.cartoes.map(c => c.posicao)) + 1 : 0;
    const { data } = await supabase
      .from('quadro_cartoes').insert({ lista_id: listaId, empresa_id: empresaId, titulo, posicao: maxPos, criado_por: meRef.current.authId }).select(CARD_SELECT).single();
    if (data) {
      const newCard = mapCard(data);
      setListas(prev => prev.map(l => l.id === listaId ? { ...l, cartoes: [...l.cartoes, newCard] } : l));
    }
  };

  const updateCartao = async (id: string, updates: Partial<QuadroCartao>, atividade?: string) => {
    const { etiquetas: _e, checklists: _c, membros: _m, ...dbUpdates } = updates as any;
    await supabase.from('quadro_cartoes').update({ ...dbUpdates, atualizado_em: new Date().toISOString() }).eq('id', id);
    setListas(prev => prev.map(l => ({ ...l, cartoes: l.cartoes.map(c => c.id === id ? { ...c, ...updates } : c) })));
    if (atividade) await logAtividade(id, atividade);
  };

  const archiveCartao = async (id: string, listaId: string) => {
    await supabase.from('quadro_cartoes').update({ arquivado: true }).eq('id', id);
    setListas(prev => prev.map(l => l.id === listaId ? { ...l, cartoes: l.cartoes.filter(c => c.id !== id) } : l));
  };

  // ── Checklist ops ─────────────────────────────────────────────────────────
  const addChecklist = async (cartaoId: string, titulo: string) => {
    const { data } = await supabase.from('cartao_checklists').insert({ cartao_id: cartaoId, titulo }).select().single();
    if (data) {
      const newCl = { ...(data as any), items: [] };
      setListas(prev => prev.map(l => ({ ...l, cartoes: l.cartoes.map(c => c.id === cartaoId ? { ...c, checklists: [...c.checklists, newCl] } : c) })));
    }
  };

  const addChecklistItem = async (checklistId: string, cartaoId: string, texto: string) => {
    const { data } = await supabase.from('cartao_checklist_items').insert({ checklist_id: checklistId, texto }).select().single();
    if (data) setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => c.id === cartaoId
        ? { ...c, checklists: c.checklists.map(cl => cl.id === checklistId ? { ...cl, items: [...cl.items, data as any] } : cl) } : c),
    })));
  };

  const toggleChecklistItem = async (itemId: string, checklistId: string, cartaoId: string, concluido: boolean) => {
    await supabase.from('cartao_checklist_items').update({ concluido }).eq('id', itemId);
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => c.id === cartaoId
        ? { ...c, checklists: c.checklists.map(cl => cl.id === checklistId ? { ...cl, items: cl.items.map(it => it.id === itemId ? { ...it, concluido } : it) } : cl) } : c),
    })));
  };

  const deleteChecklistItem = async (itemId: string, checklistId: string, cartaoId: string) => {
    await supabase.from('cartao_checklist_items').delete().eq('id', itemId);
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => c.id === cartaoId
        ? { ...c, checklists: c.checklists.map(cl => cl.id === checklistId ? { ...cl, items: cl.items.filter(it => it.id !== itemId) } : cl) } : c),
    })));
  };

  const deleteChecklist = async (checklistId: string, cartaoId: string) => {
    await supabase.from('cartao_checklists').delete().eq('id', checklistId);
    setListas(prev => prev.map(l => ({ ...l, cartoes: l.cartoes.map(c => c.id === cartaoId ? { ...c, checklists: c.checklists.filter(cl => cl.id !== checklistId) } : c) })));
  };

  // ── Feed (comentários + atividade) ──────────────────────────────────────────
  const fetchFeed = async (cartaoId: string): Promise<Comentario[]> => {
    const { data } = await supabase.from('cartao_comentarios').select('*').eq('cartao_id', cartaoId).order('criado_em');
    return (data as Comentario[]) || [];
  };

  const addComentario = async (cartaoId: string, texto: string): Promise<Comentario | null> => {
    const { data } = await supabase.from('cartao_comentarios')
      .insert({ cartao_id: cartaoId, texto, tipo: 'comentario', autor_id: meRef.current.authId, autor_nome: meRef.current.nome })
      .select().single();
    return (data as Comentario) || null;
  };

  const deleteComentario = async (id: string) => {
    await supabase.from('cartao_comentarios').delete().eq('id', id);
  };

  // ── Etiqueta ops ──────────────────────────────────────────────────────────
  const createEtiqueta = async (nome: string, cor: string): Promise<Etiqueta | null> => {
    if (!quadroId) return null;
    const { data } = await supabase.from('cartao_etiquetas').insert({ quadro_id: quadroId, nome, cor }).select().single();
    if (data) setEtiquetas(prev => [...prev, data as Etiqueta]);
    return (data as Etiqueta) || null;
  };

  const updateEtiqueta = async (id: string, updates: Partial<Pick<Etiqueta, 'nome' | 'cor'>>) => {
    await supabase.from('cartao_etiquetas').update(updates).eq('id', id);
    setEtiquetas(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    setListas(prev => prev.map(l => ({ ...l, cartoes: l.cartoes.map(c => ({ ...c, etiquetas: c.etiquetas.map(et => et.id === id ? { ...et, ...updates } : et) })) })));
  };

  const toggleEtiquetaOnCartao = async (cartaoId: string, etiquetaId: string, isActive: boolean) => {
    if (isActive) await supabase.from('cartao_etiqueta_rel').delete().match({ cartao_id: cartaoId, etiqueta_id: etiquetaId });
    else await supabase.from('cartao_etiqueta_rel').insert({ cartao_id: cartaoId, etiqueta_id: etiquetaId });
    const et = etiquetas.find(e => e.id === etiquetaId);
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => {
        if (c.id !== cartaoId) return c;
        const has = c.etiquetas.some(e => e.id === etiquetaId);
        return { ...c, etiquetas: has ? c.etiquetas.filter(e => e.id !== etiquetaId) : (et ? [...c.etiquetas, et] : c.etiquetas) };
      }),
    })));
  };

  // ── Membro ops ──────────────────────────────────────────────────────────────
  const toggleMembro = async (cartaoId: string, util: Utilizador, isActive: boolean) => {
    if (isActive) {
      await supabase.from('cartao_membros').delete().match({ cartao_id: cartaoId, utilizador_id: util.id });
    } else {
      await supabase.from('cartao_membros').insert({ cartao_id: cartaoId, utilizador_id: util.id, nome: util.nome });
      await logAtividade(cartaoId, `atribuiu ${util.nome} a este cartão`);
    }
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => {
        if (c.id !== cartaoId) return c;
        const has = c.membros.some(m => m.utilizador_id === util.id);
        return { ...c, membros: has ? c.membros.filter(m => m.utilizador_id !== util.id) : [...c.membros, { cartao_id: cartaoId, utilizador_id: util.id, nome: util.nome }] };
      }),
    })));
  };

  return {
    quadro, listas, etiquetas, utilizadores, isLoading, setListas,
    updateQuadro, archiveQuadro,
    addLista, updateLista, archiveLista, persistListaOrder,
    addCartao, updateCartao, archiveCartao, persistCartaoOrder,
    addChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem, deleteChecklist,
    fetchFeed, addComentario, deleteComentario, logAtividade,
    createEtiqueta, updateEtiqueta, toggleEtiquetaOnCartao,
    toggleMembro,
    refresh: fetchAll,
  };
}
