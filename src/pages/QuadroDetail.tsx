import { useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, X, MoreHorizontal, Archive, Pencil, Palette, Eraser, ArchiveRestore, Zap } from 'lucide-react';
import BoardColumn from '@/components/quadros/BoardColumn';
import CartaoCard from '@/components/quadros/CartaoCard';
import CartaoDetailModal from '@/components/quadros/CartaoDetailModal';
import { PassarProducaoDialog, PedidoPassagem } from '@/components/quadros/PassarProducaoDialog';
import { QuadroLista, QuadroCartao } from '@/types/quadros';
import { CAMPOS_LABEL, camposVaziosNoCartao } from '@/hooks/useQuadroProcesso';
import { useClientes } from '@/hooks/useClientes';
import { useSuppliers } from '@/hooks/useSuppliers';

const PALETTE = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#ec4899','#14b8a6','#f97316','#64748b'];

const fmtEuro = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const fmtDataCurta = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
};

const findContainer = (id: string, state: QuadroLista[]): string | null => {
  if (state.some(l => l.id === id)) return id;
  return state.find(l => l.cartoes.some(c => c.id === id))?.id ?? null;
};

export default function QuadroDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const d = useQuadroDetail(id, empresa?.id);
  // Cartão que acabou de chegar a «Adjudicado» no Comercial → propor passar para a Produção.
  const [passagem, setPassagem] = useState<PedidoPassagem | null>(null);
  const { clientes } = useClientes();
  const { suppliers } = useSuppliers();
  const [searchParams, setSearchParams] = useSearchParams();

  const listasRef = useRef<QuadroLista[]>([]);
  listasRef.current = d.listas;
  const dragOriginRef = useRef<string | null>(null);
  // Fotografia do quadro antes do arrasto. Se a coluna de destino recusar o
  // cartão, é para aqui que se volta — o onDragOver já o moveu no ecrã.
  const snapshotRef = useRef<QuadroLista[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'card' | 'list' | null>(null);
  const [openCartaoId, setOpenCartaoId] = useState<string | null>(searchParams.get('cartao'));
  const [addingLista, setAddingLista] = useState(false);
  const [newListaName, setNewListaName] = useState('');
  const [editingTitulo, setEditingTitulo] = useState(false);
  const [tituloDraft, setTituloDraft] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [showArquivados, setShowArquivados] = useState(false);
  const [arquivados, setArquivados] = useState<{ cartao: QuadroCartao; listaNome: string }[]>([]);
  const [loadingArq, setLoadingArq] = useState(false);
  const [bloqueio, setBloqueio] = useState<
    { cartaoId: string; cartaoTitulo: string; destino: string; mensagem: string; campos: string[] } | null
  >(null);

  const openArquivados = async () => {
    setShowArquivados(true); setLoadingArq(true);
    setArquivados(await d.listArquivados());
    setLoadingArq(false);
  };
  const handleRestaurar = async (cartaoId: string) => {
    await d.restaurarCartao(cartaoId);
    setArquivados(prev => prev.filter(a => a.cartao.id !== cartaoId));
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const open = useMemo(() => {
    if (!openCartaoId) return null;
    for (const l of d.listas) {
      const c = l.cartoes.find(x => x.id === openCartaoId);
      if (c) return { cartao: c, listaNome: l.nome };
    }
    return null;
  }, [openCartaoId, d.listas]);

  // Tudo o que alguma coluna deste quadro exige. Num quadro livre fica vazio,
  // e o cartão não mostra campo nenhum de processo.
  const camposDoQuadro = useMemo(() => {
    const s = new Set<string>();
    d.listas.forEach(l => (l.campos_obrigatorios ?? []).forEach(c => s.add(c)));
    return [...s];
  }, [d.listas]);

  const camposEmFalta = useMemo(
    () => (open ? camposVaziosNoCartao(open.cartao, camposDoQuadro) : []),
    [open, camposDoQuadro],
  );

  // Quadro livre não tem estados, logo não tem nada a automatizar.
  const temProcesso = d.listas.some(l => !!l.estado_codigo);

  // Cliente/fornecedor resolvidos UMA vez para o quadro todo, não por cartão.
  const resolveParte = useCallback((c: QuadroCartao) => {
    if (c.cliente_id) {
      const nome = clientes.find(x => x.id === c.cliente_id)?.nome;
      if (nome) return { nome, tipo: 'cliente' as const };
    }
    if (c.supplier_id) {
      const nome = suppliers.find(x => x.id === c.supplier_id)?.razaoSocial;
      if (nome) return { nome, tipo: 'fornecedor' as const };
    }
    return null;
  }, [clientes, suppliers]);

  /**
   * O cabeçalho que o Workflow Comercial tinha e o quadro não: quanto está em
   * cima da mesa, quanto se fechou e a que ritmo se converte.
   *
   * A taxa só conta o que já teve desfecho — incluir o que ainda está a
   * decorrer faz uma boa equipa parecer má por ter trabalho em curso.
   */
  const indicadores = useMemo(() => {
    if (!temProcesso) return null;
    const emCurso = d.listas.filter(l => !l.final);
    const ganhas  = d.listas.filter(l => l.resultado === 'ganho');
    const perdidas = d.listas.filter(l => l.resultado === 'perdido');
    const soma = (ls: QuadroLista[]) =>
      ls.reduce((t, l) => t + l.cartoes.reduce((s, c) => s + (Number(c.valor) || 0), 0), 0);
    const conta = (ls: QuadroLista[]) => ls.reduce((t, l) => t + l.cartoes.length, 0);

    const nGanhas = conta(ganhas);
    const decididas = nGanhas + conta(perdidas);
    return {
      emCurso: conta(emCurso),
      valorEmCurso: soma(emCurso),
      ganhas: nGanhas,
      valorGanho: soma(ganhas),
      taxa: decididas > 0 ? Math.round((nGanhas / decididas) * 100) : null,
    };
  }, [d.listas, temProcesso]);

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
    snapshotRef.current = listasRef.current;
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

  const onDragEnd = async (e: DragEndEvent) => {
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

    // Mudou de coluna: a coluna de destino decide se aceita. Perguntar ANTES de
    // gravar — senão o cartão fica num estado que o processo não permite.
    if (origin && origin !== overContainer) {
      const veredicto = await d.validarMovimento(String(active.id), overContainer);
      if (!veredicto.ok) {
        const anterior = snapshotRef.current;
        d.setListas(anterior);
        listasRef.current = anterior;
        const cartao = anterior.flatMap(l => l.cartoes).find(c => c.id === active.id);
        setBloqueio({
          cartaoId: String(active.id),
          cartaoTitulo: cartao?.titulo ?? 'Este cartão',
          destino: nameOf(overContainer),
          mensagem: veredicto.mensagem ?? 'Este cartão ainda não pode avançar.',
          campos: veredicto.campos,
        });
        return;
      }
    }

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
    // O cartão arrastado entre colunas grava-se sempre (ver persistCartaoOrder).
    d.persistCartaoOrder(affected, listasRef.current, origin && origin !== overContainer ? [String(active.id)] : []);
    if (origin && origin !== overContainer) {
      d.logAtividade(String(active.id), `moveu este cartão de "${nameOf(origin)}" para "${nameOf(overContainer)}"`);
      // Entrou numa coluna nova: é aqui que as automações correm.
      d.aoMoverCartao(String(active.id), origin, overContainer);

      // Adjudicado no Comercial → propor a passagem para a Produção.
      const destino = listasRef.current.find(l => l.id === overContainer);
      const ehComercial = /comercial/i.test(d.quadro?.nome ?? '');
      const ehGanho = destino && ((destino as any).resultado === 'ganho' || /adjudicad/i.test(destino.nome));
      if (ehComercial && ehGanho) {
        const cartao = destino!.cartoes.find(c => c.id === active.id);
        setPassagem({ cartaoId: String(active.id), cartaoTitulo: cartao?.titulo ?? 'Este cartão', listaAtualId: overContainer });
      }
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
              <DropdownMenuItem onClick={() => d.clearAllEtiquetasFromAllCartoes()}><Eraser size={13} className="mr-2" /> Limpar etiquetas de todos os cartões</DropdownMenuItem>
              <DropdownMenuItem onClick={openArquivados}><ArchiveRestore size={13} className="mr-2" /> Cartões arquivados</DropdownMenuItem>
              {temProcesso && (
                <DropdownMenuItem onClick={() => navigate(`/quadros/${id}/automacoes`)}>
                  <Zap size={13} className="mr-2" /> Automações
                </DropdownMenuItem>
              )}
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

      {/* Indicadores — o que o Workflow mostrava e o quadro não */}
      {indicadores && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 pb-3 shrink-0">
          {[
            { rotulo: 'Em curso',   valor: String(indicadores.emCurso),
              nota: fmtEuro(indicadores.valorEmCurso) },
            { rotulo: 'Concluídos', valor: String(indicadores.ganhas),
              nota: fmtEuro(indicadores.valorGanho) },
            { rotulo: 'Valor em cima da mesa', valor: fmtEuro(indicadores.valorEmCurso), nota: null },
            { rotulo: 'Taxa de conversão',
              valor: indicadores.taxa === null ? '—' : `${indicadores.taxa}%`,
              nota: indicadores.taxa === null ? 'sem casos decididos' : null },
          ].map(k => (
            <div key={k.rotulo} className="rounded-lg border bg-card px-3.5 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.rotulo}</p>
              <p className="text-xl font-bold tabular-nums leading-tight mt-0.5">{k.valor}</p>
              {k.nota && <p className="text-[11px] text-muted-foreground">{k.nota}</p>}
            </div>
          ))}
        </div>
      )}

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
                    resolveParte={resolveParte}
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
          camposDoQuadro={camposDoQuadro}
          camposEmFalta={camposEmFalta}
          isOpen={!!open}
          onClose={() => {
            setOpenCartaoId(null);
            if (searchParams.has('cartao')) {
              const next = new URLSearchParams(searchParams);
              next.delete('cartao');
              setSearchParams(next, { replace: true });
            }
          }}
          onUpdateCartao={d.updateCartao}
          onArchiveCartao={d.archiveCartao}
          onAddChecklist={d.addChecklist}
          onDeleteChecklist={d.deleteChecklist}
          onUpdateChecklistTitulo={d.updateChecklistTitulo}
          onAddChecklistItem={d.addChecklistItem}
          onToggleChecklistItem={d.toggleChecklistItem}
          onDeleteChecklistItem={d.deleteChecklistItem}
          onUpdateChecklistItem={d.updateChecklistItem}
          onMoveChecklistItem={d.moveChecklistItem}
          onReorderChecklistItems={d.reorderChecklistItems}
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
          onFetchEmpresasMove={d.fetchEmpresasMove}
          onFetchQuadrosMove={d.fetchQuadrosMove}
          onFetchListasMove={d.fetchListasMove}
          onMoveCartaoParaEmpresa={d.moveCartaoParaEmpresa}
          onListChecklistModelos={d.listChecklistModelos}
          onApplyChecklistModelo={d.applyChecklistModelo}
          onUpdateChecklistModeloCategoria={d.updateChecklistModeloCategoria}
        />
      )}

      <PassarProducaoDialog
        pedido={passagem}
        empresaId={empresa?.id}
        quadroAtualId={id}
        onClose={() => setPassagem(null)}
        fetchQuadros={d.fetchQuadrosMove}
        fetchListas={d.fetchListasMove}
        mover={d.moveCartaoParaEmpresa}
        registar={d.logAtividade}
      />

      {/* Movimento recusado pela coluna de destino */}
      <AlertDialog open={!!bloqueio} onOpenChange={o => !o && setBloqueio(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ainda falta preencher para entrar em "{bloqueio?.destino}"</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{bloqueio?.mensagem}</p>
                {!!bloqueio?.campos.length && (
                  <ul className="space-y-1">
                    {bloqueio.campos.map(c => (
                      <li key={c} className="flex items-center gap-2 text-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        {CAMPOS_LABEL[c] ?? c}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs">O cartão voltou para onde estava. Nada se perdeu.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Deixar como está</AlertDialogCancel>
            {!!bloqueio?.campos.length && (
              <AlertDialogAction onClick={() => { setOpenCartaoId(bloqueio.cartaoId); setBloqueio(null); }}>
                Preencher agora
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Cartões arquivados — decidir, não só restaurar.
          A janela pequena só mostrava o título, e ninguém decide o destino de
          um negócio por um título. Aqui vê-se o que lá está dentro. */}
      <Dialog open={showArquivados} onOpenChange={setShowArquivados}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[88vh] overflow-y-auto">
          <DialogTitle>Cartões arquivados</DialogTitle>
          <p className="text-sm text-muted-foreground -mt-1">
            {arquivados.length > 0
              ? `${arquivados.length} ${arquivados.length === 1 ? 'cartão arquivado' : 'cartões arquivados'}. Restaurar devolve-o à lista de onde saiu.`
              : 'Restaura um cartão para o devolver à sua lista.'}
          </p>

          <div className="mt-2 space-y-2.5">
            {loadingArq && <p className="text-sm text-muted-foreground py-10 text-center">A carregar...</p>}
            {!loadingArq && arquivados.length === 0 && (
              <p className="text-sm text-muted-foreground py-10 text-center">Não há cartões arquivados neste quadro.</p>
            )}

            {arquivados.map(({ cartao, listaNome }) => {
              const itens = cartao.checklists.reduce((s, cl) => s + cl.items.length, 0);
              const feitos = cartao.checklists.reduce((s, cl) => s + cl.items.filter(i => i.concluido).length, 0);
              const parte = resolveParte(cartao);
              return (
                <div key={cartao.id} className="rounded-lg border p-3.5 hover:border-primary/40 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Cliente e valor primeiro: é o que identifica o negócio */}
                      {(parte || cartao.valor != null) && (
                        <div className="flex items-center gap-3 flex-wrap">
                          {parte && <span className="text-xs font-medium text-muted-foreground">{parte.nome}</span>}
                          {cartao.valor != null && (
                            <span className="text-sm font-semibold tabular-nums">{fmtEuro(Number(cartao.valor))}</span>
                          )}
                        </div>
                      )}

                      <p className="text-sm font-medium leading-snug">{cartao.titulo}</p>

                      {cartao.etiquetas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {cartao.etiquetas.map(e => (
                            <span key={e.id} className="text-[10px] rounded px-1.5 py-0.5 text-white"
                                  style={{ backgroundColor: e.cor }}>{e.nome}</span>
                          ))}
                        </div>
                      )}

                      {cartao.descricao?.trim() && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                          {cartao.descricao}
                        </p>
                      )}

                      <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground pt-0.5">
                        <span>Lista: <strong className="font-medium text-foreground/70">{listaNome || '—'}</strong></span>
                        {itens > 0 && (
                          <span className={feitos === itens ? 'text-emerald-600' : ''}>
                            Checklist {feitos}/{itens}
                          </span>
                        )}
                        {cartao.membros.length > 0 && (
                          <span>{cartao.membros.map(m => m.nome).filter(Boolean).join(', ')}</span>
                        )}
                        <span>Arquivado {fmtDataCurta(cartao.atualizado_em)}</span>
                      </div>
                    </div>

                    <Button size="sm" variant="secondary" className="gap-1.5 shrink-0"
                            onClick={() => handleRestaurar(cartao.id)}>
                      <ArchiveRestore size={13} /> Restaurar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
