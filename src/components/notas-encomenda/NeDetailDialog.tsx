import { useEffect, useState } from 'react';
import { NotaEncomenda, NeItem, NeChecklistItem, NeEstado, NE_ESTADOS, NE_PRIORIDADES } from '@/types/notaEncomenda';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Package, CheckSquare, Zap, Trash2, Plus, FileDown, Loader2, Mail } from 'lucide-react';
import { exportNePdf } from './nePdfExport';
import { buildNotaEncomendaEmail } from '@/lib/emailTemplates';
import { SendEmailDialog } from '@/components/SendEmailDialog';
import { useEmpresa } from '@/contexts/EmpresaContext';

interface Props {
  ne: NotaEncomenda | null;
  onClose: () => void;
  onUpdateEstado: (id: string, estado: NeEstado) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean | void>;
  fetchItems: (neId: string) => Promise<NeItem[]>;
  fetchChecklist: (neId: string) => Promise<NeChecklistItem[]>;
  toggleChecklistItem: (id: string, v: boolean) => Promise<boolean>;
  addChecklistItem: (neId: string, desc: string) => Promise<NeChecklistItem | null>;
}

const fmtEUR = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

type Transition = { label: string; estado: NeEstado; variant?: 'default' | 'destructive' | 'outline' };
const TRANSITIONS: Record<NeEstado, Transition[]> = {
  rascunho:         [{ label: 'Enviar ao Fornecedor', estado: 'enviada' },          { label: 'Cancelar NE', estado: 'cancelada', variant: 'destructive' }],
  enviada:          [{ label: 'Cotação Recebida',     estado: 'cotacao_recebida' }, { label: 'Cancelar NE', estado: 'cancelada', variant: 'destructive' }],
  cotacao_recebida: [{ label: 'Aprovar Encomenda',    estado: 'aprovada' },         { label: 'Cancelar NE', estado: 'cancelada', variant: 'destructive' }],
  aprovada:         [{ label: 'Realizar Encomenda',   estado: 'encomendada' },      { label: 'Cancelar NE', estado: 'cancelada', variant: 'destructive' }],
  encomendada:      [{ label: 'Marcar como Recebida', estado: 'recebida' },         { label: 'Cancelar NE', estado: 'cancelada', variant: 'destructive' }],
  recebida:         [{ label: 'Marcar como Faturada', estado: 'faturada' }],
  faturada:         [],
  cancelada:        [],
};

export function NeDetailDialog({
  ne, onClose, onUpdateEstado, onDelete,
  fetchItems, fetchChecklist, toggleChecklistItem, addChecklistItem,
}: Props) {
  const [tab, setTab] = useState('detalhes');
  const [items, setItems] = useState<NeItem[]>([]);
  const [checklist, setChecklist] = useState<NeChecklistItem[]>([]);
  const [newChkDesc, setNewChkDesc] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailData, setEmailData] = useState<{ subject: string; html: string; from: string } | null>(null);
  const { empresa } = useEmpresa();

  useEffect(() => {
    if (ne) { setTab('detalhes'); setConfirmDelete(false); }
  }, [ne?.id]);

  useEffect(() => {
    if (!ne) return;
    if (tab === 'materiais') fetchItems(ne.id).then(setItems);
    if (tab === 'checklist') fetchChecklist(ne.id).then(setChecklist);
  }, [tab, ne?.id]);

  if (!ne) return null;
  const estadoCfg = NE_ESTADOS[ne.estado];
  const prioCfg = NE_PRIORIDADES[ne.prioridade];
  const transitions = TRANSITIONS[ne.estado];
  const done = checklist.filter(c => c.concluido).length;
  const total = checklist.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleEstado = async (e: NeEstado) => {
    const ok = await onUpdateEstado(ne.id, e);
    if (ok) onClose();
  };

  const handleToggle = async (item: NeChecklistItem) => {
    const novo = !item.concluido;
    const ok = await toggleChecklistItem(item.id, novo);
    if (ok) setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, concluido: novo } : c));
  };

  const handleAddChk = async () => {
    if (!newChkDesc.trim()) return;
    const item = await addChecklistItem(ne.id, newChkDesc.trim());
    if (item) {
      setChecklist(prev => [...prev, item]);
      setNewChkDesc('');
    }
  };

  const handleDelete = async () => {
    await onDelete(ne.id);
    onClose();
  };

  const handleExportPdf = async () => {
    if (!ne) return;
    setPdfLoading(true);
    try {
      // Fetch items if not already loaded (materiais tab not visited yet)
      let pdfItems = items;
      if (pdfItems.length === 0) {
        pdfItems = await fetchItems(ne.id);
        setItems(pdfItems); // cache for later
      }
      exportNePdf(
        {
          numeroNe:      ne.numero,
          titulo:        ne.titulo,
          descricao:     ne.descricao ?? undefined,
          observacoes:   ne.observacoes ?? undefined,
          prioridade:    ne.prioridade,
          fornecedorNome: ne.fornecedorNome ?? '—',
          dataCriacao:   ne.dataCriacao,
          dataNecessidade: ne.dataNecessidade ?? undefined,
          items:         pdfItems,
          valorEstimado: ne.valorEstimado,
        },
        empresa,
      );
    } finally {
      setPdfLoading(false);
    }
  };

  const handleOpenEmail = async () => {
    let emailItems = items;
    if (emailItems.length === 0) {
      emailItems = await fetchItems(ne.id);
      setItems(emailItems);
    }
    const result = buildNotaEncomendaEmail(
      {
        numero:          ne.numero,
        titulo:          ne.titulo,
        fornecedorNome:  ne.fornecedorNome,
        dataCriacao:     ne.dataCriacao,
        dataNecessidade: ne.dataNecessidade,
        items:           emailItems.map(it => ({
          descricao:   it.descricao,
          referencia:  it.referencia,
          quantidade:  it.quantidade,
          unidade:     it.unidade,
        })),
        observacoes:     ne.observacoes,
        valorEstimado:   ne.valorEstimado,
      },
      empresa,
    );
    setEmailData(result);
    setEmailOpen(true);
  };

  return (
    <Dialog open={!!ne} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">{ne.numero}</span>
                <Badge className={`${estadoCfg.bg} ${estadoCfg.color} ${estadoCfg.border} border`} variant="outline">
                  {estadoCfg.label}
                </Badge>
              </div>
              <DialogTitle>{ne.titulo}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="materiais"><Package className="h-3.5 w-3.5 mr-1" />Materiais</TabsTrigger>
            <TabsTrigger value="checklist"><CheckSquare className="h-3.5 w-3.5 mr-1" />Checklist</TabsTrigger>
            <TabsTrigger value="acoes"><Zap className="h-3.5 w-3.5 mr-1" />Ações</TabsTrigger>
          </TabsList>

          {/* Detalhes */}
          <TabsContent value="detalhes" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Fornecedor" value={ne.fornecedorNome ?? '—'} />
              <Info label="Prioridade" value={<span className={prioCfg.color}>{prioCfg.label}</span>} />
              <Info label="Data de Criação" value={fmtDate(ne.dataCriacao)} />
              <Info label="Data de Necessidade" value={fmtDate(ne.dataNecessidade)} />
              <Info label="Data de Envio" value={fmtDate(ne.dataEnvio)} />
              <Info label="Data de Recepção" value={fmtDate(ne.dataRecepcao)} />
              <Info label="Valor Estimado" value={fmtEUR(ne.valorEstimado)} />
              <Info label="Valor Final" value={fmtEUR(ne.valorFinal)} />
            </div>
            {ne.descricao && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/40 p-3 rounded-md">{ne.descricao}</p>
              </div>
            )}
            {ne.observacoes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/40 p-3 rounded-md">{ne.observacoes}</p>
              </div>
            )}
          </TabsContent>

          {/* Materiais */}
          <TabsContent value="materiais" className="mt-4">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum material registado</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Descrição</th>
                      <th className="text-left p-2">Ref.</th>
                      <th className="text-right p-2">Qtd</th>
                      <th className="text-left p-2">Un.</th>
                      <th className="text-right p-2">Preço Unit.</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(it => (
                      <tr key={it.id} className="border-t">
                        <td className="p-2">{it.descricao}</td>
                        <td className="p-2 text-muted-foreground">{it.referencia ?? '—'}</td>
                        <td className="p-2 text-right">{it.quantidade}</td>
                        <td className="p-2">{it.unidade}</td>
                        <td className="p-2 text-right">{fmtEUR(it.precoUnit)}</td>
                        <td className="p-2 text-right font-medium">{fmtEUR(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Checklist */}
          <TabsContent value="checklist" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{done}/{total} concluídos</span>
              </div>
              <Progress value={pct} />
            </div>
            <div className="space-y-2">
              {checklist.map(c => (
                <div key={c.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/40">
                  <Checkbox
                    checked={c.concluido}
                    onCheckedChange={() => handleToggle(c)}
                    className="mt-0.5"
                  />
                  <span className={`text-sm flex-1 ${c.concluido ? 'line-through text-muted-foreground' : ''}`}>
                    {c.descricao}
                  </span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar item extra..."
                value={newChkDesc}
                onChange={(e) => setNewChkDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddChk(); }}
              />
              <Button onClick={handleAddChk} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </TabsContent>

          {/* Ações */}
          <TabsContent value="acoes" className="space-y-6 mt-4">

            {/* PDF Export */}
            <div>
              <h3 className="font-semibold mb-3">Documento PDF</h3>
              <Button
                variant="outline"
                onClick={handleExportPdf}
                disabled={pdfLoading}
                className="gap-2"
              >
                {pdfLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <FileDown className="h-4 w-4" />}
                Exportar Nota de Encomenda (PDF)
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">
                Gera o documento A4 pronto para imprimir ou enviar ao fornecedor.
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Enviar por Email</h3>
              <Button variant="outline" size="sm" onClick={handleOpenEmail}>
                <Mail className="h-4 w-4 mr-2" /> Enviar NE ao Fornecedor por Email
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">
                Gera o email com a lista de materiais e envia directamente ao fornecedor.
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Transição de Estado</h3>
              {transitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem transições disponíveis</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {transitions.map(t => (
                    <Button
                      key={t.estado}
                      variant={t.variant ?? 'default'}
                      onClick={() => handleEstado(t.estado)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-destructive mb-2">Zona de Perigo</h3>
              {!confirmDelete ? (
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar NE
                </Button>
              ) : (
                <div className="border border-destructive/30 rounded-md p-3 space-y-2 bg-destructive/5">
                  <p className="text-sm">Tem certeza? Esta acção não pode ser revertida.</p>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleDelete}>Confirmar eliminação</Button>
                    <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {emailData && (
      <SendEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        title="Enviar NE ao Fornecedor"
        description={`${ne.numero} — ${ne.fornecedorNome || 'Fornecedor'}`}
        from={emailData.from}
        subject={emailData.subject}
        html={emailData.html}
      />
    )}
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
