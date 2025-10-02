import { useState, useEffect } from 'react';
import { Service, Liquidacao } from '@/types/service';
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
import { Plus, Trash2 } from 'lucide-react';

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
  const [formData, setFormData] = useState({
    data: '',
    servico: '',
    cliente: '',
    resumo: '',
    proposta: '',
    fatura: '',
    valorComIVA: 0,
    valorSemIVA: 0,
    aRealizar: false,
    tipoServico: 'fatura' as 'contrato' | 'fatura',
    contratoId: '',
    valorFaturado: 0,
    numeroFatura: '',
  });

  const [liquidacoes, setLiquidacoes] = useState<Omit<Liquidacao, 'id' | 'createdAt' | 'serviceId'>[]>([]);
  const [novaLiquidacao, setNovaLiquidacao] = useState({
    valor: 0,
    dataPagamento: '',
    observacoes: ''
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
        aRealizar: editingService.aRealizar,
        tipoServico: editingService.tipoServico || 'fatura',
        contratoId: editingService.contratoId || '',
        valorFaturado: editingService.valorFaturado || 0,
        numeroFatura: editingService.numeroFatura || '',
      });
      setLiquidacoes([]);
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
        aRealizar: false,
        tipoServico: 'fatura',
        contratoId: '',
        valorFaturado: 0,
        numeroFatura: '',
      });
      setLiquidacoes([]);
    }
  }, [editingService]);

  const handleAddLiquidacao = () => {
    if (novaLiquidacao.valor > 0 && novaLiquidacao.dataPagamento) {
      setLiquidacoes(prev => [...prev, {
        valor: novaLiquidacao.valor,
        dataPagamento: novaLiquidacao.dataPagamento,
        observacoes: novaLiquidacao.observacoes
      }]);
      setNovaLiquidacao({
        valor: 0,
        dataPagamento: '',
        observacoes: ''
      });
    }
  };

  const handleRemoveLiquidacao = (index: number) => {
    setLiquidacoes(prev => prev.filter((_, i) => i !== index));
  };

  const totalLiquidado = liquidacoes.reduce((total, liq) => total + liq.valor, 0);

  const handleDataPagamentoChange = (value: string) => {
    // Remove caracteres não numéricos exceto /
    const cleaned = value.replace(/[^\d/]/g, '');
    // Aplicar máscara DD/MM/AAAA
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
    // Limitar a 10 caracteres (DD/MM/AAAA)
    if (masked.length <= 10) {
      setNovaLiquidacao(prev => ({ ...prev, dataPagamento: masked }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      liquidado: totalLiquidado
    }, liquidacoes);
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
      aRealizar: false,
      tipoServico: 'fatura',
      contratoId: '',
      valorFaturado: 0,
      numeroFatura: '',
    });
    setLiquidacoes([]);
    setNovaLiquidacao({
      valor: 0,
      dataPagamento: '',
      observacoes: ''
    });
  };

  const handleResumoChange = (value: string) => {
    if (value.length <= 40) {
      setFormData(prev => ({ ...prev, resumo: value }));
    }
  };

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
          <form id="service-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="text"
                placeholder="DD/MM/AAAA"
                value={formData.data}
                onChange={(e) => {
                  const value = e.target.value;
                  // Remove caracteres não numéricos exceto /
                  const cleaned = value.replace(/[^\d/]/g, '');
                  // Aplicar máscara DD/MM/AAAA
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
                  // Limitar a 10 caracteres (DD/MM/AAAA)
                  if (masked.length <= 10) {
                    setFormData(prev => ({ ...prev, data: masked }));
                  }
                }}
                maxLength={10}
                pattern="\d{2}/\d{2}/\d{4}"
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
              <Label htmlFor="tipoServico">Tipo de Serviço</Label>
              <select
                id="tipoServico"
                value={formData.tipoServico}
                onChange={(e) => setFormData(prev => ({ ...prev, tipoServico: e.target.value as 'contrato' | 'fatura' }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                required
              >
                <option value="fatura">Fatura (Débito Real)</option>
                <option value="contrato">Contrato (Projeção)</option>
              </select>
            </div>

            {formData.tipoServico === 'fatura' && (
              <div className="space-y-2">
                <Label htmlFor="contratoId">Contrato de Origem (opcional)</Label>
                <Input
                  id="contratoId"
                  value={formData.contratoId}
                  onChange={(e) => setFormData(prev => ({ ...prev, contratoId: e.target.value }))}
                  placeholder="ID do contrato pai (para faturas parciais)"
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para faturas independentes. Preencha para faturas parciais de contratos.
                </p>
              </div>
            )}

            {formData.tipoServico === 'fatura' && (
              <div className="space-y-2">
                <Label htmlFor="numeroFatura">Número da Fatura</Label>
                <Input
                  id="numeroFatura"
                  value={formData.numeroFatura}
                  onChange={(e) => setFormData(prev => ({ ...prev, numeroFatura: e.target.value }))}
                  placeholder="Número da fatura"
                />
              </div>
            )}

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
              <Label htmlFor="fatura">
                {formData.tipoServico === 'contrato' ? 'Valor Total Contratado (€)' : 'Fatura'}
              </Label>
              {formData.tipoServico === 'contrato' ? (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Para contratos, este é o valor total acordado. 
                    As faturas serão criadas separadamente.
                  </p>
                </div>
              ) : (
                <Input
                  id="fatura"
                  value={formData.fatura}
                  onChange={(e) => setFormData(prev => ({ ...prev, fatura: e.target.value }))}
                  placeholder="Número da fatura"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorComIVA">
                {formData.tipoServico === 'contrato' ? 'Valor Total com IVA (€)' : 'Valor com IVA (€)'}
              </Label>
              <Input
                id="valorComIVA"
                type="number"
                step="0.01"
                value={formData.valorComIVA}
                onChange={(e) => setFormData(prev => ({ ...prev, valorComIVA: parseFloat(e.target.value) || 0 }))}
                required
              />
              {formData.tipoServico === 'contrato' && (
                <p className="text-xs text-muted-foreground">
                  Este valor não será considerado como débito até que faturas sejam emitidas.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorSemIVA">
                {formData.tipoServico === 'contrato' ? 'Valor Total sem IVA (€)' : 'Valor sem IVA (€)'}
              </Label>
              <Input
                id="valorSemIVA"
                type="number"
                step="0.01"
                value={formData.valorSemIVA}
                onChange={(e) => setFormData(prev => ({ ...prev, valorSemIVA: parseFloat(e.target.value) || 0 }))}
                required
              />
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

          <Separator className="my-6" />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Liquidações 
                {formData.tipoServico === 'contrato' ? ' (Não aplicável a contratos)' : ' (Opcional)'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {formData.tipoServico === 'contrato' 
                  ? 'Contratos não recebem liquidações diretamente. Crie faturas parciais para registrar pagamentos.'
                  : 'Adicione pagamentos parciais ou totais para esta fatura'
                }
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.tipoServico === 'fatura' && (
                <>
                  {/* Lista de liquidações existentes */}
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
                        {formData.valorComIVA > 0 && (
                          <span className="text-muted-foreground ml-2">
                            / €{formData.valorComIVA.toFixed(2)} (Saldo: €{(formData.valorComIVA - totalLiquidado).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Formulário para nova liquidação */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-muted/20">
                    <div className="space-y-2">
                      <Label htmlFor="valorLiquidacao">Valor (€)</Label>
                      <Input
                        id="valorLiquidacao"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={novaLiquidacao.valor || ''}
                        onChange={(e) => setNovaLiquidacao(prev => ({ 
                          ...prev, 
                          valor: parseFloat(e.target.value) || 0 
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
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Pagamento
                      </Button>
                    </div>
                  </div>
                </>
              )}
              
              {formData.tipoServico === 'contrato' && (
                <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Este contrato representa o valor total acordado</li>
                    <li>• Para faturar parcialmente, crie "Faturas" vinculadas a este contrato</li>
                    <li>• Cada fatura poderá receber liquidações (pagamentos)</li>
                    <li>• O saldo "A Realizar" diminui conforme faturas são emitidas</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="service-form">
            {editingService ? 'Atualizar' : 'Adicionar'} Serviço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};