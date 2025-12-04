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
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (service: Omit<Service, 'id' | 'createdAt'>, liquidacoes?: Omit<Liquidacao, 'id' | 'createdAt' | 'serviceId'>[]) => void;
  editingService?: Service | null;
  existingLiquidacoes?: Liquidacao[];
  onUpdateLiquidacao?: (liquidacaoId: string, updates: Partial<Liquidacao>) => void;
  onRemoveLiquidacao?: (liquidacaoId: string) => void;
}

export const ServiceForm = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  editingService,
  existingLiquidacoes = [],
  onUpdateLiquidacao,
  onRemoveLiquidacao 
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
  const [editingLiquidacaoId, setEditingLiquidacaoId] = useState<string | null>(null);
  const [editingLiquidacaoData, setEditingLiquidacaoData] = useState({
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

  const totalLiquidadoNovas = liquidacoes.reduce((total, liq) => total + liq.valor, 0);
  const totalLiquidadoExistentes = existingLiquidacoes.reduce((total, liq) => total + liq.valor, 0);
  const totalLiquidado = totalLiquidadoNovas + totalLiquidadoExistentes;

  const handleStartEditLiquidacao = (liquidacao: Liquidacao) => {
    setEditingLiquidacaoId(liquidacao.id);
    setEditingLiquidacaoData({
      valor: liquidacao.valor.toString(),
      dataPagamento: liquidacao.dataPagamento,
      observacoes: liquidacao.observacoes || ''
    });
  };

  const handleCancelEditLiquidacao = () => {
    setEditingLiquidacaoId(null);
    setEditingLiquidacaoData({ valor: '', dataPagamento: '', observacoes: '' });
  };

  const handleSaveEditLiquidacao = () => {
    if (editingLiquidacaoId && onUpdateLiquidacao) {
      onUpdateLiquidacao(editingLiquidacaoId, {
        valor: parseFloat(editingLiquidacaoData.valor) || 0,
        dataPagamento: editingLiquidacaoData.dataPagamento,
        observacoes: editingLiquidacaoData.observacoes || undefined
      });
      handleCancelEditLiquidacao();
      toast({
        title: "Pagamento atualizado",
        description: "Os dados do pagamento foram atualizados com sucesso.",
      });
    }
  };

  const handleEditDataPagamentoChange = (value: string) => {
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
      setEditingLiquidacaoData(prev => ({ ...prev, dataPagamento: masked }));
    }
  };

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
                  name="proposta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposta</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Número da proposta" />
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
                      <FormLabel>Valor Total da Proposta com IVA (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Valor total acordado na proposta
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valorSemIVA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Total da Proposta sem IVA (€)</FormLabel>
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

                <Separator className="md:col-span-2 my-2" />
                
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium mb-3">Faturamento</h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Se houver fatura emitida, informe o número e valor faturado. O valor pode ser menor que o total da proposta.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="numeroFatura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Fatura (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: 17/2025"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valorFaturado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Faturado com IVA (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Valor efetivamente faturado (pode ser menor que o total)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Calculated value display */}
                {(() => {
                  const valorTotal = form.watch('valorComIVA') || 0;
                  const valorFat = form.watch('valorFaturado') || 0;
                  const valorNaoFaturado = Math.max(0, valorTotal - valorFat);
                  
                  if (valorTotal > 0 && valorFat > 0 && valorNaoFaturado > 0) {
                    return (
                      <div className="md:col-span-2 p-3 bg-muted rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Valor Não Faturado:</span>
                          <span className="text-lg font-bold text-orange-600">
                            €{valorNaoFaturado.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Diferença entre o valor da proposta e o valor faturado
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                <FormField
                  control={form.control}
                  name="fatura"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipoServico"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                  <CardTitle className="text-lg">Liquidações</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Histórico de pagamentos referentes ao valor faturado. Total: €{totalLiquidado.toFixed(2)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Liquidações existentes (do banco de dados) */}
                  {existingLiquidacoes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Pagamentos Registrados:</Label>
                      {existingLiquidacoes.map((liquidacao) => (
                        <div key={liquidacao.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                          {editingLiquidacaoId === liquidacao.id ? (
                            <>
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  placeholder="Valor"
                                  value={editingLiquidacaoData.valor}
                                  onChange={(e) => setEditingLiquidacaoData(prev => ({ ...prev, valor: e.target.value }))}
                                />
                                <Input
                                  type="text"
                                  placeholder="DD/MM/AAAA"
                                  value={editingLiquidacaoData.dataPagamento}
                                  onChange={(e) => handleEditDataPagamentoChange(e.target.value)}
                                  maxLength={10}
                                />
                                <Input
                                  placeholder="Observações"
                                  value={editingLiquidacaoData.observacoes}
                                  onChange={(e) => setEditingLiquidacaoData(prev => ({ ...prev, observacoes: e.target.value }))}
                                />
                              </div>
                              <div className="flex gap-1 ml-2">
                                <Button type="button" variant="ghost" size="sm" onClick={handleSaveEditLiquidacao}>
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={handleCancelEditLiquidacao}>
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex-1">
                                <div className="flex items-center gap-4">
                                  <span className="font-medium">€{liquidacao.valor.toFixed(2)}</span>
                                  <span className="text-sm text-muted-foreground">{liquidacao.dataPagamento}</span>
                                </div>
                                {liquidacao.observacoes && (
                                  <p className="text-sm text-muted-foreground mt-1">{liquidacao.observacoes}</p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStartEditLiquidacao(liquidacao)}
                                  title="Editar pagamento"
                                  className="h-8 w-8 p-0"
                                >
                                  <Pencil className="h-4 w-4 text-blue-600" />
                                </Button>
                                {onRemoveLiquidacao && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onRemoveLiquidacao(liquidacao.id)}
                                    title="Remover pagamento"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Novas liquidações (ainda não salvas) */}
                  {liquidacoes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Novos Pagamentos (a adicionar):</Label>
                      {liquidacoes.map((liquidacao, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
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
