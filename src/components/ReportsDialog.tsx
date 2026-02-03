import { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
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

type StatusFilter = 'todos' | 'debitos' | 'liquidados';
type DebitoTimeFilter = 'todos' | 'ate30' | '31a90' | 'acima90';

const REPORT_TITLES: Record<ReportType, string> = {
  'faturados': 'Valores Faturados',
  'nao-faturados': 'Valores Não Faturados',
  'geral': 'Relatório Geral Mensal',
  'movimento-mensal': 'Movimento Mensal',
  'projecao': 'Projeção de Valores a Realizar',
};

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export const ReportsDialog = ({ open, onOpenChange, services, isLoading = false }: ReportsDialogProps) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('faturados');
  const [userName, setUserName] = useState<string>('');
  
  // Novos filtros
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [debitoTimeFilter, setDebitoTimeFilter] = useState<DebitoTimeFilter>('todos');

  // Obter anos e clientes únicos dos serviços
  const availableYears = [...new Set(services.map(s => {
    const parts = s.data.split('/');
    return parts.length === 3 ? parts[2] : '';
  }).filter(Boolean))].sort((a, b) => b.localeCompare(a));

  const availableClientes = [...new Set(services.map(s => s.cliente))].sort((a, b) => a.localeCompare(b));

  // Filtrar serviços com base nos filtros selecionados
  const filteredServices = services.filter(service => {
    // Filtro por ano
    if (selectedYear) {
      const parts = service.data.split('/');
      if (parts.length !== 3 || parts[2] !== selectedYear) return false;
    }
    
    // Filtro por mês
    if (selectedMonth) {
      const parts = service.data.split('/');
      if (parts.length !== 3 || parts[1] !== selectedMonth) return false;
    }
    
    // Filtro por cliente
    if (selectedCliente && service.cliente !== selectedCliente) return false;
    
    // Filtro por status (débitos/liquidados)
    if (statusFilter === 'debitos') {
      if (service.executadoEmDebito <= 0) return false;
    } else if (statusFilter === 'liquidados') {
      if (service.executadoEmDebito > 0) return false;
    }
    
    // Filtro por tempo de débito (apenas quando status é débitos)
    if (statusFilter === 'debitos' && debitoTimeFilter !== 'todos') {
      switch (debitoTimeFilter) {
        case 'ate30':
          if (service.diasEmAtraso < 1 || service.diasEmAtraso > 30) return false;
          break;
        case '31a90':
          if (service.diasEmAtraso < 31 || service.diasEmAtraso > 90) return false;
          break;
        case 'acima90':
          if (service.diasEmAtraso <= 90) return false;
          break;
      }
    }
    
    return true;
  });

  // Gerar subtítulo do filtro para o PDF
  const getFilterSubtitle = () => {
    const parts: string[] = [];
    
    if (selectedMonth && selectedYear) {
      const monthName = MONTHS.find(m => m.value === selectedMonth)?.label;
      parts.push(`${monthName} de ${selectedYear}`);
    } else if (selectedYear) {
      parts.push(`Ano ${selectedYear}`);
    } else if (selectedMonth) {
      const monthName = MONTHS.find(m => m.value === selectedMonth)?.label;
      parts.push(`Mês: ${monthName}`);
    }
    
    if (selectedCliente) {
      parts.push(`Cliente: ${selectedCliente}`);
    }
    
    if (statusFilter === 'debitos') {
      let debitoLabel = 'Em Débito';
      if (debitoTimeFilter === 'ate30') debitoLabel += ' (até 30 dias)';
      else if (debitoTimeFilter === '31a90') debitoLabel += ' (31 a 90 dias)';
      else if (debitoTimeFilter === 'acima90') debitoLabel += ' (acima de 90 dias)';
      parts.push(debitoLabel);
    } else if (statusFilter === 'liquidados') {
      parts.push('Apenas Liquidados');
    }
    
    return parts.length > 0 ? parts.join(' | ') : 'Todos os registros';
  };

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserName(profile.nome);
        }
      }
    };
    
    if (open) {
      fetchUserName();
    }
  }, [open]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const generatePrintHTML = () => {
    const reportContent = document.getElementById('report-content');
    if (!reportContent) return '';
    
    const currentDate = formatDate(new Date());
    const reportTitle = REPORT_TITLES[selectedReport];
    
    return `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${reportTitle} - Obrajusta II</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #1a1a2e;
            background: white;
            padding: 20px;
          }
          
          .header {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #0259dd;
          }
          
          .header img {
            height: 60px;
            margin-bottom: 15px;
          }
          
          .header h1 {
            font-size: 20pt;
            color: #0259dd;
            margin-bottom: 5px;
          }
          
          .header p {
            font-size: 10pt;
            color: #666;
          }
          
          .header h2 {
            font-size: 14pt;
            margin-top: 15px;
            color: #1a1a2e;
          }
          
          .header .filter-subtitle {
            font-size: 10pt;
            margin-top: 8px;
            color: #555;
            font-style: italic;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 9pt;
          }
          
          th, td {
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #ddd;
          }
          
          th {
            background-color: #f5f5f5;
            font-weight: 600;
            color: #1a1a2e;
          }
          
          tfoot td {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #0259dd;
            font-size: 9pt;
            color: #666;
            display: flex;
            justify-content: space-between;
          }
          
          .footer-left p,
          .footer-right p {
            margin: 3px 0;
          }
          
          .footer-right {
            text-align: right;
          }
          
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoObrajusta}" alt="Obrajusta" />
          <h1>OBRAJUSTA II, Lda</h1>
          <p>Gestão de Serviços e Faturação</p>
          <h2>${reportTitle}</h2>
          <p class="filter-subtitle">${getFilterSubtitle()}</p>
        </div>
        
        <div class="content">
          ${reportContent.innerHTML}
        </div>
        
        <div class="footer">
          <div class="footer-left">
            <p><strong>Data de Emissão:</strong> ${currentDate}</p>
            <p><strong>Emitido por:</strong> ${userName || 'Utilizador do Sistema'}</p>
          </div>
          <div class="footer-right">
            <p>OBRAJUSTA II, Lda</p>
            <p>Documento gerado automaticamente</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML());
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const getValoresFaturadosTable = () => {
    const { clientData, totals } = getValoresFaturadosReport(filteredServices);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório - Valores Faturados</CardTitle>
          <p className="text-sm text-muted-foreground">Análise detalhada de todas as faturas emitidas</p>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Cliente</TableHead>
                <TableHead>Nº Faturas</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Liquidado</TableHead>
                <TableHead>Em Débito</TableHead>
                <TableHead>% Liquidado</TableHead>
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
                  <TableCell>{formatPercentage((item.liquidado / item.valorTotal) * 100)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">TOTAL GERAL</TableCell>
                <TableCell className="font-bold">{totals.nFaturas}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.valorTotal)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.liquidado)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.emDebito)}</TableCell>
                <TableCell className="font-bold">{formatPercentage((totals.liquidado / totals.valorTotal) * 100)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const getValoresNaoFaturadosTable = () => {
    const { clientData, totals } = getValoresNaoFaturadosReport(filteredServices);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório - Valores Não Faturados</CardTitle>
          <p className="text-sm text-muted-foreground">Serviços com proposta emitida mas sem fatura</p>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Cliente</TableHead>
                <TableHead>Nº Serviços</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Liquidado</TableHead>
                <TableHead>Em Débito</TableHead>
                <TableHead>% Liquidado</TableHead>
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
                  <TableCell>{formatPercentage((item.liquidado / item.valorTotal) * 100)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">TOTAL GERAL</TableCell>
                <TableCell className="font-bold">{totals.nServicos}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.valorTotal)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.liquidado)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.emDebito)}</TableCell>
                <TableCell className="font-bold">{formatPercentage((totals.liquidado / totals.valorTotal) * 100)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const getRelatorioGeralTable = () => {
    const { monthData, totals } = getRelatorioGeralReport(filteredServices);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório Geral Mensal</CardTitle>
          <p className="text-sm text-muted-foreground">Movimento geral separado por mês com totais</p>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Mês</TableHead>
                <TableHead>Faturados (Débito)</TableHead>
                <TableHead>Faturados (Liquidado)</TableHead>
                <TableHead>Não Faturados (Débito)</TableHead>
                <TableHead>Não Faturados (Liquidado)</TableHead>
                <TableHead>Valores a Realizar (Projeção)</TableHead>
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
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">TOTAL GERAL</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.faturadosDebito)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.faturadosLiquidado)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.naoFaturadosDebito)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.naoFaturadosLiquidado)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.projecaoARealizar)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const getMovimentoMensalTable = () => {
    const monthData = getMovimentoMensalReport(filteredServices);
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
    const { clientData, totals } = getProjecaoValoresReport(filteredServices);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório - Projeção de Valores a Realizar</CardTitle>
          <p className="text-sm text-muted-foreground">Contratos com saldo ainda não faturado</p>
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
                <TableHead>% Faturado</TableHead>
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
                  <TableCell>{formatPercentage((item.valorFaturado / item.valorContratado) * 100)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">TOTAL GERAL</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.valorContratado)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.valorFaturado)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.valorARealizar)}</TableCell>
                <TableCell className="font-bold">{totals.nContratos}</TableCell>
                <TableCell className="font-bold">{formatPercentage((totals.valorFaturado / totals.valorContratado) * 100)}</TableCell>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6" />
            Relatórios Financeiros
          </DialogTitle>
        </DialogHeader>
        
        {/* Tipo de Relatório e Exportar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-b">
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

        {/* Filtros Avançados */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 py-4 border-b">
          {/* Ano */}
          <div>
            <Label className="text-xs font-medium mb-1 block">Ano</Label>
            <Select value={selectedYear ?? undefined} onValueChange={(value) => setSelectedYear(value === 'todos' ? null : value)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="todos">Todos os Anos</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mês */}
          <div>
            <Label className="text-xs font-medium mb-1 block">Mês</Label>
            <Select value={selectedMonth ?? undefined} onValueChange={(value) => setSelectedMonth(value === 'todos' ? null : value)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="todos">Todos os Meses</SelectItem>
                {MONTHS.map(month => (
                  <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cliente */}
          <div>
            <Label className="text-xs font-medium mb-1 block">Cliente</Label>
            <Select value={selectedCliente ?? undefined} onValueChange={(value) => setSelectedCliente(value === 'todos' ? null : value)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100] max-h-[200px]">
                <SelectItem value="todos">Todos os Clientes</SelectItem>
                {availableClientes.map(cliente => (
                  <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <Label className="text-xs font-medium mb-1 block">Status</Label>
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => {
              setStatusFilter(value);
              if (value !== 'debitos') setDebitoTimeFilter('todos');
            }}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="debitos">Apenas Débitos</SelectItem>
                <SelectItem value="liquidados">Apenas Liquidados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tempo de Débito (apenas visível quando status = debitos) */}
          <div>
            <Label className="text-xs font-medium mb-1 block">Tempo Débito</Label>
            <Select 
              value={debitoTimeFilter} 
              onValueChange={(value: DebitoTimeFilter) => setDebitoTimeFilter(value)}
              disabled={statusFilter !== 'debitos'}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ate30">Até 30 dias</SelectItem>
                <SelectItem value="31a90">31 a 90 dias</SelectItem>
                <SelectItem value="acima90">Acima de 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Subtítulo com filtros aplicados */}
        <div className="py-2 text-sm text-muted-foreground italic">
          Filtro: {getFilterSubtitle()} ({filteredServices.length} registros)
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="py-4" id="report-content">
            {renderReport()}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const getValoresFaturadosReport = (services: ServiceWithCalculations[]) => {
  const faturados = services.filter(s => s.numeroFatura && s.numeroFatura.trim() !== '');
  
  const clientMap = new Map<string, { cliente: string; nFaturas: number; valorTotal: number; liquidado: number; emDebito: number }>();
  
  faturados.forEach(service => {
    const existing = clientMap.get(service.cliente) || {
      cliente: service.cliente,
      nFaturas: 0,
      valorTotal: 0,
      liquidado: 0,
      emDebito: 0
    };
    
    existing.nFaturas += 1;
    existing.valorTotal += service.valorComIVA;
    existing.liquidado += service.liquidado;
    existing.emDebito += service.executadoEmDebito;
    
    clientMap.set(service.cliente, existing);
  });
  
  const clientData = Array.from(clientMap.values()).sort((a, b) => a.cliente.localeCompare(b.cliente));
  
  const totals = clientData.reduce((acc, item) => ({
    nFaturas: acc.nFaturas + item.nFaturas,
    valorTotal: acc.valorTotal + item.valorTotal,
    liquidado: acc.liquidado + item.liquidado,
    emDebito: acc.emDebito + item.emDebito
  }), { nFaturas: 0, valorTotal: 0, liquidado: 0, emDebito: 0 });
  
  return { clientData, totals };
};

const getValoresNaoFaturadosReport = (services: ServiceWithCalculations[]) => {
  // Filtrar serviços onde foi emitida proposta mas não foi emitida fatura
  const naoFaturados = services.filter(s => 
    s.proposta && s.proposta.trim() !== '' && (!s.numeroFatura || s.numeroFatura.trim() === '')
  );
  
  const clientMap = new Map<string, { cliente: string; nServicos: number; valorTotal: number; liquidado: number; emDebito: number }>();
  
  naoFaturados.forEach(service => {
    const existing = clientMap.get(service.cliente) || {
      cliente: service.cliente,
      nServicos: 0,
      valorTotal: 0,
      liquidado: 0,
      emDebito: 0
    };
    
    existing.nServicos += 1;
    existing.valorTotal += service.valorComIVA;
    existing.liquidado += service.liquidado;
    existing.emDebito += service.executadoEmDebito;
    
    clientMap.set(service.cliente, existing);
  });
  
  const clientData = Array.from(clientMap.values()).sort((a, b) => a.cliente.localeCompare(b.cliente));
  
  const totals = clientData.reduce((acc, item) => ({
    valorTotal: acc.valorTotal + item.valorTotal,
    liquidado: acc.liquidado + item.liquidado,
    emDebito: acc.emDebito + item.emDebito,
    nServicos: acc.nServicos + item.nServicos
  }), { valorTotal: 0, liquidado: 0, emDebito: 0, nServicos: 0 });
  
  return { clientData, totals };
};

const getRelatorioGeralReport = (services: ServiceWithCalculations[]) => {
  const monthMap = new Map<string, {
    mes: string; 
    faturadosDebito: number; 
    faturadosLiquidado: number; 
    naoFaturadosDebito: number; 
    naoFaturadosLiquidado: number;
    projecaoARealizar: number;
  }>();
  
  services.forEach(service => {
    const [day, month, year] = service.data.split('/');
    const mesAno = `${month}/${year}`;
    
    const existing = monthMap.get(mesAno) || {
      mes: mesAno,
      faturadosDebito: 0,
      faturadosLiquidado: 0,
      naoFaturadosDebito: 0,
      naoFaturadosLiquidado: 0,
      projecaoARealizar: 0
    };
    
    const isFaturado = service.numeroFatura && service.numeroFatura.trim() !== '';
    const temProposta = service.proposta && service.proposta.trim() !== '';
    const isContrato = service.tipoServico === 'contrato';
    
    // Valores faturados (todos com número de fatura - em débito e liquidados)
    if (isFaturado) {
      existing.faturadosDebito += service.executadoEmDebito;
      existing.faturadosLiquidado += service.liquidado;
    } 
    // Valores não faturados (com proposta mas sem fatura - EXCETO contratos/projeções)
    else if (temProposta && !isFaturado && !isContrato) {
      existing.naoFaturadosDebito += service.executadoEmDebito;
      existing.naoFaturadosLiquidado += service.liquidado;
    }
    
    // Valores a realizar projeção (apenas contratos com saldo ainda não faturado)
    if (isContrato) {
      existing.projecaoARealizar += service.valorARealizar;
    }
    
    monthMap.set(mesAno, existing);
  });
  
  const monthData = Array.from(monthMap.values()).sort((a, b) => {
    const [monthA, yearA] = a.mes.split('/');
    const [monthB, yearB] = b.mes.split('/');
    return yearA.localeCompare(yearB) || monthA.localeCompare(monthB);
  });
  
  const totals = monthData.reduce((acc, item) => ({
    faturadosDebito: acc.faturadosDebito + item.faturadosDebito,
    faturadosLiquidado: acc.faturadosLiquidado + item.faturadosLiquidado,
    naoFaturadosDebito: acc.naoFaturadosDebito + item.naoFaturadosDebito,
    naoFaturadosLiquidado: acc.naoFaturadosLiquidado + item.naoFaturadosLiquidado,
    projecaoARealizar: acc.projecaoARealizar + item.projecaoARealizar
  }), { faturadosDebito: 0, faturadosLiquidado: 0, naoFaturadosDebito: 0, naoFaturadosLiquidado: 0, projecaoARealizar: 0 });
  
  return { monthData, totals };
};

const getMovimentoMensalReport = (services: ServiceWithCalculations[]) => {
  const monthMap = new Map<string, { mes: string; valorLiquidado: number; valorEmDebito: number; nServicos: number }>();
  
  services.forEach(service => {
    const [day, month, year] = service.data.split('/');
    const mesAno = `${month}/${year}`;
    
    const existing = monthMap.get(mesAno) || {
      mes: mesAno,
      valorLiquidado: 0,
      valorEmDebito: 0,
      nServicos: 0
    };
    
    existing.valorLiquidado += service.liquidado;
    existing.valorEmDebito += service.executadoEmDebito;
    existing.nServicos += 1;
    
    monthMap.set(mesAno, existing);
  });
  
  return Array.from(monthMap.values()).sort((a, b) => {
    const [monthA, yearA] = a.mes.split('/');
    const [monthB, yearB] = b.mes.split('/');
    return yearA.localeCompare(yearB) || monthA.localeCompare(monthB);
  });
};

const getProjecaoValoresReport = (services: ServiceWithCalculations[]) => {
  const contratos = services.filter(s => s.tipoServico === 'contrato');
  
  const clientMap = new Map<string, {
    cliente: string; 
    valorContratado: number; 
    valorFaturado: number; 
    valorARealizar: number;
    nContratos: number;
  }>();
  
  contratos.forEach(service => {
    const existing = clientMap.get(service.cliente) || {
      cliente: service.cliente,
      valorContratado: 0,
      valorFaturado: 0,
      valorARealizar: 0,
      nContratos: 0
    };
    
    existing.valorContratado += service.valorComIVA;
    existing.valorFaturado += service.valorFaturado;
    existing.valorARealizar += service.valorARealizar;
    existing.nContratos += 1;
    
    clientMap.set(service.cliente, existing);
  });
  
  const clientData = Array.from(clientMap.values()).sort((a, b) => a.cliente.localeCompare(b.cliente));
  
  const totals = clientData.reduce((acc, item) => ({
    valorContratado: acc.valorContratado + item.valorContratado,
    valorFaturado: acc.valorFaturado + item.valorFaturado,
    valorARealizar: acc.valorARealizar + item.valorARealizar,
    nContratos: acc.nContratos + item.nContratos
  }), { valorContratado: 0, valorFaturado: 0, valorARealizar: 0, nContratos: 0 });
  
  return { clientData, totals };
};
