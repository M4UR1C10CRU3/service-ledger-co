import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Worker empacotado localmente pelo Vite (versão exacta 4.0.379).
// PROBLEMA: o nginx serve ficheiros .mjs como application/octet-stream, e o browser
// recusa carregar um module worker sem MIME de JavaScript. SOLUÇÃO: buscar o código
// do worker e criar o Worker a partir de um Blob com MIME text/javascript definido
// por nós — 100% no cliente, sem depender da configuração do servidor.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
let pdfWorkerPromise: Promise<void> | null = null;
function ensurePdfWorker(): Promise<void> {
  if (pdfWorkerPromise) return pdfWorkerPromise;
  pdfWorkerPromise = (async () => {
    const code = await (await fetch(pdfWorkerUrl)).text();
    const blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(blobUrl, { type: 'module' });
  })();
  pdfWorkerPromise.catch(() => { pdfWorkerPromise = null; }); // permitir nova tentativa
  return pdfWorkerPromise;
}
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlignLeft, Calendar, CheckSquare, Tag, Archive, Plus, X, Check, Clock,
  MessageSquare, Users, Palette, Trash2, Activity, Pencil, SmilePlus,
  CornerDownRight, Paperclip, Copy, LayoutTemplate, Link2, ExternalLink,
} from 'lucide-react';
import { QuadroCartao, ChecklistItem, Etiqueta, Comentario, Utilizador, CartaoAnexo, ChecklistModelo, ChecklistModeloItem } from '@/types/quadros';
import { initials, avatarColor } from './CartaoCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { format, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';

const fmtDate = (iso: string | null | undefined, fmt: string): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return isValid(d) ? format(d, fmt, { locale: pt }) : '';
  } catch {
    return '';
  }
};

const PALETTE = [
  '#ef4444','#f97316','#f59e0b','#eab308','#84cc16',
  '#22c55e','#10b981','#14b8a6','#06b6d4','#0ea5e9',
  '#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef',
  '#ec4899','#f43f5e','#854d0e','#78716c','#64748b',
];

const EMOJIS = [
  '😀','😂','🥰','😍','🤔','😅','😭','😎','🥳','🤩','😊','😬','🙄','😤','😢','😱',
  '👍','👎','❤️','🙌','👏','🤝','💪','✌️','🤞','👋','🫶','🙏','💯','👌',
  '🔥','⭐','💡','📌','✅','❌','⚠️','🎯','🚀','🏆','💰','📊','📝','🔗','📎',
  '🎉','🎊','🥂','🍕','☕','🌟','💥','⚡','🌈','🦾','🤖','💎','🏅','📣','🔔',
];

interface ItemEditState {
  responsavel_id: string;
  responsavel_nome: string;
  hora: string;
  data_limite: string;
}

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
  onUpdateChecklistItem: (itemId: string, checklistId: string, cartaoId: string, updates: Partial<Pick<ChecklistItem, 'responsavel_id' | 'responsavel_nome' | 'hora' | 'data_limite'>>) => Promise<void>;
  onFetchFeed: (cartaoId: string) => Promise<Comentario[]>;
  onAddComentario: (cartaoId: string, texto: string, replyTo?: { id: string; autor_nome: string | null; texto: string }) => Promise<Comentario | null>;
  onUpdateComentario: (id: string, texto: string) => Promise<void>;
  onDeleteComentario: (id: string) => Promise<void>;
  onCreateEtiqueta: (nome: string, cor: string) => Promise<Etiqueta | null>;
  onUpdateEtiqueta: (id: string, updates: Partial<Pick<Etiqueta, 'nome' | 'cor'>>) => Promise<void>;
  onToggleEtiqueta: (cartaoId: string, etiquetaId: string, isActive: boolean) => Promise<void>;
  onToggleMembro: (cartaoId: string, util: Utilizador, isActive: boolean) => Promise<void>;
  onListAnexos: (cartaoId: string) => Promise<CartaoAnexo[]>;
  onAddAnexo: (cartaoId: string, nome: string, url: string) => Promise<CartaoAnexo | null>;
  onUploadAnexo: (cartaoId: string, file: File) => Promise<CartaoAnexo | null>;
  onDeleteAnexo: (id: string, cartaoId: string) => Promise<void>;
  onDuplicarCartao: (cartaoId: string, listaId: string, opts: { comentarios: boolean; anexos: boolean }) => Promise<void>;
  onListChecklistModelos: () => Promise<ChecklistModelo[]>;
  onApplyChecklistModelo: (cartaoId: string, modeloNome: string, itens: ChecklistModeloItem[]) => Promise<void>;
}

type Popover = null | 'membros' | 'etiquetas' | 'capa' | 'anexos' | 'modelos';

// Renderiza um PDF em <canvas> via PDF.js — não usa <embed>/<iframe>/blob, portanto
// funciona em qualquer browser (incl. Brave com shields) sem depender do viewer nativo.
function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    setStatus('loading');
    setErrMsg('');
    let cancelled = false;

    (async () => {
      let stage = 'worker';
      try {
        if (!url) throw new Error('anexo sem caminho de ficheiro (path vazio)');
        await ensurePdfWorker();
        stage = 'fetch';
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const buffer = await resp.arrayBuffer();
        if (cancelled) return;
        stage = 'parse';
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        stage = 'render';
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.cssText = 'display:block;max-width:100%;height:auto;margin:0 auto 10px;box-shadow:0 1px 8px rgba(0,0,0,.12);background:#fff;border-radius:2px';
          container.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
        if (!cancelled) setStatus('ready');
      } catch (err) {
        console.error('[PdfViewer] falha na fase', stage, err);
        if (!cancelled) {
          setErrMsg(`[${stage}] ` + (err instanceof Error ? `${err.name}: ${err.message}` : String(err)));
          setStatus('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="relative w-full h-full">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground text-sm z-10">
          <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full inline-block" />
          A carregar PDF...
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground z-10 px-6 text-center">
          <Paperclip size={40} className="opacity-20" />
          <p className="text-sm">Não foi possível renderizar o PDF.</p>
          {errMsg && <code className="text-[11px] bg-muted rounded px-2 py-1 max-w-full break-all text-destructive">{errMsg}</code>}
          <code className="text-[10px] bg-muted/60 rounded px-2 py-1 max-w-full break-all opacity-70">url: {url || '(vazio)'}</code>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1.5">
            <ExternalLink size={14} /> Abrir em nova aba
          </a>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full overflow-auto bg-neutral-100 p-4" />
    </div>
  );
}

export default function CartaoDetailModal(props: Props) {
  const { cartao, etiquetas, utilizadores, listaNome, isOpen, onClose } = props;
  const me = useCurrentUser();

  // Core state
  const [titulo, setTitulo] = useState('');
  const [editingTitulo, setEditingTitulo] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [feed, setFeed] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [novaChecklist, setNovaChecklist] = useState('');
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const [popover, setPopover] = useState<Popover>(null);
  const [novaEt, setNovaEt] = useState({ nome: '', cor: '#6366f1' });
  const [showAtividade, setShowAtividade] = useState(false);

  // Duplicação (comentários/anexos são opcionais)
  const [showDuplicar, setShowDuplicar] = useState(false);
  const [dupComentarios, setDupComentarios] = useState(false);
  const [dupAnexos, setDupAnexos] = useState(false);

  // Checklist item detail editor (responsável / hora / prazo)
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEditState>>({});

  // Comment: reply
  const [replyingTo, setReplyingTo] = useState<Comentario | null>(null);
  // Comment: edit
  const [editingComment, setEditingComment] = useState<{ id: string; texto: string } | null>(null);
  // Emoji picker
  const [showEmoji, setShowEmoji] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // @mention autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const mentionAtPos = useRef(0);

  // Anexos
  const [anexos, setAnexos] = useState<CartaoAnexo[]>([]);
  const anexoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [previewAnexo, setPreviewAnexo] = useState<CartaoAnexo | null>(null);

  // Modelos de checklist
  const [modelos, setModelos] = useState<ChecklistModelo[]>([]);
  const [loadingModelos, setLoadingModelos] = useState(false);

  useEffect(() => {
    if (!cartao) return;
    setTitulo(cartao.titulo);
    setDescricao(cartao.descricao || '');
    props.onFetchFeed(cartao.id).then(setFeed);
    props.onListAnexos(cartao.id).then(setAnexos);
    setPopover(null);
    setEditingTitulo(false);
    setEditingDesc(false);
    setReplyingTo(null);
    setEditingComment(null);
    setExpandedItem(null);
    setShowAtividade(false);
    setAnexos([]);
    setUploadingAnexo(false);
    setPreviewAnexo(null);
    setShowDuplicar(false);
    setModelos([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartao?.id]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

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
  const saveDesc = async () => {
    await props.onUpdateCartao(c.id, { descricao: descricao || null });
    setEditingDesc(false);
  };

  const setData = async (val: string) => {
    await props.onUpdateCartao(c.id, { data_limite: val ? new Date(val).toISOString() : null, data_limite_concluida: false },
      val ? `definiu o prazo para ${fmtDate(val, 'd MMM yyyy')}` : undefined);
  };
  const toggleDone = async () => {
    await props.onUpdateCartao(c.id, { data_limite_concluida: !done }, !done ? 'marcou o prazo como concluído' : 'reabriu o prazo');
  };

  const handleAddChecklist = async () => {
    if (novaChecklist.trim()) await props.onAddChecklist(c.id, novaChecklist.trim());
    setNovaChecklist(''); setAddingChecklist(false);
  };
  const handleAddItem = async (clId: string) => {
    const texto = (newItemTexts[clId] || '').trim();
    if (!texto) return;
    await props.onAddChecklistItem(clId, c.id, texto);
    setNewItemTexts(p => ({ ...p, [clId]: '' }));
  };

  const handleComment = async () => {
    if (!novoComentario.trim()) return;
    await props.onAddComentario(c.id, novoComentario.trim(), replyingTo ?? undefined);
    setNovoComentario('');
    setReplyingTo(null);
    setMentionQuery(null);
    refreshFeed();
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setNovoComentario(val);
    const before = val.slice(0, cursor);
    const lastAt = before.lastIndexOf('@');
    if (lastAt >= 0) {
      const query = before.slice(lastAt + 1);
      if (!query.includes('  ')) {
        const q = query.toLowerCase().trim();
        const matched = utilizadores.filter(u =>
          !q ? true : u.nome.toLowerCase().includes(q),
        );
        if (matched.length > 0) {
          setMentionQuery(query);
          mentionAtPos.current = lastAt;
          return;
        }
      }
    }
    setMentionQuery(null);
  };

  const insertMention = (u: Utilizador) => {
    const at = mentionAtPos.current;
    const cursor = commentRef.current?.selectionStart ?? novoComentario.length;
    const before = novoComentario.slice(0, at);
    const after = novoComentario.slice(cursor);
    const next = `${before}@${u.nome} ${after}`;
    setNovoComentario(next);
    setMentionQuery(null);
    setTimeout(() => {
      if (commentRef.current) {
        const pos = at + 1 + u.nome.length + 1;
        commentRef.current.setSelectionRange(pos, pos);
        commentRef.current.focus();
      }
    }, 10);
  };

  const handleSaveEditComment = async () => {
    if (!editingComment || !editingComment.texto.trim()) return;
    await props.onUpdateComentario(editingComment.id, editingComment.texto.trim());
    setEditingComment(null);
    refreshFeed();
  };

  const handleCreateEt = async () => {
    if (novaEt.nome.trim() || novaEt.cor) {
      await props.onCreateEtiqueta(novaEt.nome.trim(), novaEt.cor);
      setNovaEt({ nome: '', cor: '#6366f1' });
    }
  };

  // Insert emoji at cursor in the comment textarea
  const insertEmoji = (emoji: string) => {
    const ta = commentRef.current;
    if (!ta) { setNovoComentario(p => p + emoji); setShowEmoji(false); return; }
    const start = ta.selectionStart ?? novoComentario.length;
    const end = ta.selectionEnd ?? novoComentario.length;
    const next = novoComentario.slice(0, start) + emoji + novoComentario.slice(end);
    setNovoComentario(next);
    setShowEmoji(false);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length); });
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // permitir voltar a escolher o mesmo ficheiro
    if (!files.length) return;
    setUploadingAnexo(true);
    for (const file of files) {
      const novo = await props.onUploadAnexo(c.id, file);
      if (novo) setAnexos(p => [...p, novo]);
    }
    setUploadingAnexo(false);
  };

  const handleDeleteAnexo = async (id: string) => {
    await props.onDeleteAnexo(id, c.id);
    setAnexos(p => p.filter(a => a.id !== id));
  };

  const handleOpenModelos = async () => {
    setPopover(p => p === 'modelos' ? null : 'modelos');
    if (modelos.length === 0) {
      setLoadingModelos(true);
      const list = await props.onListChecklistModelos();
      setModelos(list);
      setLoadingModelos(false);
    }
  };

  const handleApplyModelo = async (m: ChecklistModelo) => {
    setPopover(null);
    await props.onApplyChecklistModelo(c.id, m.nome, m.checklist_template_items);
    props.onFetchFeed(c.id).then(setFeed);
  };

  const handleDuplicar = () => { setDupComentarios(false); setDupAnexos(false); setShowDuplicar(true); };
  const confirmDuplicar = async () => {
    setShowDuplicar(false);
    await props.onDuplicarCartao(c.id, c.lista_id, { comentarios: dupComentarios, anexos: dupAnexos });
    onClose();
  };

  // Checklist item detail helpers
  const getItemEdit = (item: ChecklistItem): ItemEditState => itemEdits[item.id] ?? {
    responsavel_id: item.responsavel_id || '',
    responsavel_nome: item.responsavel_nome || '',
    hora: item.hora?.slice(0, 5) || '',
    data_limite: item.data_limite || '',
  };

  const saveItemEdit = async (item: ChecklistItem, clId: string) => {
    const e = getItemEdit(item);
    const u = utilizadores.find(u => u.id === e.responsavel_id);
    await props.onUpdateChecklistItem(item.id, clId, c.id, {
      responsavel_id: e.responsavel_id || null,
      responsavel_nome: u?.nome || e.responsavel_nome || null,
      hora: e.hora || null,
      data_limite: e.data_limite || null,
    });
    setExpandedItem(null);
  };

  const isImageUrl = (url: string, nome = '') => /\.(jpe?g|png|gif|webp|svg|bmp)(\?|#|$)/i.test(url) || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(nome);
  const isPdfUrl   = (url: string, nome = '') => /\.pdf(\?|#|$)/i.test(url) || /\.pdf$/i.test(nome) || url.toLowerCase().includes('.pdf');

  const SideBtn = ({ icon: Icon, label, onClick, active }: { icon: any; label: string; onClick: () => void; active?: boolean }) => (
    <Button size="sm" variant="secondary" className={`w-full justify-start gap-2 text-xs h-8 ${active ? 'ring-1 ring-primary' : ''}`} onClick={onClick}>
      <Icon size={13} /> {label}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-[920px] max-h-[92vh] overflow-y-auto p-0 gap-0">
        {c.cor && <div className="h-9" style={{ backgroundColor: c.cor }} />}

        <div className="p-5">
          <div className="flex gap-5 flex-col md:flex-row">
            {/* ── Main column ── */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* Title */}
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
                      <Clock size={13} /> {fmtDate(c.data_limite, "d MMM yyyy")}
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
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveDesc}>Guardar</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setDescricao(c.descricao || ''); setEditingDesc(false); }}>Cancelar</Button>
                    </div>
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
                  <div className="flex items-center gap-2 mb-1">
                    <CheckSquare size={15} className="text-muted-foreground" />
                    <p className="text-sm font-semibold">Checklists</p>
                    <span className="text-xs text-muted-foreground ml-auto">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5 mb-4" />
                  {c.checklists.map(cl => (
                    <div key={cl.id} className="mb-4 group/cl">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium">{cl.titulo}</p>
                        <button onClick={() => props.onDeleteChecklist(cl.id, c.id)} className="opacity-0 group-hover/cl:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                      </div>
                      {cl.items.map(item => (
                        <div key={item.id} className="group/item mb-1">
                          {/* Item row */}
                          <div className="flex items-start gap-2 py-0.5">
                            <input
                              type="checkbox"
                              checked={item.concluido}
                              onChange={() => props.onToggleChecklistItem(item.id, cl.id, c.id, !item.concluido)}
                              className="mt-0.5 h-4 w-4 rounded cursor-pointer accent-primary"
                            />
                            <span className={`text-sm flex-1 ${item.concluido ? 'line-through text-muted-foreground' : ''}`}>{item.texto}</span>
                            {item.responsavel_nome && (
                              <span
                                title={item.responsavel_nome}
                                className="shrink-0 h-5 w-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-1 ring-white/30"
                                style={{ backgroundColor: item.responsavel_id ? avatarColor(item.responsavel_id) : '#94a3b8' }}
                              >
                                {initials(item.responsavel_nome)}
                              </span>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100">
                              <button
                                title="Detalhes (responsável, hora, prazo)"
                                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                              >
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => props.onDeleteChecklistItem(item.id, cl.id, c.id)} className="text-muted-foreground hover:text-destructive p-0.5 rounded"><X size={12} /></button>
                            </div>
                          </div>

                          {/* Item meta badges (responsável mostrado inline à direita do texto) */}
                          {(item.hora || item.data_limite) && expandedItem !== item.id && (
                            <div className="flex flex-wrap gap-2 ml-6 mt-0.5">
                              {item.hora && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                                  <Clock size={11} /> {item.hora.slice(0, 5)}
                                </span>
                              )}
                              {item.data_limite && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                                  <Calendar size={11} /> {fmtDate(item.data_limite + 'T00:00:00', 'd MMM yyyy')}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Item detail editor */}
                          {expandedItem === item.id && (
                            <div className="ml-6 mt-2 p-3 bg-muted/50 rounded-lg border space-y-2">
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Responsável</p>
                                <select
                                  className="w-full h-8 text-xs border rounded px-2 bg-background"
                                  value={getItemEdit(item).responsavel_id}
                                  onChange={e => {
                                    const u = utilizadores.find(u => u.id === e.target.value);
                                    setItemEdits(p => ({ ...p, [item.id]: { ...getItemEdit(item), responsavel_id: e.target.value, responsavel_nome: u?.nome || '' } }));
                                  }}
                                >
                                  <option value="">— Nenhum —</option>
                                  {utilizadores.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Hora</p>
                                  <Input
                                    type="time"
                                    className="h-8 text-xs"
                                    value={getItemEdit(item).hora}
                                    onChange={e => setItemEdits(p => ({ ...p, [item.id]: { ...getItemEdit(item), hora: e.target.value } }))}
                                  />
                                </div>
                                <div className="flex-1">
                                  <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Data limite</p>
                                  <Input
                                    type="date"
                                    className="h-8 text-xs"
                                    value={getItemEdit(item).data_limite}
                                    onChange={e => setItemEdits(p => ({ ...p, [item.id]: { ...getItemEdit(item), data_limite: e.target.value } }))}
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" className="h-7 text-xs" onClick={() => saveItemEdit(item, cl.id)}>Guardar</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setExpandedItem(null); setItemEdits(p => { const n = { ...p }; delete n[item.id]; return n; }); }}>Cancelar</Button>
                              </div>
                            </div>
                          )}
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
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddChecklist}>Criar</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingChecklist(false); setNovaChecklist(''); }}>Cancelar</Button>
                  </div>
                </div>
              )}

              {/* Anexos */}
              {anexos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Paperclip size={15} className="text-muted-foreground" />
                    <p className="text-sm font-semibold">Anexos</p>
                  </div>
                  <div className="space-y-1.5">
                    {anexos.map(a => (
                      <div key={a.id} className="flex items-center gap-2 group py-0.5">
                        <Link2 size={13} className="text-primary shrink-0" />
                        <button onClick={() => setPreviewAnexo(a)} className="text-sm text-primary hover:underline flex-1 truncate text-left">
                          {a.nome}
                        </button>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba" className="text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 hover:text-foreground">
                          <ExternalLink size={11} />
                        </a>
                        <button onClick={() => handleDeleteAnexo(a.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Feed: atividade + comentários */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={15} className="text-muted-foreground" />
                  <p className="text-sm font-semibold">Atividade &amp; Comentários</p>
                  <button
                    onClick={() => setShowAtividade(p => !p)}
                    className="ml-auto text-[11px] text-muted-foreground hover:text-foreground border rounded px-2 py-0.5 transition-colors"
                  >
                    {showAtividade ? 'Ocultar histórico' : 'Ver histórico'}
                  </button>
                </div>

                {/* New comment box */}
                <div className="flex gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">{initials(me.nome)}</div>
                  <div className="flex-1 space-y-2">
                    {/* Reply context */}
                    {replyingTo && (
                      <div className="flex items-start gap-1.5 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground border-l-2 border-primary">
                        <CornerDownRight size={12} className="mt-0.5 shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground">{replyingTo.autor_nome}</span>
                          <p className="truncate">{replyingTo.texto.slice(0, 120)}{replyingTo.texto.length > 120 ? '…' : ''}</p>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="hover:text-destructive shrink-0"><X size={12} /></button>
                      </div>
                    )}
                    <div className="relative">
                      <Textarea
                        ref={commentRef}
                        placeholder="Escreva um comentário, follow-up ou feedback..."
                        value={novoComentario}
                        onChange={handleCommentChange}
                        rows={2}
                        className="text-sm"
                        onKeyDown={e => {
                          if (e.key === 'Escape' && mentionQuery !== null) { e.preventDefault(); setMentionQuery(null); return; }
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleComment();
                        }}
                      />
                      {mentionQuery !== null && (() => {
                        const q = mentionQuery.toLowerCase().trim();
                        const memberIds = new Set(c.membros.map(m => m.utilizador_id));
                        const suggestions = [
                          ...utilizadores.filter(u => memberIds.has(u.id) && (!q || u.nome.toLowerCase().includes(q))),
                          ...utilizadores.filter(u => !memberIds.has(u.id) && (!q || u.nome.toLowerCase().includes(q))),
                        ].slice(0, 8);
                        if (!suggestions.length) return null;
                        return (
                          <div className="absolute bottom-[calc(100%+4px)] left-0 right-0 bg-popover border rounded-lg shadow-lg overflow-hidden z-50">
                            {suggestions.map(u => (
                              <button
                                key={u.id}
                                type="button"
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left text-sm transition-colors"
                                onMouseDown={e => { e.preventDefault(); insertMention(u); }}
                              >
                                <span className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: avatarColor(u.id) }}>
                                  {initials(u.nome)}
                                </span>
                                <span className="flex-1 font-medium">{u.nome}</span>
                                {memberIds.has(u.id) && <span className="text-[10px] text-primary font-medium">membro</span>}
                                {u.cargo && !memberIds.has(u.id) && <span className="text-[10px] text-muted-foreground">{u.cargo}</span>}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    {novoComentario || replyingTo ? (
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleComment}>Comentar</Button>
                        {/* Emoji picker */}
                        <div className="relative" ref={emojiRef}>
                          <button
                            type="button"
                            onClick={() => setShowEmoji(p => !p)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Inserir emoji"
                          >
                            <SmilePlus size={16} />
                          </button>
                          {showEmoji && (
                            <div className="absolute bottom-9 left-0 z-50 bg-white border rounded-xl shadow-xl p-3 w-64">
                              <p className="text-[11px] font-semibold text-muted-foreground mb-2">Emojis</p>
                              <div className="grid grid-cols-8 gap-0.5">
                                {EMOJIS.map(em => (
                                  <button
                                    key={em}
                                    onClick={() => insertEmoji(em)}
                                    className="text-lg h-8 w-8 flex items-center justify-center hover:bg-muted rounded"
                                  >{em}</button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => { setNovoComentario(''); setReplyingTo(null); }}>Cancelar</Button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Feed items — mais recentes primeiro (ordem invertida para leitura) */}
                {feed.filter(f => f.tipo === 'comentario' || showAtividade).slice().reverse().map(f => f.tipo === 'atividade' ? (
                  <div key={f.id} className="flex items-center gap-2 mb-2.5 text-xs text-muted-foreground pl-1">
                    <span className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(f.autor_id || f.id) }}>{initials(f.autor_nome)}</span>
                    <span><strong className="text-foreground/70 font-medium">{f.autor_nome}</strong> {f.texto} · {fmtDate(f.criado_em, "d MMM HH:mm")}</span>
                  </div>
                ) : (
                  <div key={f.id} className="flex gap-2.5 mb-3 group/cm">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(f.autor_id || f.id) }}>{initials(f.autor_nome)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs"><strong>{f.autor_nome || 'Utilizador'}</strong> <span className="text-muted-foreground">{fmtDate(f.criado_em, "d MMM 'às' HH:mm")}</span>
                        {f.atualizado_em && f.atualizado_em !== f.criado_em && <span className="text-muted-foreground"> · editado</span>}
                      </p>

                      {/* Reply context inside comment */}
                      {f.reply_to_id && f.reply_to_texto && (
                        <div className="flex items-start gap-1.5 bg-muted rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground border-l-2 border-muted-foreground/30 mt-1 mb-1">
                          <CornerDownRight size={11} className="mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground/70">{f.reply_to_autor_nome}</span>
                            <p className="truncate">{f.reply_to_texto.slice(0, 100)}{(f.reply_to_texto.length > 100) ? '…' : ''}</p>
                          </div>
                        </div>
                      )}

                      {/* Comment text or edit form */}
                      {editingComment?.id === f.id ? (
                        <div className="space-y-1.5 mt-1">
                          <Textarea
                            value={editingComment.texto}
                            onChange={e => setEditingComment(p => p ? { ...p, texto: e.target.value } : p)}
                            rows={2}
                            className="text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs" onClick={handleSaveEditComment}>Guardar</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingComment(null)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <p className="text-sm mt-1 bg-muted rounded-lg px-3 py-2 whitespace-pre-wrap flex-1">{f.texto}</p>
                          <div className="flex flex-col gap-0.5 opacity-0 group-hover/cm:opacity-100 mt-1 shrink-0">
                            <button
                              title="Responder"
                              onClick={() => { setReplyingTo(f); commentRef.current?.focus(); }}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                            >
                              <MessageSquare size={13} />
                            </button>
                            <button
                              title="Editar"
                              onClick={() => setEditingComment({ id: f.id, texto: f.texto })}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              title="Eliminar"
                              onClick={async () => { await props.onDeleteComentario(f.id); refreshFeed(); }}
                              className="text-muted-foreground hover:text-destructive p-0.5"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Reply action link */}
                      {editingComment?.id !== f.id && (
                        <button
                          className="text-[11px] text-muted-foreground hover:text-foreground mt-0.5 ml-1"
                          onClick={() => { setReplyingTo(f); commentRef.current?.focus(); }}
                        >
                          Responder
                        </button>
                      )}
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

              {/* Modelos de checklist */}
              <div className="relative">
                <SideBtn icon={LayoutTemplate} label="Modelos" active={popover === 'modelos'} onClick={handleOpenModelos} />
                {popover === 'modelos' && (
                  <Pop onClose={() => setPopover(null)} title="Modelos de checklist">
                    {loadingModelos && <p className="text-xs text-muted-foreground py-2 text-center">A carregar...</p>}
                    {!loadingModelos && modelos.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2 text-center">Nenhum modelo disponível.</p>
                    )}
                    {modelos.map(m => (
                      <button
                        key={m.id}
                        className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
                        onClick={() => handleApplyModelo(m)}
                      >
                        <span className="font-medium">{m.nome}</span>
                        <span className="text-xs text-muted-foreground ml-2">({m.checklist_template_items.length} itens)</span>
                      </button>
                    ))}
                  </Pop>
                )}
              </div>

              {/* Anexos — upload de ficheiros do PC (múltiplos) */}
              <div className="relative">
                <input
                  ref={anexoInputRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/png,image/jpeg,image/*,.pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFilesSelected}
                />
                <SideBtn
                  icon={uploadingAnexo ? Clock : Paperclip}
                  label={uploadingAnexo ? 'A carregar...' : 'Anexo'}
                  active={uploadingAnexo}
                  onClick={() => { if (!uploadingAnexo) anexoInputRef.current?.click(); }}
                />
              </div>

              <Separator className="my-2" />
              <Button size="sm" variant="ghost" className="w-full justify-start gap-2 text-xs text-muted-foreground h-8" onClick={handleDuplicar}>
                <Copy size={13} /> Duplicar cartão
              </Button>
              <Button size="sm" variant="ghost" className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive h-8" onClick={() => { props.onArchiveCartao(c.id, c.lista_id); onClose(); }}>
                <Archive size={13} /> Arquivar cartão
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* ── Preview de Anexo — Dialog Radix empilhado (gere scroll, cliques e Escape) ── */}
      <Dialog open={!!previewAnexo} onOpenChange={o => { if (!o) setPreviewAnexo(null); }}>
        {previewAnexo && (
          <DialogContent className="max-w-[960px] w-[88vw] h-[86vh] p-0 gap-0 overflow-hidden flex flex-col">
            <DialogTitle className="sr-only">{previewAnexo.nome}</DialogTitle>
            {/* Header (pr-12 reserva espaço para o X incorporado do DialogContent) */}
            <div className="flex items-center gap-3 px-4 py-3 pr-12 border-b shrink-0">
              <Paperclip size={14} className="text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-medium truncate">{previewAnexo.nome}</span>
              <a href={previewAnexo.url} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba" className="text-muted-foreground hover:text-foreground shrink-0">
                <ExternalLink size={16} />
              </a>
            </div>
            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
              {isPdfUrl(previewAnexo.url, previewAnexo.nome) ? (
                <PdfViewer url={previewAnexo.url} />
              ) : isImageUrl(previewAnexo.url, previewAnexo.nome) ? (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                  <img src={previewAnexo.url} alt={previewAnexo.nome} className="max-w-full max-h-full object-contain rounded" />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                  <Paperclip size={40} className="opacity-20" />
                  <p className="text-sm">Pré-visualização não disponível para este tipo de ficheiro.</p>
                  <a href={previewAnexo.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1.5">
                    <ExternalLink size={14} /> Abrir ficheiro
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Diálogo: Duplicar cartão (comentários/anexos opcionais) ── */}
      <Dialog open={showDuplicar} onOpenChange={setShowDuplicar}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Duplicar cartão</DialogTitle>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Serão duplicados automaticamente: <strong className="text-foreground">membros, etiquetas, checklist e responsáveis</strong>.
            </p>
            <p className="font-medium">Queres manter também?</p>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded accent-primary" checked={dupComentarios} onChange={e => setDupComentarios(e.target.checked)} />
              Comentários
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded accent-primary" checked={dupAnexos} onChange={e => setDupAnexos(e.target.checked)} />
              Anexos
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button size="sm" variant="ghost" onClick={() => setShowDuplicar(false)}>Cancelar</Button>
            <Button size="sm" onClick={confirmDuplicar} className="gap-1.5"><Copy size={13} /> Duplicar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

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
