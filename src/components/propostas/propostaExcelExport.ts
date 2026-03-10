import * as XLSX from 'xlsx';
import type { PropostaLinhaForm } from '@/types/proposta';
import type { Proposta } from '@/types/proposta';

interface ExcelData {
  numeroProposta: string;
  clienteNome: string;
  clienteMorada: string;
  clienteNif: string;
  vendedorNome: string;
  dataEmissao: string;
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

function getSubtotal(linhas: PropostaLinhaForm[], idx: number): number {
  let sum = 0;
  for (let i = idx - 1; i >= 0; i--) {
    if (linhas[i].tipoLinha === 'seccao' || linhas[i].tipoLinha === 'subtotal') break;
    if (linhas[i].tipoLinha === 'artigo') sum += linhas[i].totalLinha;
  }
  return sum;
}

export function exportPropostaExcel(data: ExcelData) {
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [];

  // Header
  rows.push(['TUDO CASA — WARM LDA']);
  rows.push(['Rua Eng. Machado Vaz Nº 8, 5370-440 Mirandela']);
  rows.push(['Contribuinte Nº: 518307174']);
  rows.push([]);
  rows.push(['Pre-Proposta Nº:', data.numeroProposta]);
  rows.push(['Data Emissão:', data.dataEmissao ? new Date(data.dataEmissao).toLocaleDateString('pt-PT') : '']);
  rows.push(['Vendedor:', data.vendedorNome]);
  rows.push([]);
  rows.push(['Cliente:', data.clienteNome]);
  rows.push(['Morada:', data.clienteMorada]);
  rows.push(['NIF:', data.clienteNif]);
  rows.push([]);

  if (data.titulo) rows.push(['Trabalhos a executar:', data.titulo]);
  if (data.descricaoGeral) rows.push([data.descricaoGeral]);
  rows.push([]);

  // Table header
  const headerRow = rows.length;
  rows.push(['Referência', 'Designação', 'Quantidade', 'Uni.', 'Preço Unitário', 'Descontos (%)', 'Total']);

  // Lines
  data.linhas.forEach((l, i) => {
    if (l.tipoLinha === 'seccao') {
      rows.push([l.designacao || '', '', '', '', '', '', '']);
    } else if (l.tipoLinha === 'subtotal') {
      const sub = getSubtotal(data.linhas, i);
      rows.push(['', '', '', '', '', 'Subtotal', sub]);
    } else if (l.tipoLinha === 'texto') {
      rows.push([l.designacao || '', '', '', '', '', '', '']);
    } else {
      rows.push([
        l.referencia || '',
        l.designacao || '',
        l.quantidade,
        l.unidade,
        l.precoUnitario,
        l.descontoPct > 0 ? l.descontoPct : '',
        l.totalLinha,
      ]);
    }
  });

  rows.push([]);
  rows.push(['', '', '', '', '', 'Total sem IVA:', data.totalSemIva]);
  rows.push(['', '', '', '', '', `IVA (${data.taxaIva}%):`, data.valorIva]);
  rows.push(['', '', '', '', '', 'Total com IVA:', data.totalComIva]);
  rows.push([]);

  if (data.condicoesGerais) rows.push(['Condições gerais:', data.condicoesGerais]);
  if (data.validadeTexto) rows.push(['Validade:', data.validadeTexto]);
  if (data.duracao) rows.push(['Duração:', data.duracao]);
  if (data.condicoesPagamento) rows.push(['Condições pagamento:', data.condicoesPagamento]);
  if (data.observacoes) rows.push(['Observações:', data.observacoes]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: headerRow + 1 };

  XLSX.utils.book_append_sheet(wb, ws, 'Proposta');
  XLSX.writeFile(wb, `Proposta_${data.numeroProposta}.xlsx`);
}

export function exportPropostaExcelList(propostas: Proposta[]) {
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [
    ['Nº Proposta', 'Cliente', 'Data Emissão', 'Validade', 'Total c/ IVA', 'Estado'],
  ];

  propostas.forEach(p => {
    rows.push([
      p.numeroProposta,
      p.clienteNome || '',
      p.dataEmissao ? new Date(p.dataEmissao).toLocaleDateString('pt-PT') : '',
      p.dataValidade ? new Date(p.dataValidade).toLocaleDateString('pt-PT') : '',
      p.totalComIva,
      p.estado,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Propostas');
  XLSX.writeFile(wb, `Lista_Propostas_${new Date().toISOString().split('T')[0]}.xlsx`);
}
