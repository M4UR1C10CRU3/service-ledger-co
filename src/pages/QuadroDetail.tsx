import { useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useQuadroDetail } from '@/hooks/useQuadroDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, X, MoreHorizontal, Archive, Pencil, Palette } from 'lucide-react';
import BoardColumn from '@/components/quadros/BoardColumn';
import CartaoCard from '@/components/quadros/CartaoCard';
import CartaoDetailModal from '@/components/quadros/CartaoDetailModal';
import { QuadroLista } from '@/types/quadros';

const PALETTE = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#ec4899','#14b8a6','#f97316','#64748b'];

const findContainer = (id: string, state: QuadroLista[]): string | null => {
  if (state.some(l => l.id === id)) return id;
  return state.find(l => l.cartoes.some(c => c.id === id))?.id ?? null;
};

export default function QuadroDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const d = useQuadroDetail(id, empresa?.id);

  const listasRef = useRef<QuadroLista[]>([]);
  listasRef.current = d.listas;
  const dragOriginRef = useRef<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'card' | 'list' | null>(null);
  const [openCartaoId, setOpenCartaoId] = useState<string | null>(null);
  const [addingLista, setAddingLista] = useState(false);
  const [newListaName, setNewListaName] = useState('');
  const [editingTitulo, setEditingTitulo] = useState(false);
  const [tituloDraft, setTituloDraft] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const open = useMemo(() => {
    if (!openCartaoId) return null;
    for (const l of d.listas) {
      const c = l.cartoes.find(x => x.id === openCartaoId);
      if (c) return { cartao: c, listaNome: l.nome };
    }
    return null;
  }, [openCartaoId, d.listas]);

  const activeCartao = activeType === 'card' && activeId
    ? d.listas.flatMap(l => l.cartoes).find(c => c.id === activeId) : null;
  const activeLista = activeType === 'list' && activeId ? d.listas.find(l => l.id === activeId) : null;

  if (!id) return null;

  const nameOf = (listaId: string) => listasRef.current.find(l => l.id === listaId)?.nome || '';

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const onDragStart = (e: DragStartEvent) => {
    const type = e.active.data.current?.type as 'card' | 'list' | undefined;
    setActiveId(String(e.active.id));
    setActiveType(type ?? null);
    dragOriginRef.current = type === 'card' ? findContainer(String(e.active.id), listasRef.current) : null;
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over || active.data.current?.type !== 'card') return;
    const activeContainer = findContainer(String(active.id), listasRef.current);
    const overContainer = findContainer(String(over.id), listasRef.current);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    d.setListas(prev => {
      const from = prev.find(l => l.id === activeContainer);
      const to = prev.find(l => l.id === overContainer);
      if (!from || !to) return prev;
      const moving = from.cartoes.find(c => c.id === active.id);
      if (!moving) return prev;
      const overIsContainer = prev.some(l => l.id === over.id);
      const overIdx = overIsContainer ? to.cartoes.length : to.cartoes.findIndex(c => c.id === over.id);
      const insertAt = overIdx < 0 ? to.cartoes.length : overIdx;
      return prev.map(l => {
        if (l.id === activeContainer) return { ...l, cartoes: l.cartoes.filter(c => c.id !== active.id) };
        if (l.id === overContainer) {
          const copy = [...l.cartoes];
          copy.splice(insertAt, 0, { ...moving, lista_id: overContainer });
          return { ...l, cartoes: copy };
        }
        return l;
      });
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const type = active.data.current?.type;
    setActiveId(null); setActiveType(null);
    if (!over) { dragOriginRef.current = null; return; }

    const current = listasRef.current;

    if (type === 'list') {
      const oldIndex = current.findIndex(l => l.id === active.id);
      const newIndex = current.findIndex(l => l.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        const next = arrayMove(current, oldIndex, newIndex);
        d.setListas(next);
        d.persistListaOrder(next);
      }
      dragOriginRef.current = null;
      return;
    }

    // card
    const overContainer = findContainer(String(over.id), current);
    const origin = dragOriginRef.current;
    dragOriginRef.current = null;
    if (!overContainer) return;

    // reorder within the destination container to the exact drop index
    const destList = current.find(l => l.id === overContainer);
    if (destList) {
      const oldIndex = destList.cartoes.findIndex(c => c.id === active.id);
      const overIsContainer = current.some(l => l.id === over.id);
      const newIndex = overIsContainer ? destList.cartoes.length - 1 : destList.cartoes.findIndex(c => c.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        const next = current.map(l => l.id === overContainer ? { ...l, cartoes: arrayMove(l.cartoes, oldIndex, newIndex) } : l);
        d.setListas(next);
        listasRef.current = next;
      }
    }

    const affected = origin && origin !== overContainer ? [origin, overContainer] : [overContainer];
    d.persistCartaoOrder(affected, listasRef.current);
    if (origin && origin !== overContainer) {
      d.logAtividade(String(active.id), `moveu este cartão de "${nameOf(origin)}" para "${nameOf(overContainer)}"`);
    }
  };

  const handleAddLista = () => { if (newListaName.trim()) d.addLista(newListaName.trim()); setNewListaName(''); setAddingLista(false); };
  const saveTitulo = () => { if (tituloDraft.trim() && tituloDraft !== d.quadro?.nome) d.updateQuadro({ nome: tituloDraft.trim() }); setEditingTitulo(false); };

  const cor = d.quadro?.cor || '#6366f1';

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]" style={{ background: `linear-gradient(160deg, ${cor}14, transparent 55%)` }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/quadros')}><ArrowLeft size={16} /> Quadros</Button>
        <div className="h-5 w-px bg-border" />
        <span className="h-3.5 w-3.5 rounded-sm shrink-0" style={{ backgroundColor: cor }} />
        {editingTitulo ? (
          <Input className="h-8 text-lg font-bold max-w-xs" value={tituloDraft} onChange={e => setTituloDraft(e.target.value)} autoFocus onBlur={saveTitulo} onKeyDown={e => { if (e.key === 'Enter') saveTitulo(); if (e.key === 'Escape') setEditingTitulo(false); }} />
        ) : (
          <h1 className="text-lg font-bold cursor-pointer hover:bg-muted/60 rounded px-1.5 py-0.5" onClick={() => { setTituloDraft(d.quadro?.nome || ''); setEditingTitulo(true); }}>
            {d.quadro?.nome || 'A carregar...'}
          </h1>
        )}
        {d.quadro?.descricao && <span className="text-sm text-muted-foreground hidden lg:inline truncate max-w-md">— {d.quadro.descricao}</span>}

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"><MoreHorizontal size={18} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Quadro</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => { setTituloDraft(d.quadro?.nome || ''); setEditingTitulo(true); }}><Pencil size={13} className="mr-2" /> Renomear</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-1.5 font-normal text-xs text-muted-foreground"><Palette size={12} /> Cor do quadro</DropdownMenuLabel>
              <div className="flex flex-wrap gap-1.5 px-2 py-1.5">
                {PALETTE.map(col => (
                  <button key={col} className={`h-6 w-6 rounded ${cor === col ? 'ring-2 ring-offset-1 ring-gray-700' : ''}`} style={{ backgroundColor: col }} onClick={() => d.updateQuadro({ cor: col })} />
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmArchive(true)}><Archive size={13} className="mr-2" /> Arquivar quadro</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Board */}
      {d.isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">A carregar quadro...</div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            <SortableContext items={d.listas.map(l => l.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-3 items-start h-full">
                {d.listas.map(lista => (
                  <BoardColumn
                    key={lista.id}
                    lista={lista}
                    onOpenCartao={setOpenCartaoId}
                    onAddCartao={d.addCartao}
                    onRenameLista={d.updateLista}
                    onArchiveLista={d.archiveLista}
                  />
                ))}

                {/* Add list */}
                <div className="w-72 shrink-0">
                  {addingLista ? (
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-2 space-y-2">
                      <Input className="text-sm bg-white" placeholder="Nome da lista..." value={newListaName} onChange={e => setNewListaName(e.target.value)} autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleAddLista(); if (e.key === 'Escape') { setAddingLista(false); setNewListaName(''); } }} />
                      <div className="flex gap-2"><Button size="sm" onClick={handleAddLista}>Adicionar lista</Button><Button size="sm" variant="ghost" onClick={() => { setAddingLista(false); setNewListaName(''); }}><X size={14} /></Button></div>
                    </div>
                  ) : (
                    <button className="w-full flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-100/80 hover:bg-gray-200 rounded-xl px-3 py-2.5 transition-colors" onClick={() => setAddingLista(true)}>
                      <Plus size={16} /> Adicionar lista
                    </button>
                  )}
                </div>
              </div>
            </SortableContext>

            <DragOverlay>
              {activeCartao ? <div className="rotate-3 w-72"><CartaoCard cartao={activeCartao} /></div> :
               activeLista ? <div className="w-72 bg-gray-100 rounded-xl border border-gray-300 p-2 opacity-90 shadow-xl"><p className="text-sm font-semibold text-gray-700 px-1 py-1">{activeLista.nome}</p></div> : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Card modal */}
      {open && (
        <CartaoDetailModal
          cartao={open.cartao}
          etiquetas={d.etiquetas}
          utilizadores={d.utilizadores}
          listaNome={open.listaNome}
          isOpen={!!open}
          onClose={() => setOpenCartaoId(null)}
          onUpdateCartao={d.updateCartao}
          onArchiveCartao={d.archiveCartao}
          onAddChecklist={d.addChecklist}
          onDeleteChecklist={d.deleteChecklist}
          onAddChecklistItem={d.addChecklistItem}
          onToggleChecklistItem={d.toggleChecklistItem}
          onDeleteChecklistItem={d.deleteChecklistItem}
          onUpdateChecklistItem={d.updateChecklistItem}
          onFetchFeed={d.fetchFeed}
          onAddComentario={d.addComentario}
          onUpdateComentario={d.updateComentario}
          onDeleteComentario={d.deleteComentario}
          onCreateEtiqueta={d.createEtiqueta}
          onUpdateEtiqueta={d.updateEtiqueta}
          onToggleEtiqueta={d.toggleEtiquetaOnCartao}
          onToggleMembro={d.toggleMembro}
          onListAnexos={d.listAnexos}
          onAddAnexo={d.addAnexo}
          onUploadAnexo={d.uploadAnexo}
          onDeleteAnexo={d.deleteAnexo}
          onDuplicarCartao={d.duplicarCartao}
          onListChecklistModelos={d.listChecklistModelos}
          onApplyChecklistModelo={d.applyChecklistModelo}
        />
      )}

      {/* Archive board confirm */}
      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar este quadro?</AlertDialogTitle>
            <AlertDialogDescription>O quadro "{d.quadro?.nome}" deixará de aparecer na lista. Os dados não são apagados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await d.archiveQuadro(); navigate('/quadros'); }}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
