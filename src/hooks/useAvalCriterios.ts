import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGrupoEmpresas } from '@/hooks/useGrupoEmpresas';

// ─────────────────────────────────────────────────────────────────────────────
// Avaliação de desempenho por critérios (01/10/2026).
//
// Os critérios vivem numa biblioteca do grupo (rh_criterios), cada um com a
// descrição do que vale uma nota 1, 3 e 5. Um perfil de atividade
// (rh_aval_perfis) escolhe os critérios que contam para quem faz aquele tipo
// de trabalho e o peso de cada um. Cada Função aponta para um perfil.
// ─────────────────────────────────────────────────────────────────────────────

export interface Criterio {
  id: string; codigo: string; nome: string; categoria: string; descricao: string | null;
  ancora_1: string | null; ancora_3: string | null; ancora_5: string | null; ordem: number;
}
export interface PerfilAval {
  id: string; codigo: string; nome: string; descricao: string | null;
  criterios: { codigo: string; peso: number }[];
}
export type RespostasAval = Record<string, { nota?: number; evidencia?: string }>;

export function useAvalCriterios() {
  const { grupoId } = useGrupoEmpresas();
  const { data, isLoading } = useQuery({
    queryKey: ['rh_aval_criterios', grupoId],
    enabled: !!grupoId,
    queryFn: async () => {
      const [c, p] = await Promise.all([
        (supabase.from('rh_criterios' as any) as any).select('*').eq('grupo_id', grupoId).eq('ativo', true).order('ordem'),
        (supabase.from('rh_aval_perfis' as any) as any).select('*').eq('grupo_id', grupoId).eq('ativo', true).order('ordem'),
      ]);
      return { criterios: (c.data ?? []) as Criterio[], perfis: (p.data ?? []) as PerfilAval[] };
    },
  });
  return { criterios: data?.criterios ?? [], perfis: data?.perfis ?? [], isLoading };
}

/** Classificação na escala 0–100 (nota × 20). Os limites batem com os da escala antiga de 0 a 5. */
export function classificacaoAval(p: number): string {
  if (p >= 90) return 'Excecional';
  if (p >= 70) return 'Bom Desempenho';
  if (p >= 50) return 'Desempenho Adequado';
  if (p >= 30) return 'Abaixo do Esperado';
  return 'Insatisfatório';
}

/** Pontuação ponderada do perfil. Só conta critérios com nota; devolve também a escala antiga (0–5). */
export function pontuacaoAval(perfil: PerfilAval | null | undefined, respostas: RespostasAval) {
  if (!perfil) return null;
  let soma = 0, pesos = 0, avaliados = 0;
  for (const { codigo, peso } of perfil.criterios) {
    const n = respostas[codigo]?.nota;
    if (!n) continue;
    soma += n * 20 * peso; pesos += peso; avaliados++;
  }
  if (!pesos) return { pontuacao_100: null, pontuacao_final: null, classificacao: null, avaliados, total: perfil.criterios.length };
  const p100 = Math.round((soma / pesos) * 10) / 10;
  return {
    pontuacao_100: p100,
    pontuacao_final: Math.round((p100 / 20) * 100) / 100,
    classificacao: classificacaoAval(p100),
    avaliados, total: perfil.criterios.length,
  };
}

/** Critérios com nota extrema (1 ou 5) sem exemplo concreto — a avaliação não fecha sem eles. */
export function faltamEvidencias(perfil: PerfilAval | null | undefined, respostas: RespostasAval): string[] {
  if (!perfil) return [];
  return perfil.criterios
    .filter(({ codigo }) => { const r = respostas[codigo]; return (r?.nota === 1 || r?.nota === 5) && !r.evidencia?.trim(); })
    .map(c => c.codigo);
}
