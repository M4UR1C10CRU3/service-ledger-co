import type { TrabalhoExtra } from '@/types/trabalhoExtra';
import { getEmpresaDocConfig } from '@/lib/empresaConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TePdfData {
  osNumero: string;               // e.g. "OS 2025/001"
  clienteNome: string;
  clienteMorada?: string;
  clienteNif?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  responsavelNome?: string;
  dataEmissao: string;            // ISO date
  items: TrabalhoExtra[];         // the extra work items
  observacoes?: string;
  condicoesPagamento?: string;    // e.g. "60% adjudicação / 35% intermédio / 5% conclusão"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso)
      .toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .replace(/\//g, '.');
  } catch { return iso; }
};

const fmtEUR = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const fmtQty = (v: number) => v.toFixed(2).replace('.', ',');

function buildTeFilename(data: TePdfData): string {
  const sanitize = (s: string) =>
    (s || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  const os = sanitize(data.osNumero).replace(/\//g, '-');
  const cliente = sanitize(data.clienteNome) || 'Cliente';
  return `TE_${os}_${cliente}`;
}

// ── Main export function ──────────────────────────────────────────────────────

export function exportTePropostaPdf(data: TePdfData, empresa: any, logoDataUrl?: string) {
  const primaryColor = empresa?.corPrimaria || '#1E939C';
  const cfg = getEmpresaDocConfig(empresa?.slug);

  // ── Totals ─────────────────────────────────────────────────────────────
  const subtotal = data.items.reduce((s, it) => s + (it.total ?? it.precoUnit * it.quantidade), 0);
  const iva = subtotal * 0.23;
  const totalComIVA = subtotal + iva;

  // ── Items HTML ──────────────────────────────────────────────────────────
  let itemsHtml = '';
  data.items.forEach((it, i) => {
    const bg = i % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
    const total = it.total ?? (it.precoUnit * it.quantidade);
    itemsHtml += `<tr style="background:${bg}">
      <td style="padding:6px 10px;font-size:11px;text-align:left;font-weight:500">${it.descricao}</td>
      <td style="padding:6px 10px;font-size:11px;text-align:right">${fmtQty(it.quantidade)}</td>
      <td style="padding:6px 10px;font-size:11px;text-align:right">${fmtEUR(it.precoUnit)}</td>
      <td style="padding:6px 10px;font-size:11px;text-align:right;font-weight:600">${fmtEUR(total)}</td>
      <td style="padding:6px 10px;font-size:10px;color:#888;font-style:italic">${it.observacoes || ''}</td>
    </tr>`;
  });

  if (data.items.length === 0) {
    itemsHtml = `<tr><td colspan="5" style="padding:14px 10px;text-align:center;font-size:11px;color:#999;font-style:italic">
      Nenhum trabalho a mais registado
    </td></tr>`;
  }

  // ── Condições de pagamento (default: 60/35/5) ───────────────────────────
  const condicoesPag = data.condicoesPagamento ||
    '60% no ato de adjudicação  |  35% na fase intermédia  |  5% na conclusão e entrega da obra';

  const filename = buildTeFilename(data);

  const thStyle = `background:${primaryColor};color:white;padding:7px 10px;font-size:11px;font-weight:bold;border:none`;

  const html = `<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8" />
  <title>${filename}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #1A1A1A;
      margin: 0;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
      gap: 24px;
    }
    .header-left { flex: 1; }
    .header-right { text-align: right; flex: 1; }
    .empresa-info { font-size: 10px; line-height: 1.7; color: #1A1A1A; }
    .doc-type {
      font-weight: bold;
      font-size: 17px;
      color: ${primaryColor};
      letter-spacing: -0.3px;
      margin-bottom: 3px;
    }
    .doc-sub {
      font-size: 12px;
      color: #555;
      margin-bottom: 6px;
    }
    .doc-original { font-size: 10px; color: #888; font-style: italic; margin-bottom: 10px; }
    .destinatario {
      border: 1px solid #DDD;
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 11px;
      line-height: 1.7;
      background: #FAFAFA;
      display: inline-block;
      text-align: left;
      min-width: 200px;
    }
    .destinatario .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      margin-bottom: 3px;
      font-weight: bold;
    }
    .destinatario .nome { font-weight: bold; font-size: 12px; color: #1A1A1A; }
    .barra-cor {
      background: ${primaryColor};
      color: white;
      padding: 7px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      margin: 12px 0;
      border-radius: 2px;
    }
    .aviso-box {
      background: #FFF8EC;
      border-left: 4px solid ${primaryColor};
      padding: 10px 14px;
      font-size: 11px;
      color: #555;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .aviso-box strong { color: ${primaryColor}; }
    table.linhas {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    table.linhas td {
      border-bottom: 1px solid #EFEFEF;
      vertical-align: middle;
    }
    .totais-outer {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 18px;
    }
    .totais-box {
      width: 300px;
      border: 1px solid #E0E0E0;
      border-radius: 4px;
      overflow: hidden;
    }
    .totais-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 12px;
      font-size: 11px;
    }
    .totais-row:nth-child(odd) { background: #F9F9F9; }
    .totais-row.grand {
      background: ${primaryColor};
      color: white;
      font-weight: bold;
      font-size: 13px;
      padding: 8px 12px;
    }
    .condicoes-pag {
      font-size: 10px;
      color: #444;
      padding: 8px 12px;
      background: #F4F4F4;
      border-radius: 4px;
      line-height: 1.7;
      margin-bottom: 10px;
    }
    .condicoes-pag strong { color: ${primaryColor}; }
    .rodape-obs {
      font-size: 10px;
      line-height: 1.7;
      margin-bottom: 16px;
    }
    .rodape-obs p { margin: 3px 0; }
    .assinaturas {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      gap: 28px;
    }
    .assinaturas div {
      border-top: 1px solid #333;
      padding-top: 8px;
      flex: 1;
      text-align: center;
      font-size: 10px;
      line-height: 1.8;
    }
    .nota-legal {
      text-align: center;
      font-size: 9px;
      font-style: italic;
      color: ${primaryColor};
      margin-top: 12px;
    }
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9.5px;
      color: #1A1A1A;
      line-height: 1.7;
      padding: 8px 15mm;
      background: #F0FAFB;
      border-top: 3px solid ${primaryColor};
    }
    .page-footer .legal {
      font-style: italic;
      color: ${primaryColor};
      font-weight: 600;
      font-size: 10px;
      margin-bottom: 3px;
    }
    .page-footer .accent { color: ${primaryColor}; font-weight: 600; }
    @media print {
      body { padding: 0; padding-bottom: 90px; }
      .page-footer { position: fixed; bottom: 0; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      ${logoDataUrl
        ? `<img src="${logoDataUrl}" alt="${cfg.nomeDocumento}" style="max-height:75px;margin-bottom:10px;display:block" />`
        : `<strong style="font-size:17px;color:${primaryColor};display:block;margin-bottom:8px">${cfg.nomeDocumento}</strong>`}
      <div class="empresa-info">
        <strong>${cfg.nomeDocumento}</strong><br/>
        ${cfg.morada}<br/>
        ${cfg.codigoPostal} ${cfg.localidade}<br/>
        NIF: ${cfg.contribuinte}<br/>
        ${cfg.telefones}
      </div>
    </div>
    <div class="header-right">
      <div class="doc-type">Proposta de Trabalhos a Mais</div>
      <div class="doc-sub">Ref. Ordem de Serviço: <strong>${data.osNumero}</strong></div>
      <div class="doc-original">ORIGINAL</div>
      <div class="destinatario">
        <div class="label">Cliente / Destinatário</div>
        <div class="nome">${data.clienteNome}</div>
        ${data.clienteMorada ? `<div>${data.clienteMorada}</div>` : ''}
        ${data.clienteNif ? `<div>NIF: ${data.clienteNif}</div>` : ''}
        ${data.clienteTelefone ? `<div>Tel: ${data.clienteTelefone}</div>` : ''}
        ${data.clienteEmail ? `<div>${data.clienteEmail}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- BARRA -->
  <div class="barra-cor">
    <span>Data de Emissão: <strong>${fmtDate(data.dataEmissao)}</strong></span>
    <span>OS de Referência: <strong>${data.osNumero}</strong></span>
    <span>Responsável: <strong>${data.responsavelNome || '—'}</strong></span>
  </div>

  <!-- AVISO CONTEXTUAL -->
  <div class="aviso-box">
    <strong>Trabalhos a mais não incluídos na proposta original</strong><br/>
    Os trabalhos listados abaixo surgiram no decorrer da execução da obra e não estavam contemplados no contrato inicial.
    A sua realização requer aprovação formal do cliente antes de serem executados ou faturados.
  </div>

  <!-- TABELA DE EXTRAS -->
  <table class="linhas">
    <thead>
      <tr>
        <th style="${thStyle};text-align:left;width:45%">Descrição do Trabalho</th>
        <th style="${thStyle};text-align:right;width:10%">Qtd.</th>
        <th style="${thStyle};text-align:right;width:15%">Preço Unit.</th>
        <th style="${thStyle};text-align:right;width:15%">Total</th>
        <th style="${thStyle};text-align:left;width:15%">Obs.</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <!-- TOTAIS -->
  <div class="totais-outer">
    <div class="totais-box">
      <div class="totais-row">
        <span>Subtotal (s/ IVA)</span>
        <span>${fmtEUR(subtotal)}</span>
      </div>
      <div class="totais-row">
        <span>IVA (23%)</span>
        <span>${fmtEUR(iva)}</span>
      </div>
      <div class="totais-row grand">
        <span>Total com IVA</span>
        <span>${fmtEUR(totalComIVA)}</span>
      </div>
    </div>
  </div>

  <!-- CONDIÇÕES DE PAGAMENTO -->
  <div class="condicoes-pag">
    <strong>Condições de Pagamento:</strong><br/>
    ${condicoesPag}
  </div>

  <!-- OBSERVAÇÕES -->
  ${data.observacoes ? `<div class="rodape-obs"><p><strong>Observações:</strong><br/>${data.observacoes.replace(/\n/g, '<br/>')}</p></div>` : ''}

  <!-- ASSINATURAS -->
  <div class="assinaturas">
    <div>
      Cliente (aprovação):<br/>&nbsp;<br/>
      Data: _____ / _____ / _________<br/>
      Assinatura e NIF
    </div>
    <div>
      ${cfg.nomeDocumento}<br/>&nbsp;<br/>
      Data: _____ / _____ / _________<br/>
      Assinatura e carimbo
    </div>
  </div>

  <div class="nota-legal">
    Documento sujeito a aprovação pelo cliente. Não tem validade fiscal sem carimbo e assinatura de ambas as partes.
    Emitido electronicamente pelo sistema Clariza.
  </div>

  <!-- RODAPÉ PÁGINA -->
  <div class="page-footer">
    <div class="legal">Este documento é uma Proposta de Trabalhos a Mais — não substitui fatura comercial.</div>
    <div><span class="accent">${cfg.emailsRodape.split('|').map((e: string) => e.trim()).filter(Boolean).join('</span>&nbsp;|&nbsp;<span class="accent">')}</span></div>
    <div>${cfg.telefones}</div>
    <div><span class="accent">Sede:</span> ${cfg.morada}, ${cfg.codigoPostal} ${cfg.localidade} &nbsp;|&nbsp; NIF: ${cfg.contribuinte}</div>
  </div>

  <script>
    document.title = ${JSON.stringify(filename)};
    window.addEventListener('load', function () {
      document.title = ${JSON.stringify(filename)};
      setTimeout(function () {
        document.title = ${JSON.stringify(filename)};
        window.print();
      }, 300);
    });
    window.addEventListener('afterprint', function () {
      document.title = ${JSON.stringify(filename)};
    });
  </script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
    try { w.document.title = filename; } catch (_) {}
  }
}
