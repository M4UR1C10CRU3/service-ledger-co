import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-pro";

interface ReqBody {
  briefing: string;
  empresa_nome?: string;
  data_inicio?: string;
  data_fim?: string;
  canais?: string[];
  qtd_publicacoes?: number;
  tom?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_AI_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.briefing || body.briefing.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Briefing demasiado curto (mínimo 10 caracteres)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qtd = Math.min(Math.max(body.qtd_publicacoes ?? 8, 1), 30);
    const canaisStr = body.canais?.length ? body.canais.join(", ") : "instagram, facebook";
    const periodoStr = body.data_inicio && body.data_fim
      ? `entre ${body.data_inicio} e ${body.data_fim}`
      : "nas próximas 4 semanas a partir de hoje";

    const systemPrompt = `És um especialista em marketing digital para PMEs portuguesas. Comunicas sempre em português de Portugal.`;
    const userPrompt = `Gera um plano editorial para a empresa "${body.empresa_nome || 'Cliente'}".

Contexto / Briefing:
${body.briefing}

Requisitos:
- ${qtd} publicações distribuídas ${periodoStr}
- Canais permitidos: ${canaisStr}
- Tom: ${body.tom || "profissional e próximo"}
- Datas equilibradas, horários entre 09:00 e 20:00
- Inclui hashtags relevantes em português`;

    const tools = [{
      type: "function",
      function: {
        name: "gerar_plano",
        description: "Devolve as tarefas do plano editorial",
        parameters: {
          type: "object",
          properties: {
            tarefas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  tipo_conteudo: { type: "string", enum: ["post","story","reels","anuncio","video","blog","email","outro"] },
                  canal: { type: "string", enum: ["instagram","facebook","linkedin","tiktok","site","email","outro"] },
                  prioridade: { type: "string", enum: ["baixa","media","alta","urgente"] },
                  data_publicacao: { type: "string" },
                  hora_publicacao: { type: "string" },
                  briefing: { type: "string" },
                  copy_legenda: { type: "string" },
                  hashtags: { type: "string" },
                },
                required: ["titulo","tipo_conteudo","canal","prioridade","data_publicacao","briefing","copy_legenda"],
                additionalProperties: false,
              },
            },
          },
          required: ["tarefas"],
          additionalProperties: false,
        },
      },
    }];

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${GOOGLE_AI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "gerar_plano" } },
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
    let parsed: any = {};
    try { parsed = JSON.parse(toolCall?.function?.arguments || "{}"); } catch (e) {
      console.error("Tool args parse error");
      return new Response(JSON.stringify({ error: "Resposta da IA inválida. Tente reformular o briefing." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tarefas = Array.isArray(parsed.tarefas) ? parsed.tarefas : [];
    if (tarefas.length === 0) {
      return new Response(JSON.stringify({ error: "A IA não devolveu sugestões. Tente novamente." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ tarefas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-ai-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
