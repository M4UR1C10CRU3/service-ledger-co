// Edge function que avança automaticamente cards "Agendado" → "Publicado"
// quando o horário mais tardio agendado por plataforma já passou.
// Invocada por pg_cron a cada 5 min.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const nowMinutes = today.getHours() * 60 + today.getMinutes();

    // Procura cards agendados para hoje (ou anteriores) com agendamento confirmado
    const { data: cards, error } = await supabase
      .from("marketing_tarefas")
      .select("id, empresa_id, titulo, agendamento_horarios, data_publicacao, hora_publicacao")
      .eq("status", "agendado")
      .eq("agendamento_confirmado", true)
      .lte("data_publicacao", todayStr);

    if (error) throw error;

    let promoted = 0;
    for (const c of cards || []) {
      // Se for dia anterior, sempre promove
      const isPast = c.data_publicacao && c.data_publicacao < todayStr;
      let triggerMinutes = -1;

      if (!isPast) {
        const horarios = (c.agendamento_horarios || {}) as Record<string, string>;
        const times = Object.values(horarios).filter(Boolean);
        if (times.length === 0 && c.hora_publicacao) times.push(c.hora_publicacao);
        if (times.length === 0) continue;
        // Pega o horário mais tardio
        for (const t of times) {
          const [h, m] = String(t).split(":").map(Number);
          if (!isNaN(h) && !isNaN(m)) {
            const total = h * 60 + m;
            if (total > triggerMinutes) triggerMinutes = total;
          }
        }
        if (triggerMinutes < 0 || nowMinutes < triggerMinutes) continue;
      }

      // Promove para publicado
      const { error: updErr } = await supabase
        .from("marketing_tarefas")
        .update({ status: "publicado" })
        .eq("id", c.id);
      if (updErr) {
        console.error("update error", c.id, updErr);
        continue;
      }
      await supabase.from("marketing_comentarios").insert({
        tarefa_id: c.id,
        empresa_id: c.empresa_id,
        autor_id: null,
        autor_nome: "Sistema (auto-publish)",
        conteudo: "✅ Card movido automaticamente para Publicado — todos os horários agendados foram atingidos.",
        tipo: "sistema",
      });
      promoted++;
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: cards?.length || 0, promoted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[marketing-publish-scheduled] error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
