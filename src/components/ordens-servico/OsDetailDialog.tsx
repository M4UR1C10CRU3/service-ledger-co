import { useEffect, useState } from 'react';
import {
  OrdemServico,
  OsChecklistItem,
  OsEstado,
  OS_ESTADOS,
  OS_PRIORIDADES,
} from '@/types/ordemServico';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, AlertTriangle, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import OsExtrasTab from './OsExtrasTab';

interface Props {
  os: OrdemServico | null;
  onClose: () => void;
  onUpdate: (id: string, payload: Record<string, any>) => Promise<boolean>;
  onUpdateEstado: (id: string, estado: OsEstado) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  fetchChecklist: (osId: string) => Promise<OsChecklistItem[]>;
  addChecklistItem: (osId: string, desc: string) => Promise<OsChecklistItem | null>;
  toggleChecklistItem: (id: string, v: boolean) => Promise<boolean>;
  deleteChecklistItem: (id: string) => Promise<boolean>;
}

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const fmtEUR = (v: number | null | undefined) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

export function OsDetailDialog({
  os,
  onClose,
  onUpdate,
  onUpdateEstado,
  onDelete,
  fetchChecklist,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
}: Props) {
  const [tab, setTab] = useState('detalhes');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const [checklist, setChecklist] = useState<OsChecklistItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (os) {
      setTab('detalhes');
      setEditing(false);
      setConfirmDelete(false);
      setEditForm({
        titulo: os.titulo,
        descricao: os.descricao ?? '',
        observacoes: os.observacoes ?? '',
        prioridade: os.prioridade,
        dataPrevista: os.dataPrevista ?? '',
        valorEstimado: os.valorEstimado ?? '',
        valorFinal: os.valorFinal ?? '',
      });
    }
  }, [os]);

  useEffect(() => {
    if (os && tab === 'checklist') {
      setLoadingChecklist(true);
      fetchChecklist(os.id)
        .then(setChecklist)
        .finally(() => setLoadingChecklist(false));
    }
  }, [os, tab, fetchChecklist]);

  if (!os) return null;

  const estadoCfg = OS_ESTADOS[os.estado];

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        titulo: editForm.titulo,
        descricao: editForm.descricao || null,
        observacoes: editForm.observacoes || null,
        prioridade: editForm.prioridade,
        data_prevista: editForm.dataPrevista || null,
        valor_estimado: editForm.valorEstimado === '' ? null : Number(editForm.valorEstimado),
        valor_final: editForm.valorFinal === '' ? null : Number(editForm.valorFinal),
      };
      const ok = await onUpdate(os.id, payload);
      if (ok) setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    const desc = newItem.trim();
    if (!desc) return;
    const created = await addChecklistItem(os.id, desc);
    if (created) {
      setChecklist((prev) => [...prev, created]);
      setNewItem('');
    }
  };

  const handleToggleItem = async (item: OsChecklistItem) => {
    const newVal = !item.concluido;
    const ok = await toggleChecklistItem(item.id, newVal);
    if (ok) {
      setChecklist((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, concluido: newVal } : c)),
      );
    }
  };

  const handleDeleteItem = async (id: string) => {
    const ok = await deleteChecklistItem(id);
    if (ok) setChecklist((prev) => prev.filter((c) => c.id !== id));
  };

  const concluidos = checklist.filter((c) => c.concluido).length;
  const progress = checklist.length ? (concluidos / checklist.length) * 100 : 0;

  const transicoes: { label: string; estado: OsEstado; variant?: 'destructive' | 'default' }[] = (() => {
    switch (os.estado) {
      case 'nova':
        return [
          { label: 'Aprovar', estado: 'aprovada' },
          { label: 'Cancelar OS', estado: 'cancelada', variant: 'destructive' },
        ];
      case 'aprovada':
        return [
          { label: 'Iniciar Execução', estado: 'em_execucao' },
          { label: 'Cancelar OS', estado: 'cancelada', variant: 'destructive' },
        ];
      case 'em_execucao':
        return [
          { label: 'Marcar Concluída', estado: 'concluida' },
          { label: 'Cancelar OS', estado: 'cancelada', variant: 'destructive' },
        ];
      case 'concluida':
        return [{ label: 'Faturar', estado: 'faturada' }];
      default:
        return [];
    }
  })();

  return (
    <Dialog open={!!os} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">{os.numero}</Badge>
            <Badge className={cn(estadoCfg.bg, estadoCfg.color, estadoCfg.border, 'border')}>
              {estadoCfg.label}
            </Badge>
            <span className={cn('text-sm font-medium', OS_PRIORIDADES[os.prioridade].color)}>
              {OS_PRIORIDADES[os.prioridade].label}
            </span>
          </div>
          <DialogTitle className="text-xl mt-2">{os.titulo}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="extras">Extras</TabsTrigger>
            <TabsTrigger value="acoes">Ações</TabsTrigger>
          </TabsList>

          {/* DETALHES */}
          <TabsContent value="detalhes" className="space-y-4 mt-4">
            {!editing ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Cliente" value={os.clienteNome || '—'} />
                  <Info label="Prioridade" value={OS_PRIORIDADES[os.prioridade].label} />
                  <Info label="Data Abertura" value={fmtDate(os.dataAbertura)} />
                  <Info label="Data Prevista" value={fmtDate(os.dataPrevista)} />
                  <Info label="Data Início" value={fmtDate(os.dataInicio)} />
                  <Info label="Data Conclusão" value={fmtDate(os.dataConclusao)} />
                  <Info label="Valor Estimado" value={fmtEUR(os.valorEstimado)} />
                  <Info label="Valor Final" value={fmtEUR(os.valorFinal)} />
                </div>

                {os.descricao && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">
                      {os.descricao}
                    </p>
                  </div>
                )}
                {os.observacoes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">
                      {os.observacoes}
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setEditing(true)}>Editar</Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">Título</label>
                    <Input
                      value={editForm.titulo}
                      onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">Data Prevista</label>
                      <Input
                        type="date"
                        value={editForm.dataPrevista || ''}
                        onChange={(e) => setEditForm({ ...editForm, dataPrevista: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Prioridade</label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={editForm.prioridade}
                        onChange={(e) => setEditForm({ ...editForm, prioridade: e.target.value })}
                      >
                        {Object.entries(OS_PRIORIDADES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Valor Estimado (€)</label>
                      <Input
                        type="number" min={0} step={0.01}
                        value={editForm.valorEstimado}
                        onChange={(e) => setEditForm({ ...editForm, valorEstimado: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Valor Final (€)</label>
                      <Input
                        type="number" min={0} step={0.01}
                        value={editForm.valorFinal}
                        onChange={(e) => setEditForm({ ...editForm, valorFinal: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Descrição</label>
                    <Textarea
                      rows={3}
                      value={editForm.descricao}
                      onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Observações</label>
                    <Textarea
                      rows={2}
                      value={editForm.observacoes}
                      onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'A guardar...' : 'Guardar'}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* CHECKLIST */}
          <TabsContent value="checklist" className="space-y-4 mt-4">
            {loadingChecklist ? (
              <p className="text-sm text-muted-foreground text-center py-6">A carregar...</p>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      {concluidos} de {checklist.length} concluídos
                    </span>
                    <span className="text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="space-y-2">
                  {checklist.map((item) => {
                    const hoje = new Date(); hoje.setHours(0,0,0,0);
                    const dPrazo = item.prazo ? new Date(item.prazo + 'T00:00:00') : null;
                    const diff = dPrazo ? (dPrazo.getTime() - hoje.getTime()) / 86400000 : null;
                    const prazoCls = diff == null ? '' : diff < 0 ? 'bg-red-50 text-red-700 border-red-200' : diff <= 1 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200';
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 p-2 rounded-md border bg-card"
                      >
                        <Checkbox
                          className="mt-1"
                          checked={item.concluido}
                          onCheckedChange={() => handleToggleItem(item)}
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className={cn('text-sm', item.concluido && 'line-through text-muted-foreground')}>
                            {item.titulo}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            {item.responsavelNome && (
                              <span className="px-1.5 py-0.5 rounded border bg-muted text-muted-foreground">
                                👤 {item.responsavelNome}
                              </span>
                            )}
                            {item.prazo && (
                              <span className={cn('px-1.5 py-0.5 rounded border', prazoCls)}>
                                📅 {fmtDate(item.prazo)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                  {checklist.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sem itens na checklist
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Novo item..."
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                  />
                  <Button onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* EXTRAS */}
          <TabsContent value="extras" className="mt-4">
            <OsExtrasTab osId={os.id} empresaId={os.empresaId} osEstado={os.estado} />
          </TabsContent>

          {/* AÇÕES */}
          <TabsContent value="acoes" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Transição de Estado</h3>
              {transicoes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {transicoes.map((t) => (
                    <Button
                      key={t.estado}
                      variant={t.variant ?? 'default'}
                      onClick={() => onUpdateEstado(os.id, t.estado)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem transições disponíveis</p>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Zona de Perigo
              </h3>
              {!confirmDelete ? (
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar OS
                </Button>
              ) : (
                <div className="space-y-2 p-3 rounded-md border border-destructive/50 bg-destructive/5">
                  <p className="text-sm">Tens a certeza? Esta acção é irreversível.</p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const ok = await onDelete(os.id);
                        if (ok) onClose();
                      }}
                    >
                      Sim, eliminar
                    </Button>
                    <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
