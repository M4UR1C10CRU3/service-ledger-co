import { useState } from 'react';
import { Loader2, ListChecks } from 'lucide-react';
import {
  OsFormData,
  OS_PRIORIDADES,
  OS_ESTADOS,
  emptyOsForm,
} from '@/types/ordemServico';
import { useClientes } from '@/hooks/useClientes';
import { useOsChecklistTemplates } from '@/hooks/useOsChecklistTemplates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OsFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (form: OsFormData) => Promise<void>;
}

const ESTADOS_ENTRADA: Array<'nova' | 'aprovada' | 'em_execucao'> = [
  'nova',
  'aprovada',
  'em_execucao',
];

const PRIORIDADES_KEYS: Array<keyof typeof OS_PRIORIDADES> = [
  'baixa',
  'normal',
  'alta',
  'urgente',
];

export function OsFormDialog({ open, onOpenChange, onSubmit }: OsFormDialogProps) {
  const { clientes } = useClientes();
  const { templates } = useOsChecklistTemplates();
  const [form, setForm] = useState<OsFormData>(emptyOsForm);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ titulo?: string }>({});

  const update = <K extends keyof OsFormData>(key: K, value: OsFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClienteChange = (value: string) => {
    if (value === '__none__') {
      setForm((prev) => ({ ...prev, clienteId: '', clienteNome: '' }));
      return;
    }
    const cliente = clientes.find((c) => c.id === value);
    if (cliente) {
      setForm((prev) => ({ ...prev, clienteId: cliente.id, clienteNome: cliente.nome }));
    }
  };

  const handleSubmit = async () => {
    const newErrors: { titulo?: string } = {};
    if (!form.titulo.trim()) {
      newErrors.titulo = 'Título é obrigatório';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSaving(true);
    try {
      await onSubmit(form);
      setForm(emptyOsForm);
      setErrors({});
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ListChecks className="h-4 w-4" /> Template de Checklist
            </Label>
            <Select
              value={form.templateId || '__none__'}
              onValueChange={(v) => update('templateId', v === '__none__' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem template</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.templateId && (
              <p className="text-xs text-muted-foreground">
                Os itens da checklist serão criados automaticamente com responsáveis e prazos.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="os-titulo">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="os-titulo"
              value={form.titulo}
              onChange={(e) => update('titulo', e.target.value)}
              placeholder="Ex: Reparação de canalização"
            />
            {errors.titulo && (
              <p className="text-sm text-destructive">{errors.titulo}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={form.clienteId || '__none__'}
                onValueChange={handleClienteChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem cliente</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={form.prioridade}
                onValueChange={(v) => update('prioridade', v as OsFormData['prioridade'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {OS_PRIORIDADES[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado inicial</Label>
              <Select
                value={form.estado}
                onValueChange={(v) => update('estado', v as OsFormData['estado'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_ENTRADA.map((e) => (
                    <SelectItem key={e} value={e}>
                      {OS_ESTADOS[e].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor Estimado (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.valorEstimado}
                onChange={(e) => update('valorEstimado', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Abertura</Label>
              <Input
                type="date"
                value={form.dataAbertura}
                onChange={(e) => update('dataAbertura', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Prevista</Label>
              <Input
                type="date"
                value={form.dataPrevista}
                onChange={(e) => update('dataPrevista', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={form.descricao}
              onChange={(e) => update('descricao', e.target.value)}
              placeholder="Descrição detalhada do serviço"
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => update('observacoes', e.target.value)}
              placeholder="Notas internas ou observações adicionais"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar OS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OsFormDialog;
