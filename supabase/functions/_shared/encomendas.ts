// Encomendas da loja (WooCommerce) → Clariza. Usado por wc-encomenda e ecommerce-agente.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

export const BUCKET = "cartao-anexos";
export const APP_URL = "https://app.clarizaplatform.com";

export const admin = (): SupabaseClient =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Fornecedor pelo prefixo da referência da loja. Por agora tudo é «sem stock em loja» (inventário em conferência).
export function fornecedorDe(sku: string): string {
  const s = (sku || "").toUpperCase();
  if (s.startsWith("E3-")) return "Elektro3 (E3)";
  if (s.startsWith("DB-")) return "Delba";
  if (s.startsWith("SC-")) return "Saniclass";
  return "Fornecedor a identificar";
}

export const euro = (v: number) =>
  v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€";

const semInvalidos = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();

// «Maria Alice» + «Gonçalves Ferreira» → «Maria Alice Ferreira» (como nas pastas feitas à mão)
export function nomeCurto(primeiro: string, apelidos: string): string {
  const ult = (apelidos || "").trim().split(/\s+/).pop() || "";
  return semInvalidos(`${(primeiro || "").trim()} ${ult}`);
}

// Data local da encomenda (WooCommerce manda date_created na hora do site: Europe/Lisbon)
export function partesData(isoLocal: string) {
  const [a, m, d] = (isoLocal || new Date().toISOString()).slice(0, 10).split("-");
  return { a, m, d, mesNome: MESES[parseInt(m, 10) - 1] };
}

// Caminho relativo a «…\DEP. PRODUÇÃO_VENDAS»: «Ano 2026\10 - Outubro\Encomenda #138908 - Antonio Neves - 8,33€ - 14 10 2026»
export function pastaRelativa(numero: string, nome: string, total: number, isoLocal: string) {
  const { a, m, d, mesNome } = partesData(isoLocal);
  const pasta = semInvalidos(`Encomenda #${numero} - ${nome} - ${euro(total)} - ${d} ${m} ${a}`);
  return `Ano ${a}\\${m} - ${mesNome}\\${pasta}`;
}

export interface Item { sku: string; nome: string; qtd: number; total: number; fornecedor: string }

export function itensDe(order: any): Item[] {
  return (order.line_items || []).map((li: any) => ({
    sku: li.sku || "",
    nome: (li.name || "").trim(),
    qtd: Number(li.quantity) || 0,
    total: Math.round((Number(li.total) + Number(li.total_tax || 0)) * 100) / 100,
    fornecedor: fornecedorDe(li.sku || ""),
  }));
}

const moradaTxt = (m: any) =>
  m ? [m.address_1, m.address_2, [m.postcode, m.city].filter(Boolean).join(" "), m.country && m.country !== "PT" ? m.country : ""]
        .filter((x: string) => x && x.trim()).join(", ") : "";

export function nifDe(order: any): string {
  for (const k of ["_billing_nif", "billing_nif", "_billing_vat", "nif", "_vat_number", "vat_number"]) {
    const md = (order.meta_data || []).find((x: any) => x.key === k);
    if (md?.value) return String(md.value);
  }
  return "";
}

export const ehLevantamento = (envio: string) => /levantamento|recolha|pickup|local/i.test(envio || "");

// ── Folha de encomenda (PDF) ────────────────────────────────────────────────
const pdfTxt = (s: string) => (s || "").replace(/[^\x20-\x7E -ÿ€—–·×“”‘’…]/g, "");

export async function folhaPdf(e: {
  numero: string; data: string; cliente: string; email: string; telefone: string; nif: string;
  faturacao: string; envioMorada: string; envio: string; pagamento: string; total: number; itens: Item[]; pasta: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const laranja = rgb(1, 0.42, 0), cinza = rgb(0.35, 0.36, 0.4), preto = rgb(0.1, 0.1, 0.12);
  let y = 800;
  const t = (s: string, x: number, size = 10, font = f, color = preto) => page.drawText(pdfTxt(s), { x, y, size, font, color });
  // Parte o texto em linhas, entre palavras, até à largura indicada
  const partir = (txt: string, larg: number, size: number, font = f) => {
    const out: string[] = []; let cur = "";
    for (const w of pdfTxt(txt).split(/\s+/)) {
      const tst = cur ? cur + " " + w : w;
      if (font.widthOfTextAtSize(tst, size) > larg && cur) { out.push(cur); cur = w; } else cur = tst;
    }
    if (cur) out.push(cur);
    return out;
  };
  const linha = () => { page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.6, color: rgb(0.85, 0.85, 0.87) }); };

  page.drawRectangle({ x: 0, y: 812, width: 595.28, height: 30, color: laranja });
  y = 822; t("TUDO CASA - WARM, LDA  ·  Loja online lojatudocasa.com", 40, 10, fb, rgb(1, 1, 1));
  y = 780; t("FOLHA DE ENCOMENDA", 40, 18, fb);
  t(`Encomenda #${e.numero}`, 380, 14, fb, laranja);
  y -= 18; t(`Data: ${e.data}    ·    Pagamento confirmado: ${e.pagamento}`, 40, 10, f, cinza);
  y -= 22; linha();

  const bloco = (titulo: string, linhas: string[], x: number, y0: number) => {
    let yy = y0; page.drawText(pdfTxt(titulo), { x, y: yy, size: 9, font: fb, color: cinza }); yy -= 14;
    for (const l of linhas.filter(Boolean)) for (const p of partir(l, 240, 10)) { page.drawText(p, { x, y: yy, size: 10, font: f, color: preto }); yy -= 13; }
    return yy;
  };
  y -= 18;
  const y1 = bloco("CLIENTE", [e.cliente, e.nif ? `NIF ${e.nif}` : "", e.telefone, e.email], 40, y);
  const y2 = bloco("FATURAÇÃO", [e.faturacao], 300, y);
  y = Math.min(y1, y2) - 8;
  const y3 = bloco("ENVIO", [e.envio, ehLevantamento(e.envio) ? "" : e.envioMorada], 40, y);
  y = y3 - 8; linha(); y -= 18;

  t("REFERÊNCIA", 40, 9, fb, cinza); t("ARTIGO", 120, 9, fb, cinza); t("QTD", 390, 9, fb, cinza); t("TOTAL", 425, 9, fb, cinza); t("FORNECEDOR", 480, 9, fb, cinza);
  y -= 6; linha(); y -= 14;
  for (const it of e.itens) {
    const partes = partir(it.nome, 255, 9);
    t(it.sku || "-", 40, 9);
    t(String(it.qtd), 395, 9); t(euro(it.total), 425, 9); t(it.fornecedor.replace(" (E3)", ""), 480, 9);
    for (const p of partes) { t(p, 120, 9); y -= 12; }
    t("Sem stock em loja — encomendar ao fornecedor", 120, 8, f, laranja); y -= 16;
    if (y < 140) break;
  }
  linha(); y -= 18;
  t("TOTAL (IVA incluído)", 300, 11, fb); t(euro(e.total), 470, 11, fb);
  y -= 34;
  t("Pasta no servidor:", 40, 8, fb, cinza); y -= 11;
  t(`DEP. PRODUÇÃO_VENDAS\\${e.pasta}`.slice(0, 110), 40, 8, f, cinza);
  y = 40; t("Gerado automaticamente pelo Clariza a partir da encomenda paga na loja online.", 40, 8, f, cinza);
  return await doc.save();
}

// ── E-mail de aviso (mesmo molde dos avisos dos quadros) ────────────────────
const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function emailNovaEncomenda(o: { quadroNome: string; titulo: string; url: string; corpo: string }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <tr><td style="background:#ff6b00;padding:24px 32px"><p style="margin:0;color:#fff;font-size:18px;font-weight:700">&#128230; Nova encomenda paga</p></td></tr>
  <tr><td style="padding:28px 32px">
    <p style="margin:0 0 4px;color:#71717a;font-size:13px">Quadro</p>
    <p style="margin:0 0 16px;font-weight:600;font-size:15px">${esc(o.quadroNome)}</p>
    <p style="margin:0 0 4px;color:#71717a;font-size:13px">Cartão</p>
    <p style="margin:0 0 20px;font-weight:600;font-size:15px"><a href="${o.url}" style="color:#ff6b00;text-decoration:none">${esc(o.titulo)} &rarr;</a></p>
    <div style="border-left:4px solid #ff6b00;background:#fff4ec;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px;color:#1f2937;font-size:14px;line-height:1.6">${o.corpo}</div>
    <p style="margin:0 0 20px"><a href="${o.url}" style="display:inline-block;background:#ff6b00;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px">Abrir cartão no Clariza</a></p>
    <p style="margin:0;color:#71717a;font-size:12px">Esta é uma notificação automática do Clariza Manager.</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ── Criação do cartão a partir da encomenda paga ────────────────────────────
export async function registarEncomenda(sb: SupabaseClient, empresaId: string, order: any) {
  const { data: existente } = await sb.from("ecommerce_encomendas").select("id, cartao_id")
    .eq("empresa_id", empresaId).eq("wc_order_id", order.id).maybeSingle();
  if (existente?.cartao_id) return { estado: "ja-existia", id: existente.id };

  const { data: cfg } = await sb.from("ecommerce_config").select("*").eq("empresa_id", empresaId).maybeSingle();
  if (!cfg?.lista_entrada_id) throw new Error("ecommerce_config sem lista de entrada");
  const { data: quadro } = await sb.from("quadros").select("nome").eq("id", cfg.quadro_id).maybeSingle();

  const b = order.billing || {}, s = order.shipping || {};
  const numero = String(order.number || order.id);
  const total = Number(order.total) || 0;
  const nome = nomeCurto(b.first_name, b.last_name);
  const dataLocal = order.date_created || new Date().toISOString();
  const { d, m, a } = partesData(dataLocal);
  const pasta = pastaRelativa(numero, nome, total, dataLocal);
  const titulo = pasta.split("\\").pop()!;
  const itens = itensDe(order);
  const envio = (order.shipping_lines || []).map((x: any) => x.method_title).join(", ") || "Sem envio";
  const pagamento = order.payment_method_title || order.payment_method || "";
  const nif = nifDe(order);
  const clienteCompleto = `${b.first_name || ""} ${b.last_name || ""}`.trim();
  const faturacao = moradaTxt(b), envioMorada = moradaTxt(s.address_1 ? s : b);

  const descricao = [
    `Encomenda #${numero} da loja online — paga (${pagamento}).`,
    `Na loja: https://www.lojatudocasa.com/wp-admin/post.php?post=${order.id}&action=edit`,
    "",
    "CLIENTE",
    clienteCompleto, nif ? `NIF ${nif}` : "", b.phone || "", b.email || "",
    `Faturação: ${faturacao}`,
    "",
    "ENVIO",
    envio, ehLevantamento(envio) ? "" : `Morada: ${envioMorada}`,
    order.customer_note ? `Nota do cliente: ${order.customer_note}` : "",
    "",
    "ARTIGOS (sem stock em loja — encomendar ao fornecedor)",
    ...itens.map((i) => `- ${i.sku} · ${i.nome} × ${i.qtd} — ${euro(i.total)} — ${i.fornecedor}`),
    "",
    `TOTAL: ${euro(total)} (IVA incluído)`,
    "",
    `PASTA NO SERVIDOR: \\\\APPS01\\Documentos$\\WARM\\E-COMMERCE\\DEP. PRODUÇÃO_VENDAS\\${pasta}`,
  ].filter((x, i, arr) => x !== "" || arr[i - 1] !== "").join("\n");

  const { data: maxPos } = await sb.from("quadro_cartoes").select("posicao").eq("lista_id", cfg.lista_entrada_id)
    .order("posicao", { ascending: false }).limit(1).maybeSingle();
  const { data: cartao, error: eCard } = await sb.from("quadro_cartoes").insert({
    lista_id: cfg.lista_entrada_id, empresa_id: empresaId, titulo, descricao,
    posicao: (maxPos?.posicao ?? -1) + 1, criado_por: cfg.criado_por,
  }).select("id").single();
  if (eCard) throw eCard;

  // Membros
  const resp: { id: string; nome: string }[] = cfg.responsaveis || [];
  if (resp.length) await sb.from("cartao_membros").insert(resp.map((r) => ({ cartao_id: cartao.id, utilizador_id: r.id, nome: r.nome })));

  // Checklists: uma por fornecedor + documentos + envio
  const porForn = new Map<string, Item[]>();
  for (const i of itens) porForn.set(i.fornecedor, [...(porForn.get(i.fornecedor) || []), i]);
  const listas: { titulo: string; itens: { texto: string; concluido: boolean }[] }[] = [];
  for (const [forn, its] of porForn) listas.push({
    titulo: `Encomendar a ${forn}`,
    itens: [
      ...its.map((i) => ({ texto: `${i.sku} · ${i.nome} × ${i.qtd} — sem stock em loja`, concluido: false })),
      { texto: `Encomenda feita a ${forn}`, concluido: false },
      { texto: `Pago a ${forn}`, concluido: false },
      { texto: "Mercadoria recebida na loja", concluido: false },
    ],
  });
  listas.push({ titulo: "Documentos", itens: [
    { texto: "Folha de encomenda (anexada)", concluido: true },
    { texto: "Pasta criada no servidor", concluido: false },
    { texto: "Comprovativo de pagamento", concluido: false },
    { texto: "Fatura-recibo emitida no PHC", concluido: false },
  ]});
  listas.push({ titulo: ehLevantamento(envio) ? "Levantamento na loja" : "Envio", itens: ehLevantamento(envio)
    ? [{ texto: "Cliente avisado de que pode levantar", concluido: false }, { texto: "Levantado pelo cliente", concluido: false }]
    : [{ texto: "Embalado", concluido: false }, { texto: "Etiqueta gerada (Packlink)", concluido: false },
       { texto: "Enviado e encomenda marcada como Concluída na loja (envia o seguimento ao cliente)", concluido: false }] });
  for (let p = 0; p < listas.length; p++) {
    const { data: cl } = await sb.from("cartao_checklists").insert({ cartao_id: cartao.id, titulo: listas[p].titulo, posicao: p }).select("id").single();
    if (cl) await sb.from("cartao_checklist_items").insert(listas[p].itens.map((it, k) => ({ checklist_id: cl.id, texto: it.texto, concluido: it.concluido, posicao: k })));
  }

  // Folha de encomenda (PDF) no cartão
  const pdf = await folhaPdf({
    numero, data: `${d}/${m}/${a}`, cliente: clienteCompleto, email: b.email || "", telefone: b.phone || "", nif,
    faturacao, envioMorada, envio, pagamento, total, itens, pasta,
  });
  const nomePdf = `Folha de encomenda #${numero}.pdf`;
  const path = `${empresaId}/${cartao.id}/${crypto.randomUUID()}-folha-encomenda-${numero}.pdf`;
  const { error: eUp } = await sb.storage.from(BUCKET).upload(path, pdf, { contentType: "application/pdf" });
  if (!eUp) await sb.from("cartao_anexos").insert({ cartao_id: cartao.id, nome: nomePdf, path, tipo: "application/pdf" });

  // Registo
  const linhaEnc = {
    empresa_id: empresaId, wc_order_id: order.id, numero, estado_wc: order.status,
    data_encomenda: order.date_created_gmt ? order.date_created_gmt + "Z" : null,
    pago_em: order.date_paid_gmt ? order.date_paid_gmt + "Z" : new Date().toISOString(),
    cliente_nome: clienteCompleto, cliente_email: b.email || null, cliente_telefone: b.phone || null, cliente_nif: nif || null,
    morada_faturacao: b, morada_envio: s, envio, pagamento, total, itens,
    cartao_id: cartao.id, pasta_relativa: pasta, folha_path: eUp ? null : path,
  };
  const { data: enc, error: eEnc } = existente
    ? await sb.from("ecommerce_encomendas").update(linhaEnc).eq("id", existente.id).select("id").single()
    : await sb.from("ecommerce_encomendas").insert(linhaEnc).select("id").single();
  if (eEnc) throw eEnc;

  // Aviso por e-mail aos responsáveis
  if (resp.length) {
    const { data: us } = await sb.from("liberty_utilizadores").select("id, email").in("id", resp.map((r) => r.id));
    const url = `${APP_URL}/quadros/${cfg.quadro_id}?cartao=${cartao.id}`;
    const corpo = `<strong>${esc(clienteCompleto)}</strong> · ${esc(euro(total))} · ${esc(pagamento)}<br>`
      + itens.map((i) => `${esc(i.sku)} · ${esc(i.nome)} × ${i.qtd} — <span style="color:#ff6b00">${esc(i.fornecedor)}</span>`).join("<br>")
      + `<br><br>${esc(envio)}`;
    for (const u of us || []) {
      if (!u.email) continue;
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({
          to: u.email, subject: `[Encomendas da loja] ${titulo}`,
          html: emailNovaEncomenda({ quadroNome: quadro?.nome || "Encomendas da loja", titulo, url, corpo }),
          empresa_id: empresaId, tipo: "comercial",
        }),
      }).catch((e) => console.error("[encomendas] e-mail falhou", e));
    }
  }
  return { estado: "criado", id: enc.id, cartao_id: cartao.id };
}

// Marca como concluído o item de checklist do cartão cujo texto começa por `prefixo`
export async function concluirItem(sb: SupabaseClient, cartaoId: string, prefixo: string) {
  const { data: cls } = await sb.from("cartao_checklists").select("id").eq("cartao_id", cartaoId);
  if (!cls?.length) return;
  const { data: its } = await sb.from("cartao_checklist_items").select("id, texto, concluido").in("checklist_id", cls.map((c) => c.id));
  const alvo = (its || []).find((i) => !i.concluido && i.texto.startsWith(prefixo));
  if (alvo) await sb.from("cartao_checklist_items").update({ concluido: true }).eq("id", alvo.id);
}
