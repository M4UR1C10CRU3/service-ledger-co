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

// ── Template 3: Pedido de Pagamento (pós-adjudicação) ────────────────────────

export interface PedidoPagamentoEmailData {
  clienteNome: string;
  servico: string;
  valorTotal: number;
  valorPago: number;
  referencia?: string | null;
  dataServico?: string | null;
  condicoesPagamento?: string | null;
}

export function buildPedidoPagamentoEmail(
  data: PedidoPagamentoEmailData,
  empresa: EmpresaEmailInfo,
): { subject: string; html: string; from: string; tipo: 'financeiro' } {
  const saldo = data.valorTotal - data.valorPago;
  const cfg = getEmpresaDocConfig(empresa.slug);
  const from = cfg.emailRemetentes.financeiro;
  const subject = `Pedido de pagamento${data.referencia ? ` — ${data.referencia}` : ''} — ${cfg.nomeDocumento}`;

  const body = `
<h2 style="margin:0 0 16px;font-size:22px;color:#111;font-weight:700">Pedido de Pagamento</h2>

<p style="margin:0 0 22px;font-size:14px;color:#444;line-height:1.7">
  Exmo(a) Sr(a). <strong>${data.clienteNome}</strong>,<br><br>
  Informamos que a fatura referente ao serviço abaixo se encontra disponível para pagamento.
  Agradecemos a liquidação no prazo acordado.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:22px">
  ${data.referencia ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb;width:42%">Referência</td>
    <td style="padding:11px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #ebebeb">${data.referencia}</td>
  </tr>` : ''}
  <tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Serviço / Obra</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${data.servico}</td>
  </tr>
  ${data.dataServico ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Data</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${data.dataServico}</td>
  </tr>` : ''}
  ${data.condicoesPagamento ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Condições de pagamento</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${data.condicoesPagamento}</td>
  </tr>` : ''}
  <tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Valor total (c/ IVA)</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${fmtEUR(data.valorTotal)}</td>
  </tr>
  ${data.valorPago > 0 ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#15803d;border-bottom:1px solid #ebebeb">Já liquidado</td>
    <td style="padding:11px 14px;font-size:13px;color:#16a34a;border-bottom:1px solid #ebebeb">${fmtEUR(data.valorPago)}</td>
  </tr>` : ''}
  <tr style="background:#eff6ff">
    <td style="padding:13px 14px;font-size:13px;color:#1e40af;font-weight:700">Saldo a liquidar</td>
    <td style="padding:13px 14px;font-size:18px;font-weight:700;color:#1d4ed8">${fmtEUR(saldo)}</td>
  </tr>
</table>

<p style="margin:0;font-size:13px;color:#666;line-height:1.7">
  Para efectuar o pagamento ou obter dados bancários, por favor contacte-nos através dos dados indicados no rodapé.<br>
  Após o pagamento, agradecemos o envio do comprovativo para confirmar a liquidação.
</p>`;

  return { subject, html: baseLayout(empresa, body), from, tipo: 'financeiro' as const };
}

// ── Template 4: Lembrete de Cobrança ─────────────────────────────────────────

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

// ── Template 5: Comprovativo de Pagamento (ao fornecedor) ─────────────────────

export interface ComprovativoPagamentoEmailData {
  fornecedorNome: string;
  neNumero: string;
  descricao?: string | null;
  valorPago: number;
  referencia?: string | null;
  dataPagamento?: string | null;
  observacoes?: string | null;
}

export function buildComprovativoPagamentoEmail(
  data: ComprovativoPagamentoEmailData,
  empresa: EmpresaEmailInfo,
): { subject: string; html: string; from: string; tipo: 'compras' } {
  const cfg = getEmpresaDocConfig(empresa.slug);
  const from = cfg.emailRemetentes.compras;
  const subject = `Comprovativo de pagamento — ${data.neNumero} — ${cfg.nomeDocumento}`;

  const body = `
<h2 style="margin:0 0 16px;font-size:22px;color:#111;font-weight:700">Comprovativo de Pagamento</h2>

<p style="margin:0 0 22px;font-size:14px;color:#444;line-height:1.7">
  Exmo(a) Sr(a). <strong>${data.fornecedorNome}</strong>,<br><br>
  Informamos que o pagamento referente ao pedido abaixo foi efectuado.
  Em anexo (ou conforme indicado) encontra-se o respectivo comprovativo.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:22px">
  <tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb;width:42%">Nota de Encomenda</td>
    <td style="padding:11px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #ebebeb">${data.neNumero}</td>
  </tr>
  ${data.referencia ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Referência fatura</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${data.referencia}</td>
  </tr>` : ''}
  ${data.descricao ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Descrição</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${data.descricao}</td>
  </tr>` : ''}
  ${data.dataPagamento ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Data de pagamento</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${fmtDate(data.dataPagamento)}</td>
  </tr>` : ''}
  <tr style="background:#f0fdf4">
    <td style="padding:13px 14px;font-size:13px;color:#15803d;font-weight:700">Valor pago</td>
    <td style="padding:13px 14px;font-size:18px;font-weight:700;color:#16a34a">${fmtEUR(data.valorPago)}</td>
  </tr>
</table>

${data.observacoes ? `<p style="margin:0 0 22px;font-size:13px;color:#666;line-height:1.7"><strong>Observações:</strong> ${data.observacoes}</p>` : ''}

<p style="margin:0;font-size:13px;color:#666;line-height:1.7">
  Caso tenha alguma questão relativamente a este pagamento, contacte-nos através dos dados indicados no rodapé.<br>
  Agradecemos a colaboração.
</p>`;

  return { subject, html: baseLayout(empresa, body), from, tipo: 'compras' as const };
}

// ── Template 6: Follow-up de Proposta (sem resposta) ─────────────────────────

export interface FollowUpPropostaEmailData {
  clienteNome: string;
  numeroProposta: string;
  titulo?: string | null;
  totalComIva: number;
  dataEmissao: string;
  diasPendente: number;
  dataValidade?: string | null;
}

export function buildFollowUpPropostaEmail(
  data: FollowUpPropostaEmailData,
  empresa: EmpresaEmailInfo,
): { subject: string; html: string; from: string; tipo: 'comercial' } {
  const cfg = getEmpresaDocConfig(empresa.slug);
  const from = cfg.emailRemetentes.comercial;
  const subject = `Seguimento — ${data.numeroProposta} — ${cfg.nomeDocumento}`;

  const body = `
<h2 style="margin:0 0 16px;font-size:22px;color:#111;font-weight:700">Seguimento de Proposta</h2>

<p style="margin:0 0 22px;font-size:14px;color:#444;line-height:1.7">
  Exmo(a) Sr(a). <strong>${data.clienteNome}</strong>,<br><br>
  Vimos por este meio dar seguimento à proposta comercial enviada há ${data.diasPendente} dia${data.diasPendente !== 1 ? 's' : ''}.
  Gostaríamos de saber se tiveram oportunidade de analisar a nossa proposta e se existem questões que possamos esclarecer.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:22px">
  <tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb;width:42%">Proposta</td>
    <td style="padding:11px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #ebebeb">${data.numeroProposta}</td>
  </tr>
  ${data.titulo ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Assunto</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${data.titulo}</td>
  </tr>` : ''}
  <tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Data de emissão</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb">${fmtDate(data.dataEmissao)}</td>
  </tr>
  ${data.dataValidade ? `<tr>
    <td style="padding:11px 14px;font-size:13px;color:#666;border-bottom:1px solid #ebebeb">Válida até</td>
    <td style="padding:11px 14px;font-size:13px;border-bottom:1px solid #ebebeb;color:#b45309">${fmtDate(data.dataValidade)}</td>
  </tr>` : ''}
  <tr style="background:#eff6ff">
    <td style="padding:13px 14px;font-size:13px;color:#1e40af;font-weight:700">Valor total (c/ IVA)</td>
    <td style="padding:13px 14px;font-size:18px;font-weight:700;color:#1d4ed8">${fmtEUR(data.totalComIva)}</td>
  </tr>
</table>

<p style="margin:0;font-size:13px;color:#666;line-height:1.7">
  Estamos ao dispor para quaisquer esclarecimentos adicionais ou para agendar uma reunião.<br>
  Aguardamos a vossa resposta com expectativa.
</p>`;

  return { subject, html: baseLayout(empresa, body), from, tipo: 'comercial' as const };
}
