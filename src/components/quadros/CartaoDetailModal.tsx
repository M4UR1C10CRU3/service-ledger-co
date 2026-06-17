import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlignLeft, Calendar, CheckSquare, Tag, Archive, Plus, X, Check, Clock,
  MessageSquare, Users, Palette, Trash2, Activity,
} from 'lucide-react';
import { QuadroCartao, Etiqueta, Comentario, Utilizador } from '@/types/quadros';
import { initials, avatarColor } from './CartaoCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const PALETTE = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#6366f1','#a855f7','#ec4899','#14b8a6','#64748b'];

interface Props {
  cartao: QuadroCartao | null;
  etiquetas: Etiqueta[];
  utilizadores: Utilizador[];
  listaNome: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCartao: (id: string, updates: Partial<QuadroCartao>, atividade?: string) => Promise<void>;
  onArchiveCartao: (id: string, listaId: string) => Promise<void>;
  onAddChecklist: (cartaoId: string, titulo: string) => Promise<void>;
  onDeleteChecklist: (checklistId: string, cartaoId: string) => Promise<void>;
  onAddChecklistItem: (checklistId: string, cartaoId: string, texto: string) => Promise<void>;
  onToggleChecklistItem: (itemId: string, checklistId: string, cartaoId: string, concluido: boolean) => Promise<void>;
  onDeleteChecklistItem: (itemId: string, checklistId: string, cartaoId: string) => Promise<void>;
  onFetchFeed: (cartaoId: string) => Promise<Comentario[]>;
  onAddComentario: (cartaoId: string, texto: string) => Promise<Comentario | null>;
  onDeleteComentario: (id: string) => Promise<void>;
  onCreateEtiqueta: (nome: string, cor: string) => Promise<Etiqueta | null>;
  onUpdateEtiqueta: (id: string, updates: Partial<Pick<Etiqueta, 'nome' | 'cor'>>) => Promise<void>;
  onToggleEtiqueta: (cartaoId: string, etiquetaId: string, isActive: boolean) => Promise<void>;
  onToggleMembro: (cartaoId: string, util: Utilizador, isActive: boolean) => Promise<void>;
}

type Popover = null | 'membros' | 'etiquetas' | 'capa';

export default function CartaoDetailModal(props: Props) {
  const { cartao, etiquetas, utilizadores, listaNome, isOpen, onClose } = props;
  const me = useCurrentUser();

  const [titulo, setTitulo] = useState('');
  const [editingTitulo, setEditingTitulo] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [feed, setFeed] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [novaChecklist, setNovaChecklist] = useState('');
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);
  const [popover, setPopover] = useState<Popover>(null);
  const [novaEt, setNovaEt] = useState({ nome: '', cor: '#6366f1' });

  useEffect(() => {
    if (!cartao) return;
    setTitulo(cartao.titulo);
    setDescricao(cartao.descricao || '');
    props.onFetchFeed(cartao.id).then(setFeed);
    setPopover(null); setEditingTitulo(false); setEditingDesc(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartao?.id]);

  if (!cartao) return null;
  const c = cartao;

  const totalItems = c.checklists.reduce((s, cl) => s + cl.items.length, 0);
  const doneItems  = c.checklists.reduce((s, cl) => s + cl.items.filter(i => i.concluido).length, 0);
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const done = c.data_limite_concluida;
  const overdue = !done && !!c.data_limite && new Date(c.data_limite) < new Date();
  const etActive = (id: string) => c.etiquetas.some(e => e.id === id);
  const memActive = (id: string) => c.membros.some(m => m.utilizador_id === id);

  const refreshFeed = () => props.onFetchFeed(c.id).then(setFeed);

  const saveTitulo = async () => {
    if (titulo.trim() && titulo !== c.titulo) await props.onUpdateCartao(c.id, { titulo: titulo.trim() });
    setEditingTitulo(false);
  };
  const saveDesc = async () => { await props.onUpdateCartao(c.id, { descricao: descricao || null }); setEditingDesc(false); };

  const setData = async (val: string) => {
    await props.onUpdateCartao(c.id, { data_limite: val ? new Date(val).toISOString() : null, data_limite_concluida: false },
      val ? `definiu o prazo para ${format(new Date(val), 'd MMM yyyy', { locale: pt })}` : undefined);
  };
  const toggleDone = async () => {
    await props.onUpdateCartao(c.id, { data_limite_concluida: !done }, !done ? 'marcou o prazo como concluído' : 'reabriu o prazo');
  };

  const handleAddChecklist = async () => { if (novaChecklist.trim()) { await props.onAddChecklist(c.id, novaChecklist.trim()); } setNovaChecklist(''); setAddingChecklist(false); };
  const handleAddItem = async (clId: string) => {
    const texto = (newItemTexts[clId] || '').trim(); if (!texto) return;
    await props.onAddChecklistItem(clId, c.id, texto);
    setNewItemTexts(p => ({ ...p, [clId]: '' }));
  };
  const handleComment = async () => {
    if (!novoComentario.trim()) return;
    await props.onAddComentario(c.id, novoComentario.trim());
    setNovoComentario('');
    refreshFeed();
  };
  const handleCreateEt = async () => { if (novaEt.nome.trim() || novaEt.cor) { await props.onCreateEtiqueta(novaEt.nome.trim(), novaEt.cor); setNovaEt({ nome: '', cor: '#6366f1' }); } };

  const SideBtn = ({ icon: Icon, label, onClick, active }: { icon: any; label: string; onClick: () => void; active?: boolean }) => (
    <Button size="sm" variant="secondary" className={`w-full justify-start gap-2 text-xs h-8 ${active ? 'ring-1 ring-primary' : ''}`} onClick={onClick}>
      <Icon size={13} /> {label}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        {c.cor && <div className="h-9" style={{ backgroundColor: c.cor }} />}

        <div className="p-5">
          <div className="flex gap-5 flex-col md:flex-row">
            {/* ── Main column ── */}
            <div className="flex-1 min-w-0 space-y-5">
              <div>
                <p className="text-xs text-muted-foreground mb-1">na lista <strong>{listaNome}</strong></p>
                {editingTitulo ? (
                  <div className="flex gap-2">
                    <Input value={titulo} onChange={e => setTitulo(e.target.value)} className="text-base font-semibold" autoFocus onKeyDown={e => e.key === 'Enter' && saveTitulo()} />
                    <Button size="sm" onClick={saveTitulo}><Check size={14} /></Button>
                  </div>
                ) : (
                  <h2 className="text-xl font-semibold cursor-pointer hover:bg-muted rounded px-1 py-0.5 -ml-1" onClick={() => setEditingTitulo(true)}>{c.titulo}</h2>
                )}
              </div>

              {/* Members + labels + due badges */}
              <div className="flex flex-wrap gap-5">
                {c.membros.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Membros</p>
                    <div className="flex -space-x-1.5">
                      {c.membros.map(m => (
                        <span key={m.utilizador_id} title={m.nome || ''} className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white" style={{ backgroundColor: avatarColor(m.utilizador_id) }}>
                          {initials(m.nome)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {c.etiquetas.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Etiquetas</p>
                    <div className="flex flex-wrap gap-1">
                      {c.etiquetas.map(e => (
                        <span key={e.id} className="text-white text-xs px-2.5 py-1 rounded font-medium" style={{ backgroundColor: e.cor }}>{e.nome || '—'}</span>
                      ))}
                    </div>
                  </div>
                )}
                {c.data_limite && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Prazo</p>
                    <button onClick={toggleDone} className={`inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded ${done ? 'bg-green-100 text-green-700' : overdue ? 'bg-red-100 text-red-700 font-medium' : 'bg-muted'}`}>
                      <input type="checkbox" checked={done} readOnly className="h-3.5 w-3.5 accent-green-600 pointer-events-none" />
                      <Clock size={13} /> {format(new Date(c.data_limite), "d MMM yyyy", { locale: pt })}
                      {done ? ' · Concluído' : overdue ? ' · Em atraso' : ''}
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-2"><AlignLeft size={15} className="text-muted-foreground" /><p className="text-sm font-semibold">Descrição</p></div>
                {editingDesc ? (
                  <div className="space-y-2">
                    <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Adicione contexto, requisitos, links..." rows={4} autoFocus />
                    <div className="flex gap-2"><Button size="sm" onClick={saveDesc}>Guardar</Button><Button size="sm" variant="ghost" onClick={() => { setDescricao(c.descricao || ''); setEditingDesc(false); }}>Cancelar</Button></div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground cursor-pointer hover:bg-muted rounded p-2 min-h-[52px] whitespace-pre-wrap" onClick={() => setEditingDesc(true)}>
                    {descricao || <span className="italic">Adicione uma descrição...</span>}
                  </div>
                )}
              </div>

              {/* Checklists */}
              {c.checklists.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1"><CheckSquare size={15} className="text-muted-foreground" /><p className="text-sm font-semibold">Checklists</p><span className="text-xs text-muted-foreground ml-auto">{pct}%</span></div>
                  <Progress value={pct} className="h-1.5 mb-4" />
                  {c.checklists.map(cl => (
                    <div key={cl.id} className="mb-4 group/cl">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium">{cl.titulo}</p>
                        <button onClick={() => props.onDeleteChecklist(cl.id, c.id)} className="opacity-0 group-hover/cl:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                      </div>
                      {cl.items.map(item => (
                        <div key={item.id} className="flex items-start gap-2 py-0.5 group/item">
                          <input type="checkbox" checked={item.concluido} onChange={() => props.onToggleChecklistItem(item.id, cl.id, c.id, !item.concluido)} className="mt-0.5 h-4 w-4 rounded cursor-pointer accent-primary" />
                          <span className={`text-sm flex-1 ${item.concluido ? 'line-through text-muted-foreground' : ''}`}>{item.texto}</span>
                          <button onClick={() => props.onDeleteChecklistItem(item.id, cl.id, c.id)} className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive"><X size={12} /></button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2 ml-6">
                        <Input className="h-8 text-sm" placeholder="Adicionar item..." value={newItemTexts[cl.id] || ''} onChange={e => setNewItemTexts(p => ({ ...p, [cl.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAddItem(cl.id)} />
                        <Button size="sm" className="h-8" onClick={() => handleAddItem(cl.id)}><Plus size={13} /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {addingChecklist && (
                <div className="space-y-2">
                  <Input placeholder="Título da checklist..." value={novaChecklist} onChange={e => setNovaChecklist(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddChecklist()} autoFocus />
                  <div className="flex gap-2"><Button size="sm" onClick={handleAddChecklist}>Criar</Button><Button size="sm" variant="ghost" onClick={() => { setAddingChecklist(false); setNovaChecklist(''); }}>Cancelar</Button></div>
                </div>
              )}

              <Separator />

              {/* Feed: atividade + comentários */}
              <div>
                <div className="flex items-center gap-2 mb-3"><Activity size={15} className="text-muted-foreground" /><p className="text-sm font-semibold">Atividade &amp; Comentários</p></div>
                <div className="flex gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">{initials(me.nome)}</div>
                  <div className="flex-1 space-y-2">
                    <Textarea placeholder="Escreva um comentário, follow-up ou feedback..." value={novoComentario} onChange={e => setNovoComentario(e.target.value)} rows={2} className="text-sm" />
                    {novoComentario && <Button size="sm" onClick={handleComment}>Comentar</Button>}
                  </div>
                </div>

                {feed.map(f => f.tipo === 'atividade' ? (
                  <div key={f.id} className="flex items-center gap-2 mb-2.5 text-xs text-muted-foreground pl-1">
                    <span className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(f.autor_id || f.id) }}>{initials(f.autor_nome)}</span>
                    <span><strong className="text-foreground/70 font-medium">{f.autor_nome}</strong> {f.texto} · {format(new Date(f.criado_em), "d MMM HH:mm", { locale: pt })}</span>
                  </div>
                ) : (
                  <div key={f.id} className="flex gap-2.5 mb-3 group/cm">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(f.autor_id || f.id) }}>{initials(f.autor_nome)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs"><strong>{f.autor_nome || 'Utilizador'}</strong> <span className="text-muted-foreground">{format(new Date(f.criado_em), "d MMM 'às' HH:mm", { locale: pt })}</span></p>
                      <div className="flex items-start gap-2">
                        <p className="text-sm mt-1 bg-muted rounded-lg px-3 py-2 whitespace-pre-wrap flex-1">{f.texto}</p>
                        <button onClick={async () => { await props.onDeleteComentario(f.id); refreshFeed(); }} className="opacity-0 group-hover/cm:opacity-100 text-muted-foreground hover:text-destructive mt-2"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Sidebar ── */}
            <div className="w-full md:w-44 shrink-0 space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Adicionar ao cartão</p>

              {/* Membros */}
              <div className="relative">
                <SideBtn icon={Users} label="Membros" active={popover === 'membros'} onClick={() => setPopover(p => p === 'membros' ? null : 'membros')} />
                {popover === 'membros' && (
                  <Pop onClose={() => setPopover(null)} title="Membros">
                    <div className="space-y-0.5 max-h-56 overflow-y-auto">
                      {utilizadores.length === 0 && <p className="text-xs text-muted-foreground py-1">Nenhum utilizador nesta empresa.</p>}
                      {utilizadores.map(u => (
                        <button key={u.id} onClick={() => props.onToggleMembro(c.id, u, memActive(u.id))} className="w-full flex items-center gap-2 hover:bg-muted rounded px-1.5 py-1.5 text-left">
                          <span className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(u.id) }}>{initials(u.nome)}</span>
                          <span className="text-xs flex-1 min-w-0"><span className="block truncate font-medium">{u.nome}</span><span className="block truncate text-muted-foreground">{u.cargo || u.email}</span></span>
                          {memActive(u.id) && <Check size={14} className="text-primary shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </Pop>
                )}
              </div>

              {/* Etiquetas */}
              <div className="relative">
                <SideBtn icon={Tag} label="Etiquetas" active={popover === 'etiquetas'} onClick={() => setPopover(p => p === 'etiquetas' ? null : 'etiquetas')} />
                {popover === 'etiquetas' && (
                  <Pop onClose={() => setPopover(null)} title="Etiquetas">
                    <div className="space-y-1 mb-3 max-h-44 overflow-y-auto">
                      {etiquetas.map(e => (
                        <div key={e.id} className="flex items-center gap-2">
                          <button onClick={() => props.onToggleEtiqueta(c.id, e.id, etActive(e.id))} className="flex items-center gap-2 flex-1 min-w-0 rounded px-1 py-1 hover:bg-muted">
                            <span className="h-6 flex-1 rounded text-white text-[11px] flex items-center px-2 font-medium truncate" style={{ backgroundColor: e.cor }}>{e.nome || '—'}</span>
                            {etActive(e.id) && <Check size={14} className="text-primary shrink-0" />}
                          </button>
                        </div>
                      ))}
                    </div>
                    <Separator className="mb-2" />
                    <p className="text-xs font-medium mb-1.5">Nova etiqueta</p>
                    <Input placeholder="Nome (opcional)" value={novaEt.nome} onChange={e => setNovaEt(p => ({ ...p, nome: e.target.value }))} className="h-7 text-xs mb-1.5" />
                    <div className="flex flex-wrap gap-1 mb-2">
                      {PALETTE.map(col => <button key={col} className={`h-5 w-5 rounded border-2 ${novaEt.cor === col ? 'border-gray-700' : 'border-transparent'}`} style={{ backgroundColor: col }} onClick={() => setNovaEt(p => ({ ...p, cor: col }))} />)}
                    </div>
                    <Button size="sm" className="w-full h-7 text-xs" onClick={handleCreateEt}>Criar etiqueta</Button>
                  </Pop>
                )}
              </div>

              {/* Data limite */}
              <Button size="sm" variant="secondary" className="w-full justify-start gap-2 text-xs h-8 relative" asChild>
                <label className="cursor-pointer"><Calendar size={13} /> Data limite
                  <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={c.data_limite ? c.data_limite.split('T')[0] : ''} onChange={e => setData(e.target.value)} />
                </label>
              </Button>

              {/* Capa */}
              <div className="relative">
                <SideBtn icon={Palette} label="Capa" active={popover === 'capa'} onClick={() => setPopover(p => p === 'capa' ? null : 'capa')} />
                {popover === 'capa' && (
                  <Pop onClose={() => setPopover(null)} title="Cor de capa">
                    <div className="flex flex-wrap gap-1.5">
                      {PALETTE.map(col => <button key={col} className={`h-7 w-7 rounded ${c.cor === col ? 'ring-2 ring-offset-1 ring-gray-700' : ''}`} style={{ backgroundColor: col }} onClick={() => { props.onUpdateCartao(c.id, { cor: col }); setPopover(null); }} />)}
                      <button className="h-7 w-7 rounded border flex items-center justify-center" onClick={() => { props.onUpdateCartao(c.id, { cor: null }); setPopover(null); }}><X size={13} /></button>
                    </div>
                  </Pop>
                )}
              </div>

              <SideBtn icon={CheckSquare} label="Checklist" onClick={() => setAddingChecklist(true)} />

              <Separator className="my-2" />
              <Button size="sm" variant="ghost" className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive h-8" onClick={() => { props.onArchiveCartao(c.id, c.lista_id); onClose(); }}>
                <Archive size={13} /> Arquivar cartão
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Popover leve com backdrop de fecho
function Pop({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-9 z-50 bg-white border rounded-xl shadow-xl p-3 w-64" onClick={e => e.stopPropagation()}>
        <p className="text-xs font-semibold mb-2 text-center">{title}</p>
        {children}
      </div>
    </>
  );
}
