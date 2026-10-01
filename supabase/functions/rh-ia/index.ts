// RH com IA (01/10/2026). Três ações, sempre a partir dos dados da vaga e da Função:
//   analisar_cv           → o CV cruzado com cada requisito, adequação, mais-valias e pontos de atenção
//   gerar_guiao           → perguntas de entrevista para aquele candidato, com o que procurar e notas 1/3/5
//   relatorio_entrevista  → resumo do que foi dito, forças, reservas e recomendação provável
// A IA não decide nada: dá à direção um relatório prévio. Usa a mesma chave Google do marketing.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const GATEWAY = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
// 02/10/2026: a Google desativou o gemini-2.0-flash e fechou o 2.5-flash a chaves novas; nomes escritos à mão
// partem-se. Agora: o alias «gemini-flash-latest» primeiro, e a seguir os «flash» que a PRÓPRIA chave pode usar
// (lista pedida à Google em cada arranque da função). 503 «high demand» → até 3 tentativas com espera.
const PREFERIDO = "gemini-flash-latest";
const MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/openai/models";

async function modelosDisponiveis(key: string): Promise<string[]> {
  try {
    const r = await fetch(MODELS_URL, { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) return [];
    const j = await r.json();
    const ids: string[] = (j.data ?? []).map((m: { id: string }) => String(m.id).replace(/^models\//, ""));
    // Só modelos de texto «flash» (rápidos e baratos); fora: lite, imagem, áudio, tts, live, embeddings.
    return ids
      .filter((id) => /^gemini-.*flash/.test(id) && !/lite|image|audio|tts|live|embed|thinking-exp/.test(id))
      .sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
  } catch { return []; }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BASE = `És um técnico de recursos humanos de um grupo de empresas português (construção e reabilitação,
loja de bricolage e casa de banho, gestão de resíduos). Escreves em português de Portugal, com frases
curtas e concretas. Nunca inventas factos: se o CV não diz, escreves que não diz. Não fazes juízos sobre
idade, sexo, nacionalidade, estado civil, religião ou saúde, nem os usas como critério.
Respondes APENAS com JSON válido, sem texto antes ou depois.`;

const resp = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function contextoVaga(v: any): string {
  const f = v?.funcao ?? {};
  const lista = (x: any) => (Array.isArray(x) && x.length ? x.map((i: string) => `- ${i}`).join("\n") : "(não definido)");
  const resps = Array.isArray(f.responsabilidades)
    ? f.responsabilidades.map((a: any) => `${a.area}: ${(a.itens || []).join("; ")}`).join("\n") : "";
  return `VAGA: ${v?.cargo ?? "?"} ${v?.area ? `(${v.area})` : ""}
Descrição: ${v?.descricao ?? "-"}
Requisitos obrigatórios:\n${v?.requisitos_obrig || lista(f.requisitos?.obrigatorios)}
Requisitos valorizados:\n${v?.requisitos_pref || lista(f.requisitos?.valorizados)}
Competências profissionais:\n${lista(f.competencias?.profissionais)}
Competências comportamentais:\n${lista(f.competencias?.comportamentais)}
${v?.competencias ? `Outras competências pedidas: ${v.competencias}` : ""}
Missão da função: ${f.missao ?? "-"}
Responsabilidades:\n${resps || "-"}`;
}

const PROMPTS: Record<string, (d: any) => string> = {
  analisar_cv: (d) => `${contextoVaga(d.vaga)}

TAREFA: analisa o CV abaixo contra a vaga. Para CADA requisito obrigatório e valorizado diz se o CV
"cumpre", "parcial" ou "nao_evidencia", com a evidência (frase curta do CV) ou o que falta.
Estrutura exata:
{
 "resumo": "2-3 frases sobre o perfil",
 "aderencia": 0-100,
 "classificacao": "Alta | Média | Baixa",
 "justificacao": "1-2 frases",
 "requisitos": [{"requisito": "...", "tipo": "obrigatorio|valorizado", "avaliacao": "cumpre|parcial|nao_evidencia", "evidencia": "..."}],
 "mais_valias": ["..."],
 "pontos_atencao": ["... (lacunas, saltos entre empregos, incoerências, o que falta confirmar)"],
 "a_confirmar_na_entrevista": ["pergunta ou tema concreto"],
 "experiencia_anos": numero,
 "formacao": "...",
 "idiomas": ["..."]
}
A aderência pesa sobretudo os requisitos obrigatórios. Não penalizes o que o CV não tinha como mostrar.

CV:
${String(d.cvText ?? "").slice(0, 30000)}`,

  gerar_guiao: (d) => `${contextoVaga(d.vaga)}

ANÁLISE PRÉVIA DO CANDIDATO:
${JSON.stringify(d.analise ?? {}).slice(0, 8000)}

TAREFA: prepara um guião de entrevista para ESTE candidato, com 8 a 12 perguntas, em 3 blocos:
"tecnico" (o que a função exige), "comportamental" (como trabalha) e "esclarecer" (os pontos de atenção da análise).
Perguntas abertas, sobre situações reais ("Conte-me uma vez em que..."). Cada pergunta tem um peso (os pesos somam 100).
Estrutura exata:
{
 "introducao": "como abrir a entrevista em 2 frases",
 "perguntas": [{"id": "p1", "bloco": "tecnico|comportamental|esclarecer", "criterio": "o que avalia",
   "pergunta": "...", "procurar": "o que uma boa resposta mostra",
   "nota1": "resposta que vale 1", "nota3": "resposta que vale 3", "nota5": "resposta que vale 5", "peso": numero}],
 "fecho": "como fechar a entrevista e o que perguntar sobre disponibilidade"
}`,

  relatorio_entrevista: (d) => `${contextoVaga(d.vaga)}

CANDIDATO: ${d.candidato ?? "-"}
ANÁLISE DO CV: ${JSON.stringify(d.analise ?? {}).slice(0, 6000)}
GUIÃO, RESPOSTAS REGISTADAS E NOTAS (1 a 5):
${JSON.stringify(d.entrevista ?? []).slice(0, 15000)}
PONTUAÇÃO PONDERADA: ${d.pontuacao ?? "-"} / 100
NOTAS LIVRES DO ENTREVISTADOR: ${d.notas ?? "-"}

TAREFA: relatório prévio para a direção decidir. Baseia-te SÓ no que foi registado.
Estrutura exata:
{
 "resumo": "4-6 frases sobre como correu",
 "respostas_chave": [{"tema": "...", "o_que_disse": "...", "leitura": "..."}],
 "forcas": ["..."],
 "reservas": ["..."],
 "recomendacao": "contratar | segunda_entrevista | nao_contratar",
 "justificacao": "2-3 frases",
 "a_verificar": ["referências, documentos ou testes a pedir antes de decidir"]
}`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!KEY) return resp({ error: "A chave da IA (GOOGLE_AI_API_KEY) não está configurada." }, 500);

    const { acao, dados } = await req.json();
    const prompt = PROMPTS[acao];
    if (!prompt) return resp({ error: `Ação desconhecida: ${acao}` }, 400);
    if (acao === "analisar_cv" && String(dados?.cvText ?? "").trim().length < 100) {
      return resp({ error: "Não consegui ler texto suficiente do PDF. Se o CV for uma imagem digitalizada, peça-o em PDF de texto." }, 400);
    }

    const erros: string[] = [];
    const disponiveis = await modelosDisponiveis(KEY);
    const MODELOS = [PREFERIDO, ...disponiveis.filter((m) => m !== PREFERIDO)].slice(0, 4);
    for (const model of MODELOS) {
      let r: Response | null = null;
      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        r = await fetch(GATEWAY, {
          method: "POST",
          headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model, temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: BASE }, { role: "user", content: prompt(dados) }],
          }),
        });
        if (r.status !== 503) break;
        await esperar(1500 * tentativa); // modelo sobrecarregado: espera 1,5 s e 3 s antes de repetir
      }
      if (!r) continue;
      if (r.status === 429) return resp({ error: "Limite de pedidos à IA atingido. Tente daqui a um minuto." }, 429);
      if (!r.ok) { erros.push(`${model}: ${r.status} ${(await r.text()).slice(0, 200)}`); continue; }
      const j = await r.json();
      const texto: string = j.choices?.[0]?.message?.content ?? "";
      const m = texto.match(/\{[\s\S]*\}/);
      if (!m) { erros.push(`${model}: resposta sem JSON (${texto.slice(0, 80)})`); continue; }
      try { return resp({ resultado: JSON.parse(m[0]), modelo: model }); }
      catch { erros.push(`${model}: JSON inválido`); }
    }
    // Todos os modelos falharam: regista cada motivo e devolve-o (as mensagens da Google não contêm a chave).
    console.error("rh-ia:", erros.join(" | "));
    const motivo = erros.map((e) => e.replace(/\s+/g, " ").slice(0, 140)).join(" · ");
    return resp({ error: `A IA não devolveu uma resposta válida. Detalhe técnico: ${motivo}` }, 502);
  } catch (e) {
    console.error("rh-ia erro:", e);
    return resp({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
