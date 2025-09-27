import { useState } from 'react';
import { ServiceWithCalculations } from '@/types/service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [formData, setFormData] = useState({
    numeroFatura: '',
    valorComIVA: 0,
    valorSemIVA: 0,
    resumo: '',
    observacoes: ''
  });

  if (!contract) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const invoiceData = {
      data: new Date().toLocaleDateString('pt-PT'),
      servico: `${contract.servico} - Fatura Parcial`,
      cliente: contract.cliente,
      resumo: formData.resumo || `Fatura parcial - ${contract.servico}`,
      proposta: contract.proposta,
      fatura: formData.numeroFatura,
      numeroFatura: formData.numeroFatura,
      valorComIVA: formData.valorComIVA,
      valorSemIVA: formData.valorSemIVA,
      liquidado: 0,
      aRealizar: false,
      tipoServico: 'fatura' as const,
      contratoId: contract.id,
      valorFaturado: 0
    };

    onCreateInvoice(invoiceData);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      numeroFatura: '',
      valorComIVA: 0,
      valorSemIVA: 0,
      resumo: '',
      observacoes: ''
    });
  };

  const maxInvoiceValue = contract.valorARealizar;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Fatura Parcial</DialogTitle>
          <DialogDescription>
            Criar nova fatura para o contrato: {contract.servico}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Informações do Contrato:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Valor Total: €{contract.valorComIVA.toFixed(2)}</p>
              <p>• Já Faturado: €{contract.valorFaturado.toFixed(2)}</p>
              <p>• Disponível para Faturar: €{maxInvoiceValue.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numeroFatura">Número da Fatura *</Label>
            <Input
              id="numeroFatura"
              value={formData.numeroFatura}
              onChange={(e) => setFormData(prev => ({ ...prev, numeroFatura: e.target.value }))}
              placeholder="Ex: F-2025-001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valorComIVA">Valor com IVA (€) *</Label>
            <Input
              id="valorComIVA"
              type="number"
              step="0.01"
              max={maxInvoiceValue}
              value={formData.valorComIVA || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                if (value <= maxInvoiceValue) {
                  setFormData(prev => ({ ...prev, valorComIVA: value }));
                }
              }}
              placeholder="0.00"
              required
            />
            {formData.valorComIVA > maxInvoiceValue && (
              <p className="text-sm text-red-600">
                Valor não pode exceder €{maxInvoiceValue.toFixed(2)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="valorSemIVA">Valor sem IVA (€) *</Label>
            <Input
              id="valorSemIVA"
              type="number"
              step="0.01"
              value={formData.valorSemIVA || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, valorSemIVA: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resumo">Resumo da Fatura</Label>
            <Textarea
              id="resumo"
              value={formData.resumo}
              onChange={(e) => setFormData(prev => ({ ...prev, resumo: e.target.value }))}
              placeholder={`Fatura parcial - ${contract.servico}`}
              className="resize-none"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.numeroFatura || !formData.valorComIVA || formData.valorComIVA > maxInvoiceValue}
            >
              Criar Fatura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};