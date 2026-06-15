import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { schoolInstrutorDocPath } from '@/lib/storagePaths';

export interface SchoolDocumentoDocente {
  id: string;
  empresa_id: string;
  docente_id: string;
  tipo_documento: string;
  nome_ficheiro: string;
  storage_path: string;
  tamanho_bytes: number | null;
  mime_type: string | null;
  validade: string | null;
  created_at: string;
  url?: string;
}

export interface SchoolDocente {
  id: string;
  empresa_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  foto_path: string | null;
  formacao: string | null;
  area_especializacao: string | null;
  tempo_experiencia: string | null;
  resumo: string | null;
  assinatura_path: string | null;
  cursos_ids: string[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
  documentos?: SchoolDocumentoDocente[];
}

export type SchoolDocenteInput = Omit<SchoolDocente, 'id' | 'empresa_id' | 'created_at' | 'updated_at' | 'documentos'>;

const TABLE = 'school_docentes' as any;
const TABLE_DOCS = 'school_docentes_documentos' as any;
const BUCKET = 'school-documentos';

export function useSchoolDocentes() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: docentes = [], isLoading } = useQuery<SchoolDocente[]>({
    queryKey: ['school_docentes', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE).select('*')
        .eq('empresa_id', empresa!.id)
        .order('nome');
      if (error) throw error;
      return (data || []).map(r => ({ ...r, cursos_ids: r.cursos_ids ?? [] })) as SchoolDocente[];
    },
  });

  const createDocente = useMutation({
    mutationFn: async (input: SchoolDocenteInput) => {
      const { error } = await supabase.from(TABLE).insert({ ...input, empresa_id: empresa!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_docentes'] }); toast({ title: 'Instrutor criado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateDocente = useMutation({
    mutationFn: async ({ id, ...input }: Partial<SchoolDocenteInput> & { id: string }) => {
      const { error } = await supabase.from(TABLE).update({ ...input, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_docentes'] }); toast({ title: 'Instrutor actualizado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteDocente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school_docentes'] }); toast({ title: 'Instrutor removido' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const fetchDocumentos = async (docenteId: string): Promise<SchoolDocumentoDocente[]> => {
    const { data, error } = await supabase
      .from(TABLE_DOCS).select('*')
      .eq('docente_id', docenteId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as SchoolDocumentoDocente[];
  };

  const uploadDocumento = async (
    docenteId: string,
    file: File,
    tipo: string,
    validade?: string,
  ): Promise<boolean> => {
    if (!empresa) return false;
    const path = schoolInstrutorDocPath(empresa.id, docenteId, tipo as any, file.name);
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
    if (upErr) { toast({ title: 'Erro no upload', description: upErr.message, variant: 'destructive' }); return false; }
    const { error } = await supabase.from(TABLE_DOCS).insert({
      empresa_id: empresa.id, docente_id: docenteId,
      tipo_documento: tipo, nome_ficheiro: file.name,
      storage_path: path, tamanho_bytes: file.size,
      mime_type: file.type || null,
      validade: validade || null,
    });
    if (error) { toast({ title: 'Erro ao registar documento', description: error.message, variant: 'destructive' }); return false; }
    return true;
  };

  const deleteDocumento = async (doc: SchoolDocumentoDocente): Promise<boolean> => {
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    const { error } = await supabase.from(TABLE_DOCS).delete().eq('id', doc.id);
    return !error;
  };

  const getDocUrl = async (storagePath: string): Promise<string | null> => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
    return data?.signedUrl ?? null;
  };

  return { docentes, isLoading, createDocente, updateDocente, deleteDocente, fetchDocumentos, uploadDocumento, deleteDocumento, getDocUrl };
}
