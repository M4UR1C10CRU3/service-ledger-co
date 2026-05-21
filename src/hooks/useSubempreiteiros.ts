import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import type { Subempreiteiro, SubDocumento, SubFormData } from '@/types/subempreiteiro';

function mapSub(r: any): Subempreiteiro {
  return {
    id: r.id, empresaId: r.empresa_id,
    tipo: r.tipo, nome: r.nome,
    email: r.email, telefone: r.telefone, telemovel: r.telemovel,
    morada: r.morada, codigoPostal: r.codigo_postal, localidade: r.localidade,
    especialidade: r.especialidade, notas: r.notas,
    iban: r.iban, swift: r.swift,
    nif: r.nif, ccNumero: r.cc_numero, ccValidade: r.cc_validade,
    dataNascimento: r.data_nascimento,
    nipc: r.nipc, certidaoPermanenteCodigo: r.certidao_permanente_codigo,
    representanteNome: r.representante_nome, representanteNif: r.representante_nif,
    alvaraNumero: r.alvara_numero, alvaraValidade: r.alvara_validade,
    seguroNumero: r.seguro_numero, seguroValidade: r.seguro_validade,
    ativo: r.ativo, eliminado: r.eliminado,
    criadoEm: r.criado_em, atualizadoEm: r.atualizado_em,
  };
}

function mapDoc(r: any): SubDocumento {
  return {
    id: r.id, empresaId: r.empresa_id,
    subempreiteiroId: r.subempreiteiro_id,
    tipoDocumento: r.tipo_documento,
    nomeFicheiro: r.nome_ficheiro,
    storagePath: r.storage_path,
    tamanhoBytes: r.tamanho_bytes,
    mimeType: r.mime_type,
    validade: r.validade,
    notas: r.notas,
    criadoEm: r.criado_em,
  };
}

export function useSubempreiteiros() {
  const { empresa } = useEmpresa();
  const [subempreiteiros, setSubempreiteiros] = useState<Subempreiteiro[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('subempreiteiros')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('eliminado', false)
      .order('nome');
    if (data) setSubempreiteiros(data.map(mapSub));
    setIsLoading(false);
  }, [empresa]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const save = async (form: SubFormData, existingId?: string): Promise<string | null> => {
    if (!empresa) return null;
    const payload = {
      empresa_id: empresa.id,
      tipo: form.tipo, nome: form.nome,
      email: form.email || null, telefone: form.telefone || null,
      telemovel: form.telemovel || null, morada: form.morada || null,
      codigo_postal: form.codigoPostal || null, localidade: form.localidade || null,
      especialidade: form.especialidade || null, notas: form.notas || null,
      iban: form.iban || null, swift: form.swift || null,
      nif: form.nif || null, cc_numero: form.ccNumero || null,
      cc_validade: form.ccValidade || null,
      data_nascimento: form.dataNascimento || null,
      nipc: form.nipc || null,
      certidao_permanente_codigo: form.certidaoPermanenteCodigo || null,
      representante_nome: form.representanteNome || null,
      representante_nif: form.representanteNif || null,
      alvara_numero: form.alvaraNumero || null,
      alvara_validade: form.alvaraValidade || null,
      seguro_numero: form.seguroNumero || null,
      seguro_validade: form.seguroValidade || null,
      atualizado_em: new Date().toISOString(),
    };
    if (existingId) {
      const { error } = await supabase.from('subempreiteiros').update(payload).eq('id', existingId);
      if (error) { console.error(error); return null; }
      await fetchAll();
      return existingId;
    } else {
      const { data, error } = await supabase.from('subempreiteiros').insert(payload).select('id').single();
      if (error || !data) { console.error(error); return null; }
      await fetchAll();
      return data.id;
    }
  };

  const remove = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('subempreiteiros')
      .update({ eliminado: true, atualizado_em: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error(error); return false; }
    await fetchAll();
    return true;
  };

  const toggleAtivo = async (id: string, ativo: boolean): Promise<boolean> => {
    const { error } = await supabase.from('subempreiteiros')
      .update({ ativo, atualizado_em: new Date().toISOString() })
      .eq('id', id);
    if (error) return false;
    await fetchAll();
    return true;
  };

  // Documents
  const fetchDocs = async (subId: string): Promise<SubDocumento[]> => {
    const { data } = await supabase.from('subempreiteiros_documentos')
      .select('*').eq('subempreiteiro_id', subId).order('criado_em', { ascending: false });
    return (data || []).map(mapDoc);
  };

  const uploadDoc = async (
    subId: string,
    file: File,
    tipoDocumento: string,
    validade?: string,
    notas?: string,
  ): Promise<boolean> => {
    if (!empresa) return false;
    const ext = file.name.split('.').pop();
    const path = `${empresa.id}/${subId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from('subempreiteiros').upload(path, file);
    if (upErr) { console.error(upErr); return false; }
    const { error: dbErr } = await supabase.from('subempreiteiros_documentos').insert({
      empresa_id: empresa.id,
      subempreiteiro_id: subId,
      tipo_documento: tipoDocumento,
      nome_ficheiro: file.name,
      storage_path: path,
      tamanho_bytes: file.size,
      mime_type: file.type,
      validade: validade || null,
      notas: notas || null,
    });
    if (dbErr) { console.error(dbErr); return false; }
    return true;
  };

  const deleteDoc = async (doc: SubDocumento): Promise<boolean> => {
    await supabase.storage.from('subempreiteiros').remove([doc.storagePath]);
    const { error } = await supabase.from('subempreiteiros_documentos').delete().eq('id', doc.id);
    return !error;
  };

  const getDocUrl = async (storagePath: string): Promise<string | null> => {
    const { data } = await supabase.storage.from('subempreiteiros')
      .createSignedUrl(storagePath, 3600);
    return data?.signedUrl ?? null;
  };

  return {
    subempreiteiros, isLoading, fetchAll,
    save, remove, toggleAtivo,
    fetchDocs, uploadDoc, deleteDoc, getDocUrl,
  };
}
