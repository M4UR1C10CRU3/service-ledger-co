/**
 * Recrutamento com IA (01/10/2026) — peças comuns aos ecrãs.
 *
 * A IA (função `rh-ia`, Gemini) só prepara: análise do CV contra a vaga, guião
 * de entrevista e relatório. Quem decide é a direção; a decisão fica gravada
 * à parte, no candidato.
 */
import { pdfjsLib, ensurePdfWorker } from '@/lib/pdfWorker';
import { supabase } from '@/integrations/supabase/client';


// ── Tipos do que a IA devolve ────────────────────────────────────────────────
export interface AnaliseRequisito { requisito: string; tipo: 'obrigatorio' | 'valorizado'; avaliacao: 'cumpre' | 'parcial' | 'nao_evidencia'; evidencia: string; }
export interface AnaliseCV {
  resumo: string; aderencia: number; classificacao: string; justificacao: string;
  requisitos: AnaliseRequisito[]; mais_valias: string[]; pontos_atencao: string[];
  a_confirmar_na_entrevista: string[]; experiencia_anos?: number; formacao?: string; idiomas?: string[];
}
export interface PerguntaGuiao {
  id: string; bloco: 'tecnico' | 'comportamental' | 'esclarecer'; criterio: string; pergunta: string;
  procurar: string; nota1: string; nota3: string; nota5: string; peso: number;
}
export interface Guiao { introducao: string; perguntas: PerguntaGuiao[]; fecho: string; }
export type Respostas = Record<string, { resposta?: string; nota?: number }>;
export interface RelatorioEntrevista {
  resumo: string; respostas_chave: { tema: string; o_que_disse: string; leitura: string }[];
  forcas: string[]; reservas: string[]; recomendacao: 'contratar' | 'segunda_entrevista' | 'nao_contratar';
  justificacao: string; a_verificar: string[];
}

export const RECOMENDACAO_LABEL: Record<string, string> = {
  contratar: 'Contratar', segunda_entrevista: 'Segunda entrevista', nao_contratar: 'Não contratar',
};
export const DECISAO_LABEL: Record<string, string> = {
  contratar: 'Contratar', reserva: 'Em reserva', nao_contratar: 'Não contratar',
};
export const BLOCO_LABEL: Record<string, string> = {
  tecnico: 'Técnico', comportamental: 'Comportamental', esclarecer: 'A esclarecer',
};

// ── IA ──────────────────────────────────────────────────────────────────────
export async function chamarIA<T>(acao: 'analisar_cv' | 'gerar_guiao' | 'relatorio_entrevista', dados: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('rh-ia', { body: { acao, dados } });
  if (data?.error) throw new Error(data.error);
  if (error) {
    // O corpo do erro traz a mensagem em português da função.
    const corpo = await (error as any)?.context?.json?.().catch(() => null);
    throw new Error(corpo?.error || error.message);
  }
  return data.resultado as T;
}

/** Vaga + Função no formato que a função de IA espera. */
export function contextoVaga(vaga: any, funcao: any | null) {
  return {
    cargo: vaga.cargo, area: vaga.area, descricao: vaga.descricao,
    requisitos_obrig: vaga.requisitos_obrig, requisitos_pref: vaga.requisitos_pref, competencias: vaga.competencias,
    funcao: funcao ? {
      missao: funcao.missao, requisitos: funcao.requisitos, competencias: funcao.competencias,
      responsabilidades: funcao.responsabilidades,
    } : null,
  };
}

// ── PDF do currículo ────────────────────────────────────────────────────────
export async function textoDoPdf(ficheiro: Blob): Promise<string> {
  // Worker local (pdfWorker.ts): o CDN externo falhava («Setting up fake worker failed»).
  await ensurePdfWorker();
  const pdf = await pdfjsLib.getDocument({ data: await ficheiro.arrayBuffer(), standardFontDataUrl: '/pdf-fonts/' }).promise;
  let texto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const c = await (await pdf.getPage(i)).getTextContent();
    texto += c.items.map((it: any) => it.str).join(' ') + '\n';
  }
  return texto;
}

/** Caminho do CV no armazenamento privado «cvs». Os registos antigos só guardavam um link público (que não abre). */
export function caminhoCV(c: { cv_path?: string | null; cv_url?: string | null }): string | null {
  if (c.cv_path) return c.cv_path;
  const m = (c.cv_url || '').match(/\/cvs\/(.+)$/);
  return m ? decodeURIComponent(m[1].split('?')[0]) : null;
}

/** Abre o CV com um link temporário (10 minutos): a pasta é privada, como deve ser com dados pessoais. */
export async function abrirCV(c: { cv_path?: string | null; cv_url?: string | null }): Promise<string | null> {
  const p = caminhoCV(c);
  if (!p) return 'Este candidato não tem CV guardado.';
  const { data, error } = await supabase.storage.from('cvs').createSignedUrl(p, 600);
  if (error || !data?.signedUrl) return 'Não foi possível abrir o CV.';
  window.open(data.signedUrl, '_blank', 'noopener');
  return null;
}

export async function descarregarCV(c: { cv_path?: string | null; cv_url?: string | null }): Promise<Blob | null> {
  const p = caminhoCV(c);
  if (!p) return null;
  const { data } = await supabase.storage.from('cvs').download(p);
  return data ?? null;
}

// ── Pontuação ───────────────────────────────────────────────────────────────
/** Notas de 1 a 5, ponderadas, em 0–100 (nota × 20). Só conta as perguntas com nota. */
export function pontuacaoGuiao(guiao: Guiao | null | undefined, respostas: Respostas | null | undefined): number | null {
  if (!guiao?.perguntas?.length || !respostas) return null;
  let soma = 0, pesos = 0;
  for (const p of guiao.perguntas) {
    const n = respostas[p.id]?.nota;
    if (!n) continue;
    const w = p.peso > 0 ? p.peso : 1;
    soma += n * 20 * w; pesos += w;
  }
  return pesos ? Math.round((soma / pesos) * 10) / 10 : null;
}

export function classificacaoPontuacao(v: number | null | undefined): { label: string; cor: string } {
  if (v == null) return { label: '—', cor: 'bg-muted text-muted-foreground' };
  if (v >= 85) return { label: 'Excelente', cor: 'bg-emerald-100 text-emerald-800' };
  if (v >= 70) return { label: 'Bom', cor: 'bg-teal-100 text-teal-800' };
  if (v >= 55) return { label: 'Suficiente', cor: 'bg-amber-100 text-amber-800' };
  if (v >= 40) return { label: 'A melhorar', cor: 'bg-orange-100 text-orange-800' };
  return { label: 'Insuficiente', cor: 'bg-red-100 text-red-800' };
}
