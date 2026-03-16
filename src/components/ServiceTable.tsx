import { useState, useEffect } from 'react';
import { ServiceWithCalculations } from '@/types/service';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, Copy, Package } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ServiceTableProps {
  services: ServiceWithCalculations[];
  onEditService: (service: ServiceWithCalculations) => void;
  onDeleteService: (id: string) => void;
  onViewService: (service: ServiceWithCalculations) => void;
  onDuplicateService?: (service: ServiceWithCalculations) => void;
  onOpenMaterials?: (service: ServiceWithCalculations) => void;
}

export const ServiceTable = ({ 
  services, 
  onEditService, 
  onDeleteService, 
  onViewService,
  onDuplicateService,
  onOpenMaterials,
}: ServiceTableProps) => {
  const [materialCounts, setMaterialCounts] = useState<Record<string, number>>({});

  // Load material counts for all services
  useEffect(() => {
    const dbIds = services.map(s => s.dbId).filter(Boolean) as string[];
    if (dbIds.length === 0) return;
    supabase
      .from('stock_movimentos')
      .select('venda_id')
      .eq('tipo', 'saida')
      .eq('origem', 'venda')
      .in('venda_id', dbIds)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        for (const row of data) {
          const vid = (row as any).venda_id;
          if (vid) counts[vid] = (counts[vid] || 0) + 1;
        }
        setMaterialCounts(counts);
      });
  }, [services]);

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
                <TableHead className="w-[40px] text-center" title="Materiais">📦</TableHead>
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
                    {service.numeroFatura
                      ? service.numeroFatura.split('; ').map(entry => entry.split('|')[0]).join('; ')
                      : '—'}
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto"
                            onClick={() => onOpenMaterials?.(service)}
                            disabled={!service.dbId}
                          >
                            {service.dbId && materialCounts[service.dbId] ? (
                              <Package className="h-4 w-4 inline text-orange-500" />
                            ) : (
                              <Package className="h-4 w-4 inline text-muted-foreground/40" />
                            )}
                            {service.dbId && materialCounts[service.dbId] ? (
                              <span className="text-xs ml-0.5 text-orange-500">{materialCounts[service.dbId]}</span>
                            ) : null}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {service.dbId && materialCounts[service.dbId]
                            ? `${materialCounts[service.dbId]} material(is) registado(s) — clique para gerir`
                            : 'Clique para lançar materiais'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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