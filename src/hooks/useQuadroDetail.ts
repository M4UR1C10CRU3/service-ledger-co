import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Quadro, QuadroLista, QuadroCartao, Etiqueta, Comentario, ChecklistItem, Utilizador, CartaoAnexo, ChecklistModelo, ChecklistModeloItem } from '@/types/quadros';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { sendEmail } from '@/lib/sendEmail';
import { camposEmFalta, descreveFalta, dispararAutomacoes } from '@/hooks/useQuadroProcesso';

// ITC mantém etiquetas/checklists isolados por empresa; todas as outras empresas
// partilham o mesmo conjunto (o utilizador pediu que não haja distinção entre elas).
const ITC_EMPRESA_ID = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b';

const CARD_SELECT =
  '*, cartao_etiqueta_rel(etiqueta_id, cartao_etiquetas(id, nome, cor)), ' +
  'cartao_checklists(id, cartao_id, titulo, posicao, criado_em, cartao_checklist_items(id, checklist_id, texto, concluido, posicao, criado_em, responsavel_id, responsavel_nome, hora, data_limite)), ' +
  'cartao_membros(cartao_id, utilizador_id, nome)';

function dedupeById<T extends { id?: string; utilizador_id?: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter(item => {
    const key = item.id ?? item.utilizador_id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapCard(card: any): QuadroCartao {
  return {
    ...card,
    etiquetas: dedupeById((card.cartao_etiqueta_rel || []).map((r: any) => r.cartao_etiquetas).filter(Boolean)),
    checklists: (card.cartao_checklists || [])
      .sort((a: any, b: any) => a.posicao - b.posicao)
      .map((cl: any) => ({ ...cl, items: (cl.cartao_checklist_items || []).sort((a: any, b: any) => a.posicao - b.posicao) })),
    membros: dedupeById(card.cartao_membros || []),
  };
}

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Molde comum dos e-mails dos quadros (menções e tarefas de checklist).
function emailCartaoHtml(o: {
  titulo: string; quadroNome: string; cartaoTitulo: string; cartaoUrl: string;
  intro: string; corpoHtml: string;
}): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <tr><td style="background:#6366f1;padding:24px 32px">
    <p style="margin:0;color:#fff;font-size:18px;font-weight:700">${o.titulo}</p>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="margin:0 0 4px;color:#71717a;font-size:13px">Quadro</p>
    <p style="margin:0 0 16px;font-weight:600;font-size:15px">${escHtml(o.quadroNome)}</p>
    <p style="margin:0 0 4px;color:#71717a;font-size:13px">Cartão</p>
    <p style="margin:0 0 20px;font-weight:600;font-size:15px"><a href="${o.cartaoUrl}" style="color:#6366f1;text-decoration:none">${escHtml(o.cartaoTitulo)} &rarr;</a></p>
    <p style="margin:0 0 8px;color:#374151;font-size:14px">${o.intro}</p>
    <div style="border-left:4px solid #6366f1;background:#f5f3ff;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px;color:#1f2937;font-size:14px;line-height:1.6">${o.corpoHtml}</div>
    <p style="margin:0 0 20px"><a href="${o.cartaoUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px">Abrir cartão no Clariza</a></p>
    <p style="margin:0;color:#71717a;font-size:12px">Esta é uma notificação automática do Clariza Manager.</p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

const dataPt = (iso: string) => { const [a, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${a}`; };

// Etiquetas disponíveis para um quadro: para ITC, apenas as do próprio quadro
// (comportamento original). Para qualquer outra empresa, a união das etiquetas
// de TODOS os quadros de TODAS as empresas não-ITC, deduplicada por nome —
// assim o número máximo de etiquetas já criado fica disponível em todas.
async function fetchEtiquetasDisponiveis(quadroId: string, empresaId: string): Promise<Etiqueta[]> {
  if (empresaId === ITC_EMPRESA_ID) {
    const { data } = await supabase.from('cartao_etiquetas').select('*').eq('quadro_id', quadroId);
    return (data as Etiqueta[]) || [];
  }
  const { data: quadrosPartilhados } = await supabase.from('quadros').select('id').neq('empresa_id', ITC_EMPRESA_ID);
  const quadroIds = (quadrosPartilhados || []).map((q: any) => q.id);
  if (quadroIds.length === 0) return [];
  const { data: ets } = await supabase.from('cartao_etiquetas').select('*').in('quadro_id', quadroIds);
  // Etiquetas do quadro atual têm prioridade no dedupe por nome — evita que uma etiqueta
  // homónima de outro quadro "roube" a posição e fique com um id que nunca corresponde
  // ao que está de facto associado aos cartões deste quadro (impossível de alternar/remover).
  const ordenado = [...((ets as Etiqueta[]) || [])].sort((a, b) => {
    const aAtual = a.quadro_id === quadroId ? 0 : 1;
    const bAtual = b.quadro_id === quadroId ? 0 : 1;
    return aAtual - bAtual;
  });
  const seen = new Set<string>();
  return ordenado.filter((e) => {
    const key = e.nome.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

  /**
   * O nome a gravar num comentário.
   *
   * Se o nome verdadeiro ainda não chegou, vai-se buscá-lo na hora em vez de
   * gravar o valor de reserva. O nome fica COPIADO no comentário para sempre,
   * por isso vale a pena esperar por ele — foi assim que 152 comentários
   * ficaram assinados por "Utilizador".
   */
  const nomeParaGravar = useCallback(async (): Promise<string> => {
    if (meRef.current.pronto && meRef.current.nome) return meRef.current.nome;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return meRef.current.nome;
    // Mesma ordem do `useCurrentUser`: a ficha primeiro. Os metadados da conta
    // podem trazer o nome de um antigo dono — ver a nota lá.
    const [{ data: f }, { data: p }] = await Promise.all([
      (supabase.from('liberty_utilizadores') as any)
        .select('nome').eq('auth_user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('nome').eq('id', user.id).maybeSingle(),
    ]);
    return (
      (f?.nome as string)?.trim() ||
      p?.nome?.trim() ||
      ((user.user_metadata as any)?.nome as string)?.trim() ||
      user.email ||
      meRef.current.nome
    );
  }, []);

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

      setEtiquetas(await fetchEtiquetasDisponiveis(quadroId, empresaId));
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
        autor_id: meRef.current.authId, autor_nome: await nomeParaGravar(),
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
  // Grava coluna e posição. `sempre` = cartões que têm de ser gravados mesmo que
  // pareçam iguais: o cartão arrastado já chega aqui com a coluna nova (o
  // onDragOver muda-a no ecrã), e se calhasse ficar com o mesmo número de posição
  // que tinha na coluna antiga, nada se gravava — no ecrã mudava, na base não,
  // e ao voltar ao quadro estava outra vez onde estava (01/10/2026, Sier Energia).
  const persistCartaoOrder = useCallback(async (affectedListaIds: string[], state: QuadroLista[], sempre: string[] = []) => {
    const ops: PromiseLike<{ id: string; ok: boolean }>[] = [];
    affectedListaIds.forEach(lid => {
      const lista = state.find(l => l.id === lid);
      if (!lista) return;
      lista.cartoes.forEach((c, i) => {
        if (c.posicao !== i || c.lista_id !== lid || sempre.includes(c.id)) {
          ops.push(supabase.from('quadro_cartoes').update({ lista_id: lid, posicao: i }).eq('id', c.id).select('id')
            .then(({ data, error }) => ({ id: c.id, ok: !error && !!data?.length })));
        }
      });
    });
    const res = await Promise.all(ops);
    // Uma escrita recusada pela base devolve «sucesso» com 0 linhas: avisar e repor
    // o quadro tal como está gravado, em vez de mostrar uma posição que não ficou.
    if (res.some(r => !r.ok)) {
      toast({ title: 'A nova posição do cartão não ficou gravada', description: 'O quadro foi recarregado com o que está gravado. Tente de novo.', variant: 'destructive' });
      await fetchAll();
      return;
    }
    // O estado local passa a refletir o que foi gravado (posição e coluna).
    setListas(prev => prev.map(l => affectedListaIds.includes(l.id)
      ? { ...l, cartoes: l.cartoes.map((c, i) => ({ ...c, lista_id: l.id, posicao: i })) } : l));
  }, [fetchAll, toast]);

  // ── Processo: validação e automações do movimento ────────────────────────
  // Num quadro 'livre' não há regras — estas funções passam sempre. Num quadro
  // tipado, a coluna de destino declara o que exige, e é aqui que se verifica.

  /**
   * Pode este cartão entrar nesta coluna? Se não, devolve o que falta,
   * já em texto legível — a UI explica, em vez de recusar em silêncio.
   */
  const validarMovimento = useCallback(async (
    cartaoId: string, listaDestinoId: string,
  ): Promise<{ ok: boolean; mensagem?: string; campos: string[] }> => {
    const destino = listas.find(l => l.id === listaDestinoId);
    if (destino?.bloqueada) {
      return { ok: false, campos: [], mensagem: `"${destino.nome}" não aceita cartões arrastados.` };
    }
    const faltam = await camposEmFalta(cartaoId, listaDestinoId);
    if (faltam.length === 0) return { ok: true, campos: [] };
    return { ok: false, campos: faltam, mensagem: descreveFalta(faltam) };
  }, [listas]);

  /** Depois de mover com sucesso — corre as automações da coluna de destino. */
  const aoMoverCartao = useCallback(async (
    cartaoId: string, listaOrigemId: string | null, listaDestinoId: string,
  ) => {
    if (!empresaId || !quadroId) return;
    const origem  = listas.find(l => l.id === listaOrigemId);
    const destino = listas.find(l => l.id === listaDestinoId);
    // Sem estado associado (quadro livre) não há nada a disparar.
    if (!destino?.estado_codigo && !origem?.estado_codigo) return;
    try {
      await dispararAutomacoes({
        empresaId, cartaoId, quadroId,
        modeloCodigo: (quadro as any)?.modelo_codigo ?? null,
        estadoDestino: destino?.estado_codigo ?? null,
        estadoOrigem: origem?.estado_codigo ?? null,
      });
    } catch (e) {
      console.error('Automações do quadro falharam', e);
    }
  }, [empresaId, quadroId, listas, quadro]);

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

  // Cartões arquivados deste quadro (para recuperação)
  const listArquivados = async (): Promise<{ cartao: QuadroCartao; listaNome: string }[]> => {
    const listaIds = listas.map(l => l.id);
    if (!listaIds.length) return [];
    const nomeDe = new Map(listas.map(l => [l.id, l.nome]));
    const { data } = await supabase.from('quadro_cartoes').select(CARD_SELECT)
      .in('lista_id', listaIds).eq('arquivado', true).order('atualizado_em', { ascending: false });
    return ((data as any[]) || []).map(d => ({ cartao: mapCard(d), listaNome: nomeDe.get(d.lista_id) || '' }));
  };

  // Restaurar (desarquivar) um cartão — volta à lista de origem
  const restaurarCartao = async (cartaoId: string): Promise<void> => {
    await supabase.from('quadro_cartoes').update({ arquivado: false }).eq('id', cartaoId);
    const { data } = await supabase.from('quadro_cartoes').select(CARD_SELECT).eq('id', cartaoId).single();
    if (data) {
      const card = mapCard(data);
      setListas(prev => prev.map(l => l.id === card.lista_id
        ? (l.cartoes.some(c => c.id === card.id) ? l : { ...l, cartoes: [...l.cartoes, card] })
        : l));
    }
    toast({ title: 'Cartão restaurado' });
  };

  // ── Checklist ops ─────────────────────────────────────────────────────────
  const addChecklist = async (cartaoId: string, titulo: string) => {
    const { data } = await supabase.from('cartao_checklists').insert({ cartao_id: cartaoId, titulo }).select().single();
    if (data) {
      const newCl = { ...(data as any), items: [] };
      setListas(prev => prev.map(l => ({ ...l, cartoes: l.cartoes.map(c => c.id === cartaoId ? { ...c, checklists: [...c.checklists, newCl] } : c) })));
    }
  };

  const updateChecklistTitulo = async (checklistId: string, titulo: string) => {
    await supabase.from('cartao_checklists').update({ titulo }).eq('id', checklistId);
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => ({
        ...c, checklists: c.checklists.map(cl => cl.id === checklistId ? { ...cl, titulo } : cl),
      })),
    })));
  };

  const addChecklistItem = async (checklistId: string, cartaoId: string, texto: string) => {
    const { data } = await supabase.from('cartao_checklist_items').insert({ checklist_id: checklistId, texto }).select().single();
    if (data) setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => c.id === cartaoId
        ? { ...c, checklists: c.checklists.map(cl => cl.id === checklistId ? { ...cl, items: [...cl.items, data as any] } : cl) } : c),
    })));
  };

  // Marcar/desmarcar uma tarefa. O ecrã só muda depois de a base confirmar: uma
  // escrita recusada (sessão terminada, sem acesso) chega como «sucesso» com 0
  // linhas, e antes a checkbox ficava marcada no ecrã e voltava desmarcada ao
  // recarregar (21/10/2026, cartão José Carvas). Cada mudança fica no feed do
  // cartão, para se saber quem marcou ou desmarcou e quando.
  const toggleChecklistItem = async (itemId: string, checklistId: string, cartaoId: string, concluido: boolean) => {
    const { data, error } = await supabase.from('cartao_checklist_items')
      .update({ concluido }).eq('id', itemId).select('id');
    if (error || !data?.length) {
      toast({
        title: concluido ? 'A tarefa não ficou marcada' : 'A tarefa não ficou desmarcada',
        description: 'A alteração não foi gravada (sessão terminada ou falha de ligação). Recarregue a página e tente de novo.',
        variant: 'destructive',
      });
      return;
    }
    const texto = listas.flatMap(l => l.cartoes).find(c => c.id === cartaoId)
      ?.checklists.find(cl => cl.id === checklistId)?.items.find(it => it.id === itemId)?.texto;
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => c.id === cartaoId
        ? { ...c, checklists: c.checklists.map(cl => cl.id === checklistId ? { ...cl, items: cl.items.map(it => it.id === itemId ? { ...it, concluido } : it) } : cl) } : c),
    })));
    if (texto) await logAtividade(cartaoId, concluido ? `marcou "${texto}" como concluída` : `desmarcou "${texto}"`);
  };

  const deleteChecklistItem = async (itemId: string, checklistId: string, cartaoId: string) => {
    await supabase.from('cartao_checklist_items').delete().eq('id', itemId);
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => c.id === cartaoId
        ? { ...c, checklists: c.checklists.map(cl => cl.id === checklistId ? { ...cl, items: cl.items.filter(it => it.id !== itemId) } : cl) } : c),
    })));
  };

  // Avisa por e-mail o responsável de uma tarefa de checklist: quando passa a
  // sê-lo, ou quando a tarefa, a data ou a hora mudam. Não avisa quem atribui
  // a si próprio.
  const notificarTarefa = async (
    antes: ChecklistItem,
    updates: Partial<Pick<ChecklistItem, 'texto' | 'responsavel_id' | 'responsavel_nome' | 'hora' | 'data_limite'>>,
    cartaoId: string,
    cartaoTitulo: string,
  ) => {
    const depois = { ...antes, ...updates };
    if (!depois.responsavel_id) return;
    const novoResponsavel = depois.responsavel_id !== antes.responsavel_id;
    const mudou = novoResponsavel
      || (depois.texto ?? '') !== (antes.texto ?? '')
      || (depois.hora ?? '').slice(0, 5) !== (antes.hora ?? '').slice(0, 5)
      || (depois.data_limite ?? '').slice(0, 10) !== (antes.data_limite ?? '').slice(0, 10);
    if (!mudou) return;
    const u = utilizadores.find(x => x.id === depois.responsavel_id);
    const autorNome = meRef.current.nome || 'Alguém';
    if (!u?.email || u.nome === autorNome) return;

    const quadroNome = quadro?.nome || '';
    const cartaoUrl = `https://app.clarizaplatform.com/quadros/${quadroId}?cartao=${cartaoId}`;
    const quando = [
      depois.data_limite ? dataPt(depois.data_limite) : '',
      depois.hora ? `às ${depois.hora.slice(0, 5)}` : '',
    ].filter(Boolean).join(' ') || 'sem data definida';
    const r = await sendEmail({
      to: u.email,
      subject: novoResponsavel
        ? `[${quadroNome}] Nova tarefa: ${depois.texto}${depois.data_limite ? ` — ${quando}` : ''}`
        : `[${quadroNome}] Tarefa alterada: ${depois.texto}${depois.data_limite ? ` — ${quando}` : ''}`,
      html: emailCartaoHtml({
        titulo: novoResponsavel ? '&#9989; Tem uma nova tarefa' : '&#9999;&#65039; Uma tarefa sua foi alterada',
        quadroNome, cartaoTitulo, cartaoUrl,
        intro: `<strong>${escHtml(autorNome)}</strong> ${novoResponsavel ? 'atribuiu-lhe esta tarefa' : 'alterou esta tarefa'}:`,
        corpoHtml: `<strong>${escHtml(depois.texto)}</strong><br><span style="color:#6366f1">&#128197; ${quando}</span>`,
      }),
      empresa_id: empresaId,
      tipo: 'comercial',
    });
    if (!r.ok) toast({
      title: `Tarefa guardada, mas o e-mail a ${u.nome} não foi enviado.`,
      description: r.error,
      variant: 'destructive',
    });
  };

  const updateChecklistItem = async (
    itemId: string, checklistId: string, cartaoId: string,
    updates: Partial<Pick<ChecklistItem, 'texto' | 'responsavel_id' | 'responsavel_nome' | 'hora' | 'data_limite'>>,
  ) => {
    const cartao = listas.flatMap(l => l.cartoes).find(c => c.id === cartaoId);
    const antes = cartao?.checklists.find(cl => cl.id === checklistId)?.items.find(it => it.id === itemId);
    const { error } = await supabase.from('cartao_checklist_items').update(updates).eq('id', itemId);
    if (error) {
      toast({ title: 'Não foi possível guardar. Tente novamente.', variant: 'destructive' });
      return;
    }
    if (antes && cartao) void notificarTarefa(antes, updates, cartaoId, cartao.titulo);
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => c.id === cartaoId
        ? { ...c, checklists: c.checklists.map(cl => cl.id === checklistId ? { ...cl, items: cl.items.map(it => it.id === itemId ? { ...it, ...updates } : it) } : cl) } : c),
    })));
  };

  // Mover uma tarefa para cima/baixo dentro do checklist (normaliza posicao 0..n)
  const moveChecklistItem = async (itemId: string, checklistId: string, cartaoId: string, direction: 'up' | 'down') => {
    const cartao = listas.flatMap(l => l.cartoes).find(c => c.id === cartaoId);
    const cl = cartao?.checklists.find(x => x.id === checklistId);
    if (!cl) return;
    const items = [...cl.items];
    const idx = items.findIndex(it => it.id === itemId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;
    [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
    const reordered = items.map((it, i) => ({ ...it, posicao: i }));
    await Promise.all(reordered.map((it, i) =>
      cl.items.find(o => o.id === it.id)?.posicao === i
        ? Promise.resolve()
        : supabase.from('cartao_checklist_items').update({ posicao: i }).eq('id', it.id),
    ));
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(cc => cc.id !== cartaoId ? cc
        : { ...cc, checklists: cc.checklists.map(x => x.id !== checklistId ? x : { ...x, items: reordered }) }),
    })));
  };

  // Arrastar e largar: grava a nova ordem completa (só as posições que mudaram).
  const reorderChecklistItems = async (checklistId: string, cartaoId: string, idsPorOrdem: string[]) => {
    const cartao = listas.flatMap(l => l.cartoes).find(c => c.id === cartaoId);
    const cl = cartao?.checklists.find(x => x.id === checklistId);
    if (!cl) return;
    const porId = new Map(cl.items.map(it => [it.id, it]));
    const reordered = idsPorOrdem.map((id, i) => ({ ...porId.get(id)!, posicao: i })).filter(it => it.id);
    if (reordered.length !== cl.items.length) return;
    // Atualiza o ecrã primeiro, para o item não «saltar» de volta enquanto grava.
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(cc => cc.id !== cartaoId ? cc
        : { ...cc, checklists: cc.checklists.map(x => x.id !== checklistId ? x : { ...x, items: reordered }) }),
    })));
    await Promise.all(reordered.map((it, i) =>
      porId.get(it.id)?.posicao === i ? Promise.resolve()
        : supabase.from('cartao_checklist_items').update({ posicao: i }).eq('id', it.id),
    ));
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
        autor_id: meRef.current.authId, autor_nome: await nomeParaGravar(),
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
      const cartaoUrl = `https://app.clarizaplatform.com/quadros/${quadroId}?cartao=${cartaoId}`;
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
    <p style="margin:0 0 20px;font-weight:600;font-size:15px"><a href="${cartaoUrl}" style="color:#6366f1;text-decoration:none">${cartaoTitulo} &rarr;</a></p>
    <p style="margin:0 0 8px;color:#374151;font-size:14px"><strong>${autorNome}</strong> escreveu:</p>
    <div style="border-left:4px solid #6366f1;background:#f5f3ff;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px;color:#1f2937;font-size:14px;line-height:1.6">${textoHtml}</div>
    <p style="margin:0 0 20px"><a href="${cartaoUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px">Abrir cartão no Clariza</a></p>
    <p style="margin:0;color:#71717a;font-size:12px">Esta é uma notificação automática do Clariza Manager.</p>
  </td></tr>
</table>
</td></tr></table></body></html>`,
          empresa_id: empresaId,
          tipo: 'comercial',
        }).then(r => {
          // O comentário fica gravado na mesma; só se avisa que o e-mail não seguiu.
          if (!r.ok) toast({
            title: `Comentário guardado, mas o e-mail a ${u.nome} não foi enviado.`,
            description: r.error,
            variant: 'destructive',
          });
        });
      }
    }

    return (data as Comentario) || null;
  };

  // Só o autor mexe no que escreveu. A base impõe o mesmo — isto aqui é para
  // o utilizador perceber o que aconteceu, não é a proteção.
  const updateComentario = async (id: string, texto: string) => {
    const { data, error } = await supabase.from('cartao_comentarios')
      .update({ texto, atualizado_em: new Date().toISOString() })
      .eq('id', id).eq('autor_id', meRef.current.authId as string)
      .select('id');
    if (error || !data?.length) {
      toast({ title: 'Só quem escreveu o comentário o pode editar', variant: 'destructive' });
    }
  };

  const deleteComentario = async (id: string) => {
    const { data, error } = await supabase.from('cartao_comentarios')
      .delete().eq('id', id).eq('autor_id', meRef.current.authId as string)
      .select('id');
    if (error || !data?.length) {
      toast({ title: 'Só quem escreveu o comentário o pode eliminar', variant: 'destructive' });
    }
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

  // Apagar de vez um cartão arquivado. Checklists, comentários, anexos, membros e etiquetas
  // saem em cascata na base. Os ficheiros dos anexos só saem do Storage se nenhum outro
  // cartão os usar: um cartão duplicado partilha o mesmo ficheiro (ver duplicarCartao).
  const apagarCartaoArquivado = async (cartaoId: string): Promise<boolean> => {
    const { data: anexos } = await (supabase.from('cartao_anexos' as any) as any)
      .select('path').eq('cartao_id', cartaoId);
    const paths = [...new Set(((anexos as any[]) || []).map(a => a.path).filter(Boolean))] as string[];

    // .select() para detetar uma recusa da RLS, que no Supabase volta como sucesso com 0 linhas.
    const { data, error } = await supabase.from('quadro_cartoes').delete()
      .eq('id', cartaoId).eq('arquivado', true).select('id');
    if (error || !data?.length) {
      toast({
        title: 'Não foi possível apagar o cartão.',
        description: error?.message ?? 'Sem permissão para apagar este cartão.',
        variant: 'destructive',
      });
      return false;
    }

    if (paths.length) {
      const { data: usados } = await (supabase.from('cartao_anexos' as any) as any)
        .select('path').in('path', paths);
      const emUso = new Set(((usados as any[]) || []).map(u => u.path));
      const livres = paths.filter(p => !emUso.has(p));
      if (livres.length) await supabase.storage.from(ANEXO_BUCKET).remove(livres);
    }
    toast({ title: 'Cartão apagado' });
    return true;
  };

  // ── Duplicar cartão ───────────────────────────────────────────────────────
  // Obrigatório: membros, etiquetas (tal qual), checklist + responsáveis.
  // Opcional (escolha do utilizador): comentários e anexos.
  const duplicarCartao = async (
    cartaoId: string,
    listaId: string,
    opts?: { comentarios?: boolean; anexos?: boolean },
  ): Promise<void> => {
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
      }).select('id').single();
    if (!newCard) return;
    const newId = (newCard as any).id;

    // Etiquetas (obrigatório — tal qual estavam)
    if (srcCard.etiquetas.length > 0) {
      await supabase.from('cartao_etiqueta_rel').insert(
        srcCard.etiquetas.map(e => ({ cartao_id: newId, etiqueta_id: e.id })),
      );
    }
    // Membros (obrigatório)
    if (srcCard.membros.length > 0) {
      await supabase.from('cartao_membros').insert(
        srcCard.membros.map(m => ({ cartao_id: newId, utilizador_id: m.utilizador_id, nome: m.nome })),
      );
    }
    // Checklists + itens + responsáveis/hora/prazo (obrigatório)
    for (const cl of srcCard.checklists) {
      const { data: newCl } = await supabase.from('cartao_checklists')
        .insert({ cartao_id: newId, titulo: cl.titulo, posicao: cl.posicao })
        .select().single();
      if (newCl && cl.items.length > 0) {
        await supabase.from('cartao_checklist_items').insert(
          cl.items.map(item => ({
            checklist_id: newCl.id, texto: item.texto, concluido: false, posicao: item.posicao,
            responsavel_id: item.responsavel_id ?? null,
            responsavel_nome: item.responsavel_nome ?? null,
            hora: item.hora ?? null,
            data_limite: item.data_limite ?? null,
          })),
        );
      }
    }
    // Comentários (opcional)
    if (opts?.comentarios) {
      const feed = await fetchFeed(cartaoId);
      const coments = feed.filter(f => f.tipo === 'comentario');
      if (coments.length > 0) {
        await supabase.from('cartao_comentarios').insert(
          coments.map(cm => ({
            cartao_id: newId, texto: cm.texto, tipo: 'comentario',
            autor_id: cm.autor_id, autor_nome: cm.autor_nome,
            reply_to_id: null,
            reply_to_autor_nome: cm.reply_to_autor_nome ?? null,
            reply_to_texto: cm.reply_to_texto ?? null,
          })),
        );
      }
    }
    // Anexos (opcional) — nova linha a apontar para o MESMO ficheiro no Storage (path partilhado)
    if (opts?.anexos) {
      const srcAnexos = await listAnexos(cartaoId);
      if (srcAnexos.length > 0) {
        await (supabase.from('cartao_anexos' as any) as any).insert(
          srcAnexos.map(a => ({ cartao_id: newId, nome: a.nome, path: a.path ?? null, tipo: a.tipo ?? null })),
        );
      }
    }

    const finalCard = await supabase.from('quadro_cartoes').select(CARD_SELECT).eq('id', newId).single();
    if (finalCard.data) {
      setListas(prev => prev.map(l => l.id === listaId ? { ...l, cartoes: [...l.cartoes, mapCard(finalCard.data)] } : l));
    }
    toast({ title: 'Cartão duplicado com sucesso' });
  };

  // ── Mover cartão para outra empresa/quadro/lista ──────────────────────────
  // Seletores para o destino (empresas / quadros / listas).
  const fetchEmpresasMove = async (): Promise<{ id: string; nome: string }[]> => {
    const { data } = await supabase.from('empresas').select('id, nome').order('nome');
    return ((data as any) || []);
  };
  const fetchQuadrosMove = async (empId: string): Promise<{ id: string; nome: string }[]> => {
    const { data } = await supabase.from('quadros').select('id, nome').eq('empresa_id', empId).eq('arquivado', false).order('nome');
    return ((data as any) || []);
  };
  const fetchListasMove = async (qId: string): Promise<{ id: string; nome: string }[]> => {
    const { data } = await supabase.from('quadro_listas').select('id, nome').eq('quadro_id', qId).eq('arquivado', false).order('posicao');
    return ((data as any) || []);
  };

  // Move o PRÓPRIO cartão (mesmo id) para o destino: comentários/histórico, checklist,
  // membros e anexos vivem pendurados no id e vão com ele, sem cópia nenhuma.
  // Antes copiava para um cartão novo: a RLS de cartao_comentarios só aceita autor_id = quem
  // grava, por isso os comentários de colegas eram recusados em silêncio (30/09/2026, WMTCEC 137).
  // Só as etiquetas mudam — são de cada quadro — e são re-mapeadas por NOME.
  const moveCartaoParaEmpresa = async (
    cartaoId: string, srcListaId: string,
    target: { empresaId: string; quadroId: string; listaId: string },
  ): Promise<boolean> => {
    const src = listas.flatMap(l => l.cartoes).find(c => c.id === cartaoId);
    if (!src) return false;
    try {
      const { data: destCards } = await supabase.from('quadro_cartoes').select('posicao').eq('lista_id', target.listaId).eq('arquivado', false);
      const maxPos = ((destCards as any[]) || []).reduce((m, x) => Math.max(m, x.posicao), -1) + 1;

      const { data: movido, error: errMove } = await supabase.from('quadro_cartoes')
        .update({ lista_id: target.listaId, empresa_id: target.empresaId, posicao: maxPos })
        .eq('id', cartaoId).select('id');
      if (errMove) throw errMove;
      // Uma escrita recusada pela RLS devolve sucesso com 0 linhas — tratar como erro.
      if (!movido || (movido as any[]).length === 0) throw new Error('Sem permissão para mover este cartão para o destino.');

      // Etiquetas — trocar as do quadro de origem pelas do destino com o mesmo nome
      if (src.etiquetas.length > 0) {
        const { data: destEt } = await supabase.from('cartao_etiquetas').select('id, nome').eq('quadro_id', target.quadroId);
        const byName = new Map(((destEt as any[]) || []).map(e => [e.nome, e.id]));
        const destIds = new Set(((destEt as any[]) || []).map(e => e.id));
        const antigas = src.etiquetas.filter(e => !destIds.has(e.id)).map(e => e.id);
        if (antigas.length) await supabase.from('cartao_etiqueta_rel').delete().eq('cartao_id', cartaoId).in('etiqueta_id', antigas);
        // Etiqueta que o quadro de destino não tem: cria-se lá (mesmo nome e cor), em vez de se perder.
        const novas: { cartao_id: string; etiqueta_id: string }[] = [];
        for (const e of src.etiquetas.filter(x => !destIds.has(x.id))) {
          let etId = byName.get(e.nome);
          if (!etId) {
            const { data: criada } = await supabase.from('cartao_etiquetas').insert({ quadro_id: target.quadroId, nome: e.nome, cor: e.cor }).select('id').single();
            etId = (criada as any)?.id;
            if (etId) byName.set(e.nome, etId);
          }
          if (etId) novas.push({ cartao_id: cartaoId, etiqueta_id: etId });
        }
        if (novas.length) await supabase.from('cartao_etiqueta_rel').insert(novas);
      }

      setListas(prev => prev.map(l => l.id === srcListaId ? { ...l, cartoes: l.cartoes.filter(c => c.id !== cartaoId) } : l));
      toast({ title: 'Cartão movido', description: 'Movido com todo o histórico, comentários, checklist e anexos.' });
      return true;
    } catch (e: any) {
      toast({ title: 'Erro ao mover o cartão', description: e?.message, variant: 'destructive' });
      return false;
    }
  };

  // Quando várias empresas criaram um modelo com o mesmo nome (duplicados
  // acumulados ao longo do tempo), mantém apenas o mais completo (mais itens);
  // se houver empate, o mais recente.
  function dedupeModelosPorNome(lista: any[]): ChecklistModelo[] {
    const melhores = new Map<string, any>();
    for (const m of lista) {
      const key = (m.nome || '').trim().toLowerCase();
      const atual = melhores.get(key);
      if (!atual) { melhores.set(key, m); continue; }
      const itensAtual = (atual.checklist_template_items || []).length;
      const itensNovo = (m.checklist_template_items || []).length;
      if (itensNovo > itensAtual || (itensNovo === itensAtual && new Date(m.criado_em) > new Date(atual.criado_em))) {
        melhores.set(key, m);
      }
    }
    return Array.from(melhores.values()) as ChecklistModelo[];
  }

  // ── Modelos de checklist ──────────────────────────────────────────────────
  const listChecklistModelos = async (): Promise<ChecklistModelo[]> => {
    if (!empresaId) return [];
    try {
      // ITC mantém os seus próprios modelos; as restantes empresas partilham o
      // mesmo conjunto (número máximo de modelos já criado disponível em todas).
      if (empresaId === ITC_EMPRESA_ID) {
        const { data } = await (supabase.from('checklist_templates' as any) as any)
          .select('*, checklist_template_items(*)')
          .eq('empresa_id', empresaId)
          .order('nome', { ascending: true });
        return (data || []) as ChecklistModelo[];
      }
      const { data: empresasPartilhadas } = await supabase.from('empresas').select('id').neq('id', ITC_EMPRESA_ID);
      const empresaIds = (empresasPartilhadas || []).map((e: any) => e.id);
      if (empresaIds.length === 0) return [];
      const { data } = await (supabase.from('checklist_templates' as any) as any)
        .select('*, checklist_template_items(*)')
        .in('empresa_id', empresaIds)
        .order('nome', { ascending: true });
      return dedupeModelosPorNome((data || []) as any[]).sort((a, b) => a.nome.localeCompare(b.nome));
    } catch { return []; }
  };

  // Atribui/edita a categoria de um modelo (usada para agrupar o popover "Modelos"
  // por tipo de cartão/quadro, ex.: Compras, Produção).
  const updateChecklistModeloCategoria = async (modeloId: string, categoria: string | null): Promise<boolean> => {
    const { error } = await (supabase.from('checklist_templates' as any) as any)
      .update({ categoria: categoria?.trim() || null })
      .eq('id', modeloId);
    return !error;
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

  // Etiquetas comparadas pelo NOME (01/10/2026). A lista de escolha junta as
  // etiquetas de todos os quadros, uma por nome; um cartão podia ter a homónima de
  // outro quadro (cópias e mudanças de quadro antigas) e essa ficava «presa»:
  // aparecia no cartão, desmarcada na lista, impossível de tirar.
  //  · Tirar: remove do cartão TODAS as etiquetas com esse nome, de qualquer quadro.
  //  · Pôr: usa sempre a etiqueta deste quadro com esse nome; se não existir,
  //    cria-a aqui (mesma cor) — não volta a ligar etiquetas de outro quadro.
  const toggleEtiquetaOnCartao = async (cartaoId: string, etiquetaId: string, isActive: boolean) => {
    const et = etiquetas.find(e => e.id === etiquetaId);
    const cartao = listas.flatMap(l => l.cartoes).find(c => c.id === cartaoId);
    if (!et || !cartao || !quadroId) return;
    const mesmoNome = (n: string) => n.trim().toLowerCase() === et.nome.trim().toLowerCase();

    if (isActive) {
      const ids = cartao.etiquetas.filter(e => e.id === etiquetaId || mesmoNome(e.nome)).map(e => e.id);
      if (ids.length) await supabase.from('cartao_etiqueta_rel').delete().eq('cartao_id', cartaoId).in('etiqueta_id', ids);
      setListas(prev => prev.map(l => ({
        ...l, cartoes: l.cartoes.map(c => c.id !== cartaoId ? c : { ...c, etiquetas: c.etiquetas.filter(e => !ids.includes(e.id)) }),
      })));
      return;
    }

    let local: Etiqueta | null = (et as any).quadro_id === quadroId ? et : null;
    if (!local) {
      const { data: aqui } = await supabase.from('cartao_etiquetas').select('*').eq('quadro_id', quadroId);
      local = ((aqui as Etiqueta[]) || []).find(e => mesmoNome(e.nome)) ?? null;
      if (!local) {
        const { data: criada } = await supabase.from('cartao_etiquetas').insert({ quadro_id: quadroId, nome: et.nome, cor: et.cor }).select().single();
        local = (criada as Etiqueta) ?? null;
      }
    }
    if (!local) return;
    await supabase.from('cartao_etiqueta_rel').insert({ cartao_id: cartaoId, etiqueta_id: local.id });
    const nova = local;
    setListas(prev => prev.map(l => ({
      ...l, cartoes: l.cartoes.map(c => c.id !== cartaoId ? c : { ...c, etiquetas: [...c.etiquetas.filter(e => !mesmoNome(e.nome)), nova] }),
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
    addCartao, updateCartao, archiveCartao, persistCartaoOrder, listArquivados, restaurarCartao,
    validarMovimento, aoMoverCartao,
    addChecklist, updateChecklistTitulo, addChecklistItem, toggleChecklistItem, deleteChecklistItem, updateChecklistItem, moveChecklistItem, reorderChecklistItems, deleteChecklist,
    fetchFeed, addComentario, updateComentario, deleteComentario, logAtividade,
    listAnexos, addAnexo, uploadAnexo, deleteAnexo, apagarCartaoArquivado,
    duplicarCartao,
    fetchEmpresasMove, fetchQuadrosMove, fetchListasMove, moveCartaoParaEmpresa,
    listChecklistModelos, applyChecklistModelo, updateChecklistModeloCategoria,
    createEtiqueta, updateEtiqueta, toggleEtiquetaOnCartao, clearAllEtiquetasFromAllCartoes,
    toggleMembro,
    refresh: fetchAll,
  };
}
