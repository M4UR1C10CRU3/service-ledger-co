// Pedido à IA da Google (endpoint compatível com OpenAI) que sobrevive às mudanças de modelos (02/10/2026).
//
// Porquê: em 2026 a Google desativou o gemini-2.0-flash e fechou o 2.5 a chaves novas; com o nome do modelo
// escrito à mão, as funções partiam sem aviso. Aqui:
//   1. tenta primeiro o alias «-latest» da família pedida (flash ou pro), que acompanha a versão atual;
//   2. a seguir, os modelos dessa família que a PRÓPRIA chave pode usar (lista pedida à Google);
//   3. 503 (sobrecarga) → repete até 3 vezes com espera; 404 (modelo inexistente) e 429 (quota desse modelo)
//      → passa ao seguinte; outro erro (ex.: 400, pedido mal feito) → devolve logo, porque mudar de modelo
//      não o resolve.
// Devolve sempre um Response — o da primeira resposta boa, ou o último erro — para que cada função mantenha o
// tratamento de erros que já tinha. Cada pedido leva a data de hoje nas instruções de sistema (a IA não a sabe).

export const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/openai/models";

export type FamiliaModelo = "flash" | "pro";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function modelosDaChave(key: string, familia: FamiliaModelo): Promise<string[]> {
  try {
    const r = await fetch(MODELS_URL, { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) return [];
    const j = await r.json();
    const ids: string[] = (j.data ?? []).map((m: { id: string }) => String(m.id).replace(/^models\//, ""));
    const re = familia === "pro" ? /^gemini-.*pro/ : /^gemini-.*flash/;
    return ids
      .filter((id) => re.test(id) && !/lite|image|audio|tts|live|embed|thinking-exp|vision/.test(id))
      .sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
  } catch { return []; }
}

/** Acrescenta a data de hoje (Europe/Lisbon) à primeira mensagem de sistema, ou cria uma. */
function comDataDeHoje(messages: Array<{ role: string; content: unknown }>) {
  const hoje = new Date().toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric" });
  const nota = `A data de hoje é ${hoje}. Datas anteriores a hoje já passaram.`;
  const copia = [...messages];
  const i = copia.findIndex((m) => m.role === "system" && typeof m.content === "string");
  if (i >= 0) copia[i] = { ...copia[i], content: `${copia[i].content}\n\n${nota}` };
  else copia.unshift({ role: "system", content: nota });
  return copia;
}

/**
 * Faz o pedido à IA escolhendo o modelo. `corpo` é o corpo habitual do chat/completions SEM o campo `model`.
 */
export async function pedirGemini(
  key: string,
  corpo: Record<string, unknown> & { messages: Array<{ role: string; content: unknown }> },
  familia: FamiliaModelo = "flash",
): Promise<Response> {
  const preferido = familia === "pro" ? "gemini-pro-latest" : "gemini-flash-latest";
  const lista = await modelosDaChave(key, familia);
  // Para «pro», o flash fica no fim como último recurso: um resultado mais simples é melhor do que nenhum.
  const reserva = familia === "pro" ? ["gemini-flash-latest"] : [];
  const candidatos = [...new Set([preferido, ...lista, ...reserva])].slice(0, 5);
  const messages = comDataDeHoje(corpo.messages);

  let ultima: Response | null = null;
  for (const model of candidatos) {
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      ultima = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...corpo, messages, model }),
      });
      if (ultima.status !== 503) break;
      await esperar(1500 * tentativa);
    }
    if (ultima.ok) return ultima;
    if (![404, 429, 503].includes(ultima.status)) return ultima; // erro do pedido: outro modelo não resolve
    console.warn(`gemini: ${model} → ${ultima.status}, a tentar o seguinte`);
    if (model !== candidatos[candidatos.length - 1]) await ultima.body?.cancel(); // liberta a resposta descartada
  }
  return ultima ?? new Response(JSON.stringify({ error: "Sem modelos disponíveis" }), { status: 503 });
}
