import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";

const MES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface ReqBody {
  ano: number;
  mes: number;
  categoriaDestaque?: string;
  promocao?: string;
  notas?: string;
}

const SYSTEM_PROMPT = `És um especialista em gestão de redes sociais para a Loja Tudo Casa, em Mirandela, Trás-os-Montes, Portugal. A empresa vende materiais de construção, casa de banho, cozinha, caixilharia, climatização, jardim, eletrodomésticos, mobiliário, iluminação e pavimentos. Facebook: tudocasa.pt | Instagram: @loja.tudocasa | Site: lojatudocasa.com | WhatsApp disponível.

Gera um calendário editorial mensal com 4-5 posts por semana, obedecendo SEMPRE a estes pilares rotativos:
- 2ª ou 3ª feira: Produto em destaque
- 3ª ou 4ª feira: Dica / Conteúdo educativo
- 5ª feira: Carrossel promocional (OBRIGATÓRIO todas as semanas)
- 5ª ou 6ª feira: Interação/Engagement
- 1x por semana rotativo: post institucional (Localização, WhatsApp, Compra online + levanta na loja, Loja online, Siga o Instagram)

Horários automáticos por dia:
Seg: FB 09:00 IG 18:00 | Ter: FB 10:00 IG 18:30 | Qua: FB 09:00 IG 11:00
Qui: FB 09:00 IG 19:00 | Sex: FB 10:00 IG 12:00 | Sáb: FB 11:00 IG 10:00 | Dom: FB 11:00 IG 20:00

Tom: próximo, autêntico, linguagem de Trás-os-Montes sem forçar dialecto. Português de Portugal.
Inclui datas comemorativas portuguesas relevantes para o mês.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
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
    if (body.categoriaDestaque?.trim()) ctxLinhas.push(`- Produto/Categoria em destaque: ${body.categoriaDestaque.trim()}`);
    if (body.promocao?.trim()) ctxLinhas.push(`- Promoção/campanha em curso: ${body.promocao.trim()}`);
    if (body.notas?.trim()) ctxLinhas.push(`- Notas adicionais: ${body.notas.trim()}`);

    const userPrompt = `Gera o calendário editorial completo para ${mesNome} de ${ano} (${diasNoMes} dias).

${ctxLinhas.length ? "Contexto deste mês:\n" + ctxLinhas.join("\n") + "\n" : ""}
Distribui 4 a 5 posts por semana ao longo do mês, respeitando os pilares e horários definidos. Para cada post, define correctamente o "dia" (1-${diasNoMes}) de acordo com o calendário real de ${mesNome} ${ano}. Inclui datas comemorativas portuguesas relevantes desse mês como posts do tipo "data".`;

    const tools = [{
      type: "function",
      function: {
        name: "gerar_calendario",
        description: "Devolve a lista completa de posts do mês",
        parameters: {
          type: "object",
          properties: {
            posts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  dia: { type: "number" },
                  tipo: { type: "string", enum: ["carrossel","produto","dica","data","eng","inst","bastidores"] },
                  titulo: { type: "string" },
                  plataforma: { type: "string" },
                  horarioFB: { type: "string" },
                  horarioIG: { type: "string" },
                  holiday: { type: ["string","null"] },
                  copy: { type: "string" },
                  notaCriativa: { type: "string" },
                  hashtags: { type: "string" },
                  numSlides: { type: ["number","null"] },
                },
                required: ["dia","tipo","titulo","plataforma","horarioFB","horarioIG","copy","notaCriativa","hashtags"],
                additionalProperties: false,
              },
            },
          },
          required: ["posts"],
          additionalProperties: false,
        },
      },
    }];

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "gerar_calendario" } },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Gateway error:", resp.status, txt);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos atingido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adiciona fundos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro IA: " + txt.slice(0, 200) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(argsStr); } catch (e) {
      console.error("Tool args parse error:", argsStr);
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

    const cleaned = posts
      .filter((p: any) => Number.isFinite(p.dia) && p.dia >= 1 && p.dia <= diasNoMes)
      .map((p: any) => ({
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
