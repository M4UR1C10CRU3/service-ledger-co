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
  const consoantes = input.toUpperCase().replace(/[^A-ZÇ]/g, '').replace(/[AEIOU]/g, '');
  if (consoantes.length >= 3) return consoantes.slice(0, 3);
  return input.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X');
}

function toSentenceCase(s: string): string {
  const lower = s.toLocaleLowerCase('pt-PT');
  return lower.charAt(0).toLocaleUpperCase('pt-PT') + lower.slice(1);
}

export type PropostaPdfMode = 'unitarios' | 'subtotais' | 'global';

const MODE_SUFFIX: Record<PropostaPdfMode, string> = {
  unitarios: 'Preços Unitários',
  subtotais: 'Subtotais',
  global: 'Valor Global',
};

function buildPropostaFilename(data: { numeroProposta: string }, mode: PropostaPdfMode = 'unitarios'): string {
  const raw = (data.numeroProposta || '').replace(/[\\:*?"<>|]/g, '').trim();
  const numero = raw.replace(/^WMTCEC\s*/i, '').trim();
  return `Proposta WMTCEC ${numero}_${MODE_SUFFIX[mode]}`;
}

export function exportPropostaPdf(data: PdfData, empresa: any, logoDataUrl?: string) {
  const primaryColor = empresa?.corPrimaria || '#E8630A';
  const cfg = getEmpresaDocConfig(empresa?.slug);

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

  const filename = buildPropostaFilename(data);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1A1A1A; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
  .assinaturas { margin-top: 30px; display: flex; justify-content: space-between; gap: 20px; }
  .assinaturas div { border-top: 1px solid #333; padding-top: 8px; flex: 1; text-align: center; font-size: 10px; line-height: 1.8; }
  .page-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9.5px; color: #1A1A1A; line-height: 1.7; padding: 10px 15mm; background: #FFF3E8; border-top: 3px solid ${primaryColor}; }
  .page-footer .legal { font-style: italic; margin-bottom: 6px; color: ${primaryColor}; font-weight: 600; font-size: 10px; }
  .page-footer .contact-line { color: #1A1A1A; }
  .page-footer .accent { color: ${primaryColor}; font-weight: 600; }
  @media print { body { padding: 0; padding-bottom: 95px; } .page-footer { position: fixed; bottom: 0; } }
</style></head><body>
  <div class="header">
    <div class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="${cfg.nomeDocumento}" />` : `<strong style="font-size:16px;color:${primaryColor}">${cfg.nomeDocumento}</strong>`}</div>
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

  <div class="phc-note">Liberty Empresas — Vers. 1.0 — Este documento não serve de fatura</div>

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
    <div>Cliente:<br/>&nbsp;<br/>Assinatura se aceite.</div>
    <div>${cfg.nomeDocumento}<br/>&nbsp;<br/>Assinatura e carimbo.</div>
  </div>

  <div class="page-footer">
    <div class="legal">Este documento é uma Pré-Proposta e não serve de fatura.</div>
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
