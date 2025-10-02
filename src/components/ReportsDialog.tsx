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

  // Report: Valores Não Faturados (serviços com proposta mas sem fatura)
  const getValoresNaoFaturadosReport = () => {
    const naoFaturados = services.filter(s => 
      s.tipoServico === 'fatura' && 
      s.proposta && 
      s.proposta.trim() !== '' && 
      (!s.fatura || s.fatura.trim() === '')
    );
    
    const clientData = naoFaturados.reduce((acc, service) => {
      const existing = acc.find(item => item.cliente === service.cliente);
      
      if (existing) {
        existing.valorTotal += service.valorComIVA;
        existing.liquidado += service.liquidado;
        existing.emDebito += (service.valorComIVA - service.liquidado);
        existing.nServicos += 1;
      } else {
        acc.push({
          cliente: service.cliente,
          valorTotal: service.valorComIVA,
          liquidado: service.liquidado,
          emDebito: service.valorComIVA - service.liquidado,
          nServicos: 1,
        });
      }
      
      return acc;
    }, [] as Array<{ cliente: string; valorTotal: number; liquidado: number; emDebito: number; nServicos: number }>);

    const totals = {
      valorTotal: clientData.reduce((sum, item) => sum + item.valorTotal, 0),
      liquidado: clientData.reduce((sum, item) => sum + item.liquidado, 0),
      emDebito: clientData.reduce((sum, item) => sum + item.emDebito, 0),
      nServicos: clientData.reduce((sum, item) => sum + item.nServicos, 0),
    };

    return { clientData, totals };
  };

  // Report: Relatório Geral - Movimento Mensal Detalhado
  const getRelatorioGeralReport = () => {
    // Agrupar por mês
    const monthData = services.reduce((acc, service) => {
      const [day, month, year] = service.data.split('/');
      const monthKey = `${month}/${year}`;
      
      let existing = acc.find(item => item.mes === monthKey);
      
      if (!existing) {
        existing = {
          mes: monthKey,
          faturadosDebito: 0,
          faturadosLiquidado: 0,
          naoFaturadosDebito: 0,
          naoFaturadosLiquidado: 0,
          projecaoARealizar: 0,
        };
        acc.push(existing);
      }
      
      // Valores faturados (faturas emitidas)
      if (service.tipoServico === 'fatura' && service.fatura && service.fatura.trim() !== '') {
        existing.faturadosDebito += (service.valorComIVA - service.liquidado);
        existing.faturadosLiquidado += service.liquidado;
      }
      
      // Valores não faturados (propostas sem fatura)
      if (service.tipoServico === 'fatura' && service.proposta && service.proposta.trim() !== '' && (!service.fatura || service.fatura.trim() === '')) {
        existing.naoFaturadosDebito += (service.valorComIVA - service.liquidado);
        existing.naoFaturadosLiquidado += service.liquidado;
      }
      
      // Projeção a realizar (apenas contratos com saldo não faturado)
      if (service.tipoServico === 'contrato') {
        existing.projecaoARealizar += service.valorARealizar;
      }
      
      return acc;
    }, [] as Array<{
      mes: string;
      faturadosDebito: number;
      faturadosLiquidado: number;
      naoFaturadosDebito: number;
      naoFaturadosLiquidado: number;
      projecaoARealizar: number;
    }>);

    // Ordenar por mês
    monthData.sort((a, b) => {
      const [monthA, yearA] = a.mes.split('/');
      const [monthB, yearB] = b.mes.split('/');
      return yearA !== yearB 
        ? parseInt(yearA) - parseInt(yearB) 
        : parseInt(monthA) - parseInt(monthB);
    });

    // Calcular totais gerais
    const totals = {
      faturadosDebito: monthData.reduce((sum, item) => sum + item.faturadosDebito, 0),
      faturadosLiquidado: monthData.reduce((sum, item) => sum + item.faturadosLiquidado, 0),
      naoFaturadosDebito: monthData.reduce((sum, item) => sum + item.naoFaturadosDebito, 0),
      naoFaturadosLiquidado: monthData.reduce((sum, item) => sum + item.naoFaturadosLiquidado, 0),
      projecaoARealizar: monthData.reduce((sum, item) => sum + item.projecaoARealizar, 0),
    };

    return { monthData, totals };
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

  // Report: Projeção de Valores a Realizar (apenas contratos)
  const getProjecaoValoresReport = () => {
    const contratos = services.filter(s => s.tipoServico === 'contrato' && s.valorARealizar > 0);
    
    const clientData = contratos.reduce((acc, service) => {
      const existing = acc.find(item => item.cliente === service.cliente);
      
      if (existing) {
        existing.valorContratado += service.valorComIVA;
        existing.valorFaturado += service.valorFaturado;
        existing.valorARealizar += service.valorARealizar;
        existing.nContratos += 1;
      } else {
        acc.push({
          cliente: service.cliente,
          valorContratado: service.valorComIVA,
          valorFaturado: service.valorFaturado,
          valorARealizar: service.valorARealizar,
          nContratos: 1,
        });
      }
      
      return acc;
    }, [] as Array<{ cliente: string; valorContratado: number; valorFaturado: number; valorARealizar: number; nContratos: number }>);

    const totals = {
      valorContratado: clientData.reduce((sum, item) => sum + item.valorContratado, 0),
      valorFaturado: clientData.reduce((sum, item) => sum + item.valorFaturado, 0),
      valorARealizar: clientData.reduce((sum, item) => sum + item.valorARealizar, 0),
      nContratos: clientData.reduce((sum, item) => sum + item.nContratos, 0),
    };

    return { clientData, totals };
  };

  const renderReport = () => {
    switch (selectedReport) {
      case 'faturados': {
        const { clientData, totals } = getValoresFaturadosReport();
        
        if (clientData.length === 0) {
          return (
            <Card className="border-2">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg">📊 Relatório - Valores Faturados</CardTitle>
              </CardHeader>
              <CardContent className="py-12">
                <p className="text-muted-foreground text-center text-base">
                  Nenhum valor faturado encontrado.
                </p>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <Card className="border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">📊 Relatório - Valores Faturados</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Análise detalhada de todas as faturas emitidas
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-lg border-2 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-bold">Cliente</TableHead>
                      <TableHead className="font-bold text-center">Nº Faturas</TableHead>
                      <TableHead className="font-bold text-right">Valor Total</TableHead>
                      <TableHead className="font-bold text-right">Liquidado</TableHead>
                      <TableHead className="font-bold text-right">Em Débito</TableHead>
                      <TableHead className="font-bold text-right">% Liquidado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientData.map((client, index) => (
                      <TableRow key={client.cliente} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <TableCell className="font-medium">{client.cliente}</TableCell>
                        <TableCell className="text-center">{client.nFaturas}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(client.valorTotal)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(client.liquidado)}</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">{formatCurrency(client.emDebito)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPercentage(client.valorTotal > 0 ? (client.liquidado / client.valorTotal) * 100 : 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-primary/10 border-t-2">
                      <TableCell className="text-base">TOTAL GERAL</TableCell>
                      <TableCell className="text-center text-base">{totals.nFaturas}</TableCell>
                      <TableCell className="text-right font-mono text-base">{formatCurrency(totals.valorTotal)}</TableCell>
                      <TableCell className="text-right font-mono text-base text-green-600">{formatCurrency(totals.liquidado)}</TableCell>
                      <TableCell className="text-right font-mono text-base text-orange-600">{formatCurrency(totals.emDebito)}</TableCell>
                      <TableCell className="text-right text-base">
                        {formatPercentage(totals.valorTotal > 0 ? (totals.liquidado / totals.valorTotal) * 100 : 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      }

      case 'nao-faturados': {
        const { clientData, totals } = getValoresNaoFaturadosReport();
        
        if (clientData.length === 0) {
          return (
            <Card className="border-2">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg">📋 Relatório - Valores Não Faturados</CardTitle>
              </CardHeader>
              <CardContent className="py-12">
                <p className="text-muted-foreground text-center text-base">
                  Nenhum valor não faturado encontrado.
                </p>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <Card className="border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">📋 Relatório - Valores Não Faturados</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Propostas emitidas que ainda não foram faturadas
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-lg border-2 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-bold">Cliente</TableHead>
                      <TableHead className="font-bold text-center">Nº Serviços</TableHead>
                      <TableHead className="font-bold text-right">Valor Total</TableHead>
                      <TableHead className="font-bold text-right">Liquidado</TableHead>
                      <TableHead className="font-bold text-right">Em Débito</TableHead>
                      <TableHead className="font-bold text-right">% Liquidado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientData.map((client, index) => (
                      <TableRow key={client.cliente} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <TableCell className="font-medium">{client.cliente}</TableCell>
                        <TableCell className="text-center">{client.nServicos}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(client.valorTotal)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(client.liquidado)}</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">{formatCurrency(client.emDebito)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPercentage(client.valorTotal > 0 ? (client.liquidado / client.valorTotal) * 100 : 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-primary/10 border-t-2">
                      <TableCell className="text-base">TOTAL GERAL</TableCell>
                      <TableCell className="text-center text-base">{totals.nServicos}</TableCell>
                      <TableCell className="text-right font-mono text-base">{formatCurrency(totals.valorTotal)}</TableCell>
                      <TableCell className="text-right font-mono text-base text-green-600">{formatCurrency(totals.liquidado)}</TableCell>
                      <TableCell className="text-right font-mono text-base text-orange-600">{formatCurrency(totals.emDebito)}</TableCell>
                      <TableCell className="text-right text-base">
                        {formatPercentage(totals.valorTotal > 0 ? (totals.liquidado / totals.valorTotal) * 100 : 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      }

      case 'geral': {
        const { monthData, totals } = getRelatorioGeralReport();
        
        if (monthData.length === 0) {
          return (
            <Card className="border-2">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg">📈 Relatório Geral - Movimento Mensal</CardTitle>
              </CardHeader>
              <CardContent className="py-12">
                <p className="text-muted-foreground text-center text-base">
                  Nenhum movimento encontrado.
                </p>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <Card className="border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">📈 Relatório Geral - Movimento Mensal Completo</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Visão consolidada de todos os movimentos por mês
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-lg border-2 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-bold">Mês/Ano</TableHead>
                      <TableHead className="font-bold text-right">Fat. Débito</TableHead>
                      <TableHead className="font-bold text-right">Fat. Liquid.</TableHead>
                      <TableHead className="font-bold text-right">Não Fat. Déb.</TableHead>
                      <TableHead className="font-bold text-right">Não Fat. Liq.</TableHead>
                      <TableHead className="font-bold text-right">Proj. A Realizar</TableHead>
                      <TableHead className="font-bold text-right">Total Mês</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthData.map((month, index) => {
                      const totalMes = month.faturadosDebito + month.faturadosLiquidado + 
                                      month.naoFaturadosDebito + month.naoFaturadosLiquidado + 
                                      month.projecaoARealizar;
                      return (
                        <TableRow key={month.mes} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <TableCell className="font-semibold">{month.mes}</TableCell>
                          <TableCell className="text-right font-mono text-orange-600">{formatCurrency(month.faturadosDebito)}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">{formatCurrency(month.faturadosLiquidado)}</TableCell>
                          <TableCell className="text-right font-mono text-orange-500">{formatCurrency(month.naoFaturadosDebito)}</TableCell>
                          <TableCell className="text-right font-mono text-green-500">{formatCurrency(month.naoFaturadosLiquidado)}</TableCell>
                          <TableCell className="text-right font-mono text-blue-600">{formatCurrency(month.projecaoARealizar)}</TableCell>
                          <TableCell className="text-right font-mono font-bold">{formatCurrency(totalMes)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-bold bg-primary/10 border-t-2">
                      <TableCell className="text-base">TOTAL GERAL</TableCell>
                      <TableCell className="text-right font-mono text-base text-orange-600">{formatCurrency(totals.faturadosDebito)}</TableCell>
                      <TableCell className="text-right font-mono text-base text-green-600">{formatCurrency(totals.faturadosLiquidado)}</TableCell>
                      <TableCell className="text-right font-mono text-base text-orange-500">{formatCurrency(totals.naoFaturadosDebito)}</TableCell>
                      <TableCell className="text-right font-mono text-base text-green-500">{formatCurrency(totals.naoFaturadosLiquidado)}</TableCell>
                      <TableCell className="text-right font-mono text-base text-blue-600">{formatCurrency(totals.projecaoARealizar)}</TableCell>
                      <TableCell className="text-right font-mono text-base">
                        {formatCurrency(
                          totals.faturadosDebito + totals.faturadosLiquidado + 
                          totals.naoFaturadosDebito + totals.naoFaturadosLiquidado + 
                          totals.projecaoARealizar
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      }

      case 'movimento-mensal': {
        const monthData = getMovimentoMensalReport();
        
        if (monthData.length === 0) {
          return (
            <Card className="border-2">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg">📅 Relatório - Movimento Mensal</CardTitle>
              </CardHeader>
              <CardContent className="py-12">
                <p className="text-muted-foreground text-center text-base">
                  Nenhum movimento mensal encontrado.
                </p>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <Card className="border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">📅 Relatório - Movimento Mensal Simplificado</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Resumo mensal dos valores faturados e liquidados
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-lg border-2 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-bold">Mês/Ano</TableHead>
                      <TableHead className="font-bold text-right">Liquidado</TableHead>
                      <TableHead className="font-bold text-right">Em Débito</TableHead>
                      <TableHead className="font-bold text-center">Nº Serviços</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthData.map((month, index) => (
                      <TableRow key={month.mes} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <TableCell className="font-semibold">{month.mes}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(month.valorLiquidado)}</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">{formatCurrency(month.valorEmDebito)}</TableCell>
                        <TableCell className="text-center">{month.nServicos}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      }

      case 'projecao': {
        const { clientData, totals } = getProjecaoValoresReport();
        
        if (clientData.length === 0) {
          return (
            <Card className="border-2">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg">🎯 Relatório - Projeção de Valores a Realizar</CardTitle>
              </CardHeader>
              <CardContent className="py-12">
                <p className="text-muted-foreground text-center text-base">
                  Nenhum contrato com saldo a realizar encontrado.
                </p>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <Card className="border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">🎯 Relatório - Projeção de Valores a Realizar</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Contratos ativos e seus valores ainda não faturados
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-lg border-2 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-bold">Cliente</TableHead>
                      <TableHead className="font-bold text-center">Nº Contratos</TableHead>
                      <TableHead className="font-bold text-right">Valor Contratado</TableHead>
                      <TableHead className="font-bold text-right">Já Faturado</TableHead>
                      <TableHead className="font-bold text-right">Saldo A Realizar</TableHead>
                      <TableHead className="font-bold text-right">% Executado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientData.map((client, index) => (
                      <TableRow key={client.cliente} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <TableCell className="font-medium">{client.cliente}</TableCell>
                        <TableCell className="text-center">{client.nContratos}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(client.valorContratado)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(client.valorFaturado)}</TableCell>
                        <TableCell className="text-right font-mono text-blue-600">{formatCurrency(client.valorARealizar)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPercentage(client.valorContratado > 0 ? (client.valorFaturado / client.valorContratado) * 100 : 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-primary/10 border-t-2">
                      <TableCell className="text-base">TOTAL GERAL</TableCell>
                      <TableCell className="text-center text-base">{totals.nContratos}</TableCell>
                      <TableCell className="text-right font-mono text-base">{formatCurrency(totals.valorContratado)}</TableCell>
                      <TableCell className="text-right font-mono text-base text-green-600">{formatCurrency(totals.valorFaturado)}</TableCell>
                      <TableCell className="text-right font-mono text-base text-blue-600">{formatCurrency(totals.valorARealizar)}</TableCell>
                      <TableCell className="text-right text-base">
                        {formatPercentage(totals.valorContratado > 0 ? (totals.valorFaturado / totals.valorContratado) * 100 : 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
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
          
          <Button variant="outline" size="default" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="py-4">
            {renderReport()}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};