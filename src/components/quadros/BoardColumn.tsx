import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MoreHorizontal, X, Archive, Pencil, GripVertical } from 'lucide-react';
import { QuadroLista } from '@/types/quadros';
import SortableCard from './SortableCard';

interface Props {
  lista: QuadroLista;
  onOpenCartao: (cartaoId: string) => void;
  onAddCartao: (listaId: string, titulo: string) => void;
  onRenameLista: (id: string, nome: string) => void;
  onArchiveLista: (id: string) => void;
}

export default function BoardColumn({ lista, onOpenCartao, onAddCartao, onRenameLista, onArchiveLista }: Props) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: lista.id, data: { type: 'list' },
  });
  const [adding, setAdding] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(lista.nome);

  const style = { transform: CSS.Transform.toString(transform), transition };

  const submitCard = () => { if (titulo.trim()) onAddCartao(lista.id, titulo.trim()); setTitulo(''); setAdding(false); };
  const submitNome = () => { if (nome.trim() && nome !== lista.nome) onRenameLista(lista.id, nome.trim()); setEditing(false); };

  return (
    <div ref={setNodeRef} style={style} className={`w-72 shrink-0 bg-gray-50 rounded-xl flex flex-col max-h-full border border-gray-200 ${isDragging ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-2.5 shrink-0">
        <button className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none" {...attributes} {...listeners}>
          <GripVertical size={15} />
        </button>
        {editing ? (
          <Input className="h-7 text-sm font-semibold" value={nome} onChange={e => setNome(e.target.value)} autoFocus onBlur={submitNome} onKeyDown={e => { if (e.key === 'Enter') submitNome(); if (e.key === 'Escape') { setNome(lista.nome); setEditing(false); } }} />
        ) : (
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 flex-1 cursor-pointer" onClick={() => { setNome(lista.nome); setEditing(true); }}>
            {lista.nome}
            <span className="text-xs font-normal text-gray-400 bg-gray-200 rounded-full px-1.5">{lista.cartoes.length}</span>
          </h3>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200"><MoreHorizontal size={15} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setNome(lista.nome); setEditing(true); }}><Pencil size={13} className="mr-2" /> Renomear</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onArchiveLista(lista.id)}><Archive size={13} className="mr-2" /> Arquivar lista</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 space-y-2 min-h-[8px]">
        <SortableContext items={lista.cartoes.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {lista.cartoes.map(cartao => (
            <SortableCard key={cartao.id} cartao={cartao} listaId={lista.id} onOpen={() => onOpenCartao(cartao.id)} />
          ))}
        </SortableContext>
      </div>

      {/* Add card */}
      <div className="p-2 shrink-0">
        {adding ? (
          <div className="space-y-2">
            <Input className="text-sm bg-white" placeholder="Título do cartão..." value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') submitCard(); if (e.key === 'Escape') { setAdding(false); setTitulo(''); } }} />
            <div className="flex gap-2"><Button size="sm" onClick={submitCard}>Adicionar</Button><Button size="sm" variant="ghost" onClick={() => { setAdding(false); setTitulo(''); }}><X size={14} /></Button></div>
          </div>
        ) : (
          <button className="w-full flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-200/70 rounded-lg px-2 py-1.5 transition-colors" onClick={() => setAdding(true)}>
            <Plus size={15} /> Adicionar cartão
          </button>
        )}
      </div>
    </div>
  );
}
