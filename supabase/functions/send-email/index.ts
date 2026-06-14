import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { to, subject, html, empresa_id, tipo, from: fromOverride } = body;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ ok: false, error: "to/subject/html obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── SMTP path — when empresa_id + tipo are provided ────────────────────────
    if (empresa_id && tipo) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: cfg, error: cfgErr } = await supabase
        .from("empresa_smtp_configs")
        .select("email, nome_exibicao, smtp_host, smtp_port, smtp_user, smtp_pass")
        .eq("empresa_id", empresa_id)
        .eq("tipo", tipo)
        .eq("ativo", true)
        .single();

      if (cfgErr || !cfg) {
        console.error("[send-email] SMTP config não encontrada:", cfgErr?.message);
        return new Response(
          JSON.stringify({ ok: false, error: "Configuração SMTP não encontrada para esta empresa/tipo" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const transporter = nodemailer.createTransport({
        host: cfg.smtp_host,
        port: cfg.smtp_port,
        secure: true,
        auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
      });

      await transporter.sendMail({
        from: `${cfg.nome_exibicao} <${cfg.email}>`,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html,
      });

      return new Response(
        JSON.stringify({ ok: true, method: "smtp", from: cfg.email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Resend fallback — legacy calls that pass `from` directly ───────────────
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.warn("[send-email] Sem SMTP config e sem RESEND_API_KEY — email não enviado");
      return new Response(
        JSON.stringify({ ok: false, error: "Email não configurado. Defina empresa_id+tipo ou configure RESEND_API_KEY." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromOverride ?? "Clariza Manager <onboarding@resend.dev>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("[send-email] Resend error:", err);
      return new Response(
        JSON.stringify({ ok: false, error: err }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resData = await r.json().catch(() => ({}));
    return new Response(
      JSON.stringify({ ok: true, method: "resend", id: resData?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("[send-email] Erro interno:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
