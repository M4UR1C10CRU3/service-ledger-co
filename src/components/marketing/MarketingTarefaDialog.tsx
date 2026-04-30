import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useMarketing, type MarketingTarefaInput } from '@/hooks/useMarketing';
import {
  STATUS_CONFIG,
  STATUS_ORDER,
  PRIORIDADE_CONFIG,
  TIPO_CONTEUDO_CONFIG,
  CANAL_CONFIG,
  type MarketingTarefa,
  type MarketingStatus,
  type MarketingPrioridade,
  type MarketingTipoConteudo,
  type MarketingCanal,
} from '@/types/marketing';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: MarketingTarefa | null;
  defaultStatus?: MarketingStatus;
  onSaved?: () => void;
}

export function MarketingTarefaDialog({ open, onOpenChange, initial, defaultStatus, onSaved }: Props) {
  const { createTarefa, updateTarefa } = useMarketing();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<MarketingTarefaInput>(() => ({
    titulo: initial?.titulo || '',
    descricao: initial?.descricao || '',
    tipoConteudo: initial?.tipoConteudo || null,
    canal: initial?.canal || null,
    status: initial?.status || defaultStatus || 'ideias',
    prioridade: initial?.prioridade || 'media',
    responsavelNome: initial?.responsavelNome || '',
    delegadoPorNome: initial?.delegadoPorNome || '',
    dataPrevista: initial?.dataPrevista || '',
    dataPublicacao: initial?.dataPublicacao || '',
    horaPublicacao: initial?.horaPublicacao || '',
    hashtags: initial?.hashtags || '',
    copyLegenda: initial?.copyLegenda || '',
    linkExterno: initial?.linkExterno || '',
    briefing: initial?.briefing || '',
    observacoes: initial?.observacoes || '',
  }));

  // Reset form when dialog opens/changes target
  const lastInitialId = initial?.id || '__new__';
  const [trackedKey, setTrackedKey] = useState(lastInitialId);
  if (open && trackedKey !== lastInitialId) {
    setTrackedKey(lastInitialId);
    setForm({
      titulo: initial?.titulo || '',
      descricao: initial?.descricao || '',
      tipoConteudo: initial?.tipoConteudo || null,
      canal: initial?.canal || null,
      status: initial?.status || defaultStatus || 'ideias',
      prioridade: initial?.prioridade || 'media',
      responsavelNome: initial?.responsavelNome || '',
      delegadoPorNome: initial?.delegadoPorNome || '',
      dataPrevista: initial?.dataPrevista || '',
      dataPublicacao: initial?.dataPublicacao || '',
      horaPublicacao: initial?.horaPublicacao || '',
      hashtags: initial?.hashtags || '',
      copyLegenda: initial?.copyLegenda || '',
      linkExterno: initial?.linkExterno || '',
      briefing: initial?.briefing || '',
      observacoes: initial?.observacoes || '',
    });
  }

  const handleSubmit = async () => {
    if (!form.titulo?.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload: MarketingTarefaInput = {
      ...form,
      titulo: form.titulo.trim(),
      dataPrevista: form.dataPrevista || null,
      dataPublicacao: form.dataPublicacao || null,
      horaPublicacao: form.horaPublicacao || null,
    };
    const ok = initial
      ? await updateTarefa(initial.id, payload)
      : !!(await createTarefa(payload));
    setSaving(false);
    if (ok) {
      toast({ title: initial ? 'Tarefa atualizada' : 'Tarefa criada' });
      onSaved?.();
      onOpenChange(false);
    } else {
      toast({ title: 'Erro ao guardar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar Tarefa' : 'Nova Tarefa de Marketing'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div>
            <Label>Título *</Label>
            <Input
              value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex.: Campanha Black Friday — Post Instagram"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as MarketingStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v as MarketingPrioridade })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORIDADE_CONFIG) as MarketingPrioridade[]).map(p => (
                    <SelectItem key={p} value={p}>{PRIORIDADE_CONFIG[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo de Conteúdo</Label>
              <Select
                value={form.tipoConteudo || ''}
                onValueChange={v => setForm({ ...form, tipoConteudo: (v || null) as MarketingTipoConteudo | null })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_CONTEUDO_CONFIG) as MarketingTipoConteudo[]).map(t => (
                    <SelectItem key={t} value={t}>{TIPO_CONTEUDO_CONFIG[t].icon} {TIPO_CONTEUDO_CONFIG[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Canal</Label>
              <Select
                value={form.canal || ''}
                onValueChange={v => setForm({ ...form, canal: (v || null) as MarketingCanal | null })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CANAL_CONFIG) as MarketingCanal[]).map(c => (
                    <SelectItem key={c} value={c}>{CANAL_CONFIG[c].icon} {CANAL_CONFIG[c].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Responsável (Executor)</Label>
              <Input
                value={form.responsavelNome || ''}
                onChange={e => setForm({ ...form, responsavelNome: e.target.value })}
                placeholder="Nome de quem executa"
              />
            </div>
            <div>
              <Label>Delegado por</Label>
              <Input
                value={form.delegadoPorNome || ''}
                onChange={e => setForm({ ...form, delegadoPorNome: e.target.value })}
                placeholder="Nome de quem delegou"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data Prevista</Label>
              <Input
                type="date"
                value={form.dataPrevista || ''}
                onChange={e => setForm({ ...form, dataPrevista: e.target.value })}
              />
            </div>
            <div>
              <Label>Data Publicação</Label>
              <Input
                type="date"
                value={form.dataPublicacao || ''}
                onChange={e => setForm({ ...form, dataPublicacao: e.target.value })}
              />
            </div>
            <div>
              <Label>Hora</Label>
              <Input
                type="time"
                value={form.horaPublicacao || ''}
                onChange={e => setForm({ ...form, horaPublicacao: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Briefing / Descrição</Label>
            <Textarea
              rows={3}
              value={form.briefing || ''}
              onChange={e => setForm({ ...form, briefing: e.target.value })}
              placeholder="Objectivo, contexto, mensagem-chave..."
            />
          </div>

          <div>
            <Label>Copy / Legenda</Label>
            <Textarea
              rows={3}
              value={form.copyLegenda || ''}
              onChange={e => setForm({ ...form, copyLegenda: e.target.value })}
              placeholder="Texto da publicação..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hashtags</Label>
              <Input
                value={form.hashtags || ''}
                onChange={e => setForm({ ...form, hashtags: e.target.value })}
                placeholder="#exemplo #marca"
              />
            </div>
            <div>
              <Label>Link Externo</Label>
              <Input
                value={form.linkExterno || ''}
                onChange={e => setForm({ ...form, linkExterno: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.observacoes || ''}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} style={{ backgroundColor: '#E8561A' }}>
            {saving ? 'A guardar...' : initial ? 'Guardar' : 'Criar Tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
