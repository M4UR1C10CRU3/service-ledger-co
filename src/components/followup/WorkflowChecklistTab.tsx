import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Plus, Trash2, User, Eye, EyeOff, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useEmployees } from '@/hooks/useEmployees';
import type { ChecklistItem } from '@/types/followup';
import { useFollowup } from '@/hooks/useFollowup';
import { toast } from '@/hooks/use-toast';

interface Props {
  oportunidadeId: string;
}

export function WorkflowChecklistTab({ oportunidadeId }: Props) {
  const { empresa } = useEmpresa();
  const { employeesQuery } = useEmployees() as any;
  const employees = employeesQuery?.data ?? [];
  const { fetchChecklist, addChecklistItem, updateChecklistItem, toggleChecklistItem, deleteChecklistItem } = useFollowup();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newText, setNewText] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await fetchChecklist(oportunidadeId);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [oportunidadeId]);

  const total = items.length;
  const done = items.filter(i => i.concluido).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleAdd = async () => {
    if (!newText.trim() || !empresa) return;
    const maxOrdem = items.reduce((m, i) => Math.max(m, i.ordem), -1);
    await addChecklistItem({
      oportunidadeId, empresaId: empresa.id,
      ordem: maxOrdem + 1, texto: newText.trim(),
    });
    setNewText('');
    await load();
  };

  const handleToggle = async (item: ChecklistItem) => {
    await toggleChecklistItem(item.id, !item.concluido, empresa?.nome ? 'Utilizador' : 'Utilizador');
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este item?')) return;
    await deleteChecklistItem(id);
    await load();
  };

  const startEdit = (it: ChecklistItem) => {
    setEditingId(it.id); setEditText(it.texto);
  };
  const saveEdit = async () => {
    if (editingId && editText.trim()) {
      await updateChecklistItem(editingId, { texto: editText.trim() });
      setEditingId(null);
      await load();
    } else {
      setEditingId(null);
    }
  };

  const setResponsavel = async (item: ChecklistItem, empId: string | null) => {
    const emp = employees.find((e: any) => e.id === empId);
    await updateChecklistItem(item.id, {
      responsavelId: empId,
      responsavelNome: emp?.full_name ?? null,
    });
    await load();
  };

  const setPrazo = async (item: ChecklistItem, date: Date | undefined) => {
    await updateChecklistItem(item.id, { prazo: date ? format(date, 'yyyy-MM-dd') : null });
    await load();
  };

  const setPrazoHora = async (item: ChecklistItem, hora: string) => {
    await updateChecklistItem(item.id, { prazoHora: hora || null });
    await load();
  };

  const prazoColor = (prazo: string | null) => {
    if (!prazo) return '';
    const d = new Date(prazo);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'text-red-600 font-semibold';
    if (diff <= 1) return 'text-orange-600 font-semibold';
    return 'text-green-600';
  };

  const visible = hideDone ? items.filter(i => !i.concluido) : items;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{done}/{total} concluídos</span>
          <Button variant="ghost" size="sm" onClick={() => setHideDone(v => !v)}>
            {hideDone ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
            {hideDone ? 'Mostrar todos' : 'Ocultar concluídos'}
          </Button>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-center text-muted-foreground py-4 text-sm">A carregar...</p>
      ) : visible.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">Sem itens de checklist</p>
      ) : (
        <div className="space-y-2">
          {visible.map((it) => (
            <Card key={it.id} className={cn('p-3', it.concluido && 'bg-muted/30')}>
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-1 cursor-grab opacity-50" />
                <Checkbox checked={it.concluido} onCheckedChange={() => handleToggle(it)} className="mt-1" />
                <div className="flex-1 min-w-0 space-y-2">
                  {editingId === it.id ? (
                    <Input
                      autoFocus value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      className="h-8"
                    />
                  ) : (
                    <p
                      onClick={() => !it.concluido && startEdit(it)}
                      className={cn('text-sm cursor-text', it.concluido && 'line-through text-muted-foreground')}
                    >
                      {it.texto}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={it.responsavelId ?? '__none__'} onValueChange={v => setResponsavel(it, v === '__none__' ? null : v)}>
                      <SelectTrigger className="h-7 w-auto text-xs gap-1">
                        <User className="h-3 w-3" />
                        <SelectValue placeholder="Responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem responsável</SelectItem>
                        {employees.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn('h-7 text-xs', prazoColor(it.prazo))}>
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {it.prazo ? format(new Date(it.prazo), 'dd/MM/yyyy', { locale: pt }) : 'Sem prazo'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={it.prazo ? new Date(it.prazo) : undefined}
                          onSelect={(d) => setPrazo(it, d)}
                          className={cn('p-3 pointer-events-auto')}
                          initialFocus
                        />
                        {it.prazo && (
                          <div className="p-2 border-t">
                            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setPrazo(it, undefined)}>
                              Limpar
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time" className="h-7 w-[100px] text-xs"
                      value={it.prazoHora ?? ''}
                      onChange={e => setPrazoHora(it, e.target.value)}
                    />
                    {it.faseAssociada && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {it.faseAssociada}
                      </span>
                    )}
                  </div>
                  {it.concluido && it.concluidoPorNome && (
                    <p className="text-[10px] text-muted-foreground">
                      Concluído por {it.concluidoPorNome}
                      {it.concluidoEm && ` em ${format(new Date(it.concluidoEm), 'dd/MM HH:mm', { locale: pt })}`}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(it.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add */}
      <div className="flex gap-2 pt-2 border-t">
        <Input
          placeholder="+ Adicionar item..." value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          className="h-9"
        />
        <Button onClick={handleAdd} disabled={!newText.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>
    </div>
  );
}
