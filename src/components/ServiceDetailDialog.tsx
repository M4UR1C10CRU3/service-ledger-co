import { ServiceWithCalculations, Liquidacao } from '@/types/service';
import { LiquidacoesManager } from './LiquidacoesManager';
import { formatEUR } from '@/lib/formatters';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail } from 'lucide-react';

interface ServiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceWithCalculations | null;
  allServices: ServiceWithCalculations[];
  onAddLiquidacao: (liquidacao: Omit<Liquidacao, 'id' | 'createdAt'>) => void;
  onRemoveLiquidacao: (liquidacaoId: string) => void;
}

export const ServiceDetailDialog = ({
  open,
  onOpenChange,
  service,
  allServices,
  onAddLiquidacao,
  onRemoveLiquidacao
}: ServiceDetailDialogProps) => {
  if (!service) return null;

  // Para contratos: encontrar faturas vinculadas
  const faturasVinculadas = service.tipoServico === 'contrato' 
    ? allServices.filter(s => s.contratoId === service.id)
    : [];

  // Calcular status correto do contrato
  const getStatusContrato = () => {
    if (service.tipoServico !== 'contrato') return '';
    if (service.valorFaturado === 0) return 'Não Iniciado';
    if (service.valorFaturado >= service.valorComIVA) return 'Concluído';
    return 'Em Andamento';
  };

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
                  <span className="font-medium">Tipo:</span>
                  <div className="mt-1">
                    <Badge variant={service.tipoServico === 'contrato' ? 'default' : 'secondary'}>
                      {service.tipoServico === 'contrato' ? 'Contrato' : 'Fatura'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Data:</span>
                  <p>{service.data}</p>
                </div>
                <div>
                  <span className="font-medium">Cliente:</span>
                  <p>{service.cliente}</p>
                </div>
                {/* Contactos do cliente */}
                {(service.telefone || service.email) && (
                  <div>
                    <span className="font-medium">Contactos:</span>
                    <div className="flex flex-col gap-1 mt-1">
                      {service.telefone && (
                        <a href={`tel:${service.telefone}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Phone className="h-4 w-4" />
                          {service.telefone}
                        </a>
                      )}
                      {service.email && (
                        <a href={`mailto:${service.email}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Mail className="h-4 w-4" />
                          {service.email}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {service.tipoServico === 'fatura' && service.contratoId && (
                  <div>
                    <span className="font-medium">Contrato Pai:</span>
                    <p>{service.contratoId}</p>
                  </div>
                )}
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
                  <span className="font-medium">
                    {service.tipoServico === 'contrato' ? 'Status do Contrato:' : 'Fatura:'}
                  </span>
                  <p>
                    {service.tipoServico === 'contrato' 
                      ? getStatusContrato()
                      : (service.fatura || 'Não faturado')
                    }
                  </p>
                </div>
                {service.tipoServico === 'fatura' && service.numeroFatura && (
                  <div>
                    <span className="font-medium">Número da Fatura:</span>
                    <p>{service.numeroFatura}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {service.tipoServico === 'contrato' && (
                  <>
                    <Badge variant="outline">
                      Valor a Realizar: {formatEUR(service.valorARealizar)}
                    </Badge>
                    <Badge variant="default">
                      Já Faturado: {formatEUR(service.valorFaturado)}
                    </Badge>
                  </>
                )}
                {service.tipoServico === 'fatura' && (
                  <>
                    {service.aRealizar && (
                      <Badge variant="outline">A Realizar</Badge>
                    )}
                    {service.fatura && (
                      <Badge variant="default">Faturado</Badge>
                    )}
                    {service.executadoEmDebito > 0 && (
                      <Badge variant="destructive">
                        Em Débito: {formatEUR(service.executadoEmDebito)}
                      </Badge>
                    )}
                    {service.diasEmAtraso > 0 && (
                      <Badge variant="destructive">
                        {service.diasEmAtraso} dias em atraso
                      </Badge>
                    )}
                  </>
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
              {service.tipoServico === 'contrato' ? (
                <div className="space-y-6">
                  {/* Valores do Contrato */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Contrato</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">Valor Contratado</span>
                        <p className="text-lg font-bold">{formatEUR(service.valorComIVA)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">Já Faturado</span>
                        <p className="text-lg text-blue-600">{formatEUR(service.valorFaturado)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">A Realizar</span>
                        <p className="text-lg text-orange-600">{formatEUR(service.valorARealizar)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">% Faturado</span>
                        <p className="text-lg">{service.percentualFaturado.toFixed(1).replace('.', ',')}%</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Situação de Pagamentos (sobre o faturado) */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Pagamentos (sobre o faturado)</h4>
                    
                    {/* Lista de faturas vinculadas com seus pagamentos */}
                    {faturasVinculadas.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <span className="text-sm font-medium text-muted-foreground">Faturas vinculadas:</span>
                        <div className="space-y-1">
                          {faturasVinculadas.map(fatura => (
                            <div key={fatura.id} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                              <span className="font-medium">{fatura.numeroFatura || 'Sem número'}</span>
                              <div className="flex gap-4">
                                <span>Valor: {formatEUR(fatura.valorComIVA)}</span>
                                <span className="text-green-600">Liquidado: {formatEUR(fatura.liquidado)}</span>
                                <span className="text-red-600">Débito: {formatEUR(fatura.executadoEmDebito)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">Total Liquidado</span>
                        <p className="text-lg text-green-600">{formatEUR(service.liquidado)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">% Liquidado</span>
                        <p className="text-lg text-green-600">{service.percentualLiquidado.toFixed(1).replace('.', ',')}%</p>
                      </div>
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">Total Em Débito</span>
                        <p className="text-lg text-red-600">{formatEUR(service.executadoEmDebito)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">% Em Débito</span>
                        <p className="text-lg text-red-600">
                          {service.valorFaturado > 0 
                            ? ((service.executadoEmDebito / service.valorFaturado) * 100).toFixed(1).replace('.', ',') 
                            : '0,0'}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="font-medium text-sm text-muted-foreground">Com IVA</span>
                    <p className="text-lg font-bold">{formatEUR(service.valorComIVA)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-sm text-muted-foreground">Sem IVA</span>
                    <p className="text-lg">{formatEUR(service.valorSemIVA)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-sm text-muted-foreground">Liquidado</span>
                    <p className="text-lg text-green-600">{formatEUR(service.liquidado)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-sm text-muted-foreground">Em Débito</span>
                    <p className="text-lg text-red-600">{formatEUR(service.executadoEmDebito)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium text-sm text-muted-foreground">% Liquidado</span>
                    <p className="text-lg">{service.percentualLiquidado.toFixed(1).replace('.', ',')}%</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gestão de Liquidações - apenas para faturas */}
          {service.tipoServico === 'fatura' && (
            <LiquidacoesManager
              serviceId={service.id}
              liquidacoes={service.liquidacoes}
              valorLiquidadoLegado={service.liquidacoes.length === 0 ? service.liquidado : 0}
              onAddLiquidacao={onAddLiquidacao}
              onRemoveLiquidacao={(liquidacaoId) => onRemoveLiquidacao(liquidacaoId)}
            />
          )}
          
          {/* Informação para contratos */}
          {service.tipoServico === 'contrato' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Contrato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Este é um contrato de longa duração. Para registrar pagamentos, 
                    crie faturas parciais vinculadas a este contrato.
                  </p>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Status:</p>
                      <p className="text-lg">
                        {service.statusContrato === 'nao_iniciado' && 'Aguardando primeira fatura'}
                        {service.statusContrato === 'em_andamento' && 'Em execução'}
                        {service.statusContrato === 'concluido' && 'Contrato concluído'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Progresso:</p>
                      <p className="text-lg">{service.percentualFaturado.toFixed(1).replace('.', ',')}% faturado</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};