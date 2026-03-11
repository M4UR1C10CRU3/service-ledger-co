import type { PropostaLinhaForm } from '@/types/proposta';
import { getEmpresaDocConfig } from '@/lib/empresaConfig';

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

const fmtEur = (v: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const fmtQty = (v: number) => v.toFixed(3).replace('.', ',');

function getSubtotal(linhas: PropostaLinhaForm[], idx: number): number {
  let sum = 0;
  for (let i = idx - 1; i >= 0; i--) {
    if (linhas[i].tipoLinha === 'seccao' || linhas[i].tipoLinha === 'subtotal') break;
    if (linhas[i].tipoLinha === 'artigo') sum += linhas[i].totalLinha;
  }
  return sum;
}

export function exportPropostaPdf(data: PdfData, empresa: any) {
  // Dynamic company branding
  const primaryColor = empresa?.corPrimaria || '#E8630A';
  const cfg = getEmpresaDocConfig(empresa?.slug);
  const logoPath = empresa?.logoPath || '';

  const dataFormatted = data.dataEmissao
    ? new Date(data.dataEmissao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
    : '';

  let linhasHtml = '';
  data.linhas.forEach((l, i) => {
    if (l.tipoLinha === 'seccao') {
      linhasHtml += `<tr style="background:#F2F2F2"><td colspan="7" style="padding:6px 8px;font-weight:bold;color:${primaryColor};font-size:11px">${l.designacao || ''}</td></tr>`;
    } else if (l.tipoLinha === 'subtotal') {
      const sub = getSubtotal(data.linhas, i);
      linhasHtml += `<tr style="background:#E0E0E0"><td colspan="6" style="padding:6px 8px;text-align:right;font-weight:bold;font-size:11px">Subtotal</td><td style="padding:6px 8px;text-align:right;font-weight:bold;font-size:11px">${fmtEur(sub)}</td></tr>`;
    } else if (l.tipoLinha === 'texto') {
      linhasHtml += `<tr><td colspan="7" style="padding:4px 8px;font-style:italic;color:#666;font-size:10px">${l.designacao || ''}</td></tr>`;
    } else {
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
      linhasHtml += `<tr style="background:${bg}">
        <td style="padding:4px 8px;font-size:11px">${l.referencia || ''}</td>
        <td style="padding:4px 8px;font-size:11px">${l.designacao || ''}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${fmtQty(l.quantidade)}</td>
        <td style="padding:4px 8px;font-size:11px">${l.unidade}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${fmtEur(l.precoUnitario)}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${l.descontoPct > 0 ? l.descontoPct + '%' : ''}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${fmtEur(l.totalLinha)}</td>
      </tr>`;
    }
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pre-Proposta ${data.numeroProposta}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1A1A1A; margin: 0; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
  .logo img { max-height: 70px; }
  .proposta-num { text-align: right; font-size: 13px; }
  .proposta-num strong { font-size: 15px; }
  .empresa-info { font-size: 11px; line-height: 1.6; }
  .barra-cor { background: ${primaryColor}; color: white; padding: 6px 12px; display: flex; justify-content: space-between; font-size: 11px; margin: 10px 0; }
  .phc-note { font-size: 9px; font-style: italic; color: #888; margin-bottom: 10px; }
  table.linhas { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  table.linhas th { background: ${primaryColor}; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
  table.linhas th:nth-child(3), table.linhas th:nth-child(5), table.linhas th:nth-child(6), table.linhas th:nth-child(7) { text-align: right; }
  .rodape { display: flex; justify-content: space-between; margin-top: 15px; }
  .condicoes { flex: 1; font-size: 10px; line-height: 1.6; }
  .totais { width: 220px; font-size: 11px; }
  .totais table { width: 100%; }
  .totais td { padding: 3px 6px; }
  .totais .total-final { background: ${primaryColor}; color: white; font-weight: bold; font-size: 13px; }
  .assinaturas { margin-top: 30px; font-size: 10px; display: flex; justify-content: space-between; }
  .assinaturas div { border-top: 1px solid #333; padding-top: 5px; width: 30%; text-align: center; }
  .emails { text-align: center; font-size: 9px; color: #666; margin-top: 20px; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <div class="logo"><img src="" alt="${cfg.nomeDocumento}" /></div>
    <div class="proposta-num">
      <span style="font-size:10px;color:#888">Não entra para SAF-T</span><br/>
      <strong>Pre-Proposta Nº ${data.numeroProposta}</strong><br/>
      <span>ORIGINAL</span>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:10px">
    <div class="empresa-info">
      <strong style="font-size:14px">${cfg.nomeDocumento}</strong><br/>
      ${cfg.morada.toUpperCase()}<br/>
      ${cfg.codigoPostal}  ${cfg.localidade.toUpperCase()}<br/>
      Contribuinte Nº: ${cfg.contribuinte}
      ${cfg.telefones ? '<br/>' + cfg.telefones : ''}
    </div>
    <div style="text-align:right;font-size:12px">
      <strong>${data.clienteNome}</strong><br/>
      ${data.clienteMorada ? data.clienteMorada + '<br/>' : ''}
      ${data.clienteNif ? 'NIF: ' + data.clienteNif : ''}
    </div>
  </div>

  <div class="barra-cor">
    <span>Data de emissão: ${dataFormatted}</span>
    <span>Vendedor: ${data.vendedorNome}</span>
    <span>V/Nº Contribuinte: ${data.clienteNif}</span>
    <span>Hora de emissão: ${data.horaEmissao}</span>
  </div>

  <div class="phc-note">Software PHC — Emitido por programa certificado nº 0006/AT — Este documento não serve de fatura</div>

  ${data.titulo ? `<p style="font-weight:bold;margin-bottom:5px">Trabalhos a executar:</p>` : ''}
  ${data.descricaoGeral ? `<p style="font-size:11px;margin-bottom:10px">${data.descricaoGeral}</p>` : ''}

  <table class="linhas">
    <thead><tr>
      <th>Referência</th><th>Designação</th><th>Quantidade</th><th>Uni.</th><th>Preço Unitário</th><th>Descontos</th><th>Total</th>
    </tr></thead>
    <tbody>${linhasHtml}</tbody>
  </table>

  <div class="rodape">
    <div class="condicoes">
      <p><strong>Como condições gerais teremos:</strong></p>
      <p>${data.condicoesGerais}</p>
      ${data.validadeTexto ? `<p><strong>Validade da proposta:</strong><br/>${data.validadeTexto}</p>` : ''}
      ${data.duracao ? `<p><strong>Duração:</strong> ${data.duracao}</p>` : ''}
      ${data.condicoesPagamento ? `<p><strong>Condições de pagamento:</strong><br/>${data.condicoesPagamento}</p>` : ''}
      ${data.observacoes ? `<p><strong>Observações:</strong><br/>${data.observacoes}</p>` : ''}
    </div>
    <div class="totais">
      <table>
        <tr><td>TOTAL sem IVA:</td><td style="text-align:right;font-weight:bold">${fmtEur(data.totalSemIva)}</td></tr>
        <tr><td>Valor do IVA (${data.taxaIva}%):</td><td style="text-align:right">${fmtEur(data.valorIva)}</td></tr>
        <tr class="total-final"><td style="padding:6px">Total com IVA:</td><td style="text-align:right;padding:6px">${fmtEur(data.totalComIva)}</td></tr>
      </table>
    </div>
  </div>

  <div class="assinaturas">
    <div>Cliente:</div>
    <div>Assinatura e carimbo.</div>
    <div>Assinatura se aceite.</div>
  </div>

  <div class="emails">
    ${cfg.emailsRodape.split('|').map(e => e.trim()).join(' &nbsp;|&nbsp; ')}
  </div>

  <script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
