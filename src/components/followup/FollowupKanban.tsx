import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Phone } from 'lucide-react';
import { FASES_ORDER, FASES_CONFIG, TIPOS_CONTACTO, type FaseFollowup } from '@/types/followup';
import type { Oportunidade } from '@/types/followup';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOTIVOS_ARQUIVO } from '@/types/followup';

interface Props {
  oportunidades: Oportunidade[];
  onUpdateFase: (id: string, fase: FaseFollowup, motivo?: string) => Promise<boolean>;
  onViewDetail: (o: Oportunidade) => void;
  onRegisterContact: (o: Oportunidade) => void;
  onEdit: (o: Oportunidade) => void;
}

export function FollowupKanban({ oportunidades, onUpdateFase, onViewDetail, onRegisterContact, onEdit }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [archiveDialog, setArchiveDialog] = useState<{ id: string } | null>(null);
  const [archiveMotivo, setArchiveMotivo] = useState('Preço');

  const now = new Date();

  const handleDrop = async (fase: FaseFollowup) => {
    if (!dragId) return;
    const opp = oportunidades.find(o => o.id === dragId);
    if (!opp || opp.fase === fase) { setDragId(null); return; }

    if (fase === 'perdido') {
      setArchiveDialog({ id: dragId });
      return;
    }
    await onUpdateFase(dragId, fase);
    setDragId(null);
  };

  const confirmArchive = async () => {
    if (!archiveDialog) return;
    await onUpdateFase(archiveDialog.id, 'perdido', archiveMotivo);
    setArchiveDialog(null);
    setDragId(null);
  };

  const isOverdue = (o: Oportunidade) => o.proximoFollowupData && new Date(o.proximoFollowupData) < now;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {FASES_ORDER.map(fase => {
          const config = FASES_CONFIG[fase];
          const items = oportunidades.filter(o => o.fase === fase);
          return (
            <div
              key={fase}
              className="flex-shrink-0 w-[280px] rounded-xl border bg-muted/30 flex flex-col"
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(fase)}
            >
              <div className="p-3 border-b flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                <span className="text-sm font-semibold">{config.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
              </div>
              <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[60vh]">
                {items.map(o => (
                  <Card
                    key={o.id}
                    draggable
                    onDragStart={() => setDragId(o.id)}
                    className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <p className="text-xs text-muted-foreground">{o.clienteNome || '—'}</p>
                    <p className="text-sm font-medium truncate">{o.titulo}</p>
                    {o.numeroProposta && (
                      <p className="text-xs text-muted-foreground mt-1">📄 {o.numeroProposta}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold">
                        €{(o.totalComIva ?? o.valorEstimado ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${o.probabilidade}%`,
                              backgroundColor: o.probabilidade >= 90 ? '#22C55E' : o.probabilidade >= 61 ? '#3B82F6' : o.probabilidade >= 31 ? '#EAB308' : '#EF4444',
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{o.probabilidade}%</span>
                      </div>
                    </div>
                    {o.proximoFollowupData && (
                      <div className={`text-[10px] mt-1.5 ${isOverdue(o) ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                        {isOverdue(o) ? '⚠️ ' : '📅 '}
                        {format(new Date(o.proximoFollowupData), "dd/MM HH:mm", { locale: pt })}
                      </div>
                    )}
                    <div className="flex gap-1 mt-2 border-t pt-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRegisterContact(o)}><Phone className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onViewDetail(o)}><Eye className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(o)}><Edit className="h-3 w-3" /></Button>
                    </div>
                  </Card>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Sem oportunidades</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!archiveDialog} onOpenChange={() => { setArchiveDialog(null); setDragId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Motivo do Arquivamento</DialogTitle></DialogHeader>
          <Select value={archiveMotivo} onValueChange={setArchiveMotivo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOTIVOS_ARQUIVO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setArchiveDialog(null); setDragId(null); }}>Cancelar</Button>
            <Button onClick={confirmArchive}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
