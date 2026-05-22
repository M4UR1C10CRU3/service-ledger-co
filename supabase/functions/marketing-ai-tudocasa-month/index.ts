import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

const MES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface ReqBody {
  ano: number;
  mes: number; // 1-12
  categoriaDestaque?: string;
  promocao?: string;
  notas?: string;
}

interface PostGerado {
  dia: number;
  tipo: "carrossel" | "produto" | "dica" | "data" | "eng" | "inst" | "bastidores";
  titulo: string;
  plataforma: string;
  horarioFB: string;
  horarioIG: string;
  holiday: string | null;
  copy: string;
  notaCriativa: string;
  hashtags: string;
  numSlides: number | null;
}

const SYSTEM_PROMPT = `És um especialista em gestão de redes sociais para a Loja Tudo Casa, em Mirandela, Trás-os-Montes, Portugal. A empresa vende materiais de construção, casa de banho, cozinha, caixilharia, climatização, jardim, eletrodomésticos, mobiliário, iluminação e pavimentos. Facebook: tudocasa.pt | Instagram: @loja.tudocasa | Site: lojatudocasa.com | WhatsApp disponível.

Gera um calendário editorial mensal com 4-5 posts por semana, obedecendo SEMPRE a estes pilares rotativos:
- 2ª ou 3ª feira: Produto em destaque
- 3ª ou 4ª feira: Dica / Conteúdo educativo
- 5ª feira: Carrossel promocional (OBRIGATÓRIO todas as semanas)
- 5ª ou 6ª feira: Interação/Engagement
- 1x por semana rotativo: post institucional (rodar entre: Localização, WhatsApp, Compra online + levanta na loja, Loja online, Siga o Instagram)

Horários automáticos por dia:
Seg: FB 09:00 IG 18:00 | Ter: FB 10:00 IG 18:30 | Qua: FB 09:00 IG 11:00
Qui: FB 09:00 IG 19:00 | Sex: FB 10:00 IG 12:00 | Sáb: FB 11:00 IG 10:00 | Dom: FB 11:00 IG 20:00

Tom: próximo, autêntico, linguagem de Trás-os-Montes sem forçar dialecto. Português de Portugal.
Inclui datas comemorativas portuguesas relevantes para o mês.

Devolve um array JSON com esta estrutura exacta para cada post:
{
  dia: number,
  tipo: 'carrossel'|'produto'|'dica'|'data'|'eng'|'inst'|'bastidores',
  titulo: string,
  plataforma: string,
  horarioFB: string,
  horarioIG: string,
  holiday: string|null,
  copy: string,
  notaCriativa: string,
  hashtags: string,
  numSlides: number|null
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ano = Number(body.ano);
    const mes = Number(body.mes);
    if (!ano || !mes || mes < 1 || mes > 12) {
      return new Response(JSON.stringify({ error: "Ano/mês inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const diasNoMes = new Date(ano, mes, 0).getDate();
    const mesNome = MES_NOMES[mes - 1];

    const ctxLinhas: string[] = [];
    if (body.categoriaDestaque?.trim()) ctxLinhas.push(`- Produto/Categoria em destaque este mês: ${body.categoriaDestaque.trim()}`);
    if (body.promocao?.trim()) ctxLinhas.push(`- Promoção/campanha especial em curso: ${body.promocao.trim()}`);
    if (body.notas?.trim()) ctxLinhas.push(`- Notas adicionais: ${body.notas.trim()}`);

    const userPrompt = `Gera o calendário editorial completo para ${mesNome} de ${ano} (${diasNoMes} dias).

${ctxLinhas.length ? "Contexto deste mês:\n" + ctxLinhas.join("\n") + "\n" : ""}
Distribui 4 a 5 posts por semana ao longo do mês, respeitando os pilares e horários definidos no system prompt. Para cada post, define correctamente o "dia" (1-${diasNoMes}) de acordo com o calendário real de ${mesNome} ${ano} e o pilar correspondente ao dia da semana. Inclui datas comemorativas portuguesas relevantes desse mês como posts do tipo "data".

Devolve APENAS JSON válido (sem markdown, sem texto extra) com esta forma:
{ "posts": [ { ...estrutura definida... }, ... ] }`;

    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Anthropic error:", resp.status, txt);
      const status = resp.status === 401 ? 401 : resp.status === 429 ? 429 : 500;
      const msg = resp.status === 401
        ? "Chave Anthropic inválida ou expirada."
        : resp.status === 429
        ? "Limite de pedidos atingido. Tente novamente em alguns minutos."
        : "Erro no Claude: " + txt.slice(0, 200);
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text: string = data?.content?.[0]?.text || "";

    let jsonStr = text.trim();
    const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (fenced) jsonStr = fenced[1].trim();
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);

    let parsed: { posts?: PostGerado[] };
    try { parsed = JSON.parse(jsonStr); }
    catch (e) {
      console.error("JSON parse error. Raw:", text);
      return new Response(JSON.stringify({ error: "Resposta da IA inválida. Tente novamente." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
    if (posts.length === 0) {
      return new Response(JSON.stringify({ error: "A IA não devolveu posts. Tente novamente." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // sanity: clamp dia
    const cleaned = posts
      .filter(p => Number.isFinite(p.dia) && p.dia >= 1 && p.dia <= diasNoMes)
      .map(p => ({
        ...p,
        plataforma: p.plataforma || "FB + IG",
        horarioFB: p.horarioFB || "09:00",
        horarioIG: p.horarioIG || "18:00",
        holiday: p.holiday || null,
        hashtags: p.hashtags || "",
        notaCriativa: p.notaCriativa || "",
        copy: p.copy || "",
        numSlides: p.numSlides ?? null,
      }));

    return new Response(JSON.stringify({ posts: cleaned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-ai-tudocasa-month error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
