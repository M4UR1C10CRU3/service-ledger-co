// Email templates — Clariza Manager
// Todos os templates seguem o layout branded: header cor empresa, corpo, footer

import { getEmpresaDocConfig } from './empresaConfig';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface EmpresaEmailInfo {
  slug?: string;
  nome?: string;
  corPrimaria?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtEUR = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// ── Base layout ───────────────────────────────────────────────────────────────

function baseLayout(empresa: EmpresaEmailInfo, body: string): string {
  const cfg = getEmpresaDocConfig(empresa.slug);
  const cor = empresa.corPrimaria || '#E8630A';
  const nome = cfg.nomeDocumento || empresa.nome || 'Clariza Manager';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0">

        <!-- Header -->
        <tr>
          <td style="background:${cor};padding:22px 28px">
            <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">Clariza Manager</div>
            <div style="color:#ffffff;font-size:11px;margin-top:3px;opacity:0.88">${nome}</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:30px 28px">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:16px 28px;border-top:1px solid #ebebeb">
            <p style="margin:0;font-size:11px;color:#999;line-height:1.7">
              <strong style="color:#666">${nome}</strong><br>
              ${cfg.morada} · ${cfg.codigoPostal} ${cfg.localidade}<br>
              NIF ${cfg.contribuinte}<br>
              ${cfg.emails}${cfg.telefones ? ' · ' + cfg.telefones : ''}
            </p>
            <p style="margin:10px 0 0;font-size:10px;color:#ccc">
              Clariza Manager — Sistema de Gestão Empresarial · Este email foi gerado automaticamente.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Template 1: Proposta Adjudicada ──────────────────────────────────────────

export interface PropostaEmailData {
  numeroProposta: string;
  clienteNome: string;
  totalComIva: number;
  dataEmissao: string;
  titulo?: string;
  duracao?: string;
  condicoesPagamento?: string;
  observacoes?: string;
}

export function buildPropostaAdjudicadaEmail(
  data: PropostaEmailData,
  empresa: EmpresaEmailInfo,
): { subject: string; html: string; from: string; tipo: 'comercial' } {
  const cfg = getEmpresaDocConfig(empresa.slug);
  const from = cfg.emailRemetentes.comercial;
  const subject = `Confirmação de adjudicação — ${data.numeroProposta}`;

  const rows = [
    { label: 'Referência', value: `<strong>${data.numeroProposta}</strong>` },
    ...(data.titulo ? [{ label: 'Descrição', value: data.titulo }] : []),
    { label: 'Data', value: fmtDate(data.dataEmissao) },
    ...(data.duracao ? [{ label: 'Prazo de execução', value: data.duracao }] : []),
    ...(data.condicoesPagamento ? [{ label: 'Condições de pagamento', value: data.condicoesPagamento }] : []),
  ];

  const tableRows = rows.map(r =>
    `<tr>
      <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb;width:42%;white-space:nowrap">${r.label}</td>
      <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${r.value}</td>
    </tr>`
  ).join('');

  const body = `
<h2 style="margin:0 0 6px;font-size:22px;color:#111;font-weight:700">Confirmação de Adjudicação</h2>
<p style="margin:0 0 24px;font-size:12px;color:#999">Referência: ${data.numeroProposta}</p>

<p style="margin:0 0 22px;font-size:14px;color:#444;line-height:1.7">
  Exmo(a) Sr(a). <strong>${data.clienteNome}</strong>,<br><br>
  Confirmamos que a proposta abaixo foi adjudicada. Iremos proceder com os trabalhos conforme acordado.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;margin-bottom:22px;overflow:hidden">
  ${tableRows}
  <tr style="background:#f0fdf4">
    <td style="padding:13px 14px;font-size:13px;color:#15803d;font-weight:700">Valor total (c/ IVA)</td>
    <td style="padding:13px 14px;font-size:18px;font-weight:700;color:#16a34a">${fmtEUR(data.totalComIva)}</td>
  </tr>
</table>

${data.observacoes ? `<div style="background:#fefce8;border:1px solid #fde047;border-radius:6px;padding:14px 16px;margin-bottom:22px">
  <p style="margin:0;font-size:13px;color:#713f12"><strong>Observações:</strong> ${data.observacoes}</p>
</div>` : ''}

<p style="margin:0;font-size:13px;color:#666;line-height:1.7">
  Agradecemos a sua confiança. Para qualquer questão, não hesite em contactar-nos.
</p>`;

  return { subject, html: baseLayout(empresa, body), from, tipo: 'comercial' as const };
}

// ── Template 1b: Proposta Enviada ao Cliente ──────────────────────────────────

export function buildPropostaEnviadaEmail(
  data: PropostaEmailData,
  empresa: EmpresaEmailInfo,
): { subject: string; html: string; from: string; tipo: 'comercial' } {
  const cfg = getEmpresaDocConfig(empresa.slug);
  const from = cfg.emailRemetentes.comercial;
  const subject = `Proposta ${data.numeroProposta} — ${cfg.nomeDocumento}`;

  const rows = [
    { label: 'Referência', value: `<strong>${data.numeroProposta}</strong>` },
    ...(data.titulo ? [{ label: 'Descrição', value: data.titulo }] : []),
    { label: 'Data', value: fmtDate(data.dataEmissao) },
    ...(data.duracao ? [{ label: 'Prazo de execução', value: data.duracao }] : []),
    ...(data.condicoesPagamento ? [{ label: 'Condições de pagamento', value: data.condicoesPagamento }] : []),
  ];

  const tableRows = rows.map(r =>
    `<tr>
      <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb;width:42%;white-space:nowrap">${r.label}</td>
      <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${r.value}</td>
    </tr>`
  ).join('');

  const body = `
<h2 style="margin:0 0 6px;font-size:22px;color:#111;font-weight:700">Proposta Comercial</h2>
<p style="margin:0 0 24px;font-size:12px;color:#999">Referência: ${data.numeroProposta}</p>

<p style="margin:0 0 22px;font-size:14px;color:#444;line-height:1.7">
  Exmo(a) Sr(a). <strong>${data.clienteNome}</strong>,<br><br>
  É com prazer que apresentamos a nossa proposta comercial. Analisámos o vosso pedido e
  elaborámos a solução que melhor se adapta às suas necessidades.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;margin-bottom:22px;overflow:hidden">
  ${tableRows}
  <tr style="background:#eff6ff">
    <td style="padding:13px 14px;font-size:13px;color:#1e40af;font-weight:700">Valor total (c/ IVA)</td>
    <td style="padding:13px 14px;font-size:18px;font-weight:700;color:#1d4ed8">${fmtEUR(data.totalComIva)}</td>
  </tr>
</table>

${data.observacoes ? `<div style="background:#fefce8;border:1px solid #fde047;border-radius:6px;padding:14px 16px;margin-bottom:22px">
  <p style="margin:0;font-size:13px;color:#713f12"><strong>Observações:</strong> ${data.observacoes}</p>
</div>` : ''}

<p style="margin:0;font-size:13px;color:#666;line-height:1.7">
  O documento completo segue em anexo. Para aceitar ou colocar questões, não hesite em contactar-nos.
  A proposta é válida por 30 dias a partir da data de emissão.
</p>`;

  return { subject, html: baseLayout(empresa, body), from, tipo: 'comercial' as const };
}

// ── Template 2: Nota de Encomenda ao Fornecedor ───────────────────────────────

export interface NeEmailItem {
  descricao: string;
  referencia: string | null;
  quantidade: number;
  unidade: string;
}

export interface NeEmailData {
  numero: string;
  titulo: string;
  fornecedorNome: string | null;
  dataCriacao: string;
  dataNecessidade: string | null;
  items: NeEmailItem[];
  observacoes?: string | null;
  valorEstimado?: number | null;
}

export function buildNotaEncomendaEmail(
  data: NeEmailData,
  empresa: EmpresaEmailInfo,
): { subject: string; html: string; from: string; tipo: 'compras' } {
  const cfg = getEmpresaDocConfig(empresa.slug);
  const from = cfg.emailRemetentes.compras;
  const subject = `Nota de Encomenda ${data.numero} — ${cfg.nomeDocumento}`;

  const itemsHtml = data.items.length > 0 ? `
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;margin:18px 0;overflow:hidden;font-size:13px">
  <tr style="background:#f0f0f0">
    <th style="padding:9px 12px;text-align:left;font-weight:600;border-bottom:1px solid #e0e0e0">Descrição</th>
    <th style="padding:9px 12px;text-align:left;font-weight:600;border-bottom:1px solid #e0e0e0;width:18%">Referência</th>
    <th style="padding:9px 12px;text-align:right;font-weight:600;border-bottom:1px solid #e0e0e0;width:14%">Qtd.</th>
    <th style="padding:9px 12px;text-align:left;font-weight:600;border-bottom:1px solid #e0e0e0;width:10%">Un.</th>
  </tr>
  ${data.items.map((it, i) => `
  <tr style="${i % 2 === 1 ? 'background:#fafafa' : ''}">
    <td style="padding:8px 12px;border-bottom:1px solid #ebebeb">${it.descricao}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #ebebeb;color:#888">${it.referencia || '—'}</td>
    <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #ebebeb">${it.quantidade % 1 === 0 ? it.quantidade : it.quantidade.toFixed(2).replace('.', ',')}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #ebebeb">${it.unidade}</td>
  </tr>`).join('')}
</table>` : '';

  const body = `
<h2 style="margin:0 0 6px;font-size:22px;color:#111;font-weight:700">Nota de Encomenda</h2>
<p style="margin:0 0 22px;font-size:12px;color:#999">Referência: <strong style="color:#333">${data.numero}</strong></p>

<p style="margin:0 0 18px;font-size:14px;color:#444;line-height:1.7">
  ${data.fornecedorNome ? `Exmo(a) Sr(a). / <strong>${data.fornecedorNome}</strong>,` : 'Exmo(s) Srs.,'}<br><br>
  Enviamos a nossa Nota de Encomenda referente a <strong>${data.titulo}</strong>.<br>
  Por favor confirme a disponibilidade e o prazo de entrega.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden">
  <tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb;width:42%">Data de emissão</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${fmtDate(data.dataCriacao)}</td>
  </tr>
  ${data.dataNecessidade ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#666${data.valorEstimado ? ';border-bottom:1px solid #ebebeb' : ''}">Prazo de entrega necessário</td>
    <td style="padding:11px 14px;font-size:13px;font-weight:700;color:#dc2626${data.valorEstimado ? ';border-bottom:1px solid #ebebeb' : ''}">${fmtDate(data.dataNecessidade)}</td>
  </tr>` : ''}
  ${data.valorEstimado ? `<tr style="background:#fff7ed">
    <td style="padding:11px 14px;font-size:13px;color:#92400e">Valor estimado</td>
    <td style="padding:11px 14px;font-size:13px;font-weight:600;color:#c2410c">${fmtEUR(data.valorEstimado)}</td>
  </tr>` : ''}
</table>

${itemsHtml}

${data.observacoes ? `<div style="background:#fefce8;border:1px solid #fde047;border-radius:6px;padding:14px 16px;margin-top:18px">
  <p style="margin:0;font-size:13px;color:#713f12"><strong>Observações:</strong> ${data.observacoes}</p>
</div>` : ''}

<p style="margin:18px 0 0;font-size:13px;color:#666;line-height:1.7">
  Aguardamos a sua confirmação. Obrigado pela colaboração.
</p>`;

  return { subject, html: baseLayout(empresa, body), from, tipo: 'compras' as const };
}

// ── Template 3: Lembrete de Cobrança ─────────────────────────────────────────

export interface CobrancaEmailData {
  clienteNome: string;
  servico: string;
  valorTotal: number;
  valorPago: number;
  referencia?: string | null;
  dataServico?: string | null;
}

export function buildCobrancaDebitoEmail(
  data: CobrancaEmailData,
  empresa: EmpresaEmailInfo,
): { subject: string; html: string; from: string; tipo: 'financeiro' } {
  const emDivida = data.valorTotal - data.valorPago;
  const cfg = getEmpresaDocConfig(empresa.slug);
  const from = cfg.emailRemetentes.financeiro;
  const subject = `Lembrete de pagamento — ${cfg.nomeDocumento}`;

  const body = `
<h2 style="margin:0 0 16px;font-size:22px;color:#111;font-weight:700">Lembrete de Pagamento</h2>

<p style="margin:0 0 22px;font-size:14px;color:#444;line-height:1.7">
  Exmo(a) Sr(a). <strong>${data.clienteNome}</strong>,<br><br>
  Vimos por este meio recordar que existe um saldo por liquidar referente ao serviço abaixo indicado.
  Agradecemos a regularização da situação o mais brevemente possível.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:22px">
  ${data.referencia ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb;width:42%">Referência</td>
    <td style="padding:11px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #ebebeb">${data.referencia}</td>
  </tr>` : ''}
  <tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Serviço</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${data.servico}</td>
  </tr>
  ${data.dataServico ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Data</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${data.dataServico}</td>
  </tr>` : ''}
  <tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Valor total</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${fmtEUR(data.valorTotal)}</td>
  </tr>
  <tr>
    <td style="padding:11px 14px;font-size:13px;color:#15803d;border-bottom:1px solid #ebebeb">Valor liquidado</td>
    <td style="padding:11px 14px;font-size:13px;color:#16a34a;border-bottom:1px solid #ebebeb">${fmtEUR(data.valorPago)}</td>
  </tr>
  <tr style="background:#fef2f2">
    <td style="padding:13px 14px;font-size:13px;color:#991b1b;font-weight:700">Saldo em dívida</td>
    <td style="padding:13px 14px;font-size:18px;font-weight:700;color:#dc2626">${fmtEUR(emDivida)}</td>
  </tr>
</table>

<p style="margin:0;font-size:13px;color:#666;line-height:1.7">
  Para regularizar a situação ou colocar qualquer questão, contacte-nos através dos dados no rodapé.<br>
  Agradecemos a sua atenção e colaboração.
</p>`;

  return { subject, html: baseLayout(empresa, body), from, tipo: 'financeiro' as const };
}
