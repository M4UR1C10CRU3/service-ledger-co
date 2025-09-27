import { ServiceWithCalculations } from '@/types/service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ServiceTableProps {
  services: ServiceWithCalculations[];
  onEditService: (service: ServiceWithCalculations) => void;
  onDeleteService: (id: string) => void;
  onViewService: (service: ServiceWithCalculations) => void;
  onCreateInvoice?: (contract: ServiceWithCalculations) => void;
}

export const ServiceTable = ({ 
  services, 
  onEditService, 
  onDeleteService, 
  onViewService,
  onCreateInvoice 
}: ServiceTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusBadge = (service: ServiceWithCalculations) => {
    // Para contratos
    if (service.tipoServico === 'contrato') {
      if (service.statusContrato === 'nao_iniciado') {
        return <Badge variant="outline">Não Iniciado</Badge>;
      }
      if (service.statusContrato === 'em_andamento') {
        return <Badge className="bg-blue-100 text-blue-800">Em Andamento</Badge>;
      }
      if (service.statusContrato === 'concluido') {
        return <Badge className="bg-green-100 text-green-800">Concluído</Badge>;
      }
    }
    
    // Para faturas
    if (!service.fatura) {
      return <Badge variant="outline">A Realizar</Badge>;
    }
    
    if (service.executadoEmDebito === 0) {
      return <Badge className="status-paid">Liquidado</Badge>;
    }
    
    if (service.diasEmAtraso > 0) {
      return <Badge className="status-overdue">Em Atraso ({service.diasEmAtraso}d)</Badge>;
    }
    
    return <Badge className="status-pending">Pendente</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gestão de Serviços</span>
          <span className="text-sm font-normal text-muted-foreground">
            {services.length} serviços registados
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead className="w-[80px]">Tipo</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="w-[200px]">Resumo</TableHead>
                <TableHead className="w-[100px]">Proposta</TableHead>
                <TableHead className="w-[100px]">Fatura</TableHead>
                <TableHead className="text-right w-[120px]">Valor c/ IVA</TableHead>
                <TableHead className="text-right w-[120px]">Liquidado</TableHead>
                <TableHead className="text-right w-[120px]">Saldo</TableHead>
                <TableHead className="text-right w-[100px]">%</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-mono text-sm">{service.data}</TableCell>
                  <TableCell>
                    <Badge variant={service.tipoServico === 'contrato' ? 'default' : 'secondary'}>
                      {service.tipoServico === 'contrato' ? 'Contrato' : 'Fatura'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{service.servico}</TableCell>
                  <TableCell>{service.cliente}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {service.resumo}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{service.proposta}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {service.tipoServico === 'contrato' 
                      ? (service.contratoId ? `Vinculado: ${service.contratoId}` : '—')
                      : (service.fatura || '—')
                    }
                  </TableCell>
                  <TableCell className="table-cell-currency">
                    {formatCurrency(service.valorComIVA)}
                  </TableCell>
                  <TableCell className="table-cell-currency">
                    {service.tipoServico === 'contrato' 
                      ? formatCurrency(service.valorFaturado)
                      : formatCurrency(service.liquidado)
                    }
                  </TableCell>
                  <TableCell className="table-cell-currency">
                    {service.tipoServico === 'contrato' ? (
                      <span className="text-blue-600">
                        {formatCurrency(service.valorARealizar)}
                      </span>
                    ) : (
                      <span className={service.executadoEmDebito > 0 ? "text-danger" : ""}>
                        {formatCurrency(service.executadoEmDebito)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(service.percentualLiquidado)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(service)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {service.tipoServico === 'contrato' && service.valorARealizar > 0 && onCreateInvoice && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCreateInvoice(service)}
                          title="Criar Fatura Parcial"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewService(service)}
                        title="Ver Detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditService(service)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteService(service.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};