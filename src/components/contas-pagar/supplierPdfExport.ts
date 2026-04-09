import { AccountPayable, TIPO_LANCAMENTO_LABELS } from '@/types/accountPayable';
import { getEmpresaDocConfig } from '@/lib/empresaConfig';
import { getEffectiveStatus, formatDateToISO } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const PDF_STATUS_LABELS: Record<string, string> = {
  pendente: 'À vencer',
  liquidado: 'Liquidado',
  vencido: 'Vencido',
  parcial: 'Parcial',
  cancelado: 'Cancelado',
};

const fmtEur = (v: number) =>
  v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

const fmtDate = (d: string | null) =>
  d ? format(new Date(d), 'dd/MM/yyyy') : '—';

interface SupplierPdfParams {
  supplierName: string;
  accounts: AccountPayable[];
  year: string;
  month: string;
  empresa: any;
  userName?: string;
  logoUrl?: string;
}

export function exportSupplierStatement({
  supplierName,
  accounts,
  year,
  month,
  empresa,
  userName,
  logoUrl,
}: SupplierPdfParams) {
  const cfg = getEmpresaDocConfig(empresa?.slug);
  const primaryColor = empresa?.corPrimaria || '#1a5276';
  const resolvedLogo = logoUrl || empresa?.logoPath || '';
  const now = new Date();

  // Sort by date
  const sorted = [...accounts].sort((a, b) =>
    (a.dataEmissao || '').localeCompare(b.dataEmissao || '')
  );

  const totalBruto = sorted.reduce((s, a) => s + a.valorLiquido, 0);
  const totalPago = sorted.filter(a => a.status === 'liquidado').reduce((s, a) => s + a.valorLiquido, 0);
  const totalPendente = totalBruto - totalPago;

  // Running balance
  let saldo = 0;
  const rows = sorted.map(a => {
    const debito = a.status !== 'liquidado' ? a.valorLiquido : 0;
    const credito = a.status === 'liquidado' ? a.valorLiquido : 0;
    saldo += debito - credito;
    return { ...a, debito, credito, saldo };
  });

  const periodoLabel = month !== 'all'
    ? `${format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy', { locale: pt })}`
    : `Ano ${year}`;

  const tableRows = rows.map(r => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;">${fmtDate(r.dataEmissao)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;">${r.numeroDocumento || '—'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.descricao || TIPO_LANCAMENTO_LABELS[r.tipoLancamento] || '—'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;">${fmtDate(r.dataVencimento)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:center;">
        ${(() => { const es = getEffectiveStatus(r.status, r.dataVencimento); return `<span style="padding:2px 8px;border-radius:10px;font-size:10px;background:${es === 'liquidado' ? '#dcfce7' : es === 'vencido' ? '#fee2e2' : '#fef9c3'};color:${es === 'liquidado' ? '#166534' : es === 'vencido' ? '#991b1b' : '#854d0e'};">${PDF_STATUS_LABELS[es] || es}</span>`; })()}
      </td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right;color:#dc2626;">${r.debito > 0 ? fmtEur(r.debito) : ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right;color:#16a34a;">${r.credito > 0 ? fmtEur(r.credito) : ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right;font-weight:600;color:${r.saldo > 0 ? '#dc2626' : '#16a34a'};">${fmtEur(r.saldo)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Extrato - ${supplierName}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    * { margin:0; padding:0; box-sizing:border-box; font-family: 'Segoe UI', Arial, sans-serif; }
    body { color:#1f2937; padding: 20px; }
  </style>
</head>
<body>
  <!-- Header -->
  <table style="width:100%;margin-bottom:20px;">
    <tr>
      <td style="width:60%;">
        ${resolvedLogo ? `<img src="${resolvedLogo}" style="max-height:50px;margin-bottom:6px;" />` : ''}
        <div style="font-size:13px;font-weight:700;color:${primaryColor};">${cfg.nomeDocumento}</div>
        <div style="font-size:10px;color:#6b7280;">${cfg.morada}${cfg.codigoPostal ? ` • ${cfg.codigoPostal} ${cfg.localidade}` : ''}</div>
        <div style="font-size:10px;color:#6b7280;">NIF: ${cfg.contribuinte}${cfg.telefones ? ` • ${cfg.telefones}` : ''}</div>
      </td>
      <td style="text-align:right;vertical-align:top;">
        <div style="font-size:18px;font-weight:700;color:${primaryColor};margin-bottom:4px;">EXTRATO DE CONTA CORRENTE</div>
        <div style="font-size:11px;color:#6b7280;">Período: ${periodoLabel}</div>
        <div style="font-size:11px;color:#6b7280;">Emitido em: ${format(now, 'dd/MM/yyyy HH:mm')}</div>
      </td>
    </tr>
  </table>

  <!-- Supplier info -->
  <div style="background:#f3f4f6;border-radius:8px;padding:12px 16px;margin-bottom:16px;border-left:4px solid ${primaryColor};">
    <div style="font-size:14px;font-weight:700;color:${primaryColor};">${supplierName}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:4px;">${sorted.length} lançamento(s) no período</div>
  </div>

  <!-- Summary cards -->
  <table style="width:100%;margin-bottom:16px;">
    <tr>
      <td style="width:33%;padding-right:8px;">
        <div style="background:#eff6ff;border-radius:8px;padding:10px 14px;text-align:center;">
          <div style="font-size:10px;color:#1e40af;text-transform:uppercase;font-weight:600;">Total Transacionado</div>
          <div style="font-size:16px;font-weight:700;color:#1e3a5f;">${fmtEur(totalBruto)}</div>
        </div>
      </td>
      <td style="width:33%;padding:0 4px;">
        <div style="background:#f0fdf4;border-radius:8px;padding:10px 14px;text-align:center;">
          <div style="font-size:10px;color:#166534;text-transform:uppercase;font-weight:600;">Total Pago</div>
          <div style="font-size:16px;font-weight:700;color:#166534;">${fmtEur(totalPago)}</div>
        </div>
      </td>
      <td style="width:33%;padding-left:8px;">
        <div style="background:${totalPendente > 0 ? '#fef2f2' : '#f0fdf4'};border-radius:8px;padding:10px 14px;text-align:center;">
          <div style="font-size:10px;color:${totalPendente > 0 ? '#991b1b' : '#166534'};text-transform:uppercase;font-weight:600;">Saldo Pendente</div>
          <div style="font-size:16px;font-weight:700;color:${totalPendente > 0 ? '#dc2626' : '#166534'};">${fmtEur(totalPendente)}</div>
        </div>
      </td>
    </tr>
  </table>

  <!-- Table -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:${primaryColor};">
        <th style="padding:8px;text-align:left;color:#fff;font-size:11px;font-weight:600;">Data Emissão</th>
        <th style="padding:8px;text-align:left;color:#fff;font-size:11px;font-weight:600;">Nº Documento</th>
        <th style="padding:8px;text-align:left;color:#fff;font-size:11px;font-weight:600;">Descrição</th>
        <th style="padding:8px;text-align:left;color:#fff;font-size:11px;font-weight:600;">Vencimento</th>
        <th style="padding:8px;text-align:center;color:#fff;font-size:11px;font-weight:600;">Estado</th>
        <th style="padding:8px;text-align:right;color:#fff;font-size:11px;font-weight:600;">Débito</th>
        <th style="padding:8px;text-align:right;color:#fff;font-size:11px;font-weight:600;">Crédito</th>
        <th style="padding:8px;text-align:right;color:#fff;font-size:11px;font-weight:600;">Saldo</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr style="background:#f9fafb;font-weight:700;">
        <td colspan="5" style="padding:8px;font-size:12px;">TOTAIS</td>
        <td style="padding:8px;text-align:right;font-size:12px;color:#dc2626;">${fmtEur(rows.reduce((s, r) => s + r.debito, 0))}</td>
        <td style="padding:8px;text-align:right;font-size:12px;color:#16a34a;">${fmtEur(rows.reduce((s, r) => s + r.credito, 0))}</td>
        <td style="padding:8px;text-align:right;font-size:12px;color:${saldo > 0 ? '#dc2626' : '#16a34a'};">${fmtEur(saldo)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Footer -->
  <div style="margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af;">
    <span>${cfg.nomeDocumento} • NIF: ${cfg.contribuinte}</span>
    <span>${userName ? `Emitido por: ${userName} • ` : ''}${format(now, "dd/MM/yyyy 'às' HH:mm")}</span>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}
