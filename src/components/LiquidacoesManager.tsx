import { useState } from 'react';
import { Liquidacao } from '@/types/service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';

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
  const [novaLiquidacao, setNovaLiquidacao] = useState({
    valor: 0,
    dataPagamento: '',
    observacoes: ''
  });

  const handleAddLiquidacao = () => {
    if (novaLiquidacao.valor > 0 && novaLiquidacao.dataPagamento) {
      onAddLiquidacao({
        serviceId,
        valor: novaLiquidacao.valor,
        dataPagamento: novaLiquidacao.dataPagamento,
        observacoes: novaLiquidacao.observacoes
      });
      setNovaLiquidacao({
        valor: 0,
        dataPagamento: '',
        observacoes: ''
      });
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
        {/* Lista de liquidações existentes */}
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

        {/* Formulário para nova liquidação */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Registrar novo pagamento:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (€)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={novaLiquidacao.valor}
                onChange={(e) => setNovaLiquidacao(prev => ({ 
                  ...prev, 
                  valor: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataPagamento">Data do Pagamento</Label>
              <Input
                id="dataPagamento"
                type="text"
                placeholder="DD/MM/YYYY"
                value={novaLiquidacao.dataPagamento}
                onChange={(e) => setNovaLiquidacao(prev => ({ 
                  ...prev, 
                  dataPagamento: e.target.value 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                rows={1}
                value={novaLiquidacao.observacoes}
                onChange={(e) => setNovaLiquidacao(prev => ({ 
                  ...prev, 
                  observacoes: e.target.value 
                }))}
                className="resize-none"
              />
            </div>
          </div>
          <Button 
            onClick={handleAddLiquidacao}
            className="mt-3"
            disabled={!novaLiquidacao.valor || !novaLiquidacao.dataPagamento}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Pagamento
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};