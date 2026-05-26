import type { POLinhaForm } from '@/types/pedidoOrcamento';
import { getEmpresaDocConfig } from '@/lib/empresaConfig';

interface PdfData {
  numeroPo: string;
  clienteNome: string;
  clienteMorada: string;
  clienteNif: string;
  clienteTelefone: string;
  clienteEmail: string;
  vendedorNome: string;
  dataEmissao: string;
  horaEmissao: string;
  titulo: string;
  descricaoNecessidade: string;
  obra: string;
  duracaoObra: string;
  localExecucao: string;
  linhas: POLinhaForm[];
  validadeTexto: string;
  condicoesPagamento: string;
  condicoesGerais: string;
  observacoes: string;
}

const fmtQty = (v: number) => v.toFixed(3).replace('.', ',');

export function exportPoPdf(data: PdfData, empresa: any, logoDataUrl?: string) {
  const primaryColor = empresa?.corPrimaria || '#E8630A';
  const cfg = getEmpresaDocConfig(empresa?.slug);

  const dataFormatted = data.dataEmissao
    ? new Date(data.dataEmissao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
    : '';

  let linhasHtml = '';
  data.linhas.forEach((l, i) => {
    if (l.tipoLinha === 'seccao') {
      linhasHtml += `<tr style="background:#F2F2F2"><td colspan="5" style="padding:6px 8px;font-weight:bold;color:${primaryColor};font-size:11px">${l.designacao || ''}</td></tr>`;
    } else if (l.tipoLinha === 'texto') {
      linhasHtml += `<tr><td colspan="5" style="padding:4px 8px;font-style:italic;color:#666;font-size:10px">${l.designacao || ''}</td></tr>`;
    } else {
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
      linhasHtml += `<tr style="background:${bg}">
        <td style="padding:4px 8px;font-size:11px">${l.referencia || ''}</td>
        <td style="padding:4px 8px;font-size:11px">${l.designacao || ''}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${fmtQty(l.quantidade)}</td>
        <td style="padding:4px 8px;font-size:11px">${l.unidade}</td>
        <td style="padding:4px 8px;font-size:11px">${l.observacaoLinha || ''}</td>
      </tr>`;
    }
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pedido de Orçamento ${data.numeroPo}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1A1A1A; margin: 0; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
  .logo img { max-height: 70px; }
  .po-num { text-align: right; font-size: 13px; }
  .po-num strong { font-size: 15px; }
  .empresa-info { font-size: 11px; line-height: 1.6; }
  .barra-cor { background: ${primaryColor}; color: white; padding: 6px 12px; display: flex; justify-content: space-between; font-size: 11px; margin: 10px 0; }
  .obra-box { border: 1px solid ${primaryColor}; padding: 6px 10px; margin: 10px 0; font-size: 11px; background: #FFF8F2; }
  .obra-box strong { color: ${primaryColor}; }
  .nota { font-size: 9px; font-style: italic; color: #888; margin-bottom: 10px; }
  table.linhas { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  table.linhas th { background: ${primaryColor}; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
  table.linhas th:nth-child(3) { text-align: right; }
  .rodape { margin-top: 15px; font-size: 10px; line-height: 1.6; }
  .rodape p { margin: 4px 0; }
  .assinaturas { margin-top: 30px; font-size: 10px; display: flex; justify-content: space-between; }
  .assinaturas div { border-top: 1px solid #333; padding-top: 5px; width: 30%; text-align: center; }
  .emails { text-align: center; font-size: 9px; color: #666; margin-top: 20px; line-height: 1.5; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <div class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="${cfg.nomeDocumento}" />` : `<strong style="font-size:16px;color:${primaryColor}">${cfg.nomeDocumento}</strong>`}</div>
    <div class="po-num">
      <span style="font-size:10px;color:#888">Documento interno — não fiscal</span><br/>
      <strong>Pedido de Orçamento Nº ${data.numeroPo}</strong><br/>
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
      ${data.clienteNif ? 'NIF: ' + data.clienteNif + '<br/>' : ''}
      ${data.clienteTelefone ? 'Tel: ' + data.clienteTelefone + '<br/>' : ''}
      ${data.clienteEmail ? data.clienteEmail : ''}
    </div>
  </div>

  <div class="barra-cor">
    <span>Data: ${dataFormatted}</span>
    <span>Hora: ${data.horaEmissao}</span>
    <span>Responsável: ${data.vendedorNome || '—'}</span>
    <span>V/Nº Contribuinte: ${data.clienteNif || '—'}</span>
  </div>

  ${data.obra ? `<div class="obra-box"><strong>Obra:</strong> ${data.obra}${data.localExecucao ? ` &nbsp;|&nbsp; <strong>Local:</strong> ${data.localExecucao}` : ''}${data.duracaoObra ? ` &nbsp;|&nbsp; <strong>Duração prevista:</strong> ${data.duracaoObra}` : ''}</div>` : ''}

  ${data.titulo ? `<p style="font-weight:bold;margin-bottom:5px">${data.titulo}</p>` : ''}
  ${data.descricaoNecessidade ? `<p style="font-size:11px;margin-bottom:10px;white-space:pre-wrap">${data.descricaoNecessidade}</p>` : ''}

  <table class="linhas">
    <thead><tr>
      <th>Referência</th><th>Designação</th><th>Quantidade</th><th>Uni.</th><th>Observação</th>
    </tr></thead>
    <tbody>${linhasHtml || `<tr><td colspan="5" style="padding:12px;text-align:center;color:#888;font-size:11px">Sem artigos descritos</td></tr>`}</tbody>
  </table>

  <div class="rodape">
    ${data.condicoesGerais ? `<p><strong>Condições gerais:</strong><br/>${data.condicoesGerais}</p>` : ''}
    ${data.validadeTexto ? `<p><strong>Validade da proposta:</strong><br/>${data.validadeTexto}</p>` : ''}
    ${data.condicoesPagamento ? `<p><strong>Condições de pagamento:</strong><br/>${data.condicoesPagamento}</p>` : ''}
    ${data.observacoes ? `<p><strong>Observações:</strong><br/>${data.observacoes}</p>` : ''}
  </div>

  <div class="assinaturas">
    <div>Cliente</div>
    <div>Assinatura e carimbo</div>
    <div>${cfg.nomeDocumento}</div>
  </div>

  <p class="nota" style="text-align:center;margin-top:25px">Este documento é um Pedido de Orçamento e não serve de fatura.</p>

  <div class="emails">
    ${cfg.emailsRodape.split('|').map(e => e.trim()).filter(Boolean).join(' &nbsp;|&nbsp; ')}<br/>
    ${cfg.telefones}<br/>
    Sede: ${cfg.morada}, ${cfg.codigoPostal} ${cfg.localidade}
  </div>

  <script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
