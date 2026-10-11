import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Materiais didáticos de uma turma.
 *
 * A tabela `school_materiais` já era LIDA pelo Portal do Aluno, mas nunca
 * escrita por ninguém — não havia ecrã nenhum que publicasse material. Este
 * hook é a metade que faltava: o instrutor da turma publica, e o que ele marca
 * como visível aparece aos formandos dessa turma.
 *
 * DUAS FORMAS DE PUBLICAR, e a razão de serem duas:
 *
 *   • FICHEIRO — PDF, apresentação, apostila. Sobe para o balde privado
 *     `school-materiais` e o que fica guardado é o CAMINHO, não um endereço
 *     público. Quem abre recebe uma ligação assinada e temporária. Guardar o
 *     endereço público deixaria o material de um curso pago ao alcance de
 *     qualquer pessoa que adivinhasse a ligação.
 *
 *   • LIGAÇÃO — vídeos. Não é preguiça: o alojamento tem limite de tamanho por
 *     ficheiro e um vídeo de formação passa-o quase sempre. O vídeo fica onde
 *     já vive (YouTube, Vimeo, Drive) e aqui guarda-se o endereço.
 *
 * A distinção entre os dois é o próprio conteúdo da coluna: começa por `http`
 * é ligação, senão é caminho no balde.
 */

const BALDE = 'school-materiais';

/** Limite por ficheiro do plano atual do Supabase. */
export const LIMITE_FICHEIRO_MB = 50;

export interface MaterialTurma {
  id: string;
  turma_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: string | null;
  url: string | null;
  visivel_aluno: boolean;
  created_at: string;
}

export const TIPOS_MATERIAL = [
  { valor: 'apostila',     rotulo: 'Apostila' },
  { valor: 'apresentacao', rotulo: 'Apresentação' },
  { valor: 'pdf',          rotulo: 'PDF / Documento' },
  { valor: 'video',        rotulo: 'Vídeo' },
  { valor: 'outro',        rotulo: 'Outro' },
];

/** É um endereço externo, ou um ficheiro no balde? */
export const eLigacao = (url?: string | null) => Boolean(url && /^https?:\/\//i.test(url));

/**
 * Endereço para abrir um material.
 *
 * Ligações abrem-se como estão. Ficheiros do balde recebem uma ligação
 * assinada, válida por uma hora — o balde é privado e um endereço direto
 * devolveria 403.
 */
export async function urlParaAbrir(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (eLigacao(url)) return url;
  const { data, error } = await supabase.storage.from(BALDE).createSignedUrl(url, 3600);
  if (error) {
    console.error('Falha a assinar o material:', error);
    return null;
  }
  return data?.signedUrl ?? null;
}

export function useSchoolMateriais(turmaId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const chave = ['school-materiais', turmaId ?? null];

  // O instrutor vê TUDO o que publicou, visível ou não. Só o aluno é que leva
  // o filtro `visivel_aluno` — que já estava do lado dele.
  const { data: materiais = [], isLoading } = useQuery({
    queryKey: chave,
    enabled: Boolean(turmaId),
    queryFn: async () => {
      const { data, error } = await (supabase.from('school_materiais') as any)
        .select('id, turma_id, titulo, descricao, tipo, url, visivel_aluno, created_at')
        .eq('turma_id', turmaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as MaterialTurma[];
    },
  });

  const publicar = useMutation({
    mutationFn: async (params: {
      empresaId: string;
      docenteId: string | null;
      titulo: string;
      descricao?: string;
      tipo: string;
      ficheiro?: File | null;
      ligacao?: string;
      visivel: boolean;
    }) => {
      if (!turmaId) throw new Error('Turma não indicada.');

      let url: string;

      if (params.ficheiro) {
        const mb = params.ficheiro.size / 1024 / 1024;
        if (mb > LIMITE_FICHEIRO_MB) {
          throw new Error(
            `O ficheiro tem ${mb.toFixed(0)} MB e o limite é ${LIMITE_FICHEIRO_MB} MB. ` +
            `Para vídeos, publique antes a ligação (YouTube, Vimeo ou Drive).`
          );
        }
        const ext = params.ficheiro.name.split('.').pop()?.toLowerCase() ?? 'bin';
        const nome = params.ficheiro.name
          .replace(/\.[^.]+$/, '')
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .toLowerCase()
          .slice(0, 60);
        const caminho = `${params.empresaId}/${turmaId}/${Date.now()}_${nome}.${ext}`;

        const { error: upErro } = await supabase.storage
          .from(BALDE)
          .upload(caminho, params.ficheiro, { upsert: false });
        if (upErro) throw upErro;
        url = caminho;
      } else if (params.ligacao?.trim()) {
        const l = params.ligacao.trim();
        url = /^https?:\/\//i.test(l) ? l : `https://${l}`;
      } else {
        throw new Error('Indique um ficheiro ou uma ligação.');
      }

      // `.select()` obrigatório: sem ele, uma escrita recusada pelas regras da
      // base devolve sucesso com zero linhas e o material desaparece em
      // silêncio — já nos aconteceu noutro sítio.
      const { data, error } = await (supabase.from('school_materiais') as any)
        .insert({
          empresa_id: params.empresaId,
          turma_id: turmaId,
          docente_id: params.docenteId,
          titulo: params.titulo.trim(),
          descricao: params.descricao?.trim() || null,
          tipo: params.tipo,
          url,
          visivel_aluno: params.visivel,
        })
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('O material não foi gravado. Verifique as permissões.');
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-materiais'] });
      queryClient.invalidateQueries({ queryKey: ['portal-aluno'] });
      toast({ title: 'Material publicado' });
    },
    onError: (e: any) => {
      toast({ variant: 'destructive', title: 'Não foi possível publicar', description: e.message });
    },
  });

  const alternarVisivel = useMutation({
    mutationFn: async (m: MaterialTurma) => {
      const { data, error } = await (supabase.from('school_materiais') as any)
        .update({ visivel_aluno: !m.visivel_aluno })
        .eq('id', m.id)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('A alteração não foi gravada.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-materiais'] });
      queryClient.invalidateQueries({ queryKey: ['portal-aluno'] });
    },
    onError: (e: any) => {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    },
  });

  const remover = useMutation({
    mutationFn: async (m: MaterialTurma) => {
      const { data, error } = await (supabase.from('school_materiais') as any)
        .delete().eq('id', m.id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('O material não foi removido.');
      // O ficheiro só se apaga DEPOIS de a linha sair. Pela ordem inversa,
      // uma falha a meio deixava a linha a apontar para um ficheiro que já
      // não existe.
      if (m.url && !eLigacao(m.url)) {
        await supabase.storage.from(BALDE).remove([m.url]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-materiais'] });
      queryClient.invalidateQueries({ queryKey: ['portal-aluno'] });
      toast({ title: 'Material removido' });
    },
    onError: (e: any) => {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    },
  });

  return { materiais, isLoading, publicar, alternarVisivel, remover };
}
