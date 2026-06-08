import type { PropostaLinhaForm } from '@/types/proposta';
import { getEmpresaDocConfig } from '@/lib/empresaConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PdfData {
  numeroProposta: string;
  clienteNome: string;
  clienteMorada: string;
  clienteNif: string;
  vendedorNome: string;
  dataEmissao: string;
  horaEmissao: string;
  titulo: string;
  descricaoGeral: string;
  linhas: PropostaLinhaForm[];
  taxaIva: number;
  totalSemIva: number;
  valorIva: number;
  totalComIva: number;
  condicoesGerais: string;
  validadeTexto: string;
  duracao: string;
  condicoesPagamento: string;
  observacoes: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtEur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const fmtQty = (v: number) => v.toFixed(3).replace('.', ',');

function getSubtotal(linhas: PropostaLinhaForm[], idx: number): number {
  let sum = 0;
  for (let i = idx - 1; i >= 0; i--) {
    if (linhas[i].tipoLinha === 'seccao' || linhas[i].tipoLinha === 'subtotal') break;
    if (linhas[i].tipoLinha === 'artigo') sum += linhas[i].totalLinha;
  }
  return sum;
}

// ── Mode ──────────────────────────────────────────────────────────────────────

export type PropostaPdfMode = 'unitarios' | 'subtotais' | 'global';

const MODE_SUFFIX: Record<PropostaPdfMode, string> = {
  unitarios: 'Preços Unitários',
  subtotais: 'Subtotais',
  global:    'Valor Global',
};

// ── Main export ───────────────────────────────────────────────────────────────

export function exportPropostaPdf(
  data: PdfData,
  empresa: any,
  logoDataUrl?: string,
  mode: PropostaPdfMode = 'unitarios',
) {
  const primaryColor = empresa?.corPrimaria || '#E8630A';
  const cfg = getEmpresaDocConfig(empresa?.slug);

  // Filename — company-agnostic
  const numClean = (data.numeroProposta || '')
    .replace(/[\\:*?"<>|]/g, '').replace(/\//g, '-').trim();
  const filename = `Proposta ${cfg.prefixoProposta} ${numClean}_${MODE_SUFFIX[mode]}`;

  // Date
  const dataFormatted = data.dataEmissao
    ? new Date(data.dataEmissao)
        .toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
        .replace(/\//g, '.')
    : '';

  const hideLineValues = mode === 'subtotais' || mode === 'global';
  const hideSubtotals  = mode === 'global';

  // ── Table rows ──────────────────────────────────────────────────────────────
  let linhasHtml = '';
  data.linhas.forEach((l, i) => {
    if (l.tipoLinha === 'seccao') {
      linhasHtml += `<tr style="background:#F2F2F2">
        <td colspan="7" style="padding:6px 8px;font-weight:bold;color:${primaryColor};font-size:11px">${l.designacao || ''}</td>
      </tr>`;
    } else if (l.tipoLinha === 'subtotal') {
      if (hideSubtotals) return;
      const sub = getSubtotal(data.linhas, i);
      linhasHtml += `<tr style="background:#E0E0E0">
        <td colspan="6" style="padding:5px 8px;text-align:right;font-weight:bold;font-size:11px">SUBTOTAL</td>
        <td style="padding:5px 8px;text-align:right;font-weight:bold;font-size:11px">${fmtEur(sub)}</td>
      </tr>`;
    } else if (l.tipoLinha === 'texto') {
      linhasHtml += `<tr>
        <td colspan="7" style="padding:4px 8px;font-style:italic;color:#555;font-size:10px">${l.designacao || ''}</td>
      </tr>`;
    } else {
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
      const descPct = l.descontoPct > 0 ? l.descontoPct + '%' : '';
      linhasHtml += `<tr style="background:${bg}">
        <td style="padding:4px 8px;font-size:11px;color:#555">${l.referencia || ''}</td>
        <td style="padding:4px 8px;font-size:11px">${l.designacao || ''}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${fmtQty(l.quantidade)}</td>
        <td style="padding:4px 8px;text-align:center;font-size:11px">${l.unidade}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${hideLineValues ? '' : fmtEur(l.precoUnitario)}</td>
        <td style="padding:4px 8px;text-align:center;font-size:11px;color:#666">${hideLineValues ? '' : descPct}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px;font-weight:${hideLineValues ? 'normal' : '600'}">${hideLineValues ? '' : fmtEur(l.totalLinha)}</td>
      </tr>`;
    }
  });

  // ── Defaults (match PHC) ────────────────────────────────────────────────────
  const condicoesGerais    = data.condicoesGerais    || 'O valor acima indicado é acrescido de IVA à taxa legal em vigor.';
  const validadeTexto      = data.validadeTexto      || 'Proposta tem validade de 30 dias, sujeita a rectificação após esse prazo.';
  const condicoesPagamento = data.condicoesPagamento || 'Pagamento até 60 dias após a emissão de fatura.';

  // Emails for signature area
  const emails = cfg.emailsRodape.split('|').map((e: string) => e.trim()).filter(Boolean);

  const th = `background:${primaryColor};color:white;padding:6px 8px;font-size:11px;font-weight:bold;border:none`;

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
      <div style="font-size:11px">Pré-Proposta &nbsp;Nº &nbsp;&nbsp;<strong style="font-size:14px">${data.numeroProposta}</strong></div>
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
      ${data.clienteNif ? 'NIF: ' + data.clienteNif : ''}
    </div>
  </div>

  <!-- Section heading -->
  <p style="font-weight:bold;font-style:italic;margin:8px 0 4px;font-size:12px">Trabalhos a executar:</p>

  <!-- Colored bar -->
  <div style="background:${primaryColor};color:white;padding:6px 12px;display:flex;justify-content:space-between;align-items:flex-start;font-size:10px">
    <div>
      <strong>Data de emissão :</strong>&nbsp;${dataFormatted}<br/>
      Hora de emissão :&nbsp;${data.horaEmissao || ''}
    </div>
    <span><strong>Vendedor:</strong>&nbsp;${data.vendedorNome}</span>
    <span><strong>V/Nº Contribuinte:</strong>&nbsp;${data.clienteNif}</span>
  </div>

  <!-- System note (replaces PHC note) -->
  <div style="font-size:9px;font-style:italic;color:#888;padding:3px 0 5px;border-bottom:1px solid #E0E0E0;margin-bottom:6px">
    Clariza Manager — Sistema de Gestão Empresarial — Este documento não serve de fatura
  </div>

  ${data.descricaoGeral ? `<p style="font-size:11px;margin-bottom:8px">${data.descricaoGeral}</p>` : ''}

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

  <!-- Footer: Conditions (left) + Totals (right) — PHC layout -->
  <div style="display:flex;gap:14px;margin-top:10px;align-items:flex-start">

    <div style="flex:1;background:#F5F5F5;border:1px solid #E0E0E0;padding:8px 12px;font-size:10px;line-height:1.7">
      <p style="margin:2px 0"><strong>Como condições gerais teremos:</strong></p>
      <p style="margin:2px 0">${condicoesGerais}</p>
      <p style="margin:4px 0 2px"><strong>Validade da proposta:</strong><br/>${validadeTexto}</p>
      ${data.duracao
        ? `<p style="margin:2px 0"><strong>Duração</strong><br/>${data.duracao}</p>`
        : `<p style="margin:2px 0"><strong>Duração</strong></p>`}
      <p style="margin:2px 0"><strong>Condições de pagamento:</strong><br/>${condicoesPagamento}</p>
      <p style="margin:2px 0"><strong>Observações</strong>${data.observacoes ? '<br/>' + data.observacoes.replace(/\n/g, '<br/>') : ''}</p>
    </div>

    <div style="width:230px;font-size:11px">
      ${mode !== 'global' ? `
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:3px 6px;font-size:10px;color:#666">Valor do IVA</td>
          <td style="padding:3px 6px;font-size:10px;color:#666;text-align:right">Total com IVA</td>
        </tr>
        <tr>
          <td style="padding:3px 6px;font-weight:600">${fmtEur(data.valorIva)}</td>
          <td style="padding:3px 6px;font-weight:600;text-align:right">${fmtEur(data.totalComIva)}</td>
        </tr>
        <tr>
          <td colspan="2" style="border-top:1px solid #CCC;padding:0"></td>
        </tr>
        <tr>
          <td style="padding:5px 6px;font-weight:bold;font-size:12px">TOTAL sem IVA:</td>
          <td style="padding:5px 6px;font-weight:bold;font-size:12px;text-align:right">${fmtEur(data.totalSemIva)}</td>
        </tr>
      </table>` : `
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:5px 6px;font-weight:bold;font-size:13px">Total com IVA:</td>
          <td style="padding:5px 6px;font-weight:bold;font-size:13px;text-align:right">${fmtEur(data.totalComIva)}</td>
        </tr>
      </table>`}
    </div>
  </div>

  <!-- Signatures — PHC 3-column layout -->
  <div style="margin-top:22px;display:flex;justify-content:space-between;align-items:flex-end">
    <div style="font-size:10px">
      Cliente:<br/>
      <div style="border-top:1px solid #333;margin-top:22px;padding-top:4px;width:190px">&nbsp;</div>
      Assinatura se aceite.
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
