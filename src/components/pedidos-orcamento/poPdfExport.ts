import type { POLinhaForm } from '@/types/pedidoOrcamento';
import { getEmpresaDocConfig } from '@/lib/empresaConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const consoantes = input.toUpperCase().replace(/[^A-ZÇ]/g, '').replace(/[AEIOU]/g, '');
  if (consoantes.length >= 3) return consoantes.slice(0, 3);
  return input.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X');
}

function toSentenceCase(s: string): string {
  const lower = s.toLocaleLowerCase('pt-PT');
  return lower.charAt(0).toLocaleUpperCase('pt-PT') + lower.slice(1);
}

function buildPoFilename(data: {
  numeroPo: string; clienteNome: string; titulo: string;
  localExecucao?: string; clienteMorada?: string;
}): string {
  const sanitize = (s: string) =>
    (s || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  const numero = (data.numeroPo || '').replace(/[\\:*?"<>|]/g, '').replace(/\//g, '-').trim();
  const cliente = sanitize(data.clienteNome) || 'Cliente';
  const titulo = toSentenceCase(sanitize(data.titulo) || 'Serviço');
  const localCode = getLocalidadeCodigo(data.localExecucao || data.clienteMorada || '');
  return `${numero}_${cliente}_${titulo}_${localCode}`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function exportPoPdf(data: PdfData, empresa: any, logoDataUrl?: string) {
  const primaryColor = empresa?.corPrimaria || '#E8630A';
  const cfg = getEmpresaDocConfig(empresa?.slug);

  const filename = buildPoFilename(data);

  const dataFormatted = data.dataEmissao
    ? new Date(data.dataEmissao)
        .toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
        .replace(/\//g, '.')
    : '';

  // ── Table rows ──────────────────────────────────────────────────────────────
  const linhasParaRender = data.linhas && data.linhas.length > 0
    ? data.linhas
    : [{ tipoLinha: 'artigo', referencia: '', designacao: '', quantidade: 1, unidade: 'un', observacaoLinha: '' } as POLinhaForm];

  let linhasHtml = '';
  linhasParaRender.forEach((l, i) => {
    if (l.tipoLinha === 'seccao') {
      linhasHtml += `<tr style="background:#F2F2F2">
        <td colspan="5" style="padding:6px 8px;font-weight:bold;color:${primaryColor};font-size:11px">${l.designacao || ''}</td>
      </tr>`;
    } else if (l.tipoLinha === 'texto') {
      linhasHtml += `<tr>
        <td colspan="5" style="padding:4px 8px;font-style:italic;color:#555;font-size:10px">${l.designacao || ''}</td>
      </tr>`;
    } else {
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
      linhasHtml += `<tr style="background:${bg}">
        <td style="padding:4px 8px;font-size:11px;color:#555">${l.referencia || ''}</td>
        <td style="padding:4px 8px;font-size:11px">${l.designacao || ''}</td>
        <td style="padding:4px 8px;text-align:right;font-size:11px">${fmtQty(l.quantidade)}</td>
        <td style="padding:4px 8px;text-align:center;font-size:11px">${l.unidade}</td>
        <td style="padding:4px 8px;font-size:10px;color:#666">${l.observacaoLinha || ''}</td>
      </tr>`;
    }
  });

  const th = `background:${primaryColor};color:white;padding:6px 8px;font-size:11px;font-weight:bold;border:none`;
  const showObra = !!(data.obra && data.obra.trim());

  const condicoesGerais  = data.condicoesGerais  || 'O valor a indicar deverá ser acrescido de IVA à taxa legal em vigor.';
  const validadeTexto    = data.validadeTexto    || 'Proposta tem validade de 30 dias, sujeita a rectificação após esse prazo.';
  const condicoesPag     = data.condicoesPagamento || 'Pagamento conforme acordo comercial em vigor.';

  const emails = cfg.emailsRodape.split('|').map((e: string) => e.trim()).filter(Boolean);

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
      <div style="font-size:11px">Pedido de Orçamento &nbsp;Nº &nbsp;&nbsp;<strong style="font-size:14px">${data.numeroPo}</strong></div>
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
      ${data.clienteNif ? 'NIF: ' + data.clienteNif + '<br/>' : ''}
      ${data.clienteTelefone ? 'Tel: ' + data.clienteTelefone + '<br/>' : ''}
      ${data.clienteEmail ? data.clienteEmail : ''}
    </div>
  </div>

  <!-- Section heading -->
  <p style="font-weight:bold;font-style:italic;margin:8px 0 4px;font-size:12px">Materiais / Serviços a orçamentar:</p>

  <!-- Colored bar -->
  <div style="background:${primaryColor};color:white;padding:6px 12px;display:flex;justify-content:space-between;align-items:flex-start;font-size:10px">
    <div>
      <strong>Data de emissão :</strong>&nbsp;${dataFormatted}<br/>
      Hora de emissão :&nbsp;${data.horaEmissao || ''}
    </div>
    <span><strong>Responsável:</strong>&nbsp;${data.vendedorNome || '—'}</span>
    <span><strong>V/Nº Contribuinte:</strong>&nbsp;${data.clienteNif || '—'}</span>
  </div>

  <!-- System note -->
  <div style="font-size:9px;font-style:italic;color:#888;padding:3px 0 5px;border-bottom:1px solid #E0E0E0;margin-bottom:6px">
    Clariza Manager — Sistema de Gestão Empresarial — Este documento não serve de fatura
  </div>

  ${showObra ? `<div style="background:#FFF3E8;border-left:3px solid ${primaryColor};padding:8px 12px;margin-bottom:8px;font-size:11px">
    <strong style="color:${primaryColor}">Obra:</strong> ${data.obra}
    ${data.localExecucao ? ` &nbsp;|&nbsp; <strong style="color:${primaryColor}">Local:</strong> ${data.localExecucao}` : ''}
    ${data.duracaoObra ? ` &nbsp;|&nbsp; <strong style="color:${primaryColor}">Duração prevista:</strong> ${data.duracaoObra}` : ''}
  </div>` : ''}

  ${data.titulo ? `<p style="font-weight:bold;font-size:12px;margin:0 0 4px">${data.titulo}</p>` : ''}
  ${data.descricaoNecessidade ? `<p style="font-size:10px;font-style:italic;color:#666;margin:0 0 8px">${data.descricaoNecessidade.replace(/\n/g, '<br/>')}</p>` : ''}

  <!-- Items table (5 columns — no prices, request document) -->
  <table class="linhas">
    <thead>
      <tr>
        <th style="${th};text-align:left;width:12%">Referência</th>
        <th style="${th};text-align:left">Designação</th>
        <th style="${th};text-align:right;width:10%">Quantidade</th>
        <th style="${th};text-align:center;width:7%">Uni.</th>
        <th style="${th};text-align:left;width:20%">Observação</th>
      </tr>
    </thead>
    <tbody>${linhasHtml}</tbody>
  </table>

  <!-- Footer: Conditions (left) + Empty box (right, for supplier's quote) -->
  <div style="display:flex;gap:14px;margin-top:10px;align-items:flex-start">

    <div style="flex:1;background:#F5F5F5;border:1px solid #E0E0E0;padding:8px 12px;font-size:10px;line-height:1.7">
      <p style="margin:2px 0"><strong>Como condições gerais teremos:</strong></p>
      <p style="margin:2px 0">${condicoesGerais}</p>
      <p style="margin:4px 0 2px"><strong>Validade da proposta:</strong><br/>${validadeTexto}</p>
      ${data.duracaoObra ? `<p style="margin:2px 0"><strong>Duração:</strong><br/>${data.duracaoObra}</p>` : ''}
      <p style="margin:2px 0"><strong>Condições de pagamento:</strong><br/>${condicoesPag}</p>
      ${data.observacoes ? `<p style="margin:2px 0"><strong>Observações:</strong><br/>${data.observacoes.replace(/\n/g, '<br/>')}</p>` : ''}
    </div>

    <div style="width:230px;border:1px solid #E0E0E0;min-height:80px;padding:8px 12px;font-size:10px;color:#999;font-style:italic">
      Resposta / Proposta de preço do fornecedor
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
