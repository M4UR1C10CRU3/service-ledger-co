import { ServiceWithCalculations, Liquidacao } from '@/types/service';
import { LiquidacoesManager } from './LiquidacoesManager';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ServiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceWithCalculations | null;
  onAddLiquidacao: (liquidacao: Omit<Liquidacao, 'id' | 'createdAt'>) => void;
  onRemoveLiquidacao: (liquidacaoId: string) => void;
}

export const ServiceDetailDialog = ({
  open,
  onOpenChange,
  service,
  onAddLiquidacao,
  onRemoveLiquidacao
}: ServiceDetailDialogProps) => {
  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Serviço</DialogTitle>
          <DialogDescription>
            Visualize e gerencie os detalhes e liquidações do serviço
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Serviço */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Data:</span>
                  <p>{service.data}</p>
                </div>
                <div>
                  <span className="font-medium">Cliente:</span>
                  <p>{service.cliente}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium">Serviço:</span>
                  <p>{service.servico}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium">Resumo:</span>
                  <p>{service.resumo}</p>
                </div>
                <div>
                  <span className="font-medium">Proposta:</span>
                  <p>{service.proposta || 'Não especificado'}</p>
                </div>
                <div>
                  <span className="font-medium">Fatura:</span>
                  <p>{service.fatura || 'Não faturado'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {service.aRealizar && (
                  <Badge variant="outline">A Realizar</Badge>
                )}
                {service.fatura && (
                  <Badge variant="default">Faturado</Badge>
                )}
                {service.executadoEmDebito > 0 && (
                  <Badge variant="destructive">
                    Em Débito: €{service.executadoEmDebito.toFixed(2)}
                  </Badge>
                )}
                {service.diasEmAtraso > 0 && (
                  <Badge variant="destructive">
                    {service.diasEmAtraso} dias em atraso
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Valores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Valores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="font-medium text-sm text-muted-foreground">Com IVA</span>
                  <p className="text-lg font-bold">€{service.valorComIVA.toFixed(2)}</p>
                </div>
                <div>
                  <span className="font-medium text-sm text-muted-foreground">Sem IVA</span>
                  <p className="text-lg">€{service.valorSemIVA.toFixed(2)}</p>
                </div>
                <div>
                  <span className="font-medium text-sm text-muted-foreground">Liquidado</span>
                  <p className="text-lg text-green-600">€{service.liquidado.toFixed(2)}</p>
                </div>
                <div>
                  <span className="font-medium text-sm text-muted-foreground">% Liquidado</span>
                  <p className="text-lg">{service.percentualLiquidado.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gestão de Liquidações */}
          <LiquidacoesManager
            serviceId={service.id}
            liquidacoes={service.liquidacoes}
            onAddLiquidacao={onAddLiquidacao}
            onRemoveLiquidacao={(liquidacaoId) => onRemoveLiquidacao(liquidacaoId)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};