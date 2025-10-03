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
    window.print();
  };

  const getValoresFaturadosTable = () => {
    const { clientData, totals } = getValoresFaturadosReport(services);
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
    const { clientData, totals } = getValoresNaoFaturadosReport(services);
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
    const { monthData, totals } = getRelatorioGeralReport(services);
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
    const monthData = getMovimentoMensalReport(services);
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
    const { clientData, totals } = getProjecaoValoresReport(services);
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
        <ScrollArea className="flex-1 pr-4">
          <div className="py-4">{renderReport()}</div>
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
