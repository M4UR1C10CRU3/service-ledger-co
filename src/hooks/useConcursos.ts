import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import type { Concurso, MapaItem, DocumentoConcurso, EstadoDoc, EstadoConcurso, AnexoConcurso } from '@/types/concursos';
import type { Emparelhamento } from '@/lib/concursos/lerProposta';
import { nomeDaSessao } from '@/lib/nomeDaSessao';

const T_CONC = 'cp_concursos' as any;
const T_MAPA = 'cp_mapa_itens' as any;
const T_DOCS = 'cp_documentos' as any;
const T_ANEXOS = 'cartao_anexos' as any;
const BUCKET = 'cartao-anexos';

async function nomeUtilizador(): Promise<string> {
  return (await nomeDaSessao()).nome;   // a ficha primeiro — ver lib/nomeDaSessao
}

/** Lista dos concursos da empresa. */
export function useConcursos() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const { data, error } = await (supabase.from(T_CONC) as any)
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('prazo_propostas', { ascending: true, nullsFirst: false });
    if (error) toast({ title: 'Não foi possível carregar os concursos', description: error.message, variant: 'destructive' });
    else setConcursos((data ?? []) as Concurso[]);
    setLoading(false);
  }, [empresa?.id, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  return { concursos, loading, recarregar: carregar };
}

/** Um concurso com o seu mapa e a sua checklist. */
export function useConcurso(id: string | undefined) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const [concurso, setConcurso] = useState<Concurso | null>(null);
  const [mapa, setMapa] = useState<MapaItem[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoConcurso[]>([]);
  const [anexos, setAnexos] = useState<AnexoConcurso[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarAnexos = useCallback(async (cartaoId: string | null) => {
    if (!cartaoId) { setAnexos([]); return; }
    const { data } = await (supabase.from(T_ANEXOS) as any)
      .select('*').eq('cartao_id', cartaoId).order('criado_em', { ascending: true });
    setAnexos((data ?? []) as AnexoConcurso[]);
  }, []);

  const carregar = useCallback(async () => {
    if (!empresa?.id || !id) return;
    setLoading(true);
    const [c, m, d] = await Promise.all([
      (supabase.from(T_CONC) as any).select('*').eq('id', id).eq('empresa_id', empresa.id).maybeSingle(),
      (supabase.from(T_MAPA) as any).select('*').eq('concurso_id', id).order('posicao'),
      (supabase.from(T_DOCS) as any).select('*').eq('concurso_id', id).order('posicao'),
    ]);
    const erro = c.error || m.error || d.error;
    if (erro) toast({ title: 'Não foi possível carregar o concurso', description: erro.message, variant: 'destructive' });
    const conc = (c.data ?? null) as Concurso | null;
    setConcurso(conc);
    setMapa((m.data ?? []) as MapaItem[]);
    setDocumentos((d.data ?? []) as DocumentoConcurso[]);
    await carregarAnexos(conc?.cartao_id ?? null);
    setLoading(false);
  }, [empresa?.id, id, toast, carregarAnexos]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Escrita ────────────────────────────────────────────────────────────────

  /**
   * Um preço de cada vez, gravado ao sair do campo. O `.select()` é de
   * propósito: sem ele um UPDATE bloqueado pelo RLS devolve sucesso com zero
   * linhas e ninguém dá por isso.
   */
  const gravarPreco = useCallback(async (itemId: string, preco: number | null) => {
    const { data, error } = await (supabase.from(T_MAPA) as any)
      .update({ preco_unitario: preco, origem_preco: 'manual' })
      .eq('id', itemId).select('id').maybeSingle();
    if (error || !data) {
      toast({ title: 'Preço não gravado', description: error?.message ?? 'Sem permissão para alterar este item.', variant: 'destructive' });
      return false;
    }
    setMapa(prev => prev.map(i => i.id === itemId ? { ...i, preco_unitario: preco, origem_preco: 'manual' } : i));
    return true;
  }, [toast]);

  const gravarPrecoPrevio = useCallback(async (itemId: string, preco: number | null) => {
    const { data, error } = await (supabase.from(T_MAPA) as any)
      .update({ preco_previo: preco }).eq('id', itemId).select('id').maybeSingle();
    if (error || !data) {
      toast({ title: 'Preço prévio não gravado', description: error?.message ?? 'Sem permissão.', variant: 'destructive' });
      return false;
    }
    setMapa(prev => prev.map(i => i.id === itemId ? { ...i, preco_previo: preco } : i));
    return true;
  }, [toast]);

  const mudarEstadoDocumento = useCallback(async (docId: string, estado: EstadoDoc) => {
    const agora = new Date().toISOString();
    const patch: Record<string, unknown> = { estado };
    if (estado === 'validado') { patch.validado_em = agora; patch.validado_por = await nomeUtilizador(); }
    if (estado === 'assinado') patch.assinado_em = agora;
    const { data, error } = await (supabase.from(T_DOCS) as any)
      .update(patch).eq('id', docId).select('id').maybeSingle();
    if (error || !data) {
      toast({ title: 'Estado não alterado', description: error?.message ?? 'Sem permissão.', variant: 'destructive' });
      return false;
    }
    setDocumentos(prev => prev.map(d => d.id === docId ? { ...d, ...patch } as DocumentoConcurso : d));
    return true;
  }, [toast]);

  const atualizarConcurso = useCallback(async (patch: Partial<Concurso>) => {
    if (!concurso) return false;
    const { data, error } = await (supabase.from(T_CONC) as any)
      .update({ ...patch, atualizado_em: new Date().toISOString() })
      .eq('id', concurso.id).select('*').maybeSingle();
    if (error || !data) {
      toast({ title: 'Não foi possível guardar', description: error?.message ?? 'Sem permissão.', variant: 'destructive' });
      return false;
    }
    setConcurso(data as Concurso);
    return true;
  }, [concurso, toast]);

  /**
   * Mudar de estado move também o cartão para a lista certa do Quadro — o
   * cartão e o concurso nunca ficam a dizer coisas diferentes.
   */
  const mudarEstado = useCallback(async (estado: EstadoConcurso) => {
    if (!concurso) return false;
    const ok = await atualizarConcurso({ estado });
    if (!ok || !concurso.cartao_id) return ok;
    const { data: cartao } = await (supabase.from('quadro_cartoes') as any)
      .select('lista_id, quadro_listas(quadro_id)').eq('id', concurso.cartao_id).maybeSingle();
    const quadroId = cartao?.quadro_listas?.quadro_id;
    if (!quadroId) return ok;
    const { data: lista } = await (supabase.from('quadro_listas') as any)
      .select('id').eq('quadro_id', quadroId).eq('estado_codigo', estado).maybeSingle();
    if (lista?.id) {
      await (supabase.from('quadro_cartoes') as any)
        .update({ lista_id: lista.id, movido_em: new Date().toISOString() }).eq('id', concurso.cartao_id);
    }
    return ok;
  }, [concurso, atualizarConcurso]);

  // ── Anexos: o mesmo bucket privado dos Quadros ─────────────────────────────

  /** URL assinado válido por uma hora. */
  const urlAnexo = useCallback(async (a: AnexoConcurso): Promise<string | null> => {
    const raw = a.path ?? a.url ?? '';
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(raw, 60 * 60);
    return data?.signedUrl ?? null;
  }, []);

  const subirFicheiro = useCallback(async (file: File): Promise<AnexoConcurso | null> => {
    if (!empresa?.id || !concurso?.cartao_id) { toast({ title: 'Este concurso não tem cartão associado', variant: 'destructive' }); return null; }
    const seguro = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${empresa.id}/${concurso.cartao_id}/${crypto.randomUUID()}-${seguro}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) { toast({ title: `Falha ao carregar "${file.name}"`, description: upErr.message, variant: 'destructive' }); return null; }
    const { data, error } = await (supabase.from(T_ANEXOS) as any)
      .insert({ cartao_id: concurso.cartao_id, nome: file.name, path, tipo: file.type || null })
      .select().single();
    if (error || !data) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast({ title: `Falha ao registar "${file.name}"`, description: error?.message, variant: 'destructive' });
      return null;
    }
    setAnexos(prev => [...prev, data as AnexoConcurso]);
    return data as AnexoConcurso;
  }, [empresa?.id, concurso?.cartao_id, toast]);

  /** Anexa um ficheiro a um documento da checklist. Se estava por fazer, passa a gerado. */
  const anexarADocumento = useCallback(async (doc: DocumentoConcurso, file: File) => {
    const a = await subirFicheiro(file);
    if (!a) return false;
    const patch: Record<string, unknown> = { anexo_id: a.id };
    if (doc.estado === 'por_fazer') patch.estado = 'gerado';
    const { data, error } = await (supabase.from(T_DOCS) as any).update(patch).eq('id', doc.id).select('id').maybeSingle();
    if (error || !data) { toast({ title: 'Ficheiro carregado, mas não ficou ligado ao documento', description: error?.message, variant: 'destructive' }); return false; }
    setDocumentos(prev => prev.map(d => d.id === doc.id ? { ...d, ...patch } as DocumentoConcurso : d));
    return true;
  }, [subirFicheiro, toast]);

  /** Peça do concurso (vinda da entidade): só anexo, sem documento da checklist. */
  const anexarPeca = useCallback(async (file: File) => !!(await subirFicheiro(file)), [subirFicheiro]);

  const removerAnexo = useCallback(async (a: AnexoConcurso) => {
    const doc = documentos.find(d => d.anexo_id === a.id);
    if (doc) await (supabase.from(T_DOCS) as any).update({ anexo_id: null }).eq('id', doc.id);
    await (supabase.from(T_ANEXOS) as any).delete().eq('id', a.id);
    if (a.path) await supabase.storage.from(BUCKET).remove([a.path]);
    setAnexos(prev => prev.filter(x => x.id !== a.id));
    if (doc) setDocumentos(prev => prev.map(d => d.id === doc.id ? { ...d, anexo_id: null } : d));
  }, [documentos]);

  // ── Importação da proposta ─────────────────────────────────────────────────

  /**
   * Escreve os preços emparelhados e, se vier, o total e o número da proposta.
   * Só toca nos que têm par — os sem par ficam para quem decide.
   */
  const importarPrecos = useCallback(async (pares: Emparelhamento[], extra: { total?: number | null; numero?: string | null }) => {
    const comPar = pares.filter(p => p.item_id);
    let ok = 0, falhas = 0;
    for (const p of comPar) {
      const { data, error } = await (supabase.from(T_MAPA) as any)
        .update({ preco_unitario: p.linha.preco_unitario, origem_preco: 'importado' })
        .eq('id', p.item_id).select('id').maybeSingle();
      if (error || !data) falhas++; else ok++;
    }
    setMapa(prev => prev.map(i => {
      const p = comPar.find(x => x.item_id === i.id);
      return p ? { ...i, preco_unitario: p.linha.preco_unitario, origem_preco: 'importado' as const } : i;
    }));
    const patch: Partial<Concurso> = {};
    if (extra.total != null) patch.preco_proposto = extra.total;
    if (extra.numero) patch.proposta_numero = extra.numero;
    if (Object.keys(patch).length) await atualizarConcurso(patch);
    toast({ title: `${ok} preço${ok === 1 ? '' : 's'} importado${ok === 1 ? '' : 's'}`, description: falhas ? `${falhas} não gravados (sem permissão).` : undefined, variant: falhas ? 'destructive' : 'default' });
    return { ok, falhas };
  }, [atualizarConcurso, toast]);

  return {
    concurso, mapa, documentos, anexos, loading, recarregar: carregar,
    gravarPreco, gravarPrecoPrevio, mudarEstadoDocumento, atualizarConcurso, mudarEstado,
    urlAnexo, anexarADocumento, anexarPeca, removerAnexo, importarPrecos,
  };
}
