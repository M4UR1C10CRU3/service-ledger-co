import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Produto } from '@/hooks/useProdutos';
import { Pencil } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto: Produto | null;
  onEdit: (produto: Produto) => void;
}

export function ProdutoDetailDialog({ open, onOpenChange, produto, onEdit }: Props) {
  if (!produto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
          <div className="grid grid-cols-2 gap-4">
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
