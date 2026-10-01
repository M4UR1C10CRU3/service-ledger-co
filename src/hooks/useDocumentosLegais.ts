import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { admDocumentoPath } from '@/lib/storagePaths';
import { useToast } from '@/hooks/use-toast';
import type {
  AdmPais, TipoDocumento, DocumentoLegal, DocumentoVersao, DocumentoHistorico,
} from '@/types/administrativo';

const T_DOCS      = 'adm_documentos' as any;
const V_DOCS      = 'v_adm_documentos' as any;
const T_VERSOES   = 'adm_documento_versoes' as any;
const T_HISTORICO = 'adm_documento_historico' as any;
const T_TIPOS     = 'adm_tipos_documento' as any;
const T_TIPOS_EMP = 'adm_tipos_documento_empresa' as any;
const T_PAISES    = 'adm_paises' as any;
const BUCKET      = 'adm-documentos';

async function utilizadorAtual(): Promise<{ id: string | null; nome: string }> {
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  return { id: u?.id ?? null, nome: (u?.user_metadata as any)?.nome || u?.email || 'Utilizador' };
}

export function useDocumentosLegais() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const [documentos, setDocumentos] = useState<DocumentoLegal[]>([]);
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [pais, setPais] = useState<AdmPais | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Leitura ────────────────────────────────────────────────────────────────

  const carregarDocumentos = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const { data, error } = await (supabase.from(V_DOCS) as any)
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('data_validade', { ascending: true, nullsFirst: false });
    if (error) {
      toast({ title: 'Não foi possível carregar os documentos', description: error.message, variant: 'destructive' });
    } else {
      setDocumentos((data ?? []) as DocumentoLegal[]);
    }
    setLoading(false);
  }, [empresa?.id, toast]);

  /**
   * O catálogo oferecido é o do país da empresa, mais os universais, mais os
   * tipos próprios dela. Uma empresa portuguesa nunca vê o catálogo brasileiro.
   */
  const carregarCatalogo = useCallback(async () => {
    if (!empresa?.id) return;
    const codigoPais = empresa?.pais ?? null;

    const [{ data: base }, { data: proprios }, { data: paisRow }] = await Promise.all([
      (supabase.from(T_TIPOS) as any)
        .select('*')
        .eq('ativo', true)
        .or(codigoPais ? `pais.eq.${codigoPais},pais.is.null` : 'pais.is.null')
        .order('ordem'),
      (supabase.from(T_TIPOS_EMP) as any)
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true)
        .order('nome'),
      codigoPais
        ? (supabase.from(T_PAISES) as any).select('*').eq('codigo', codigoPais).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const vertical = empresa?.vertical ?? null;

    const doCatalogo: TipoDocumento[] = ((base ?? []) as any[])
      // Um tipo preso a um vertical só aparece nesse vertical: a certificação
      // DGERT não interessa a uma empresa de construção.
      .filter(t => !t.aplica_a_vertical || t.aplica_a_vertical === vertical)
      .map(t => ({
        id: t.id,
        origem: 'catalogo' as const,
        pais: t.pais,
        nome: t.nome,
        entidade_emissora: t.entidade_emissora,
        ambito: t.ambito,
        validade_valor: t.validade_valor,
        validade_unidade: t.validade_unidade,
        aviso_dias_sugerido: t.aviso_dias_sugerido ?? 60,
        rotina: !!t.rotina,
        obrigatorio: !!t.obrigatorio,
        aplica_a_vertical: t.aplica_a_vertical,
      }));

    const daEmpresa: TipoDocumento[] = ((proprios ?? []) as any[]).map(t => ({
      id: t.id,
      origem: 'empresa' as const,
      pais: codigoPais,
      nome: t.nome,
      entidade_emissora: t.entidade_emissora,
      ambito: t.ambito,
      validade_valor: t.validade_valor,
      validade_unidade: t.validade_unidade,
      aviso_dias_sugerido: t.aviso_dias_sugerido ?? 60,
      rotina: !!t.rotina,
      obrigatorio: false,
      aplica_a_vertical: null,
    }));

    setTipos([...doCatalogo, ...daEmpresa]);
    setPais((paisRow as AdmPais) ?? null);
  }, [empresa]);

  useEffect(() => { carregarDocumentos(); }, [carregarDocumentos]);
  useEffect(() => { carregarCatalogo(); }, [carregarCatalogo]);

  // ── Histórico ──────────────────────────────────────────────────────────────

  const registarHistorico = useCallback(async (
    documentoId: string, tipo: string, descricao: string, metadata: Record<string, unknown> = {},
  ) => {
    if (!empresa?.id) return;
    const { nome } = await utilizadorAtual();
    await (supabase.from(T_HISTORICO) as any).insert({
      empresa_id: empresa.id, documento_id: documentoId, tipo, descricao, metadata, utilizador_nome: nome,
    });
  }, [empresa?.id]);

  // ── Escrita ────────────────────────────────────────────────────────────────

  const criarDocumento = useCallback(async (
    patch: Partial<DocumentoLegal>,
  ): Promise<DocumentoLegal | null> => {
    if (!empresa?.id) return null;
    const { id: uid, nome } = await utilizadorAtual();

    // .select() de propósito: uma política de RLS a bloquear devolve sucesso
    // com zero linhas, não erro. Sem isto, gravava-se nada em silêncio.
    const { data, error } = await (supabase.from(T_DOCS) as any)
      .insert({ ...patch, empresa_id: empresa.id, created_by: uid, created_by_nome: nome })
      .select()
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Não foi possível criar o documento',
        description: error?.message ?? 'A gravação não devolveu nenhuma linha — verifique as permissões.',
        variant: 'destructive',
      });
      return null;
    }
    await registarHistorico(data.id, 'criado', `Documento "${data.titulo}" registado.`);
    await carregarDocumentos();
    return data as DocumentoLegal;
  }, [empresa?.id, toast, registarHistorico, carregarDocumentos]);

  const atualizarDocumento = useCallback(async (
    id: string, patch: Partial<DocumentoLegal>,
  ): Promise<boolean> => {
    const { data, error } = await (supabase.from(T_DOCS) as any)
      .update(patch).eq('id', id).select().maybeSingle();
    if (error || !data) {
      toast({
        title: 'Não foi possível guardar',
        description: error?.message ?? 'A alteração não afetou nenhuma linha.',
        variant: 'destructive',
      });
      return false;
    }
    await registarHistorico(id, 'editado', 'Documento alterado.', patch as Record<string, unknown>);
    await carregarDocumentos();
    return true;
  }, [toast, registarHistorico, carregarDocumentos]);

  const arquivarDocumento = useCallback(async (id: string): Promise<boolean> => {
    const ok = await atualizarDocumento(id, { arquivado: true } as Partial<DocumentoLegal>);
    if (ok) toast({ title: 'Documento arquivado' });
    return ok;
  }, [atualizarDocumento, toast]);

  // ── Versões ────────────────────────────────────────────────────────────────

  const listarVersoes = useCallback(async (documentoId: string): Promise<DocumentoVersao[]> => {
    const { data } = await (supabase.from(T_VERSOES) as any)
      .select('*').eq('documento_id', documentoId).order('created_at', { ascending: false });
    return (data ?? []) as DocumentoVersao[];
  }, []);

  const anexarFicheiro = useCallback(async (
    documentoId: string, versaoId: string, ficheiro: File,
  ): Promise<boolean> => {
    if (!empresa?.id) return false;
    const path = admDocumentoPath(empresa.id, documentoId, ficheiro.name);
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, ficheiro);
    if (upErr) {
      toast({ title: 'Falhou o carregamento do ficheiro', description: upErr.message, variant: 'destructive' });
      return false;
    }
    const { data, error } = await (supabase.from(T_VERSOES) as any)
      .update({
        storage_path: path,
        nome_ficheiro: ficheiro.name,
        mime_type: ficheiro.type || null,
        tamanho_bytes: ficheiro.size,
      })
      .eq('id', versaoId).select().maybeSingle();
    if (error || !data) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast({ title: 'Não foi possível ligar o ficheiro ao documento', variant: 'destructive' });
      return false;
    }
    return true;
  }, [empresa?.id, toast]);

  /**
   * Anexar o ficheiro ao documento que já está registado.
   *
   * Um documento acabado de registar ainda não tem versão nenhuma — a primeira
   * só nascia ao renovar, e por isso não havia forma de lá pôr o PDF sem fingir
   * uma renovação. Aqui, se não houver versão vigente, cria-se uma a partir dos
   * dados do próprio documento: é a versão que está em vigor, não uma renovação.
   */
  const anexarAoDocumento = useCallback(async (
    documento: DocumentoLegal, ficheiro: File,
  ): Promise<boolean> => {
    if (!empresa?.id) return false;
    const { nome } = await utilizadorAtual();

    const { data: vigente } = await (supabase.from(T_VERSOES) as any)
      .select('*').eq('documento_id', documento.id).eq('vigente', true).maybeSingle();

    let versaoId: string | null = vigente?.id ?? null;

    if (!versaoId) {
      const { data: nova, error } = await (supabase.from(T_VERSOES) as any)
        .insert({
          empresa_id: empresa.id,
          documento_id: documento.id,
          numero: documento.numero,
          data_emissao: documento.data_emissao,
          data_validade: documento.data_validade,
          vigente: true,
          created_by_nome: nome,
        })
        .select().maybeSingle();
      if (error || !nova) {
        toast({
          title: 'Não foi possível preparar o documento para receber o ficheiro',
          description: error?.message,
          variant: 'destructive',
        });
        return false;
      }
      versaoId = nova.id;
    }

    // Substituir um ficheiro apaga o antigo, para não deixar lixo no bucket.
    if (vigente?.storage_path) {
      await supabase.storage.from(BUCKET).remove([vigente.storage_path]);
    }

    const ok = await anexarFicheiro(documento.id, versaoId as string, ficheiro);
    if (ok) {
      await registarHistorico(documento.id, 'ficheiro', `Ficheiro anexado: ${ficheiro.name}.`);
      toast({ title: 'Ficheiro anexado' });
    }
    return ok;
  }, [empresa?.id, toast, anexarFicheiro, registarHistorico]);

  /**
   * Renovar CRIA uma versão nova. A anterior fica arquivada com o ficheiro
   * dela — é ela que prova que a empresa esteve regular naquele período.
   * Nunca se edita a antiga por cima.
   */
  const renovarDocumento = useCallback(async (
    documento: DocumentoLegal,
    nova: { numero: string | null; data_emissao: string | null; data_validade: string | null; notas: string | null },
    ficheiro?: File | null,
  ): Promise<boolean> => {
    if (!empresa?.id) return false;
    const { nome } = await utilizadorAtual();

    await (supabase.from(T_VERSOES) as any)
      .update({ vigente: false }).eq('documento_id', documento.id).eq('vigente', true);

    const { data: versao, error } = await (supabase.from(T_VERSOES) as any)
      .insert({
        empresa_id: empresa.id,
        documento_id: documento.id,
        numero: nova.numero,
        data_emissao: nova.data_emissao,
        data_validade: nova.data_validade,
        notas: nova.notas,
        vigente: true,
        created_by_nome: nome,
      })
      .select().maybeSingle();

    if (error || !versao) {
      toast({ title: 'Não foi possível criar a nova versão', description: error?.message, variant: 'destructive' });
      return false;
    }

    if (ficheiro) await anexarFicheiro(documento.id, versao.id, ficheiro);

    const ok = await atualizarDocumento(documento.id, {
      numero: nova.numero,
      data_emissao: nova.data_emissao,
      data_validade: nova.data_validade,
      em_renovacao: false,
    } as Partial<DocumentoLegal>);

    if (ok) {
      await registarHistorico(
        documento.id, 'renovado',
        `Renovado. Nova validade: ${nova.data_validade ?? 'sem validade'}.`,
        { versao_id: versao.id },
      );
      toast({ title: 'Documento renovado', description: 'A versão anterior ficou no histórico.' });
    }
    return ok;
  }, [empresa?.id, toast, anexarFicheiro, atualizarDocumento, registarHistorico]);

  /** URL assinado, válido uma hora. O bucket é privado — nunca há link aberto. */
  const urlDoFicheiro = useCallback(async (storagePath: string): Promise<string | null> => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
    return data?.signedUrl ?? null;
  }, []);

  const listarHistorico = useCallback(async (documentoId: string): Promise<DocumentoHistorico[]> => {
    const { data } = await (supabase.from(T_HISTORICO) as any)
      .select('*').eq('documento_id', documentoId).order('created_at', { ascending: false });
    return (data ?? []) as DocumentoHistorico[];
  }, []);

  /** Tipo próprio da empresa, para o que o catálogo não previu. */
  const criarTipoProprio = useCallback(async (nome: string): Promise<TipoDocumento | null> => {
    if (!empresa?.id) return null;
    const { data, error } = await (supabase.from(T_TIPOS_EMP) as any)
      .insert({ empresa_id: empresa.id, nome })
      .select().maybeSingle();
    if (error || !data) {
      toast({ title: 'Não foi possível criar o tipo', description: error?.message, variant: 'destructive' });
      return null;
    }
    await carregarCatalogo();
    return {
      id: data.id, origem: 'empresa', pais: null, nome: data.nome,
      entidade_emissora: null, ambito: null, validade_valor: null, validade_unidade: null,
      aviso_dias_sugerido: 60, rotina: false, obrigatorio: false, aplica_a_vertical: null,
    };
  }, [empresa?.id, toast, carregarCatalogo]);

  return {
    documentos, tipos, pais, loading,
    recarregar: carregarDocumentos,
    criarDocumento, atualizarDocumento, arquivarDocumento,
    listarVersoes, anexarFicheiro, anexarAoDocumento, renovarDocumento, urlDoFicheiro,
    listarHistorico, criarTipoProprio,
  };
}
