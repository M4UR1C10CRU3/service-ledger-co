import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { QuadroCartao } from '@/types/quadros';
import CartaoCard from './CartaoCard';

interface Props {
  cartao: QuadroCartao;
  listaId: string;
  onOpen: () => void;
}

export default function SortableCard({ cartao, listaId, onOpen }: Props) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: cartao.id, data: { type: 'card', listaId },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <CartaoCard cartao={cartao} onClick={onOpen} />
    </div>
  );
}
