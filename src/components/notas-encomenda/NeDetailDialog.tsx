import { NotaEncomenda, NeItem, NeChecklistItem, NeEstado } from '@/types/notaEncomenda';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  ne: NotaEncomenda | null;
  onClose: () => void;
  onUpdateEstado: (id: string, estado: NeEstado) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
  fetchItems: (neId: string) => Promise<NeItem[]>;
  fetchChecklist: (neId: string) => Promise<NeChecklistItem[]>;
  toggleChecklistItem: (itemId: string, concluido: boolean) => Promise<boolean>;
  addChecklistItem: (neId: string, descricao: string) => Promise<NeChecklistItem | null>;
}

export function NeDetailDialog({ ne, onClose }: Props) {
  return (
    <Dialog open={!!ne} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ne?.numero ?? 'Nota de Encomenda'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Detalhe em construção.</p>
      </DialogContent>
    </Dialog>
  );
}
