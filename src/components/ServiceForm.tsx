import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Service, Liquidacao } from '@/types/service';
import { serviceFormSchema, liquidacaoSchema, type ServiceFormData, type LiquidacaoFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (service: Omit<Service, 'id' | 'createdAt'>, liquidacoes?: Omit<Liquidacao, 'id' | 'createdAt' | 'serviceId'>[]) => void;
  editingService?: Service | null;
}

export const ServiceForm = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  editingService 
}: ServiceFormProps) => {
  const { toast } = useToast();
  
  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      data: '',
      servico: '',
      cliente: '',
      resumo: '',
      proposta: '',
      fatura: '',
      valorComIVA: 0,
      valorSemIVA: 0,
      aRealizar: false,
      tipoServico: 'fatura',
      contratoId: '',
      valorFaturado: 0,
      numeroFatura: '',
    },
  });

  const [liquidacoes, setLiquidacoes] = useState<Omit<Liquidacao, 'id' | 'createdAt' | 'serviceId'>[]>([]);
  const [novaLiquidacao, setNovaLiquidacao] = useState({
    valor: '',
    dataPagamento: '',
    observacoes: ''
  });

  // Update form data when editingService changes
  useEffect(() => {
    if (editingService) {
      form.reset({
        data: editingService.data,
        servico: editingService.servico,
        cliente: editingService.cliente,
        resumo: editingService.resumo,
        proposta: editingService.proposta || '',
        fatura: editingService.fatura,
        valorComIVA: editingService.valorComIVA,
        valorSemIVA: editingService.valorSemIVA,
        aRealizar: editingService.aRealizar,
        tipoServico: editingService.tipoServico || 'fatura',
        contratoId: editingService.contratoId || '',
        valorFaturado: editingService.valorFaturado || 0,
        numeroFatura: editingService.numeroFatura || '',
      });
      setLiquidacoes([]);
    } else {
      form.reset();
      setLiquidacoes([]);
    }
  }, [editingService, form]);

  const handleAddLiquidacao = () => {
    try {
      const validated = liquidacaoSchema.parse({
        valor: parseFloat(novaLiquidacao.valor),
        dataPagamento: novaLiquidacao.dataPagamento,
        observacoes: novaLiquidacao.observacoes || undefined,
      }) as Omit<Liquidacao, 'id' | 'createdAt' | 'serviceId'>;
      
      setLiquidacoes(prev => [...prev, validated]);
      setNovaLiquidacao({
        valor: '',
        dataPagamento: '',
        observacoes: ''
      });
      toast({
        title: "Liquidação adicionada",
        description: "Pagamento adicionado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro de validação",
        description: error.errors?.[0]?.message || "Dados inválidos",
        variant: "destructive",
      });
    }
  };

  const handleRemoveLiquidacao = (index: number) => {
    setLiquidacoes(prev => prev.filter((_, i) => i !== index));
  };

  const totalLiquidado = liquidacoes.reduce((total, liq) => total + liq.valor, 0);

  const handleDataPagamentoChange = (value: string) => {
    const cleaned = value.replace(/[^\d/]/g, '');
    let masked = cleaned;
    if (cleaned.length >= 2 && !cleaned.includes('/')) {
      masked = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    if (cleaned.length >= 5 && cleaned.indexOf('/') === 2) {
      const parts = cleaned.split('/');
      if (parts[1] && parts[1].length >= 2) {
        masked = parts[0] + '/' + parts[1].slice(0, 2) + '/' + (parts[1].slice(2) + (parts[2] || '')).slice(0, 4);
      }
    }
    if (masked.length <= 10) {
      setNovaLiquidacao(prev => ({ ...prev, dataPagamento: masked }));
    }
  };

  const handleFormSubmit = (data: ServiceFormData) => {
    onSubmit({
      ...data,
      liquidado: totalLiquidado
    } as Omit<Service, 'id' | 'createdAt'>, liquidacoes);
    onOpenChange(false);
    form.reset();
    setLiquidacoes([]);
    setNovaLiquidacao({
      valor: '',
      dataPagamento: '',
      observacoes: ''
    });
  };

  const tipoServico = form.watch('tipoServico');
  const resumo = form.watch('resumo');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {editingService ? 'Editar Serviço' : 'Novo Serviço'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do serviço. Os cálculos serão feitos automaticamente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Form {...form}>
            <form id="service-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="DD/MM/AAAA"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            const cleaned = value.replace(/[^\d/]/g, '');
                            let masked = cleaned;
                            if (cleaned.length >= 2 && !cleaned.includes('/')) {
                              masked = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
                            }
                            if (cleaned.length >= 5 && cleaned.indexOf('/') === 2) {
                              const parts = cleaned.split('/');
                              if (parts[1] && parts[1].length >= 2) {
                                masked = parts[0] + '/' + parts[1].slice(0, 2) + '/' + (parts[1].slice(2) + (parts[2] || '')).slice(0, 4);
                              }
                            }
                            if (masked.length <= 10) {
                              field.onChange(masked);
                            }
                          }}
                          maxLength={10}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cliente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="servico"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Serviço</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resumo"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        Resumo do Serviço ({resumo?.length || 0}/40)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="resize-none"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipoServico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Serviço</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        >
                          <option value="fatura">Fatura (Débito Real)</option>
                          <option value="contrato">Contrato (Projeção)</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {tipoServico === 'fatura' && (
                  <FormField
                    control={form.control}
                    name="contratoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contrato de Origem (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="ID do contrato pai"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Deixe vazio para faturas independentes
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {tipoServico === 'fatura' && (
                  <FormField
                    control={form.control}
                    name="numeroFatura"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número da Fatura</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Número da fatura"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="proposta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposta (opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Opcional" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fatura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {tipoServico === 'contrato' ? 'Valor Total Contratado (€)' : 'Fatura'}
                      </FormLabel>
                      <FormControl>
                        {tipoServico === 'contrato' ? (
                          <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground">
                              Para contratos, este é o valor total acordado.
                            </p>
                          </div>
                        ) : (
                          <Input {...field} placeholder="Número da fatura" />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valorComIVA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {tipoServico === 'contrato' ? 'Valor Total com IVA (€)' : 'Valor com IVA (€)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      {tipoServico === 'contrato' && (
                        <p className="text-xs text-muted-foreground">
                          Este valor não será considerado como débito até que faturas sejam emitidas.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valorSemIVA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {tipoServico === 'contrato' ? 'Valor Total sem IVA (€)' : 'Valor sem IVA (€)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aRealizar"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>A Realizar</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-6" />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Liquidações 
                    {tipoServico === 'contrato' ? ' (Não aplicável a contratos)' : ' (Opcional)'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {tipoServico === 'contrato' 
                      ? 'Contratos não recebem liquidações diretamente. Crie faturas parciais para registrar pagamentos.'
                      : 'Adicione pagamentos parciais ou totais para esta fatura'
                    }
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tipoServico === 'fatura' && (
                    <>
                      {liquidacoes.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Pagamentos Adicionados:</Label>
                          {liquidacoes.map((liquidacao, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                              <div className="flex-1">
                                <div className="flex items-center gap-4">
                                  <span className="font-medium">€{liquidacao.valor.toFixed(2)}</span>
                                  <span className="text-sm text-muted-foreground">{liquidacao.dataPagamento}</span>
                                </div>
                                {liquidacao.observacoes && (
                                  <p className="text-sm text-muted-foreground mt-1">{liquidacao.observacoes}</p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLiquidacao(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="text-sm font-medium text-right">
                            Total Liquidado: €{totalLiquidado.toFixed(2)}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-muted/20">
                        <div className="space-y-2">
                          <Label htmlFor="valorLiquidacao">Valor (€)</Label>
                          <Input
                            id="valorLiquidacao"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={novaLiquidacao.valor}
                            onChange={(e) => setNovaLiquidacao(prev => ({ 
                              ...prev, 
                              valor: e.target.value
                            }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dataPagamento">Data Pagamento</Label>
                          <Input
                            id="dataPagamento"
                            type="text"
                            placeholder="DD/MM/AAAA"
                            value={novaLiquidacao.dataPagamento}
                            onChange={(e) => handleDataPagamentoChange(e.target.value)}
                            maxLength={10}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="observacoes">Observações</Label>
                          <Input
                            id="observacoes"
                            placeholder="Opcional"
                            maxLength={500}
                            value={novaLiquidacao.observacoes}
                            onChange={(e) => setNovaLiquidacao(prev => ({ 
                              ...prev, 
                              observacoes: e.target.value 
                            }))}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddLiquidacao}
                            disabled={!novaLiquidacao.valor || !novaLiquidacao.dataPagamento}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Pagamento
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="service-form">
            {editingService ? 'Atualizar Serviço' : 'Adicionar Serviço'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
