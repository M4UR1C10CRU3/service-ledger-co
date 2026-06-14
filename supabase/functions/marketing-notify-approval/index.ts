import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReqBody {
  tarefaId: string;
  empresaId: string;
  titulo: string;
  dataPublicacao?: string | null;
  horaPublicacao?: string | null;
  aprovadorNome?: string | null;
  origem: "em_aprovacao";
  linkApp?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as ReqBody;
    if (!body?.tarefaId || !body?.empresaId) {
      return new Response(JSON.stringify({ error: "tarefaId/empresaId obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Encontrar administradores activos (ou aprovador específico)
    const { data: admins } = await supabase
      .from("liberty_utilizadores")
      .select("id, auth_user_id, nome, email")
      .eq("ativo", true)
      .eq("eliminado", false)
      .or(`perfil.eq.administrador${body.aprovadorNome ? `,nome.ilike.${body.aprovadorNome}` : ""}`);

    const destinatarios = admins || [];
    const dataStr = body.dataPublicacao
      ? `${body.dataPublicacao}${body.horaPublicacao ? " " + String(body.horaPublicacao).slice(0, 5) : ""}`
      : "—";
    const mensagem = `Post "${body.titulo}" aguarda a sua aprovação. Publicação prevista: ${dataStr}.`;

    // Notificação in-app
    if (destinatarios.length > 0) {
      const rows = destinatarios.map((u) => ({
        tarefa_id: body.tarefaId,
        empresa_id: body.empresaId,
        destinatario_id: u.auth_user_id || u.id,
        destinatario_nome: u.nome,
        tipo: "aprovacao_pendente",
        mensagem,
        lida: false,
      }));
      const { error: notifErr } = await supabase.from("marketing_tarefa_notificacoes").insert(rows);
      if (notifErr) console.error("notif insert err", notifErr);
    }

    // Email — só se Resend estiver configurado (opcional)
    let emailSent = false;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const to = destinatarios.map((u) => u.email).filter(Boolean) as string[];
      if (to.length > 0) {
        const link = body.linkApp || "";
        const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#111">
  <h2 style="color:#A855F7">Aprovação pendente — Marketing</h2>
  <p>Olá,</p>
  <p>Um post está a aguardar a sua aprovação no sistema Clariza:</p>
  <table style="border-collapse:collapse;margin:14px 0">
    <tr><td style="padding:6px 10px;color:#666">Título</td><td style="padding:6px 10px;font-weight:600">${body.titulo}</td></tr>
    <tr><td style="padding:6px 10px;color:#666">Publicação prevista</td><td style="padding:6px 10px">${dataStr}</td></tr>
  </table>
  ${link ? `<p><a href="${link}" style="display:inline-block;background:#A855F7;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Abrir e aprovar</a></p>` : ""}
  <p style="color:#888;font-size:12px;margin-top:24px">Clariza — Plataforma de Gestão Empresarial</p>
</div>`.trim();
        try {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Clariza <onboarding@resend.dev>",
              to,
              subject: `Aprovação pendente: ${body.titulo}`,
              html,
            }),
          });
          emailSent = r.ok;
          if (!r.ok) console.error("resend err", await r.text());
        } catch (e) {
          console.error("resend ex", e);
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, destinatarios: destinatarios.length, emailSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
