import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ServiceWithCalculations } from '@/types/service';
import { invoiceFormSchema, type InvoiceFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ServiceWithCalculations | null;
  onCreateInvoice: (invoiceData: any) => void;
}

export const CreateInvoiceDialog = ({
  open,
  onOpenChange,
  contract,
  onCreateInvoice
}: CreateInvoiceDialogProps) => {
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      numeroFatura: '',
      valorComIVA: 0,
      valorSemIVA: 0,
      resumo: '',
    },
  });

  if (!contract) return null;

  const maxInvoiceValue = contract.valorARealizar;

  const handleSubmit = (data: InvoiceFormData) => {
    if (data.valorComIVA > maxInvoiceValue) {
      form.setError('valorComIVA', {
        message: `Valor não pode exceder €${maxInvoiceValue.toFixed(2)}`,
      });
      return;
    }

    const invoiceData = {
      data: new Date().toLocaleDateString('pt-PT'),
      servico: `${contract.servico} - Fatura Parcial`,
      cliente: contract.cliente,
      resumo: data.resumo || `Fatura parcial - ${contract.servico}`,
      proposta: contract.proposta,
      fatura: data.numeroFatura,
      numeroFatura: data.numeroFatura,
      valorComIVA: data.valorComIVA,
      valorSemIVA: data.valorSemIVA,
      liquidado: 0,
      aRealizar: false,
      tipoServico: 'fatura' as const,
      contratoId: contract.id,
      valorFaturado: 0
    };

    onCreateInvoice(invoiceData);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Fatura Parcial</DialogTitle>
          <DialogDescription>
            Criar nova fatura para o contrato: {contract.servico}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Informações do Contrato:</h4>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <p>• Valor Total: €{contract.valorComIVA.toFixed(2)}</p>
                <p>• Já Faturado: €{contract.valorFaturado.toFixed(2)}</p>
                <p>• Disponível para Faturar: €{maxInvoiceValue.toFixed(2)}</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="numeroFatura"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número da Fatura *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: F-2025-001" />
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
                  <FormLabel>Valor com IVA (€) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxInvoiceValue}
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
              name="valorSemIVA"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor sem IVA (€) *</FormLabel>
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
              name="resumo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resumo da Fatura</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={`Fatura parcial - ${contract.servico}`}
                      className="resize-none"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Criar Fatura
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};