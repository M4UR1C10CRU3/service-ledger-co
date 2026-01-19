import { ServiceWithCalculations } from '@/types/service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, Copy } from 'lucide-react';
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
  onDuplicateService?: (service: ServiceWithCalculations) => void;
}

export const ServiceTable = ({ 
  services, 
  onEditService, 
  onDeleteService, 
  onViewService,
  onDuplicateService,
}: ServiceTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getStatusBadge = (service: ServiceWithCalculations) => {
    // Totalmente liquidado (sem débito pendente)
    if (service.executadoEmDebito === 0) {
      return <Badge className="status-paid">Liquidado</Badge>;
    }
    
    // Em débito - cores baseadas nos dias de atraso
    // Acima de 91 dias - Vermelho
    if (service.diasEmAtraso >= 91) {
      return <Badge className="bg-red-600 text-white hover:bg-red-700">Em Débito ({service.diasEmAtraso}d)</Badge>;
    }
    // Entre 31 e 90 dias - Laranja
    if (service.diasEmAtraso >= 31) {
      return <Badge className="bg-orange-500 text-white hover:bg-orange-600">Em Débito ({service.diasEmAtraso}d)</Badge>;
    }
    // Entre 1 e 30 dias - Amarelo
    return <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">Em Débito ({service.diasEmAtraso}d)</Badge>;
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
                <TableHead className="w-[100px] text-center">Data</TableHead>
                <TableHead className="text-center">Serviço</TableHead>
                <TableHead className="text-center">Cliente</TableHead>
                <TableHead className="w-[200px] text-center">Resumo</TableHead>
                <TableHead className="w-[100px] text-center">Proposta</TableHead>
                <TableHead className="w-[100px] text-center">Fatura</TableHead>
                <TableHead className="w-[120px] text-center">Valor Total</TableHead>
                <TableHead className="w-[120px] text-center">FT</TableHead>
                <TableHead className="w-[120px] text-center">NFT</TableHead>
                <TableHead className="w-[120px] text-center">Liquidado</TableHead>
                <TableHead className="w-[120px] text-center">Em Débito</TableHead>
                <TableHead className="w-[130px] text-center">Status</TableHead>
                <TableHead className="w-[100px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-mono text-sm text-center">{service.data}</TableCell>
                  <TableCell className="font-medium text-center">{service.servico}</TableCell>
                  <TableCell className="text-center">{service.cliente}</TableCell>
                  <TableCell className="text-sm text-muted-foreground text-center">
                    {service.resumo}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-center">{service.proposta || '—'}</TableCell>
                  <TableCell className="font-mono text-sm text-center">
                    {service.numeroFatura || '—'}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {formatCurrency(service.valorComIVA)}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    <span className={service.valorFaturado > 0 ? "text-green-600" : ""}>
                      {formatCurrency(service.valorFaturado || 0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    <span className={service.valorARealizar > 0 ? "text-orange-600" : ""}>
                      {formatCurrency(service.valorARealizar)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {formatCurrency(service.liquidado)}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    <span className={service.executadoEmDebito > 0 ? "text-danger" : ""}>
                      {formatCurrency(service.executadoEmDebito)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(service)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewService(service)}
                        title="Ver Detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onDuplicateService && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDuplicateService(service)}
                          title="Duplicar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
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