import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-flash";

const TUDOCASA_CONTEXT = `Loja Tudo Casa, em Mirandela, Trás-os-Montes, Portugal. Vende materiais de construção, casa de banho, cozinha, caixilharia, climatização, jardim, eletrodomésticos, mobiliário, iluminação e pavimentos. Facebook: tudocasa.pt | Instagram: @loja.tudocasa | Site: lojatudocasa.com. Tom próximo e autêntico, linguagem de Trás-os-Montes sem forçar dialecto. Português de Portugal (sempre).`;

interface ReqBody {
  field: "copy" | "hashtags" | "briefing" | "titulo";
  titulo?: string;
  tipoConteudo?: string;
  canal?: string;
  copy?: string;
  contextoExtra?: string;
}

function buildPrompt(b: ReqBody): { system: string; user: string; json: boolean } {
  const meta = [
    b.titulo ? `Título do post: ${b.titulo}` : "",
    b.tipoConteudo ? `Tipo: ${b.tipoConteudo}` : "",
    b.canal ? `Plataforma(s): ${b.canal}` : "",
    b.copy ? `Copy actual: ${b.copy}` : "",
    b.contextoExtra ? `Contexto adicional: ${b.contextoExtra}` : "",
  ].filter(Boolean).join("\n");

  const system = `És um especialista em redes sociais da ${TUDOCASA_CONTEXT}`;

  switch (b.field) {
    case "copy":
      return { system, json: false,
        user: `${meta}\n\nGera uma copy alternativa para este post. Máximo 3 parágrafos curtos. Tom próximo de Trás-os-Montes, sem forçar dialecto. Português de Portugal. Devolve APENAS o texto da copy, sem aspas, sem markdown, sem hashtags.` };
    case "hashtags":
      return { system, json: false,
        user: `${meta}\n\nSugere 8-10 hashtags em português relevantes para este post da Tudo Casa em Mirandela. Mistura hashtags de alcance alto (#Casa, #Remodelação, #Decoração) com hashtags locais (#Mirandela #TrásOsMontes #TudoCasa). Devolve APENAS as hashtags numa única linha, separadas por espaços, sem texto extra.` };
    case "briefing":
      return { system, json: false,
        user: `${meta}\n\nSugere uma nota criativa / briefing visual para este post: tipo de imagem ou vídeo, composição, cores predominantes, e, se for carrossel, número de slides recomendado e sugestão para cada slide. Máximo 6 linhas. Devolve APENAS o texto, sem markdown.` };
    case "titulo":
      return { system, json: true,
        user: `${meta}\n\nSugere 3 alternativas de título curtas (máximo 10 palavras cada) para este post.` };
  }
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
    if (!body?.field) {
      return new Response(JSON.stringify({ error: "Campo (field) obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { system, user, json } = buildPrompt(body);

    const payload: any = {
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 600,
    };

    if (json) {
      payload.tools = [{
        type: "function",
        function: {
          name: "sugerir_titulos",
          description: "Devolve 3 alternativas de título",
          parameters: {
            type: "object",
            properties: { alternativas: { type: "array", items: { type: "string" } } },
            required: ["alternativas"],
            additionalProperties: false,
          },
        },
      }];
      payload.tool_choice = { type: "function", function: { name: "sugerir_titulos" } };
    }

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${GOOGLE_AI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Gateway error:", resp.status, txt);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos atingido. Tente novamente em alguns instantes." }), {
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

    if (json) {
      const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
      let parsed: any = {};
      try { parsed = JSON.parse(toolCall?.function?.arguments || "{}"); } catch { parsed = {}; }
      const alternativas = Array.isArray(parsed.alternativas)
        ? parsed.alternativas.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 3)
        : [];
      return new Response(JSON.stringify({ alternativas }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text: string = (data?.choices?.[0]?.message?.content || "").trim();
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
