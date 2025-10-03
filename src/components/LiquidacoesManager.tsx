import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Liquidacao } from '@/types/service';
import { liquidacaoSchema, type LiquidacaoFormData } from '@/lib/validations';
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
import { useToast } from '@/hooks/use-toast';

interface LiquidacoesManagerProps {
  serviceId: string;
  liquidacoes: Liquidacao[];
  onAddLiquidacao: (liquidacao: Omit<Liquidacao, 'id' | 'createdAt'>) => void;
  onRemoveLiquidacao: (liquidacaoId: string) => void;
}

export const LiquidacoesManager = ({ 
  serviceId, 
  liquidacoes, 
  onAddLiquidacao, 
  onRemoveLiquidacao 
}: LiquidacoesManagerProps) => {
  const { toast } = useToast();
  
  const form = useForm<LiquidacaoFormData>({
    resolver: zodResolver(liquidacaoSchema),
    defaultValues: {
      valor: 0,
      dataPagamento: '',
      observacoes: '',
    },
  });

  const handleAddLiquidacao = (data: LiquidacaoFormData) => {
    onAddLiquidacao({
      serviceId,
      valor: data.valor,
      dataPagamento: data.dataPagamento,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Liquidações</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total liquidado: €{totalLiquidado.toFixed(2)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {liquidacoes.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Pagamentos registrados:</h4>
            {liquidacoes.map((liquidacao) => (
              <div key={liquidacao.id} className="flex items-center justify-between p-3 border rounded">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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