import { useState } from 'react';
import { NeFormData, NeItemForm, NE_PRIORIDADES, emptyNeForm } from '@/types/notaEncomenda';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useProdutos } from '@/hooks/useProdutos';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (form: NeFormData, items: NeItemForm[]) => Promise<void>;
}

const emptyItem = (id: string): NeItemForm => ({
  tempId: id, descricao: '', referencia: '', quantidade: '1', unidade: 'und', precoUnit: '',
});

export function NeFormDialog({ open, onOpenChange, onSubmit }: Props) {
  const { suppliers } = useSuppliers();
  const { toast } = useToast();
  const [form, setForm] = useState<NeFormData>(emptyNeForm);
  const [items, setItems] = useState<NeItemForm[]>([emptyItem('1')]);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setForm(emptyNeForm);
    setItems([emptyItem('1')]);
  };

  const update = <K extends keyof NeFormData>(k: K, v: NeFormData[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const updateItem = (id: string, k: keyof NeItemForm, v: string) =>
    setItems(prev => prev.map(it => it.tempId === id ? { ...it, [k]: v } : it));

  const addItem = () => setItems(prev => [...prev, emptyItem(Date.now().toString())]);
  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.tempId !== id));

  const handleSupplierChange = (val: string) => {
    if (val === '__none__') {
      setForm(prev => ({ ...prev, fornecedorId: '', fornecedorNome: '' }));
      return;
    }
    const s = suppliers.find(x => x.id === val);
    setForm(prev => ({
      ...prev,
      fornecedorId: val,
      fornecedorNome: s?.razaoSocial ?? '',
    }));
  };

  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    const validItems = items.filter(it => it.descricao.trim());
    if (validItems.length === 0) {
      toast({ title: 'Adicione pelo menos um material', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(form, validItems);
      reset();
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Nota de Encomenda</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Dados gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) => update('titulo', e.target.value)}
                placeholder="Ex: Encomenda de materiais — Obra X"
              />
            </div>

            <div>
              <Label>Fornecedor</Label>
              <Select value={form.fornecedorId || '__none__'} onValueChange={handleSupplierChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar fornecedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem fornecedor</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.razaoSocial}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => update('prioridade', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NE_PRIORIDADES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data de Criação</Label>
              <Input type="date" value={form.dataCriacao} onChange={(e) => update('dataCriacao', e.target.value)} />
            </div>

            <div>
              <Label>Data de Necessidade</Label>
              <Input type="date" value={form.dataNecessidade} onChange={(e) => update('dataNecessidade', e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <Label>Valor Estimado (€)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.valorEstimado}
                onChange={(e) => update('valorEstimado', e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => update('descricao', e.target.value)}
                rows={2}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => update('observacoes', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Materiais */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Materiais a Encomendar</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">Descrição</th>
                    <th className="text-left p-2 font-medium w-24">Ref.</th>
                    <th className="text-left p-2 font-medium w-20">Qtd</th>
                    <th className="text-left p-2 font-medium w-20">Un.</th>
                    <th className="text-left p-2 font-medium w-28">Preço Unit.</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.tempId} className="border-t">
                      <td className="p-1.5">
                        <Input value={it.descricao} onChange={(e) => updateItem(it.tempId, 'descricao', e.target.value)} placeholder="Material" />
                      </td>
                      <td className="p-1.5">
                        <Input value={it.referencia} onChange={(e) => updateItem(it.tempId, 'referencia', e.target.value)} />
                      </td>
                      <td className="p-1.5">
                        <Input type="number" step="0.01" min="0" value={it.quantidade} onChange={(e) => updateItem(it.tempId, 'quantidade', e.target.value)} />
                      </td>
                      <td className="p-1.5">
                        <Input value={it.unidade} onChange={(e) => updateItem(it.tempId, 'unidade', e.target.value)} />
                      </td>
                      <td className="p-1.5">
                        <Input type="number" step="0.01" min="0" value={it.precoUnit} onChange={(e) => updateItem(it.tempId, 'precoUnit', e.target.value)} placeholder="0,00" />
                      </td>
                      <td className="p-1.5">
                        <Button
                          type="button" variant="ghost" size="icon"
                          onClick={() => removeItem(it.tempId)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              ℹ O checklist de processo será criado automaticamente com os 11 passos padrão.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'A criar...' : 'Criar NE'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
