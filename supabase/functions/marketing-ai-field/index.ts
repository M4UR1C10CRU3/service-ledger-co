import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

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
      return {
        system,
        json: false,
        user: `${meta}\n\nGera uma copy alternativa para este post. Máximo 3 parágrafos curtos. Tom próximo de Trás-os-Montes, sem forçar dialecto. Português de Portugal. Devolve APENAS o texto da copy, sem aspas, sem markdown, sem hashtags.`,
      };
    case "hashtags":
      return {
        system,
        json: false,
        user: `${meta}\n\nSugere 8-10 hashtags em português relevantes para este post da Tudo Casa em Mirandela. Mistura hashtags de alcance alto (#Casa, #Remodelação, #Decoração) com hashtags locais (#Mirandela #TrásOsMontes #TudoCasa). Devolve APENAS as hashtags numa única linha, separadas por espaços, sem texto extra.`,
      };
    case "briefing":
      return {
        system,
        json: false,
        user: `${meta}\n\nSugere uma nota criativa / briefing visual para este post: tipo de imagem ou vídeo, composição, cores predominantes, e, se for carrossel, número de slides recomendado e sugestão para cada slide. Máximo 6 linhas. Devolve APENAS o texto, sem markdown.`,
      };
    case "titulo":
      return {
        system,
        json: true,
        user: `${meta}\n\nSugere 3 alternativas de título curtas (máximo 10 palavras cada) para este post. Devolve APENAS JSON válido com a forma: {"alternativas": ["...", "...", "..."]}`,
      };
  }
}

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
    if (!body?.field) {
      return new Response(JSON.stringify({ error: "Campo (field) obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { system, user, json } = buildPrompt(body);

    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      const status = resp.status === 401 ? 401 : resp.status === 429 ? 429 : 500;
      const msg = resp.status === 401
        ? "Chave Anthropic inválida."
        : resp.status === 429
        ? "Limite de pedidos atingido. Tente novamente em alguns instantes."
        : "Erro IA: " + txt.slice(0, 200);
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text: string = (data?.content?.[0]?.text || "").trim();

    if (json) {
      let s = text;
      const fenced = s.match(/```(?:json)?\s*([\s\S]+?)```/);
      if (fenced) s = fenced[1].trim();
      const f = s.indexOf("{"); const l = s.lastIndexOf("}");
      if (f >= 0 && l > f) s = s.slice(f, l + 1);
      let parsed: any = {};
      try { parsed = JSON.parse(s); } catch { parsed = {}; }
      const alternativas = Array.isArray(parsed.alternativas)
        ? parsed.alternativas.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 3)
        : [];
      return new Response(JSON.stringify({ alternativas }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
