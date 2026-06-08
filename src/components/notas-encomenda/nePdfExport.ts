import type { NeItem } from '@/types/notaEncomenda';
import { getEmpresaDocConfig } from '@/lib/empresaConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NePdfData {
  numeroNe: string;
  titulo: string;
  descricao?: string;
  observacoes?: string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  fornecedorNome: string;
  fornecedorMorada?: string;
  fornecedorNif?: string;
  fornecedorTelefone?: string;
  fornecedorEmail?: string;
  responsavelNome?: string;
  dataCriacao: string;
  dataNecessidade?: string;
  propostaNumero?: string;
  osNumero?: string;
  items: NeItem[];
  valorEstimado?: number | null;
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

const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: '⚠ URGENTE',
};

// ── Main export ───────────────────────────────────────────────────────────────

export function exportNePdf(data: NePdfData, empresa: any, logoDataUrl?: string) {
  const primaryColor = empresa?.corPrimaria || '#E8630A';
  const cfg = getEmpresaDocConfig(empresa?.slug);

  // Filename
  const numClean = (data.numeroNe || '').replace(/[\\:*?"<>|]/g, '').replace(/\//g, '-').trim();
  const fornClean = (data.fornecedorNome || 'Fornecedor').replace(/[\\:*?"<>|]/g, '').trim();
  const filename = `NE_${numClean}_${fornClean}`;

  // Totals
  const hasUnitPrices = data.items.some(it => it.precoUnit != null && it.precoUnit > 0);
  const subtotal = data.items.reduce((s, it) =>
    s + (it.total ?? ((it.precoUnit ?? 0) * it.quantidade)), 0);
  const iva = subtotal * 0.23;
  const totalComIva = subtotal + iva;

  // ── Table rows ──────────────────────────────────────────────────────────────
  let linhasHtml = '';
  if (data.items.length === 0) {
    linhasHtml = `<tr><td colspan="7" style="padding:14px 8px;text-align:center;font-size:11px;color:#999;font-style:italic">
      Nenhum material especificado
    </td></tr>`;
  } else {
    data.items.forEach((it, i) => {
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
      const total = it.total ?? (it.precoUnit != null ? it.precoUnit * it.quantidade : null);
      linhasHtml += `<tr style="background:${bg}">
        <td style="padding:4px 8px;font-size:11px;color:#555">${it.referencia || ''}</td>
        <td style="padding:4px 8px;font-size:11px">${it.descricao}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${fmtQty(it.quantidade)}</td>
        <td style="padding:4px 8px;text-align:center;font-size:11px">${it.unidade}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${hasUnitPrices && it.precoUnit != null ? fmtEur(it.precoUnit) : ''}</td>
        <td style="padding:4px 8px;text-align:center;font-size:11px"></td>
        <td style="padding:4px 8px;text-align:right;font-size:11px;font-weight:600">${hasUnitPrices && total != null ? fmtEur(total) : ''}</td>
      </tr>`;
      if (it.observacoes) {
        linhasHtml += `<tr style="background:${bg}">
          <td colspan="7" style="padding:2px 8px 5px 24px;font-size:10px;color:#888;font-style:italic">${it.observacoes}</td>
        </tr>`;
      }
    });
  }

  // Refs
  const refs: string[] = [];
  if (data.propostaNumero) refs.push(`Proposta: <strong>${data.propostaNumero}</strong>`);
  if (data.osNumero) refs.push(`OS: <strong>${data.osNumero}</strong>`);
  const refsLine = refs.length
    ? `<div style="font-size:9px;color:#888;margin-top:3px">Ref. interna — ${refs.join(' &nbsp;|&nbsp; ')}</div>`
    : '';

  // Default conditions
  const condicoesPag = data.condicoesPagamento || 'Conforme acordo comercial em vigor.';
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
      <div style="font-size:11px">Nota de Encomenda &nbsp;Nº &nbsp;&nbsp;<strong style="font-size:14px">${data.numeroNe}</strong></div>
      <div style="font-size:11px;margin-top:2px">ORIGINAL</div>
      ${refsLine}
    </div>
  </div>

  <!-- Company + Supplier info -->
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
      <strong style="font-size:13px">${data.fornecedorNome}</strong><br/>
      ${data.fornecedorMorada ? data.fornecedorMorada + '<br/>' : ''}
      ${data.fornecedorNif ? 'NIF: ' + data.fornecedorNif + '<br/>' : ''}
      ${data.fornecedorTelefone ? 'Tel: ' + data.fornecedorTelefone + '<br/>' : ''}
      ${data.fornecedorEmail ? data.fornecedorEmail : ''}
    </div>
  </div>

  <!-- Section heading -->
  <p style="font-weight:bold;font-style:italic;margin:8px 0 4px;font-size:12px">Materiais a encomendar:</p>

  <!-- Colored bar -->
  <div style="background:${primaryColor};color:white;padding:6px 12px;display:flex;justify-content:space-between;align-items:flex-start;font-size:10px">
    <div>
      <strong>Data de emissão :</strong>&nbsp;${fmtDate(data.dataCriacao)}<br/>
      ${data.dataNecessidade ? `Prazo de entrega :&nbsp;<strong>${fmtDate(data.dataNecessidade)}</strong>` : 'Prazo de entrega :'}
    </div>
    <span><strong>Responsável:</strong>&nbsp;${data.responsavelNome || '—'}</span>
    <span><strong>Prioridade:</strong>&nbsp;${PRIORIDADE_LABEL[data.prioridade] ?? data.prioridade}</span>
  </div>

  <!-- System note -->
  <div style="font-size:9px;font-style:italic;color:#888;padding:3px 0 5px;border-bottom:1px solid #E0E0E0;margin-bottom:6px">
    Clariza Manager — Sistema de Gestão Empresarial — Este documento não serve de fatura
  </div>

  ${data.descricao ? `<p style="font-size:11px;margin-bottom:8px">${data.descricao.replace(/\n/g, '<br/>')}</p>` : ''}

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
      ${data.dataNecessidade
        ? `<p style="margin:4px 0 2px"><strong>Prazo de entrega:</strong><br/>${fmtDate(data.dataNecessidade)}</p>`
        : `<p style="margin:2px 0"><strong>Prazo de entrega:</strong></p>`}
      <p style="margin:2px 0"><strong>Condições de pagamento:</strong><br/>${condicoesPag}</p>
      <p style="margin:2px 0"><strong>Local de entrega:</strong><br/>Nas instalações indicadas pelo responsável.</p>
      <p style="margin:2px 0"><strong>Observações</strong>${data.observacoes ? '<br/>' + data.observacoes.replace(/\n/g, '<br/>') : ''}</p>
    </div>

    <div style="width:230px;font-size:11px">
      ${hasUnitPrices ? `
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
      </table>` : data.valorEstimado ? `
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:5px 6px;font-size:11px">Valor estimado:</td>
          <td style="padding:5px 6px;font-size:11px;text-align:right;font-weight:600">${fmtEur(data.valorEstimado)}</td>
        </tr>
      </table>` : ''}
    </div>
  </div>

  <!-- Signatures -->
  <div style="margin-top:22px;display:flex;justify-content:space-between;align-items:flex-end">
    <div style="font-size:10px">
      Fornecedor:<br/>
      <div style="border-top:1px solid #333;margin-top:22px;padding-top:4px;width:190px">&nbsp;</div>
      Assinatura e carimbo.
    </div>
    <div style="font-size:10px;text-align:center">
      ${cfg.nomeDocumento}<br/>
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
