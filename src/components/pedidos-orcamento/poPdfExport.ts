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

// Mapa de códigos de localidade (3 letras maiúsculas) por concelho
const LOCALIDADE_CODIGOS: Record<string, string> = {
  'mirandela': 'MDL',
  'bragança': 'BGC', 'braganca': 'BGC',
  'macedo de cavaleiros': 'MCD', 'macedo': 'MCD',
  'vila real': 'VRL',
  'porto': 'PRT',
  'lisboa': 'LSB',
  'vinhais': 'VNH',
  'chaves': 'CHV',
  'mogadouro': 'MGD',
  'vimioso': 'VMS',
  'miranda do douro': 'MDR',
  'alfândega da fé': 'ALF', 'alfandega da fe': 'ALF',
  'carrazeda de ansiães': 'CRZ', 'carrazeda': 'CRZ',
  'torre de moncorvo': 'TMC',
  'freixo de espada à cinta': 'FEC', 'freixo': 'FEC',
  'valpaços': 'VLP', 'valpacos': 'VLP',
  'murça': 'MRC', 'murca': 'MRC',
};

function getLocalidadeCodigo(input?: string): string {
  if (!input) return 'XXX';
  const lower = input.toLowerCase().trim();
  for (const [nome, code] of Object.entries(LOCALIDADE_CODIGOS)) {
    if (lower.includes(nome)) return code;
  }
  // Fallback: primeiras 3 consoantes maiúsculas
  const consoantes = input.toUpperCase().replace(/[^A-ZÇ]/g, '').replace(/[AEIOU]/g, '');
  if (consoantes.length >= 3) return consoantes.slice(0, 3);
  // Fallback final: primeiras 3 letras
  return input.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X');
}

function buildPoFilename(data: { numeroPo: string; clienteNome: string; titulo: string; localExecucao?: string; clienteMorada?: string }): string {
  const sanitize = (s: string) => (s || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  const numero = (data.numeroPo || '').replace(/[\\:*?"<>|]/g, '').replace(/\//g, '-').trim();
  const cliente = sanitize(data.clienteNome) || 'Cliente';
  const titulo = sanitize(data.titulo) || 'Serviço';
  const localFonte = data.localExecucao || data.clienteMorada || '';
  const localCode = getLocalidadeCodigo(localFonte);
  return `${numero}_${cliente}_${titulo}_${localCode}`;
}

export function exportPoPdf(data: PdfData, empresa: any, logoDataUrl?: string) {
  const primaryColor = empresa?.corPrimaria || '#E8630A';
  const cfg = getEmpresaDocConfig(empresa?.slug);

  const dataFormatted = data.dataEmissao
    ? new Date(data.dataEmissao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
    : '';

  const linhasParaRender = data.linhas && data.linhas.length > 0
    ? data.linhas
    : [{ tipoLinha: 'artigo', referencia: '', designacao: '', quantidade: 1, unidade: 'und', observacaoLinha: '' } as POLinhaForm];

  let linhasHtml = '';
  linhasParaRender.forEach((l, i) => {
    if (l.tipoLinha === 'seccao') {
      linhasHtml += `<tr style="background:#F2F2F2"><td colspan="5" style="padding:6px 8px;font-weight:bold;color:${primaryColor};font-size:11px">${l.designacao || ''}</td></tr>`;
    } else if (l.tipoLinha === 'texto') {
      linhasHtml += `<tr><td colspan="5" style="padding:4px 8px;font-style:italic;color:#666;font-size:11px">${l.designacao || ''}</td></tr>`;
    } else {
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
      linhasHtml += `<tr style="background:${bg}">
        <td style="padding:5px 8px;font-size:11px;text-align:left">${l.referencia || ''}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:left">${l.designacao || ''}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:right">${fmtQty(l.quantidade)}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:center">${l.unidade}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:left">${l.observacaoLinha || ''}</td>
      </tr>`;
    }
  });

  const showObra = !!(data.obra && data.obra.trim());
  const showContacto = !!(data.clienteTelefone || data.clienteEmail);

  const filename = buildPoFilename(data);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1A1A1A; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 20px; }
  .header-left { flex: 1; }
  .header-right { text-align: right; flex: 1; }
  .logo img { max-height: 80px; margin-bottom: 8px; }
  .empresa-info { font-size: 10px; line-height: 1.6; color: #1A1A1A; }
  .doc-meta { font-size: 9px; color: #888; font-style: italic; }
  .doc-title { font-weight: bold; font-size: 16px; color: #1A1A1A; margin: 4px 0 2px; }
  .doc-original { font-size: 11px; color: #555; margin-bottom: 10px; }
  .cliente-bloco { font-size: 11px; font-weight: bold; line-height: 1.6; color: #1A1A1A; }
  .barra-cor { background: ${primaryColor}; color: white; padding: 6px 12px; display: flex; justify-content: space-between; font-size: 10px; margin: 10px 0; }
  .obra-box { background: #FFF3E8; border-left: 3px solid ${primaryColor}; padding: 8px 12px; margin-bottom: 10px; font-size: 11px; color: #1A1A1A; }
  .obra-box strong { color: ${primaryColor}; font-weight: bold; }
  .titulo-tabela { font-weight: bold; font-size: 12px; margin-bottom: 6px; }
  .descricao-necessidade { font-style: italic; font-size: 10px; color: #666; margin-bottom: 8px; }
  .contacto-box { font-size: 10px; margin-bottom: 8px; line-height: 1.5; }
  .contacto-box strong { display: block; margin-bottom: 2px; }
  table.linhas { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  table.linhas th { background: ${primaryColor}; color: white; padding: 6px 8px; font-size: 11px; font-weight: bold; }
  table.linhas th.col-ref { text-align: left; }
  table.linhas th.col-des { text-align: left; }
  table.linhas th.col-qtd { text-align: right; }
  table.linhas th.col-uni { text-align: center; }
  table.linhas th.col-obs { text-align: left; }
  .rodape { display: flex; gap: 20px; margin-top: 10px; }
  .rodape-esq { flex: 2; font-size: 10px; line-height: 1.8; }
  .rodape-esq p { margin: 4px 0; }
  .rodape-esq strong { font-weight: bold; }
  .rodape-dir { flex: 1; border: 1px solid #CCCCCC; min-height: 80px; }
  .assinaturas { margin-top: 30px; display: flex; justify-content: space-between; gap: 20px; }
  .assinaturas div { border-top: 1px solid #333; padding-top: 8px; flex: 1; text-align: center; font-size: 10px; line-height: 1.8; }
  .nota-legal { text-align: center; font-size: 9px; font-style: italic; color: ${primaryColor}; margin-top: 15px; }
  .page-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9.5px; color: #1A1A1A; line-height: 1.7; padding: 10px 15mm; background: #FFF3E8; border-top: 3px solid ${primaryColor}; }
  .page-footer .legal { font-style: italic; margin-bottom: 6px; color: ${primaryColor}; font-weight: 600; font-size: 10px; }
  .page-footer .contact-line { color: #1A1A1A; }
  .page-footer .accent { color: ${primaryColor}; font-weight: 600; }
  @media print { body { padding: 0; padding-bottom: 95px; } .page-footer { position: fixed; bottom: 0; } }
</style></head><body>
  <div class="header">
    <div class="header-left">
      <div class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="${cfg.nomeDocumento}" />` : `<strong style="font-size:18px;color:${primaryColor}">${cfg.nomeDocumento}</strong>`}</div>
      <div class="empresa-info">
        ${cfg.nomeDocumento}<br/>
        ${cfg.morada}<br/>
        ${cfg.codigoPostal} ${cfg.localidade}<br/>
        Contribuinte Nº: ${cfg.contribuinte}<br/>
        ${cfg.telefones}
      </div>
    </div>
    <div class="header-right">
      <div class="doc-meta">Documento interno — não fiscal</div>
      <div class="doc-title">Pedido de Orçamento Nº ${data.numeroPo}</div>
      <div class="doc-original">ORIGINAL</div>
      <div class="cliente-bloco">
        ${data.clienteNome || ''}<br/>
        ${data.clienteMorada ? data.clienteMorada + '<br/>' : ''}
        ${data.clienteNif ? 'NIF: ' + data.clienteNif + '<br/>' : ''}
        ${data.clienteTelefone ? 'Tel: ' + data.clienteTelefone + '<br/>' : ''}
        ${data.clienteEmail || ''}
      </div>
    </div>
  </div>

  <div class="barra-cor">
    <span>Data: ${dataFormatted}</span>
    <span>Hora: ${data.horaEmissao || ''}</span>
    <span>Responsável: ${data.vendedorNome || '—'}</span>
    <span>V/Nº Contribuinte: ${data.clienteNif || '—'}</span>
  </div>

  ${showObra ? `<div class="obra-box">
    <strong>Obra:</strong> ${data.obra}${data.localExecucao ? ` &nbsp;|&nbsp; <strong>Local:</strong> ${data.localExecucao}` : ''}${data.duracaoObra ? ` &nbsp;|&nbsp; <strong>Duração prevista:</strong> ${data.duracaoObra}` : ''}
  </div>` : ''}

  ${data.titulo ? `<div class="titulo-tabela">${data.titulo}</div>` : ''}
  ${data.descricaoNecessidade ? `<div class="descricao-necessidade">${data.descricaoNecessidade.replace(/\n/g, '<br/>')}</div>` : ''}

  ${showContacto ? `<div class="contacto-box">
    <strong>CONTACTO</strong>
    ${data.clienteTelefone ? `Telemóvel: ${data.clienteTelefone}${data.clienteNome ? ' ' + data.clienteNome : ''}<br/>` : ''}
    ${data.clienteEmail ? `E-mail: ${data.clienteEmail}` : ''}
  </div>` : ''}

  <table class="linhas">
    <thead><tr>
      <th class="col-ref">Referência</th>
      <th class="col-des">Designação</th>
      <th class="col-qtd">Quantidade</th>
      <th class="col-uni">Uni.</th>
      <th class="col-obs">Observação</th>
    </tr></thead>
    <tbody>${linhasHtml}</tbody>
  </table>

  <div class="rodape">
    <div class="rodape-esq">
      ${data.condicoesGerais ? `<p><strong>Condições gerais:</strong><br/>${data.condicoesGerais.replace(/\n/g, '<br/>')}</p>` : ''}
      ${data.validadeTexto ? `<p><strong>Validade da proposta:</strong><br/>${data.validadeTexto}</p>` : ''}
      ${data.duracaoObra ? `<p><strong>Duração:</strong><br/>${data.duracaoObra}</p>` : ''}
      ${data.condicoesPagamento ? `<p><strong>Condições de pagamento:</strong><br/>${data.condicoesPagamento.replace(/\n/g, '<br/>')}</p>` : ''}
      ${data.observacoes ? `<p><strong>Observações:</strong><br/>${data.observacoes.replace(/\n/g, '<br/>')}</p>` : ''}
    </div>
    <div class="rodape-dir"></div>
  </div>

  <div class="assinaturas">
    <div>Cliente:<br/>&nbsp;<br/>Assinatura se aceite.</div>
    <div>${cfg.nomeDocumento}<br/>&nbsp;<br/>Assinatura e carimbo.</div>
  </div>

  <div class="page-footer">
    <div class="legal">Este documento é um Pedido de Orçamento e não serve de fatura.</div>
    <div class="contact-line"><span class="accent">${cfg.emailsRodape.split('|').map(e => e.trim()).filter(Boolean).join('</span>&nbsp;|&nbsp;<span class="accent">')}</span></div>
    <div class="contact-line">${cfg.telefones.replace(/(\d[\d\s]+)/g, '<span class="accent">$1</span>')}</div>
    <div class="contact-line"><span class="accent">Sede:</span> ${cfg.morada}, ${cfg.codigoPostal} ${cfg.localidade}</div>
  </div>

  <script>
    document.title = ${JSON.stringify(filename)};
    window.addEventListener('load', function(){
      document.title = ${JSON.stringify(filename)};
      setTimeout(function(){
        document.title = ${JSON.stringify(filename)};
        window.print();
      }, 300);
    });
    window.addEventListener('afterprint', function(){ document.title = ${JSON.stringify(filename)}; });
  </script>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
    try { w.document.title = filename; } catch (e) {}
  }
}
