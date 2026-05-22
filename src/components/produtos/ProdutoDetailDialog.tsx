import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { Produto } from '@/hooks/useProdutos';
import { Pencil } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto: Produto | null;
  onEdit: (produto: Produto) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);

export function ProdutoDetailDialog({ open, onOpenChange, produto, onEdit }: Props) {
  const { suppliers } = useSuppliers();
  if (!produto) return null;

  const supplierName = (id: string | null) => {
    if (!id) return '—';
    const s = suppliers.find(x => x.id === id);
    return s ? (s.razaoSocial || s.nomeFantasia) : '—';
  };

  const custoComIva = produto.precoCusto * (1 + produto.ivaCusto / 100);
  const precoVenda = custoComIva * (1 + produto.margem / 100);

  const fornecedores = [
    { label: 'Fornecedor 1', id: produto.fornecedor1Id },
    { label: 'Fornecedor 2', id: produto.fornecedor2Id },
    { label: 'Fornecedor 3', id: produto.fornecedor3Id },
  ].filter(f => f.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Referência Interna</p>
              <p className="font-medium">{produto.refInterna}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Referência Fornecedor</p>
              <p className="font-medium">{produto.refFornecedor || '—'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Descrição</p>
            <p className="font-medium">{produto.descricao}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Categoria</p>
              <Badge variant="secondary">{produto.categoria}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unidade</p>
              <p className="font-medium">{produto.unidade || '—'}</p>
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Fornecedores prováveis</p>
            {fornecedores.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum fornecedor associado.</p>
            ) : (
              <div className="space-y-1">
                {fornecedores.map(f => (
                  <div key={f.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium">{supplierName(f.id!)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Custo e preço de venda</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Preço de custo</p>
                <p className="font-medium">{fmt(produto.precoCusto)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IVA</p>
                <p className="font-medium">{produto.ivaCusto}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo c/ IVA</p>
                <p className="font-medium">{fmt(custoComIva)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margem</p>
                <p className="font-medium">{produto.margem}%</p>
              </div>
              <div className="col-span-2 rounded-md bg-muted/40 p-2">
                <p className="text-xs text-muted-foreground">Preço de venda sugerido</p>
                <p className="font-semibold text-primary text-base">{fmt(precoVenda)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-3">
            <div>
              <p className="text-xs text-muted-foreground">Origem</p>
              <Badge variant={produto.origem === 'excel' ? 'outline' : 'default'}>
                {produto.origem === 'excel' ? 'Excel' : 'Manual'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Atualizado em</p>
              <p className="text-sm">{new Date(produto.updatedAt).toLocaleDateString('pt-PT')}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={() => { onOpenChange(false); onEdit(produto); }}>
            <Pencil className="w-4 h-4 mr-2" /> Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
