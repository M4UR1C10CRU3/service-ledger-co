import type { NeItem } from '@/types/notaEncomenda';
import { getEmpresaDocConfig } from '@/lib/empresaConfig';

// ── Data types ────────────────────────────────────────────────────────────────

export interface NePdfData {
  // NE identification
  numeroNe: string;
  titulo: string;
  descricao?: string;
  observacoes?: string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';

  // Supplier (recipient)
  fornecedorNome: string;
  fornecedorMorada?: string;
  fornecedorNif?: string;
  fornecedorTelefone?: string;
  fornecedorEmail?: string;

  // Dates
  dataCriacao: string;
  dataNecessidade?: string;

  // Internal references
  propostaNumero?: string;
  osNumero?: string;

  // Responsible
  responsavelNome?: string;

  // Line items
  items: NeItem[];

  // Optional estimated value (shown when no priced items)
  valorEstimado?: number | null;
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

const fmtQty = (v: number) => v.toFixed(3).replace('.', ',');

const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: '⚠ URGENTE',
};

function buildNeFilename(data: NePdfData): string {
  const sanitize = (s: string) =>
    (s || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  const numero = sanitize(data.numeroNe).replace(/\//g, '-');
  const forn = sanitize(data.fornecedorNome) || 'Fornecedor';
  const titulo = sanitize(data.titulo) || 'Encomenda';
  return `NE_${numero}_${forn}_${titulo}`;
}

// ── Main export function ──────────────────────────────────────────────────────

export function exportNePdf(data: NePdfData, empresa: any, logoDataUrl?: string) {
  const primaryColor = empresa?.corPrimaria || '#1E939C';
  const cfg = getEmpresaDocConfig(empresa?.slug);

  // ── Totals calculation ──────────────────────────────────────────────────
  const hasUnitPrices = data.items.some(it => it.precoUnit != null && it.precoUnit > 0);
  const subtotal = data.items.reduce((s, it) => s + (it.total ?? (it.precoUnit ?? 0) * it.quantidade), 0);
  const iva = subtotal * 0.23;
  const totalComIVA = subtotal + iva;

  // ── Items HTML ──────────────────────────────────────────────────────────
  let itemsHtml = '';
  data.items.forEach((it, i) => {
    const bg = i % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
    const total = it.total ?? (it.precoUnit != null ? it.precoUnit * it.quantidade : null);
    itemsHtml += `<tr style="background:${bg}">
      <td style="padding:5px 8px;font-size:11px;text-align:left;color:#555">${it.referencia || ''}</td>
      <td style="padding:5px 8px;font-size:11px;text-align:left;font-weight:500">${it.descricao}</td>
      <td style="padding:5px 8px;font-size:11px;text-align:right">${fmtQty(it.quantidade)}</td>
      <td style="padding:5px 8px;font-size:11px;text-align:center;color:#555">${it.unidade}</td>
      ${hasUnitPrices ? `
      <td style="padding:5px 8px;font-size:11px;text-align:right">${it.precoUnit != null ? fmtEUR(it.precoUnit) : '—'}</td>
      <td style="padding:5px 8px;font-size:11px;text-align:right;font-weight:600">${total != null ? fmtEUR(total) : '—'}</td>
      ` : ''}
      ${it.observacoes ? `<td style="padding:5px 8px;font-size:10px;color:#888;font-style:italic">${it.observacoes}</td>` : (hasUnitPrices ? '' : '<td></td>')}
    </tr>`;
  });

  // ── Empty state ─────────────────────────────────────────────────────────
  if (data.items.length === 0) {
    itemsHtml = `<tr><td colspan="${hasUnitPrices ? 7 : 5}" style="padding:16px 8px;text-align:center;font-size:11px;color:#999;font-style:italic">
      Nenhum material especificado
    </td></tr>`;
  }

  // ── Totals block (only when unit prices exist) ──────────────────────────
  const totaisHtml = hasUnitPrices ? `
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      <tr>
        <td style="padding:4px 0;font-size:11px;color:#555;width:70%">Subtotal (s/ IVA)</td>
        <td style="padding:4px 0;font-size:11px;text-align:right">${fmtEUR(subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:11px;color:#555">IVA (23%)</td>
        <td style="padding:4px 0;font-size:11px;text-align:right">${fmtEUR(iva)}</td>
      </tr>
      <tr style="border-top:2px solid ${primaryColor}">
        <td style="padding:6px 0 2px;font-size:13px;font-weight:bold;color:${primaryColor}">Total com IVA</td>
        <td style="padding:6px 0 2px;font-size:13px;font-weight:bold;color:${primaryColor};text-align:right">${fmtEUR(totalComIVA)}</td>
      </tr>
    </table>` : (data.valorEstimado ? `
    <div style="margin-top:8px;font-size:11px">
      <strong>Valor estimado:</strong> ${fmtEUR(data.valorEstimado)}
    </div>` : '');

  // ── Referências (proposta / OS) ─────────────────────────────────────────
  const refs: string[] = [];
  if (data.propostaNumero) refs.push(`Proposta: <strong>${data.propostaNumero}</strong>`);
  if (data.osNumero) refs.push(`OS: <strong>${data.osNumero}</strong>`);
  const refsHtml = refs.length
    ? `<div style="margin-top:4px;font-size:10px;color:#666">Ref. interna — ${refs.join(' &nbsp;|&nbsp; ')}</div>`
    : '';

  const filename = buildNeFilename(data);

  // ── TABLE header columns ────────────────────────────────────────────────
  const thBase = `background:${primaryColor};color:white;padding:6px 8px;font-size:11px;font-weight:bold;border:none`;
  const tableColsHeader = hasUnitPrices
    ? `<th style="${thBase};text-align:left">Referência</th>
       <th style="${thBase};text-align:left">Descrição / Material</th>
       <th style="${thBase};text-align:right">Quantidade</th>
       <th style="${thBase};text-align:center">Un.</th>
       <th style="${thBase};text-align:right">Preço Unit.</th>
       <th style="${thBase};text-align:right">Total</th>
       <th style="${thBase};text-align:left">Obs.</th>`
    : `<th style="${thBase};text-align:left">Referência</th>
       <th style="${thBase};text-align:left">Descrição / Material</th>
       <th style="${thBase};text-align:right">Quantidade</th>
       <th style="${thBase};text-align:center">Un.</th>
       <th style="${thBase};text-align:left">Obs.</th>`;

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
      font-size: 18px;
      color: ${primaryColor};
      letter-spacing: -0.3px;
      margin-bottom: 2px;
    }
    .doc-numero { font-size: 13px; font-weight: 600; color: #1A1A1A; margin-bottom: 6px; }
    .doc-original { font-size: 10px; color: #888; font-style: italic; margin-bottom: 8px; }
    .destinatario {
      border: 1px solid #DDD;
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 11px;
      line-height: 1.7;
      background: #FAFAFA;
      display: inline-block;
      text-align: left;
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
    .barra-cor .prio-badge {
      background: rgba(255,255,255,0.20);
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 10px;
    }
    .titulo-secao {
      font-size: 13px;
      font-weight: bold;
      color: #1A1A1A;
      margin: 10px 0 4px;
      padding-bottom: 4px;
      border-bottom: 2px solid ${primaryColor};
    }
    .descricao-box {
      font-size: 11px;
      color: #444;
      line-height: 1.6;
      margin-bottom: 10px;
      padding: 8px 12px;
      background: #F8F8F8;
      border-left: 3px solid ${primaryColor};
    }
    table.linhas {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }
    table.linhas td {
      border-bottom: 1px solid #EFEFEF;
      vertical-align: middle;
    }
    .totais-box {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }
    .totais-inner { width: 280px; }
    .rodape {
      display: flex;
      gap: 20px;
      margin-top: 12px;
    }
    .rodape-esq { flex: 2; font-size: 10px; line-height: 1.8; }
    .rodape-esq p { margin: 3px 0; }
    .rodape-esq strong { font-weight: bold; color: #1A1A1A; }
    .rodape-dir { flex: 1; border: 1px solid #CCC; min-height: 70px; border-radius: 4px; }
    .assinaturas {
      margin-top: 28px;
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
      margin-bottom: 4px;
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
      <div class="doc-type">Nota de Encomenda</div>
      <div class="doc-numero">Nº ${data.numeroNe}</div>
      <div class="doc-original">ORIGINAL</div>
      ${refsHtml}
      <div class="destinatario">
        <div class="label">Fornecedor / Destinatário</div>
        <div class="nome">${data.fornecedorNome}</div>
        ${data.fornecedorMorada ? `<div>${data.fornecedorMorada}</div>` : ''}
        ${data.fornecedorNif ? `<div>NIF: ${data.fornecedorNif}</div>` : ''}
        ${data.fornecedorTelefone ? `<div>Tel: ${data.fornecedorTelefone}</div>` : ''}
        ${data.fornecedorEmail ? `<div>${data.fornecedorEmail}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- BARRA COLORIDA -->
  <div class="barra-cor">
    <span>Data de Emissão: <strong>${fmtDate(data.dataCriacao)}</strong></span>
    ${data.dataNecessidade ? `<span>Prazo de Entrega: <strong>${fmtDate(data.dataNecessidade)}</strong></span>` : '<span></span>'}
    <span>Responsável: <strong>${data.responsavelNome || '—'}</strong></span>
    <span class="prio-badge">Prioridade: ${PRIORIDADE_LABEL[data.prioridade] ?? data.prioridade}</span>
  </div>

  <!-- TÍTULO + DESCRIÇÃO -->
  ${data.titulo ? `<div class="titulo-secao">${data.titulo}</div>` : ''}
  ${data.descricao ? `<div class="descricao-box">${data.descricao.replace(/\n/g, '<br/>')}</div>` : ''}

  <!-- TABELA DE MATERIAIS -->
  <table class="linhas">
    <thead>
      <tr>${tableColsHeader}</tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <!-- TOTAIS -->
  ${hasUnitPrices ? `<div class="totais-box"><div class="totais-inner">${totaisHtml}</div></div>` : totaisHtml}

  <!-- RODAPÉ CONDIÇÕES + ASSINATURA FORNECEDOR -->
  <div class="rodape">
    <div class="rodape-esq">
      ${data.observacoes ? `<p><strong>Observações:</strong><br/>${data.observacoes.replace(/\n/g, '<br/>')}</p>` : ''}
      ${data.dataNecessidade ? `<p><strong>Prazo de entrega:</strong> ${fmtDate(data.dataNecessidade)}</p>` : ''}
      <p><strong>Condições de pagamento:</strong> Conforme acordo comercial em vigor.</p>
      <p><strong>Entrega:</strong> Nas instalações indicadas pelo responsável.</p>
    </div>
    <div class="rodape-dir"></div>
  </div>

  <!-- ASSINATURAS -->
  <div class="assinaturas">
    <div>
      Fornecedor:<br/>&nbsp;<br/>
      Data: _____ / _____ / _________<br/>
      Assinatura e carimbo
    </div>
    <div>
      ${cfg.nomeDocumento}<br/>&nbsp;<br/>
      Data: _____ / _____ / _________<br/>
      Assinatura e carimbo
    </div>
  </div>

  <!-- NOTA LEGAL -->
  <div class="nota-legal">
    Documento interno de gestão — não substitui fatura comercial.
    Emitido electronicamente pelo sistema Clariza.
  </div>

  <!-- RODAPÉ PÁGINA -->
  <div class="page-footer">
    <div class="legal">Este documento é uma Nota de Encomenda e não serve de fatura ou documento fiscal.</div>
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
