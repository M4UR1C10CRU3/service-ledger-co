import { useState } from 'react';
import { ServiceWithCalculations } from '@/types/service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { FileText, Download } from 'lucide-react';
import logoObrajusta from '@/assets/logo-obrajusta.png';

interface ReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: ServiceWithCalculations[];
  isLoading?: boolean;
}

type ReportType = 
  | 'faturados' 
  | 'nao-faturados' 
  | 'geral' 
  | 'movimento-mensal'
  | 'projecao';

export const ReportsDialog = ({ open, onOpenChange, services, isLoading = false }: ReportsDialogProps) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('faturados');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleExportPDF = () => {
    // Trigger browser print dialog with custom print styles
    window.print();
  };

  const getReportTitle = () => {
    switch (selectedReport) {
      case 'faturados':
        return 'Relatório de Valores Faturados';
      case 'nao-faturados':
        return 'Relatório de Valores Não Faturados';
      case 'geral':
        return 'Relatório Geral Mensal';
      case 'movimento-mensal':
        return 'Relatório de Movimento Mensal';
      case 'projecao':
        return 'Relatório de Projeção de Valores a Realizar';
      default:
        return 'Relatório Financeiro';
    }
  };

  const getValoresFaturadosTable = () => {
    const { clientData, totals } = getValoresFaturadosReport();
    return (
      <Card>
        <CardHeader>
          <CardTitle>Valores Faturados por Cliente</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Cliente</TableHead>
                <TableHead>Nº Faturas</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Liquidado</TableHead>
                <TableHead>Em Dívida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientData.map((item) => (
                <TableRow key={item.cliente}>
                  <TableCell className="font-medium">{item.cliente}</TableCell>
                  <TableCell>{item.nFaturas}</TableCell>
                  <TableCell>{formatCurrency(item.valorTotal)}</TableCell>
                  <TableCell>{formatCurrency(item.liquidado)}</TableCell>
                  <TableCell>{formatCurrency(item.emDebito)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={1}></TableCell>
                <TableCell>Total:</TableCell>
                <TableCell>{formatCurrency(totals.valorTotal)}</TableCell>
                <TableCell>{formatCurrency(totals.liquidado)}</TableCell>
                <TableCell>{formatCurrency(totals.emDebito)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const getValoresNaoFaturadosTable = () => {
    const { clientData, totals } = getValoresNaoFaturadosReport();
    return (
      <Card>
        <CardHeader>
          <CardTitle>Valores Não Faturados por Cliente</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Cliente</TableHead>
                <TableHead>Nº Serviços</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Liquidado</TableHead>
                <TableHead>Em Dívida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientData.map((item) => (
                <TableRow key={item.cliente}>
                  <TableCell className="font-medium">{item.cliente}</TableCell>
                  <TableCell>{item.nServicos}</TableCell>
                  <TableCell>{formatCurrency(item.valorTotal)}</TableCell>
                  <TableCell>{formatCurrency(item.liquidado)}</TableCell>
                  <TableCell>{formatCurrency(item.emDebito)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={1}></TableCell>
                <TableCell>Total:</TableCell>
                <TableCell>{formatCurrency(totals.valorTotal)}</TableCell>
                <TableCell>{formatCurrency(totals.liquidado)}</TableCell>
                <TableCell>{formatCurrency(totals.emDebito)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const getRelatorioGeralTable = () => {
    const { monthData, totals } = getRelatorioGeralReport();
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório Geral Mensal</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Mês</TableHead>
                <TableHead>Faturados (Dívida)</TableHead>
                <TableHead>Faturados (Liquidado)</TableHead>
                <TableHead>Não Faturados (Dívida)</TableHead>
                <TableHead>Não Faturados (Liquidado)</TableHead>
                <TableHead>Projeção a Realizar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthData.map((item) => (
                <TableRow key={item.mes}>
                  <TableCell className="font-medium">{item.mes}</TableCell>
                  <TableCell>{formatCurrency(item.faturadosDebito)}</TableCell>
                  <TableCell>{formatCurrency(item.faturadosLiquidado)}</TableCell>
                  <TableCell>{formatCurrency(item.naoFaturadosDebito)}</TableCell>
                  <TableCell>{formatCurrency(item.naoFaturadosLiquidado)}</TableCell>
                  <TableCell>{formatCurrency(item.projecaoARealizar)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={1}></TableCell>
                <TableCell>Total:</TableCell>
                <TableCell>{formatCurrency(totals.faturadosDebito)}</TableCell>
                <TableCell>{formatCurrency(totals.faturadosLiquidado)}</TableCell>
                <TableCell>{formatCurrency(totals.naoFaturadosDebito)}</TableCell>
                <TableCell>{formatCurrency(totals.naoFaturadosLiquidado)}</TableCell>
                <TableCell>{formatCurrency(totals.projecaoARealizar)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const getMovimentoMensalTable = () => {
    const monthData = getMovimentoMensalReport();
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movimento Mensal</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Mês</TableHead>
                <TableHead>Valor Liquidado</TableHead>
                <TableHead>Valor Em Dívida</TableHead>
                <TableHead>Nº Serviços</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthData.map((item) => (
                <TableRow key={item.mes}>
                  <TableCell className="font-medium">{item.mes}</TableCell>
                  <TableCell>{formatCurrency(item.valorLiquidado)}</TableCell>
                  <TableCell>{formatCurrency(item.valorEmDebito)}</TableCell>
                  <TableCell>{item.nServicos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const getProjecaoValoresTable = () => {
    const { clientData, totals } = getProjecaoValoresReport();
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projeção de Valores a Realizar</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Cliente</TableHead>
                <TableHead>Valor Contratado</TableHead>
                <TableHead>Valor Faturado</TableHead>
                <TableHead>Valor a Realizar</TableHead>
                <TableHead>Nº Contratos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientData.map((item) => (
                <TableRow key={item.cliente}>
                  <TableCell className="font-medium">{item.cliente}</TableCell>
                  <TableCell>{formatCurrency(item.valorContratado)}</TableCell>
                  <TableCell>{formatCurrency(item.valorFaturado)}</TableCell>
                  <TableCell>{formatCurrency(item.valorARealizar)}</TableCell>
                  <TableCell>{item.nContratos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={1}></TableCell>
                <TableCell>Total:</TableCell>
                <TableCell>{formatCurrency(totals.valorContratado)}</TableCell>
                <TableCell>{formatCurrency(totals.valorFaturado)}</TableCell>
                <TableCell>{formatCurrency(totals.valorARealizar)}</TableCell>
                <TableCell>{totals.nContratos}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const renderReport = () => {
    if (isLoading) {
      return <p>A carregar dados...</p>;
    }
    switch (selectedReport) {
      case 'faturados':
        return getValoresFaturadosTable();
      case 'nao-faturados':
        return getValoresNaoFaturadosTable();
      case 'geral':
        return getRelatorioGeralTable();
      case 'movimento-mensal':
        return getMovimentoMensalTable();
      case 'projecao':
        return getProjecaoValoresTable();
      default:
        return null;
    }
    return null;
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
            background: white;
          }
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
          }
          .print-logo {
            max-width: 150px;
            height: auto;
          }
          .company-info {
            text-align: right;
            font-size: 10pt;
            line-height: 1.4;
          }
          .company-name {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .report-title {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            margin: 20px 0;
            color: #333;
          }
          .report-date {
            text-align: right;
            font-size: 9pt;
            margin-bottom: 20px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 9pt;
          }
          table th {
            background-color: #f0f0f0;
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-weight: bold;
          }
          table td {
            border: 1px solid #ddd;
            padding: 8px;
          }
          tfoot td {
            background-color: #f8f8f8;
            font-weight: bold;
          }
          .print-footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 8pt;
            color: #666;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="no-print">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-6 h-6" />
              Relatórios Financeiros
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-b no-print">
            <div className="w-full sm:w-auto">
              <Label className="text-sm font-medium mb-2 block">Tipo de Relatório</Label>
              <Select value={selectedReport} onValueChange={(value: ReportType) => setSelectedReport(value)}>
                <SelectTrigger className="w-full sm:w-[350px] bg-background border-2">
                  <SelectValue placeholder="Selecione o tipo de relatório" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  <SelectItem value="faturados">📊 Valores Faturados</SelectItem>
                  <SelectItem value="nao-faturados">📋 Valores Não Faturados</SelectItem>
                  <SelectItem value="geral">📈 Relatório Geral Mensal</SelectItem>
                  <SelectItem value="movimento-mensal">📅 Movimento Mensal</SelectItem>
                  <SelectItem value="projecao">🎯 Projeção de Valores a Realizar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="default" className="w-full sm:w-auto" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
          <ScrollArea className="flex-1 pr-4">
            <div id="printable-report">
              <div className="print-header">
                <img src={logoObrajusta} alt="Obrajusta II" className="print-logo" />
                <div className="company-info">
                  <div className="company-name">Obrajusta II</div>
                  <div>Gestão de Serviços Jurídicos</div>
                  <div>NIF: [Número de Identificação Fiscal]</div>
                  <div>Email: contato@obrajusta.pt</div>
                  <div>Tel: +351 XXX XXX XXX</div>
                </div>
              </div>
              <h1 className="report-title">{getReportTitle()}</h1>
              <div className="report-date">
                Data de Emissão: {new Date().toLocaleDateString('pt-PT', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="py-4">{renderReport()}</div>
              <div className="print-footer">
                <p>Este documento foi gerado automaticamente pelo sistema de gestão Obrajusta II</p>
                <p>© {new Date().getFullYear()} Obrajusta II - Todos os direitos reservados</p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

const getValoresFaturadosReport = () => {
  return { clientData: [], totals: { nFaturas: 0, valorTotal: 0, liquidado: 0, emDebito: 0 } };
};

const getValoresNaoFaturadosReport = () => {
  return { clientData: [], totals: { valorTotal: 0, liquidado: 0, emDebito: 0, nServicos: 0 } };
};

const getRelatorioGeralReport = () => {
  return { monthData: [], totals: { faturadosDebito: 0, faturadosLiquidado: 0, naoFaturadosDebito: 0, naoFaturadosLiquidado: 0, projecaoARealizar: 0 } };
};

const getMovimentoMensalReport = () => {
  return [];
};

const getProjecaoValoresReport = () => {
  return { clientData: [], totals: { valorContratado: 0, valorFaturado: 0, valorARealizar: 0, nContratos: 0 } };
};
