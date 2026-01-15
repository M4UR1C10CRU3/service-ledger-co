import { ServiceWithCalculations } from '@/types/service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye } from 'lucide-react';
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
}

export const ServiceTable = ({ 
  services, 
  onEditService, 
  onDeleteService, 
  onViewService
}: ServiceTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getStatusBadge = (service: ServiceWithCalculations) => {
    const valorFaturado = service.valorFaturado || 0;
    
    // Sem fatura emitida
    if (!service.numeroFatura && valorFaturado === 0) {
      return <Badge variant="outline">Não Faturado</Badge>;
    }
    
    // Totalmente liquidado
    if (valorFaturado > 0 && service.executadoEmDebito === 0) {
      return <Badge className="status-paid">Liquidado</Badge>;
    }
    
    // Em atraso
    if (service.diasEmAtraso > 0) {
      return <Badge className="status-overdue">Em Atraso ({service.diasEmAtraso}d)</Badge>;
    }
    
    // Parcialmente faturado ou pendente
    if (service.valorARealizar > 0 && valorFaturado > 0) {
      return <Badge className="bg-blue-100 text-blue-800">Parcial</Badge>;
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
        {services.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhum serviço encontrado para o período selecionado</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="w-[200px]">Resumo</TableHead>
                <TableHead className="w-[100px]">Proposta</TableHead>
                <TableHead className="w-[100px]">Fatura</TableHead>
                <TableHead className="text-right w-[120px]">Valor Total</TableHead>
                <TableHead className="text-right w-[120px]">Faturado</TableHead>
                <TableHead className="text-right w-[120px]">Não Faturado</TableHead>
                <TableHead className="text-right w-[120px]">Liquidado</TableHead>
                <TableHead className="text-right w-[120px]">Em Débito</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-mono text-sm">{service.data}</TableCell>
                  <TableCell className="font-medium">{service.servico}</TableCell>
                  <TableCell>{service.cliente}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {service.resumo}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{service.proposta || '—'}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {service.numeroFatura || '—'}
                  </TableCell>
                  <TableCell className="table-cell-currency">
                    {formatCurrency(service.valorComIVA)}
                  </TableCell>
                  <TableCell className="table-cell-currency">
                    <span className={service.valorFaturado > 0 ? "text-green-600" : ""}>
                      {formatCurrency(service.valorFaturado || 0)}
                    </span>
                  </TableCell>
                  <TableCell className="table-cell-currency">
                    <span className={service.valorARealizar > 0 ? "text-orange-600" : ""}>
                      {formatCurrency(service.valorARealizar)}
                    </span>
                  </TableCell>
                  <TableCell className="table-cell-currency">
                    {formatCurrency(service.liquidado)}
                  </TableCell>
                  <TableCell className="table-cell-currency">
                    <span className={service.executadoEmDebito > 0 ? "text-danger" : ""}>
                      {formatCurrency(service.executadoEmDebito)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(service)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
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
        )}
      </CardContent>
    </Card>
  );
};