import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Liquidacao, FormaPagamento } from '@/types/service';
import { liquidacaoSchema, type LiquidacaoFormData } from '@/lib/validations';
import { formatEUR } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface LiquidacoesManagerProps {
  serviceId: string;
  liquidacoes: Liquidacao[];
  valorLiquidadoLegado?: number; // Valor legado quando não há liquidações registradas
  onAddLiquidacao: (liquidacao: Omit<Liquidacao, 'id' | 'createdAt'>) => void;
  onRemoveLiquidacao: (liquidacaoId: string) => void;
}

export const LiquidacoesManager = ({ 
  serviceId, 
  liquidacoes, 
  valorLiquidadoLegado = 0,
  onAddLiquidacao, 
  onRemoveLiquidacao 
}: LiquidacoesManagerProps) => {
  const { toast } = useToast();
  
  const form = useForm<LiquidacaoFormData>({
    resolver: zodResolver(liquidacaoSchema),
    defaultValues: {
      valor: 0,
      dataPagamento: '',
      formaPagamento: undefined,
      observacoes: '',
    },
  });

  const formaPagamentoLabels: Record<FormaPagamento, string> = {
    cheque: 'Cheque',
    multibanco: 'Multibanco',
    numerario: 'Numerário',
    transferencia: 'Transferência',
  };

  const handleAddLiquidacao = (data: LiquidacaoFormData) => {
    onAddLiquidacao({
      serviceId,
      valor: data.valor,
      dataPagamento: data.dataPagamento,
      formaPagamento: data.formaPagamento,
      observacoes: data.observacoes,
    });
    form.reset();
    toast({
      title: "Liquidação adicionada",
      description: "Pagamento registrado com sucesso",
    });
  };

  const handleDataPagamentoChange = (value: string, onChange: (value: string) => void) => {
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
      onChange(masked);
    }
  };

  const totalLiquidado = liquidacoes.reduce((total, liq) => total + liq.valor, 0);
  
  // Se não há liquidações mas há valor legado, mostrar aviso
  const hasLegadoValue = liquidacoes.length === 0 && valorLiquidadoLegado > 0;
  const displayTotal = hasLegadoValue ? valorLiquidadoLegado : totalLiquidado;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Liquidações</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total liquidado: {formatEUR(displayTotal)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aviso para valores legados sem histórico detalhado */}
        {hasLegadoValue && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Valor já liquidado:</strong> {formatEUR(valorLiquidadoLegado)}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Este valor foi registado sem histórico detalhado. Novos pagamentos serão adicionados ao histórico abaixo.
            </p>
          </div>
        )}
        
        {liquidacoes.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Pagamentos registrados:</h4>
            {liquidacoes.map((liquidacao) => (
              <div key={liquidacao.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{formatEUR(liquidacao.valor)}</span>
                    <span className="text-sm text-muted-foreground">{liquidacao.dataPagamento}</span>
                    {liquidacao.formaPagamento && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {formaPagamentoLabels[liquidacao.formaPagamento]}
                      </span>
                    )}
                  </div>
                  {liquidacao.observacoes && (
                    <p className="text-sm text-muted-foreground mt-1">{liquidacao.observacoes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveLiquidacao(liquidacao.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Registrar novo pagamento:</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddLiquidacao)} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
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
                  name="dataPagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data do Pagamento</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="DD/MM/AAAA"
                          {...field}
                          onChange={(e) => handleDataPagamentoChange(e.target.value, field.onChange)}
                          maxLength={10}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="formaPagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pagamento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="multibanco">Multibanco</SelectItem>
                          <SelectItem value="numerario">Numerário</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={1}
                          maxLength={500}
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Pagamento
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
};