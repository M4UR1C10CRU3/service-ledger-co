import { useState, useEffect } from 'react';
import { Service } from '@/types/service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (service: Omit<Service, 'id' | 'createdAt'>) => void;
  editingService?: Service | null;
}

export const ServiceForm = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  editingService 
}: ServiceFormProps) => {
  const [formData, setFormData] = useState({
    data: '',
    servico: '',
    cliente: '',
    resumo: '',
    proposta: '',
    fatura: '',
    valorComIVA: 0,
    valorSemIVA: 0,
    liquidado: 0,
    dataLiquidacao: '',
    liquidacaoTotal: true,
    aRealizar: false,
  });

  // Update form data when editingService changes
  useEffect(() => {
    if (editingService) {
      setFormData({
        data: editingService.data,
        servico: editingService.servico,
        cliente: editingService.cliente,
        resumo: editingService.resumo,
        proposta: editingService.proposta || '',
        fatura: editingService.fatura,
        valorComIVA: editingService.valorComIVA,
        valorSemIVA: editingService.valorSemIVA,
        liquidado: editingService.liquidado,
        dataLiquidacao: editingService.dataLiquidacao || '',
        liquidacaoTotal: editingService.liquidacaoTotal,
        aRealizar: editingService.aRealizar,
      });
    } else {
      setFormData({
        data: '',
        servico: '',
        cliente: '',
        resumo: '',
        proposta: '',
        fatura: '',
        valorComIVA: 0,
        valorSemIVA: 0,
        liquidado: 0,
        dataLiquidacao: '',
        liquidacaoTotal: true,
        aRealizar: false,
      });
    }
  }, [editingService]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      data: '',
      servico: '',
      cliente: '',
      resumo: '',
      proposta: '',
      fatura: '',
      valorComIVA: 0,
      valorSemIVA: 0,
      liquidado: 0,
      dataLiquidacao: '',
      liquidacaoTotal: true,
      aRealizar: false,
    });
  };

  const handleResumoChange = (value: string) => {
    if (value.length <= 40) {
      setFormData(prev => ({ ...prev, resumo: value }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingService ? 'Editar Serviço' : 'Novo Serviço'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do serviço. Os cálculos serão feitos automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="text"
                placeholder="DD/MM/YYYY"
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <Input
                id="cliente"
                value={formData.cliente}
                onChange={(e) => setFormData(prev => ({ ...prev, cliente: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="servico">Serviço</Label>
              <Input
                id="servico"
                value={formData.servico}
                onChange={(e) => setFormData(prev => ({ ...prev, servico: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="resumo">
                Resumo do Serviço ({formData.resumo.length}/40)
              </Label>
              <Textarea
                id="resumo"
                value={formData.resumo}
                onChange={(e) => handleResumoChange(e.target.value)}
                className="resize-none"
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposta">Proposta (opcional)</Label>
              <Input
                id="proposta"
                value={formData.proposta}
                onChange={(e) => setFormData(prev => ({ ...prev, proposta: e.target.value }))}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fatura">Fatura</Label>
              <Input
                id="fatura"
                value={formData.fatura}
                onChange={(e) => setFormData(prev => ({ ...prev, fatura: e.target.value }))}
                placeholder="Deixe vazio se não faturado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorComIVA">Valor com IVA (€)</Label>
              <Input
                id="valorComIVA"
                type="number"
                step="0.01"
                value={formData.valorComIVA}
                onChange={(e) => setFormData(prev => ({ ...prev, valorComIVA: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorSemIVA">Valor sem IVA (€)</Label>
              <Input
                id="valorSemIVA"
                type="number"
                step="0.01"
                value={formData.valorSemIVA}
                onChange={(e) => setFormData(prev => ({ ...prev, valorSemIVA: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="liquidado">Valor Liquidado (€)</Label>
              <Input
                id="liquidado"
                type="number"
                step="0.01"
                value={formData.liquidado}
                onChange={(e) => setFormData(prev => ({ ...prev, liquidado: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataLiquidacao">Data da Liquidação</Label>
              <Input
                id="dataLiquidacao"
                type="text"
                placeholder="DD/MM/YYYY (opcional)"
                value={formData.dataLiquidacao}
                onChange={(e) => setFormData(prev => ({ ...prev, dataLiquidacao: e.target.value }))}
              />
            </div>

            <div className="space-y-2 flex items-center space-x-2">
              <Switch
                id="liquidacaoTotal"
                checked={formData.liquidacaoTotal}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, liquidacaoTotal: checked }))}
              />
              <Label htmlFor="liquidacaoTotal">Liquidação Total</Label>
              <span className="text-sm text-muted-foreground">
                {formData.liquidacaoTotal ? '(Total)' : '(Parcial - permite preenchimento posterior)'}
              </span>
            </div>

            <div className="space-y-2 flex items-center space-x-2">
              <Switch
                id="aRealizar"
                checked={formData.aRealizar}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, aRealizar: checked }))}
              />
              <Label htmlFor="aRealizar">A Realizar</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingService ? 'Atualizar' : 'Adicionar'} Serviço
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};