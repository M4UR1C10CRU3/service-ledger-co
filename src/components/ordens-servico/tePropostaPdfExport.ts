import type { TrabalhoExtra } from '@/types/trabalhoExtra';
import { getEmpresaDocConfig } from '@/lib/empresaConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TePdfData {
  osNumero: string;
  clienteNome: string;
  clienteMorada?: string;
  clienteNif?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  responsavelNome?: string;
  dataEmissao: string;            // ISO date
  items: TrabalhoExtra[];
  observacoes?: string;
  condicoesPagamento?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtEur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const fmtQty = (v: number) => v.toFixed(3).replace('.', ',');

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso)
      .toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .replace(/\//g, '.');
  } catch { return iso; }
};

// ── Main export ───────────────────────────────────────────────────────────────

export function exportTePropostaPdf(data: TePdfData, empresa: any, logoDataUrl?: string) {
  const primaryColor = empresa?.corPrimaria || '#E8630A';
  const cfg = getEmpresaDocConfig(empresa?.slug);

  // Filename
  const sanitize = (s: string) =>
    (s || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  const osClean = sanitize(data.osNumero).replace(/\//g, '-');
  const cliClean = sanitize(data.clienteNome) || 'Cliente';
  const filename = `TE_${osClean}_${cliClean}`;

  // Totals
  const subtotal = data.items.reduce((s, it) => s + (it.total ?? it.precoUnit * it.quantidade), 0);
  const iva = subtotal * 0.23;
  const totalComIva = subtotal + iva;

  // Table rows
  let linhasHtml = '';
  if (data.items.length === 0) {
    linhasHtml = `<tr><td colspan="6" style="padding:14px 8px;text-align:center;font-size:11px;color:#999;font-style:italic">
      Nenhum trabalho a mais registado
    </td></tr>`;
  } else {
    data.items.forEach((it, i) => {
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
      const total = it.total ?? (it.precoUnit * it.quantidade);
      linhasHtml += `<tr style="background:${bg}">
        <td style="padding:4px 8px;font-size:11px"></td>
        <td style="padding:4px 8px;font-size:11px">${it.descricao}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${fmtQty(it.quantidade)}</td>
        <td style="padding:4px 8px;text-align:center;font-size:11px">un</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${fmtEur(it.precoUnit)}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${it.precoUnit > 0 ? '' : ''}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px;font-weight:600">${fmtEur(total)}</td>
      </tr>`;
      if (it.observacoes) {
        linhasHtml += `<tr style="background:${bg}">
          <td colspan="7" style="padding:2px 8px 5px 24px;font-size:10px;color:#888;font-style:italic">${it.observacoes}</td>
        </tr>`;
      }
    });
  }

  const condicoesPag = data.condicoesPagamento ||
    '60% no ato de adjudicação  |  35% na fase intermédia  |  5% na conclusão e entrega da obra';

  const emails = cfg.emailsRodape.split('|').map((e: string) => e.trim()).filter(Boolean);

  const th = `background:${primaryColor};color:white;padding:6px 8px;font-size:11px;font-weight:bold;border:none`;

  // Now emitted timestamp in PT format
  const emissaoFormatted = fmtDate(data.dataEmissao);
  const hora = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  const html = `<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8" />
  <title>${filename}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1A1A1A; margin: 0; padding: 20px; }
    table.linhas { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    table.linhas td { border-bottom: 1px solid #F0F0F0; vertical-align: top; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>

  <!-- HEADER: Logo + Doc reference -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
    <div>
      ${logoDataUrl
        ? `<img src="${logoDataUrl}" alt="${cfg.nomeDocumento}" style="max-height:65px;display:block;margin-bottom:4px" />`
        : `<strong style="font-size:16px;color:${primaryColor};display:block;margin-bottom:4px">${cfg.nomeDocumento}</strong>`}
    </div>
    <div style="text-align:right">
      <div style="font-size:9px;color:#888">Não entra para SAF-T</div>
      <div style="font-size:11px">Proposta de Trabalhos a Mais &nbsp;—&nbsp; OS: <strong style="font-size:13px">${data.osNumero}</strong></div>
      <div style="font-size:11px;margin-top:2px">ORIGINAL</div>
    </div>
  </div>

  <!-- Company + Client info -->
  <div style="display:flex;justify-content:space-between;margin-bottom:10px">
    <div style="font-size:11px;line-height:1.7">
      <strong style="font-size:13px">${cfg.nomeDocumento}</strong><br/>
      ${cfg.morada.toUpperCase()}<br/>
      ${cfg.codigoPostal}&nbsp;&nbsp;${cfg.localidade.toUpperCase()}<br/>
      Contribuinte Nº: ${cfg.contribuinte}<br/>
      Conserv. Registo Comercial:<br/>
      Capital Social:
    </div>
    <div style="text-align:right;font-size:12px;line-height:1.6">
      <strong style="font-size:13px">${data.clienteNome}</strong><br/>
      ${data.clienteMorada ? data.clienteMorada + '<br/>' : ''}
      ${data.clienteNif ? 'NIF: ' + data.clienteNif + '<br/>' : ''}
      ${data.clienteTelefone ? 'Tel: ' + data.clienteTelefone + '<br/>' : ''}
      ${data.clienteEmail ? data.clienteEmail : ''}
    </div>
  </div>

  <!-- Section heading -->
  <p style="font-weight:bold;font-style:italic;margin:8px 0 4px;font-size:12px">Trabalhos a executar (adicionais):</p>

  <!-- Colored bar -->
  <div style="background:${primaryColor};color:white;padding:6px 12px;display:flex;justify-content:space-between;align-items:flex-start;font-size:10px">
    <div>
      <strong>Data de emissão :</strong>&nbsp;${emissaoFormatted}<br/>
      Hora de emissão :&nbsp;${hora}
    </div>
    <span><strong>Responsável:</strong>&nbsp;${data.responsavelNome || '—'}</span>
    <span><strong>V/Nº Contribuinte:</strong>&nbsp;${data.clienteNif || '—'}</span>
  </div>

  <!-- System note -->
  <div style="font-size:9px;font-style:italic;color:#888;padding:3px 0 5px;border-bottom:1px solid #E0E0E0;margin-bottom:6px">
    Clariza Manager — Sistema de Gestão Empresarial — Este documento não serve de fatura
  </div>

  <!-- Contextual note -->
  <div style="background:#FFF8EC;border-left:4px solid ${primaryColor};padding:8px 12px;font-size:10px;color:#555;line-height:1.6;margin-bottom:10px">
    <strong style="color:${primaryColor}">Trabalhos a mais não incluídos na proposta original</strong><br/>
    Os trabalhos listados abaixo surgiram no decorrer da execução da obra e não estavam contemplados no contrato inicial.
    A sua realização requer aprovação formal do cliente antes de serem executados ou faturados.
  </div>

  <!-- Items table -->
  <table class="linhas">
    <thead>
      <tr>
        <th style="${th};text-align:left;width:10%">Referência</th>
        <th style="${th};text-align:left">Designação</th>
        <th style="${th};text-align:right;width:9%">Quantidade</th>
        <th style="${th};text-align:center;width:6%">Uni.</th>
        <th style="${th};text-align:right;width:12%">Preço Unitário</th>
        <th style="${th};text-align:right;width:9%">Descontos</th>
        <th style="${th};text-align:right;width:10%">Total</th>
      </tr>
    </thead>
    <tbody>${linhasHtml}</tbody>
  </table>

  <!-- Footer: Conditions + Totals -->
  <div style="display:flex;gap:14px;margin-top:10px;align-items:flex-start">

    <div style="flex:1;background:#F5F5F5;border:1px solid #E0E0E0;padding:8px 12px;font-size:10px;line-height:1.7">
      <p style="margin:2px 0"><strong>Como condições gerais teremos:</strong></p>
      <p style="margin:2px 0">O valor acima indicado é acrescido de IVA à taxa legal em vigor.</p>
      <p style="margin:4px 0 2px"><strong>Validade da proposta:</strong><br/>Proposta tem validade de 30 dias, sujeita a rectificação após esse prazo.</p>
      <p style="margin:2px 0"><strong>Condições de pagamento:</strong><br/>${condicoesPag}</p>
      <p style="margin:2px 0"><strong>Observações</strong>${data.observacoes ? '<br/>' + data.observacoes.replace(/\n/g, '<br/>') : ''}</p>
    </div>

    <div style="width:230px;font-size:11px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:3px 6px;font-size:10px;color:#666">Valor do IVA</td>
          <td style="padding:3px 6px;font-size:10px;color:#666;text-align:right">Total com IVA</td>
        </tr>
        <tr>
          <td style="padding:3px 6px;font-weight:600">${fmtEur(iva)}</td>
          <td style="padding:3px 6px;font-weight:600;text-align:right">${fmtEur(totalComIva)}</td>
        </tr>
        <tr>
          <td colspan="2" style="border-top:1px solid #CCC;padding:0"></td>
        </tr>
        <tr>
          <td style="padding:5px 6px;font-weight:bold;font-size:12px">TOTAL sem IVA:</td>
          <td style="padding:5px 6px;font-weight:bold;font-size:12px;text-align:right">${fmtEur(subtotal)}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Signatures — PHC 3-column layout -->
  <div style="margin-top:22px;display:flex;justify-content:space-between;align-items:flex-end">
    <div style="font-size:10px">
      Cliente (aprovação):<br/>
      <div style="border-top:1px solid #333;margin-top:22px;padding-top:4px;width:190px">&nbsp;</div>
      Assinatura e NIF.
    </div>
    <div style="font-size:10px;text-align:center">
      Assinatura e carimbo.<br/>
      <div style="border-top:1px solid #333;margin-top:22px;padding-top:4px;width:190px;display:inline-block">&nbsp;</div>
    </div>
    <div style="font-size:10px;text-align:right;line-height:1.8">
      ${emails.map((e: string) => `<div>${e}</div>`).join('')}
    </div>
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
