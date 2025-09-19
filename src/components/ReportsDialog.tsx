import { useState } from 'react';
import { ServiceWithCalculations } from '@/types/service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/table';
import { FileText, Download } from 'lucide-react';

interface ReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: ServiceWithCalculations[];
}

type ReportType = 
  | 'faturados' 
  | 'nao-faturados' 
  | 'geral' 
  | 'movimento-mensal'
  | 'projecao';

export const ReportsDialog = ({ open, onOpenChange, services }: ReportsDialogProps) => {
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

  // Report: Valores Faturados
  const getValoresFaturadosReport = () => {
    const faturados = services.filter(s => s.fatura && s.fatura.trim() !== '');
    
    const clientData = faturados.reduce((acc, service) => {
      const existing = acc.find(item => item.cliente === service.cliente);
      const emDebito = service.valorComIVA - service.liquidado;
      
      if (existing) {
        existing.nFaturas += 1;
        existing.valorTotal += service.valorComIVA;
        existing.liquidado += service.liquidado;
        existing.emDebito += emDebito;
      } else {
        acc.push({
          cliente: service.cliente,
          nFaturas: 1,
          valorTotal: service.valorComIVA,
          liquidado: service.liquidado,
          emDebito: emDebito,
        });
      }
      
      return acc;
    }, [] as Array<{ cliente: string; nFaturas: number; valorTotal: number; liquidado: number; emDebito: number }>);

    const totals = {
      nFaturas: clientData.reduce((sum, item) => sum + item.nFaturas, 0),
      valorTotal: clientData.reduce((sum, item) => sum + item.valorTotal, 0),
      liquidado: clientData.reduce((sum, item) => sum + item.liquidado, 0),
      emDebito: clientData.reduce((sum, item) => sum + item.emDebito, 0),
    };

    return { clientData, totals };
  };

  // Report: Valores Não Faturados
  const getValoresNaoFaturadosReport = () => {
    const naoFaturados = services.filter(s => !s.fatura || s.fatura.trim() === '');
    const total = naoFaturados.reduce((sum, s) => sum + s.valorComIVA, 0);
    return { naoFaturados, total };
  };

  // Report: Relatório Geral
  const getRelatorioGeralReport = () => {
    const faturados = services.filter(s => s.fatura && s.fatura.trim() !== '');
    const naoFaturados = services.filter(s => !s.fatura || s.fatura.trim() === '');
    
    const valorFaturado = faturados.reduce((sum, s) => sum + s.valorComIVA, 0);
    const valorNaoFaturado = naoFaturados.reduce((sum, s) => sum + s.valorComIVA, 0);
    const totalGeral = valorFaturado + valorNaoFaturado;

    return { valorFaturado, valorNaoFaturado, totalGeral };
  };

  // Report: Movimento Mensal
  const getMovimentoMensalReport = () => {
    const faturados = services.filter(s => s.fatura && s.fatura.trim() !== '');
    
    const monthData = faturados.reduce((acc, service) => {
      const [day, month, year] = service.data.split('/');
      const monthKey = `${month}/${year}`;
      
      const existing = acc.find(item => item.mes === monthKey);
      const emDebito = service.valorComIVA - service.liquidado;
      
      if (existing) {
        existing.valorLiquidado += service.liquidado;
        existing.valorEmDebito += emDebito;
        existing.nServicos += 1;
      } else {
        acc.push({
          mes: monthKey,
          valorLiquidado: service.liquidado,
          valorEmDebito: emDebito,
          nServicos: 1,
        });
      }
      
      return acc;
    }, [] as Array<{ mes: string; valorLiquidado: number; valorEmDebito: number; nServicos: number }>);

    return monthData.sort((a, b) => a.mes.localeCompare(b.mes));
  };

  // Report: Projeção de Valores a Realizar
  const getProjecaoValoresReport = () => {
    const clientData = services.reduce((acc, service) => {
      const existing = acc.find(item => item.cliente === service.cliente);
      
      const valorEmDebito = (service.fatura && service.fatura.trim() !== '') ? (service.valorComIVA - service.liquidado) : 0;
      const valorNaoFaturado = (!service.fatura || service.fatura.trim() === '') ? service.valorComIVA : 0;
      
      if (valorEmDebito > 0 || valorNaoFaturado > 0) {
        if (existing) {
          existing.valorEmDebito += valorEmDebito;
          existing.valorNaoFaturado += valorNaoFaturado;
          existing.projecaoTotal += valorEmDebito + valorNaoFaturado;
        } else {
          acc.push({
            cliente: service.cliente,
            valorEmDebito,
            valorNaoFaturado,
            projecaoTotal: valorEmDebito + valorNaoFaturado,
          });
        }
      }
      
      return acc;
    }, [] as Array<{ cliente: string; valorEmDebito: number; valorNaoFaturado: number; projecaoTotal: number }>);

    const totals = {
      valorEmDebito: clientData.reduce((sum, item) => sum + item.valorEmDebito, 0),
      valorNaoFaturado: clientData.reduce((sum, item) => sum + item.valorNaoFaturado, 0),
      projecaoTotal: clientData.reduce((sum, item) => sum + item.projecaoTotal, 0),
    };

    return { clientData, totals };
  };

  const renderReport = () => {
    switch (selectedReport) {
      case 'faturados': {
        const { clientData, totals } = getValoresFaturadosReport();
        return (
          <Card>
            <CardHeader>
              <CardTitle>Relatório - Valores Faturados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Nº Faturas</TableHead>
                    <TableHead className="text-right">Valor Total (€)</TableHead>
                    <TableHead className="text-right">Liquidado (€)</TableHead>
                    <TableHead className="text-right">Em Débito (€)</TableHead>
                    <TableHead className="text-right">Percentual Liquidado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientData.map((client) => (
                    <TableRow key={client.cliente}>
                      <TableCell className="font-medium">{client.cliente}</TableCell>
                      <TableCell>{client.nFaturas}</TableCell>
                      <TableCell className="text-right">{formatCurrency(client.valorTotal)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(client.liquidado)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(client.emDebito)}</TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(client.valorTotal > 0 ? (client.liquidado / client.valorTotal) * 100 : 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>TOTAL</TableCell>
                    <TableCell>{totals.nFaturas}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.valorTotal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.liquidado)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.emDebito)}</TableCell>
                    <TableCell className="text-right">
                      {formatPercentage(totals.valorTotal > 0 ? (totals.liquidado / totals.valorTotal) * 100 : 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      }

      case 'nao-faturados': {
        const { naoFaturados, total } = getValoresNaoFaturadosReport();
        return (
          <Card>
            <CardHeader>
              <CardTitle>Relatório - Valores Não Faturados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Valor Total (€)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {naoFaturados.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.cliente}</TableCell>
                      <TableCell>{service.servico}</TableCell>
                      <TableCell className="text-right">{formatCurrency(service.valorComIVA)}</TableCell>
                      <TableCell>
                        {service.aRealizar ? 'A realizar' : 'Realizado'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="font-bold">TOTAL Não Faturado: {formatCurrency(total)}</p>
              </div>
            </CardContent>
          </Card>
        );
      }

      case 'geral': {
        const { valorFaturado, valorNaoFaturado, totalGeral } = getRelatorioGeralReport();
        return (
          <Card>
            <CardHeader>
              <CardTitle>Relatório Geral (Faturados + Não Faturados)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor Total (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Valores Faturados</TableCell>
                    <TableCell className="text-right">{formatCurrency(valorFaturado)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Valores Não Faturados</TableCell>
                    <TableCell className="text-right">{formatCurrency(valorNaoFaturado)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>TOTAL GERAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalGeral)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      }

      case 'movimento-mensal': {
        const monthData = getMovimentoMensalReport();
        return (
          <Card>
            <CardHeader>
              <CardTitle>Relatório - Movimento Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead className="text-right">Liquidado (€)</TableHead>
                    <TableHead className="text-right">Em Débito (€)</TableHead>
                    <TableHead className="text-right">Nº Serviços</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthData.map((month) => (
                    <TableRow key={month.mes}>
                      <TableCell className="font-medium">{month.mes}</TableCell>
                      <TableCell className="text-right">{formatCurrency(month.valorLiquidado)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(month.valorEmDebito)}</TableCell>
                      <TableCell className="text-right">{month.nServicos}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      }

      case 'projecao': {
        const { clientData, totals } = getProjecaoValoresReport();
        return (
          <Card>
            <CardHeader>
              <CardTitle>Relatório - Projeção de Valores a Realizar</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor em Débito (€)</TableHead>
                    <TableHead className="text-right">Valor Não Faturado (€)</TableHead>
                    <TableHead className="text-right">Projeção Total (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientData.map((client) => (
                    <TableRow key={client.cliente}>
                      <TableCell className="font-medium">{client.cliente}</TableCell>
                      <TableCell className="text-right">
                        {client.valorEmDebito > 0 ? formatCurrency(client.valorEmDebito) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {client.valorNaoFaturado > 0 ? formatCurrency(client.valorNaoFaturado) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(client.projecaoTotal)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.valorEmDebito)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.valorNaoFaturado)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.projecaoTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Relatórios
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={selectedReport} onValueChange={(value: ReportType) => setSelectedReport(value)}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Selecione o tipo de relatório" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faturados">Valores Faturados</SelectItem>
                  <SelectItem value="nao-faturados">Valores Não Faturados</SelectItem>
                  <SelectItem value="geral">Relatório Geral</SelectItem>
                  <SelectItem value="movimento-mensal">Movimento Mensal</SelectItem>
                  <SelectItem value="projecao">Projeção de Valores a Realizar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>

          {renderReport()}
        </div>
      </DialogContent>
    </Dialog>
  );
};