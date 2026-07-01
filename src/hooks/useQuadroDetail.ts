import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Quadro, QuadroLista, QuadroCartao, Etiqueta, Comentario, ChecklistItem, Utilizador, CartaoAnexo, ChecklistModelo, ChecklistModeloItem } from '@/types/quadros';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { sendEmail } from '@/lib/sendEmail';

const CARD_SELECT =
  '*, cartao_etiqueta_rel(etiqueta_id, cartao_etiquetas(id, nome, cor)), ' +
  'cartao_checklists(id, cartao_id, titulo, posicao, criado_em, cartao_checklist_items(id, checklist_id, texto, concluido, posicao, criado_em, responsavel_id, responsavel_nome, hora, data_limite)), ' +
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

  const updateChecklistItem = async (
    itemId: string, checklistId: string, cartaoId: string,
    updates: Partial<Pick<ChecklistItem, 'responsavel_id' | 'responsavel_nome' | 'hora' | 'data_limite'>>,
  ) => {
    await supabase.from('cartao_checklist_items').update(updates).eq('id', itemId);
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => c.id === cartaoId
        ? { ...c, checklists: c.checklists.map(cl => cl.id === checklistId ? { ...cl, items: cl.items.map(it => it.id === itemId ? { ...it, ...updates } : it) } : cl) } : c),
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

  const addComentario = async (
    cartaoId: string,
    texto: string,
    replyTo?: { id: string; autor_nome: string | null; texto: string },
  ): Promise<Comentario | null> => {
    const { data } = await supabase.from('cartao_comentarios')
      .insert({
        cartao_id: cartaoId, texto, tipo: 'comentario',
        autor_id: meRef.current.authId, autor_nome: meRef.current.nome,
        reply_to_id: replyTo?.id ?? null,
        reply_to_autor_nome: replyTo?.autor_nome ?? null,
        reply_to_texto: replyTo ? replyTo.texto.slice(0, 300) : null,
      })
      .select().single();

    // Enviar email a utilizadores mencionados com @Nome
    const autorNome = meRef.current.nome || 'Alguém';
    const mencionados = utilizadores.filter(
      u => u.email && texto.includes(`@${u.nome}`) && u.nome !== autorNome,
    );
    if (mencionados.length > 0) {
      const cartaoTitulo = listas.flatMap(l => l.cartoes).find(c => c.id === cartaoId)?.titulo || '';
      const quadroNome = quadro?.nome || '';
      const textoHtml = texto
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/@([\wÀ-ÿ][\wÀ-ÿ\s]*)/g, '<strong style="color:#6366f1">@$1</strong>');
      for (const u of mencionados) {
        sendEmail({
          to: u.email,
          subject: `[${quadroNome}] ${autorNome} mencionou-te num comentário`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <tr><td style="background:#6366f1;padding:24px 32px">
    <p style="margin:0;color:#fff;font-size:18px;font-weight:700">&#128172; Nova menção num comentário</p>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="margin:0 0 4px;color:#71717a;font-size:13px">Quadro</p>
    <p style="margin:0 0 16px;font-weight:600;font-size:15px">${quadroNome}</p>
    <p style="margin:0 0 4px;color:#71717a;font-size:13px">Cartão</p>
    <p style="margin:0 0 20px;font-weight:600;font-size:15px">${cartaoTitulo}</p>
    <p style="margin:0 0 8px;color:#374151;font-size:14px"><strong>${autorNome}</strong> escreveu:</p>
    <div style="border-left:4px solid #6366f1;background:#f5f3ff;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px;color:#1f2937;font-size:14px;line-height:1.6">${textoHtml}</div>
    <p style="margin:0;color:#71717a;font-size:12px">Esta é uma notificação automática do Clariza Manager. Responde directamente através da aplicação.</p>
  </td></tr>
</table>
</td></tr></table></body></html>`,
          empresa_id: empresaId,
          tipo: 'comercial',
        }).catch(() => {}); // não-crítico
      }
    }

    return (data as Comentario) || null;
  };

  const updateComentario = async (id: string, texto: string) => {
    await supabase.from('cartao_comentarios')
      .update({ texto, atualizado_em: new Date().toISOString() })
      .eq('id', id);
  };

  const deleteComentario = async (id: string) => {
    await supabase.from('cartao_comentarios').delete().eq('id', id);
  };

  // ── Anexos ────────────────────────────────────────────────────────────────
  // A coluna real do ficheiro chama-se `path` (não `url`) e aponta para o bucket
  // PRIVADO 'cartao-anexos'. Deriva um URL utilizável: se já for um URL completo
  // usa-o; caso contrário gera um URL assinado (bucket privado → getPublicUrl dá 400).
  const ANEXO_BUCKET = 'cartao-anexos';
  const isDirectUrl = (s: string) => /^https?:\/\//i.test(s) || s.startsWith('blob:') || s.startsWith('data:');
  const mapAnexo = async (a: any): Promise<CartaoAnexo> => {
    const raw: string = a?.path ?? a?.url ?? '';
    let url = '';
    if (raw && isDirectUrl(raw)) url = raw;
    else if (raw) {
      const { data } = await supabase.storage.from(ANEXO_BUCKET).createSignedUrl(raw, 60 * 60);
      url = data?.signedUrl || '';
    }
    return { ...a, url };
  };

  const listAnexos = async (cartaoId: string): Promise<CartaoAnexo[]> => {
    try {
      const { data } = await (supabase.from('cartao_anexos' as any) as any)
        .select('*').eq('cartao_id', cartaoId).order('criado_em', { ascending: true });
      return await Promise.all(((data || []) as any[]).map(mapAnexo));
    } catch { return []; }
  };

  const addAnexo = async (cartaoId: string, nome: string, url: string): Promise<CartaoAnexo | null> => {
    try {
      const { data } = await (supabase.from('cartao_anexos' as any) as any)
        .insert({ cartao_id: cartaoId, nome, path: url })
        .select().single();
      await logAtividade(cartaoId, `anexou "${nome}"`);
      return data ? await mapAnexo(data) : null;
    } catch { return null; }
  };

  // Upload de ficheiro do PC → bucket privado 'cartao-anexos' → registo em cartao_anexos.
  const uploadAnexo = async (cartaoId: string, file: File): Promise<CartaoAnexo | null> => {
    if (!empresaId) { toast({ title: 'Sem empresa ativa', variant: 'destructive' }); return null; }
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${empresaId}/${cartaoId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from(ANEXO_BUCKET).upload(path, file, {
        contentType: file.type || undefined, upsert: false,
      });
      if (upErr) { toast({ title: `Falha ao carregar "${file.name}"`, description: upErr.message, variant: 'destructive' }); return null; }
      const { data, error: insErr } = await (supabase.from('cartao_anexos' as any) as any)
        .insert({ cartao_id: cartaoId, nome: file.name, path, tipo: file.type || null })
        .select().single();
      if (insErr || !data) {
        await supabase.storage.from(ANEXO_BUCKET).remove([path]); // rollback: não deixar ficheiro órfão
        toast({ title: `Falha ao registar "${file.name}"`, description: insErr?.message, variant: 'destructive' });
        return null;
      }
      await logAtividade(cartaoId, `anexou "${file.name}"`);
      return await mapAnexo(data);
    } catch (e: any) {
      toast({ title: `Erro ao anexar "${file.name}"`, description: e?.message, variant: 'destructive' });
      return null;
    }
  };

  const deleteAnexo = async (id: string, cartaoId: string): Promise<void> => {
    try {
      await (supabase.from('cartao_anexos' as any) as any).delete().eq('id', id);
      await logAtividade(cartaoId, 'removeu um anexo');
    } catch { /* não crítico */ }
  };

  // ── Duplicar cartão ───────────────────────────────────────────────────────
  const duplicarCartao = async (cartaoId: string, listaId: string): Promise<void> => {
    if (!empresaId) return;
    const srcCard = listas.flatMap(l => l.cartoes).find(c => c.id === cartaoId);
    if (!srcCard) return;
    const lista = listas.find(l => l.id === listaId);
    const maxPos = lista && lista.cartoes.length > 0 ? Math.max(...lista.cartoes.map(c => c.posicao)) + 1 : 0;
    const { data: newCard } = await supabase.from('quadro_cartoes')
      .insert({
        lista_id: listaId, empresa_id: empresaId,
        titulo: `${srcCard.titulo} (cópia)`,
        descricao: srcCard.descricao, cor: srcCard.cor,
        posicao: maxPos, criado_por: meRef.current.authId,
      }).select(CARD_SELECT).single();
    if (!newCard) return;
    for (const cl of srcCard.checklists) {
      const { data: newCl } = await supabase.from('cartao_checklists')
        .insert({ cartao_id: newCard.id, titulo: cl.titulo, posicao: cl.posicao })
        .select().single();
      if (newCl && cl.items.length > 0) {
        await supabase.from('cartao_checklist_items').insert(
          cl.items.map(item => ({ checklist_id: newCl.id, texto: item.texto, concluido: false, posicao: item.posicao })),
        );
      }
    }
    const finalCard = await supabase.from('quadro_cartoes').select(CARD_SELECT).eq('id', newCard.id).single();
    if (finalCard.data) {
      setListas(prev => prev.map(l => l.id === listaId ? { ...l, cartoes: [...l.cartoes, mapCard(finalCard.data)] } : l));
    }
    toast({ title: 'Cartão duplicado com sucesso' });
  };

  // ── Modelos de checklist ──────────────────────────────────────────────────
  const listChecklistModelos = async (): Promise<ChecklistModelo[]> => {
    if (!empresaId) return [];
    try {
      const { data } = await (supabase.from('checklist_templates' as any) as any)
        .select('*, checklist_template_items(*)')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true });
      return (data || []) as ChecklistModelo[];
    } catch { return []; }
  };

  const applyChecklistModelo = async (cartaoId: string, modeloNome: string, itens: ChecklistModeloItem[]): Promise<void> => {
    const lista = listas.find(l => l.cartoes.some(c => c.id === cartaoId));
    const maxPos = lista?.cartoes.find(c => c.id === cartaoId)?.checklists.length ?? 0;
    const { data: cl } = await supabase.from('cartao_checklists')
      .insert({ cartao_id: cartaoId, titulo: modeloNome, posicao: maxPos })
      .select().single();
    if (!cl) return;
    if (itens.length > 0) {
      await supabase.from('cartao_checklist_items').insert(
        [...itens].sort((a, b) => a.posicao - b.posicao).map((item, i) => ({
          checklist_id: cl.id, texto: item.texto, concluido: false, posicao: i,
        })),
      );
    }
    const { data: updatedCard } = await supabase.from('quadro_cartoes').select(CARD_SELECT).eq('id', cartaoId).single();
    if (updatedCard) {
      const mapped = mapCard(updatedCard);
      setListas(prev => prev.map(l => ({ ...l, cartoes: l.cartoes.map(c => c.id === cartaoId ? mapped : c) })));
    }
  };

  // ── Etiqueta ops ──────────────────────────────────────────────────────────
  // Cria a etiqueta ao nível do quadro (fica DISPONÍVEL no seletor de todos os cartões),
  // mas NÃO a aplica a nenhum cartão — a aplicação é sempre manual, pelo utilizador.
  const createEtiqueta = async (nome: string, cor: string): Promise<Etiqueta | null> => {
    if (!quadroId) return null;
    const { data } = await supabase.from('cartao_etiquetas').insert({ quadro_id: quadroId, nome, cor }).select().single();
    if (data) setEtiquetas(prev => [...prev, data as Etiqueta]);
    return (data as Etiqueta) || null;
  };

  // Limpar: remover TODAS as etiquetas aplicadas a TODOS os cartões deste quadro.
  // Remove só as ASSOCIAÇÕES (cartao_etiqueta_rel) — as etiquetas continuam
  // disponíveis no seletor para aplicação manual.
  const clearAllEtiquetasFromAllCartoes = async (): Promise<number> => {
    const cardIds = listas.flatMap(l => l.cartoes).filter(c => c.etiquetas.length > 0).map(c => c.id);
    if (cardIds.length === 0) {
      toast({ title: 'Nada a limpar', description: 'Nenhum cartão tem etiquetas aplicadas.' });
      return 0;
    }
    const { error } = await supabase.from('cartao_etiqueta_rel').delete().in('cartao_id', cardIds);
    if (error) {
      toast({ title: 'Erro ao limpar etiquetas', description: error.message, variant: 'destructive' });
      return 0;
    }
    setListas(prev => prev.map(l => ({ ...l, cartoes: l.cartoes.map(c => ({ ...c, etiquetas: [] })) })));
    toast({ title: 'Etiquetas removidas de todos os cartões', description: 'Agora aplicas manualmente onde precisares.' });
    return cardIds.length;
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
    addChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem, updateChecklistItem, deleteChecklist,
    fetchFeed, addComentario, updateComentario, deleteComentario, logAtividade,
    listAnexos, addAnexo, uploadAnexo, deleteAnexo,
    duplicarCartao,
    listChecklistModelos, applyChecklistModelo,
    createEtiqueta, updateEtiqueta, toggleEtiquetaOnCartao, clearAllEtiquetasFromAllCartoes,
    toggleMembro,
    refresh: fetchAll,
  };
}
