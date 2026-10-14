// API do agente que corre no PC da loja (rede local, com acesso a \\APPS01).
// Autenticação: cabeçalho «x-agente-token» = segredo ECOMMERCE_AGENTE_TOKEN.
//   GET  ?acao=pendentes  → encomendas cuja pasta ainda não foi criada (com ligação temporária para a folha em PDF)
//   POST {acao:"pasta-criada", numero}
//   GET  ?acao=pastas&dias=120 → encomendas recentes e nomes dos ficheiros já levados ao cartão
//   POST {acao:"anexo", numero, nome, base64} → anexa ao cartão um PDF encontrado na pasta
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, BUCKET, concluirItem } from "../_shared/encomendas.ts";

const EMPRESA_SLUG = "tudocasa";
const resp = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

function tokenValido(t: string | null): boolean {
  const esperado = Deno.env.get("ECOMMERCE_AGENTE_TOKEN") || "";
  if (!esperado || !t || t.length !== esperado.length) return false;
  let dif = 0;
  for (let i = 0; i < t.length; i++) dif |= t.charCodeAt(i) ^ esperado.charCodeAt(i);
  return dif === 0;
}

// Que item da checklist «Documentos» o ficheiro conclui
function itemDoFicheiro(nome: string): string | null {
  const n = nome.toLowerCase();
  if (n.startsWith("fatura") || n.startsWith("factura")) return "Fatura-recibo emitida no PHC";
  if (n.startsWith("comp") || n.includes("comprovativo")) return "Comprovativo de pagamento";
  return null;
}

serve(async (req) => {
  if (!tokenValido(req.headers.get("x-agente-token"))) return resp(401, { ok: false, error: "token inválido" });
  const sb = admin();
  const { data: emp } = await sb.from("empresas").select("id").eq("slug", EMPRESA_SLUG).maybeSingle();
  if (!emp) return resp(500, { ok: false, error: "empresa não encontrada" });
  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const acao = url.searchParams.get("acao");
      if (acao === "pendentes") {
        const { data } = await sb.from("ecommerce_encomendas").select("numero, pasta_relativa, folha_path")
          .eq("empresa_id", emp.id).is("pasta_criada_em", null).not("cartao_id", "is", null).order("criado_em");
        const out = [];
        for (const e of data || []) {
          let folha_url: string | null = null;
          if (e.folha_path) {
            const { data: s } = await sb.storage.from(BUCKET).createSignedUrl(e.folha_path, 600);
            folha_url = s?.signedUrl ?? null;
          }
          out.push({ numero: e.numero, pasta_relativa: e.pasta_relativa, folha_url });
        }
        return resp(200, { ok: true, encomendas: out });
      }
      if (acao === "pastas") {
        const dias = Math.min(Math.max(parseInt(url.searchParams.get("dias") || "120", 10) || 120, 1), 400);
        const desde = new Date(Date.now() - dias * 86400000).toISOString();
        const { data } = await sb.from("ecommerce_encomendas").select("numero, pasta_relativa, anexos_enviados")
          .eq("empresa_id", emp.id).not("pasta_criada_em", "is", null).not("cartao_id", "is", null).gte("criado_em", desde);
        return resp(200, { ok: true, encomendas: data || [] });
      }
      return resp(400, { ok: false, error: "ação desconhecida" });
    }

    if (req.method === "POST") {
      const b = await req.json();
      const { data: enc } = await sb.from("ecommerce_encomendas").select("id, cartao_id, anexos_enviados")
        .eq("empresa_id", emp.id).eq("numero", String(b.numero || "")).maybeSingle();
      if (!enc?.cartao_id) return resp(404, { ok: false, error: "encomenda sem cartão" });

      if (b.acao === "pasta-criada") {
        await sb.from("ecommerce_encomendas").update({ pasta_criada_em: new Date().toISOString() }).eq("id", enc.id);
        await concluirItem(sb, enc.cartao_id, "Pasta criada no servidor");
        return resp(200, { ok: true });
      }

      if (b.acao === "anexo") {
        const nome = String(b.nome || "").replace(/[\\/]/g, "").slice(0, 200);
        if (!/\.pdf$/i.test(nome) || !b.base64) return resp(400, { ok: false, error: "só PDF" });
        const ja: string[] = enc.anexos_enviados || [];
        if (ja.includes(nome)) return resp(200, { ok: true, repetido: true });
        const bytes = Uint8Array.from(atob(b.base64), (c) => c.charCodeAt(0));
        if (bytes.length > 15 * 1024 * 1024) return resp(413, { ok: false, error: "ficheiro grande de mais" });
        const safe = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_");
        const path = `${emp.id}/${enc.cartao_id}/${crypto.randomUUID()}-${safe}`;
        const { error: eUp } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: "application/pdf" });
        if (eUp) throw eUp;
        await sb.from("cartao_anexos").insert({ cartao_id: enc.cartao_id, nome, path, tipo: "application/pdf" });
        await sb.from("ecommerce_encomendas").update({ anexos_enviados: [...ja, nome] }).eq("id", enc.id);
        const item = itemDoFicheiro(nome);
        if (item) await concluirItem(sb, enc.cartao_id, item);
        return resp(200, { ok: true });
      }
      return resp(400, { ok: false, error: "ação desconhecida" });
    }
    return resp(405, { ok: false });
  } catch (e) {
    console.error("[ecommerce-agente]", e);
    return resp(500, { ok: false, error: String((e as Error)?.message ?? e) });
  }
});
