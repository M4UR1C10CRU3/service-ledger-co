import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { QuadroCartao } from '@/types/quadros';
import CartaoCard from './CartaoCard';

export type ParteDoCartao = { nome: string; tipo: 'cliente' | 'fornecedor' } | null;

interface Props {
  cartao: QuadroCartao;
  listaId: string;
  onOpen: () => void;
  /** Resolve o cliente/fornecedor do cartão. Vem de cima para não haver uma
   *  consulta por cartão. */
  resolveParte?: (c: QuadroCartao) => ParteDoCartao;
}

export default function SortableCard({ cartao, listaId, onOpen, resolveParte }: Props) {
  const parte = resolveParte?.(cartao) ?? null;
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
      <CartaoCard cartao={cartao} onClick={onOpen} parteNome={parte?.nome} parteTipo={parte?.tipo} />
    </div>
  );
}
