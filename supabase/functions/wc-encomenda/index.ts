// Recebe o webhook «Pedido atualizado» do WooCommerce (lojatudocasa.com).
// Quando a encomenda fica PAGA (estado «processing»), abre o cartão no quadro «Encomendas da loja»
// da Tudo Casa - Warm. Repetições do mesmo webhook não criam cartões duplicados.
// Segredo: WC_WEBHOOK_SECRET (o mesmo «Segredo» definido no webhook do WooCommerce).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, registarEncomenda } from "../_shared/encomendas.ts";

const EMPRESA_SLUG = "tudocasa";
const ESTADOS_PAGOS = ["processing", "completed"];

async function assinaturaValida(corpo: string, assinatura: string | null): Promise<boolean> {
  const segredo = Deno.env.get("WC_WEBHOOK_SECRET");
  if (!segredo || !assinatura) return false;
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpo)));
  const esperado = btoa(String.fromCharCode(...mac));
  if (esperado.length !== assinatura.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ assinatura.charCodeAt(i);
  return dif === 0;
}

const resp = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method !== "POST") return resp(405, { ok: false });
  const corpo = await req.text();

  // Ao criar o webhook, o WooCommerce envia um «ping» (webhook_id=N) sem assinatura de encomenda.
  if (!corpo.trim().startsWith("{")) return resp(200, { ok: true, ping: true });

  if (!(await assinaturaValida(corpo, req.headers.get("x-wc-webhook-signature")))) {
    console.warn("[wc-encomenda] assinatura inválida");
    return resp(401, { ok: false, error: "assinatura inválida" });
  }

  let order: any;
  try { order = JSON.parse(corpo); } catch { return resp(400, { ok: false, error: "JSON inválido" }); }
  if (!order?.id || !ESTADOS_PAGOS.includes(order.status)) return resp(200, { ok: true, ignorado: order?.status ?? "sem estado" });

  const sb = admin();
  const { data: emp } = await sb.from("empresas").select("id").eq("slug", EMPRESA_SLUG).maybeSingle();
  if (!emp) return resp(500, { ok: false, error: "empresa não encontrada" });

  try {
    const r = await registarEncomenda(sb, emp.id, order);
    console.log(`[wc-encomenda] #${order.number || order.id}: ${r.estado}`);
    return resp(200, { ok: true, ...r });
  } catch (e) {
    console.error("[wc-encomenda] erro", e);
    // O WooCommerce regista a falha no histórico do webhook (e desliga-o ao fim de 5 falhas seguidas).
    return resp(500, { ok: false, error: String((e as Error)?.message ?? e) });
  }
});
