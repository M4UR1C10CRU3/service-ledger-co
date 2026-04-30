import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250929";

interface ReqBody {
  briefing: string;          // descrição da campanha/contexto
  empresa_nome?: string;
  data_inicio?: string;      // YYYY-MM-DD
  data_fim?: string;         // YYYY-MM-DD
  canais?: string[];         // instagram, facebook, ...
  qtd_publicacoes?: number;  // sugestão de quantas tarefas gerar
  tom?: string;              // ex: "profissional", "descontraído"
}

interface TarefaSugerida {
  titulo: string;
  tipo_conteudo: string;     // post|story|reels|anuncio|video|blog|email|outro
  canal: string;             // instagram|facebook|linkedin|tiktok|site|email|outro
  prioridade: string;        // baixa|media|alta|urgente
  data_publicacao: string;   // YYYY-MM-DD
  hora_publicacao?: string;  // HH:MM
  briefing: string;          // objectivo + contexto
  copy_legenda: string;      // texto pronto a publicar
  hashtags?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.briefing || body.briefing.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Briefing demasiado curto (mínimo 10 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qtd = Math.min(Math.max(body.qtd_publicacoes ?? 8, 1), 30);
    const canaisStr = (body.canais && body.canais.length > 0)
      ? body.canais.join(", ")
      : "instagram, facebook";
    const periodoStr = body.data_inicio && body.data_fim
      ? `entre ${body.data_inicio} e ${body.data_fim}`
      : "nas próximas 4 semanas a partir de hoje";

    const systemPrompt = `Você é um especialista em marketing digital para PMEs portuguesas.
Devolve SEMPRE e APENAS JSON válido (sem markdown, sem comentários, sem texto antes ou depois).
Toda a comunicação (títulos, briefings, copy, hashtags) é em PORTUGUÊS DE PORTUGAL.
Os valores dos campos categóricos têm de pertencer aos enums definidos.`;

    const userPrompt = `Gera um plano editorial para a empresa "${body.empresa_nome || 'Cliente'}".

Contexto / Briefing:
${body.briefing}

Requisitos:
- ${qtd} publicações distribuídas ${periodoStr}
- Canais permitidos: ${canaisStr}
- Tom: ${body.tom || "profissional e próximo"}
- Datas distribuídas de forma equilibrada (evita concentrar tudo no mesmo dia)
- Cada publicação deve ter título curto, briefing (objectivo) e copy_legenda pronto a publicar
- Inclui hashtags relevantes em português
- Horário sugerido entre 09:00 e 20:00

Devolve EXACTAMENTE este JSON (sem texto extra):
{
  "tarefas": [
    {
      "titulo": "string curto",
      "tipo_conteudo": "post|story|reels|anuncio|video|blog|email|outro",
      "canal": "instagram|facebook|linkedin|tiktok|site|email|outro",
      "prioridade": "baixa|media|alta|urgente",
      "data_publicacao": "YYYY-MM-DD",
      "hora_publicacao": "HH:MM",
      "briefing": "objectivo e contexto da publicação",
      "copy_legenda": "texto pronto a publicar com chamada à acção",
      "hashtags": "#exemplo #marca"
    }
  ]
}`;

    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Anthropic error:", resp.status, txt);
      if (resp.status === 401) {
        return new Response(JSON.stringify({ error: "Chave Anthropic inválida ou expirada." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos atingido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro no Claude: " + txt.slice(0, 200) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text: string = data?.content?.[0]?.text || "";

    // Extract JSON (Claude pode às vezes embrulhar)
    let jsonStr = text.trim();
    const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (fenced) jsonStr = fenced[1].trim();
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace > 0) jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);

    let parsed: { tarefas?: TarefaSugerida[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("JSON parse error. Raw:", text);
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
