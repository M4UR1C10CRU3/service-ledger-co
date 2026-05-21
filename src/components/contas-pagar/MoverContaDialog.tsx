import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { AccountPayable } from '@/types/accountPayable';

interface Props {
  account: AccountPayable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved?: () => void;
}

type TipoNovo = 'compra_revenda' | 'despesa';

export function MoverContaDialog({ account, open, onOpenChange, onMoved }: Props) {
  const { empresas } = useEmpresa();
  const { toast } = useToast();
  const [novoEmpresaId, setNovoEmpresaId] = useState<string>('');
  const [novoTipo, setNovoTipo] = useState<TipoNovo>('despesa');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setNovoEmpresaId(account.empresaId);
      const tipoAtual = account.tipoLancamento;
      setNovoTipo(
        tipoAtual === 'compra_revenda' || tipoAtual === 'compra' ? 'compra_revenda' : 'despesa'
      );
    }
  }, [account]);

  if (!account) return null;

  const tipoAtualNorm: TipoNovo =
    account.tipoLancamento === 'compra_revenda' || account.tipoLancamento === 'compra'
      ? 'compra_revenda'
      : 'despesa';

  const empresaMudou = novoEmpresaId !== account.empresaId;
  const tipoMudou = novoTipo !== tipoAtualNorm;
  const algoMudou = empresaMudou || tipoMudou;

  const handleSalvar = async () => {
    if (!algoMudou) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      // 1. Update accounts_payable
      const updates: any = {};
      if (empresaMudou) updates.empresa_id = novoEmpresaId;
      if (tipoMudou) updates.tipo_lancamento = novoTipo;
      const { error: e1 } = await supabase
        .from('accounts_payable')
        .update(updates)
        .eq('id', account.id);
      if (e1) throw e1;

      // 2. Cascade empresa_id to related records (payments + cash flows)
      if (empresaMudou) {
        // Get all payment ids for this account
        const { data: payments } = await supabase
          .from('account_payments')
          .select('id')
          .eq('account_payable_id', account.id);

        await supabase
          .from('account_payments')
          .update({ empresa_id: novoEmpresaId })
          .eq('account_payable_id', account.id);

        const paymentIds = (payments || []).map((p: any) => String(p.id));
        if (paymentIds.length > 0) {
          await supabase
            .from('cash_flows')
            .update({ empresa_id: novoEmpresaId })
            .in('source_id', paymentIds)
            .in('source_type', ['pagamento_fornecedor', 'pagamento_despesa']);
        }
      }

      toast({
        title: 'Conta movida com sucesso',
        description: [
          empresaMudou ? 'Empresa atualizada' : null,
          tipoMudou ? 'Tipo de lançamento atualizado' : null,
        ].filter(Boolean).join(' · '),
      });
      onOpenChange(false);
      onMoved?.();
    } catch (err: any) {
      console.error('Erro ao mover conta:', err);
      toast({
        title: 'Erro ao mover conta',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const empresaAtual = empresas.find(e => e.id === account.empresaId);
  const empresaNova = empresas.find(e => e.id === novoEmpresaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Mover / Reclassificar Conta
          </DialogTitle>
          <DialogDescription>
            Altere a empresa e/ou o tipo (Compra ↔ Despesa). Pagamentos e fluxo de caixa acompanham automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={novoEmpresaId} onValueChange={setNovoEmpresaId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {empresas.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {empresaMudou && (
              <p className="text-xs text-muted-foreground">
                {empresaAtual?.nome} → <strong>{empresaNova?.nome}</strong>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo de Lançamento</Label>
            <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as TipoNovo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compra_revenda">Compra (Artigos para Revenda)</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
            {tipoMudou && (
              <p className="text-xs text-muted-foreground">
                {tipoAtualNorm === 'compra_revenda' ? 'Compra' : 'Despesa'} → <strong>{novoTipo === 'compra_revenda' ? 'Compra' : 'Despesa'}</strong>
              </p>
            )}
          </div>

          {algoMudou && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Esta operação atualiza o registo, seus pagamentos e movimentos de fluxo de caixa.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={!algoMudou || saving}>
            {saving ? 'A mover...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
