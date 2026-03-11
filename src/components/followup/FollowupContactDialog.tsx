import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { TIPOS_CONTACTO, FASES_ORDER, FASES_CONFIG, SENTIMENTOS, type TipoContacto, type FaseFollowup, type Sentimento } from '@/types/followup';
import type { Oportunidade } from '@/types/followup';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oportunidade: Oportunidade | null;
  onSave: (oportunidadeId: string, data: any) => Promise<boolean>;
}

export function FollowupContactDialog({ open, onOpenChange, oportunidade, onSave }: Props) {
  const [tipoContacto, setTipoContacto] = useState<TipoContacto>('telefone');
  const [resultado, setResultado] = useState('');
  const [feedbackCliente, setFeedbackCliente] = useState('');
  const [sentimento, setSentimento] = useState<Sentimento>('desconhecido');
  const [mudaFase, setMudaFase] = useState(false);
  const [faseNova, setFaseNova] = useState<FaseFollowup | null>(null);
  const [probabilidade, setProbabilidade] = useState(oportunidade?.probabilidade ?? 25);
  const [proxData, setProxData] = useState('');
  const [proxTipo, setProxTipo] = useState<TipoContacto>('telefone');
  const [proxNotas, setProxNotas] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset when oportunidade changes
  const handleOpen = (v: boolean) => {
    if (v && oportunidade) {
      setProbabilidade(oportunidade.probabilidade);
      setTipoContacto('telefone');
      setResultado('');
      setFeedbackCliente('');
      setSentimento('desconhecido');
      setMudaFase(false);
      setFaseNova(null);
      setProxData('');
      setProxNotas('');
    }
    onOpenChange(v);
  };

  const handleSave = async () => {
    if (!oportunidade || !resultado.trim()) {
      toast({ title: 'Erro', description: 'Resultado do contacto é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const ok = await onSave(oportunidade.id, {
      tipoContacto,
      resultado: resultado.trim(),
      feedbackCliente: feedbackCliente.trim() || null,
      sentimento,
      probabilidadeApos: probabilidade,
      faseNova: mudaFase ? faseNova : null,
      proximoFollowupData: proxData ? new Date(proxData).toISOString() : null,
      proximoFollowupTipo: proxTipo,
      proximoFollowupNotas: proxNotas || null,
    });
    setSaving(false);
    if (ok) {
      toast({ title: 'Contacto registado com sucesso' });
      onOpenChange(false);
    }
  };

  const probColor = probabilidade >= 90 ? 'text-green-600' : probabilidade >= 61 ? 'text-blue-600' : probabilidade >= 31 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registar Contacto</DialogTitle>
          {oportunidade && <p className="text-sm text-muted-foreground">{oportunidade.clienteNome} — {oportunidade.titulo}</p>}
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo de Contacto *</Label>
            <Select value={tipoContacto} onValueChange={v => setTipoContacto(v as TipoContacto)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS_CONTACTO).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Resultado do Contacto *</Label>
            <Textarea value={resultado} onChange={e => setResultado(e.target.value)} placeholder="O que aconteceu neste contacto..." />
          </div>

          <div>
            <Label>Feedback do Cliente</Label>
            <Textarea value={feedbackCliente} onChange={e => setFeedbackCliente(e.target.value)} placeholder="O que o cliente disse/manifestou..." />
          </div>

          <div>
            <Label>Sentimento do Cliente</Label>
            <div className="flex gap-2 mt-1">
              {(Object.entries(SENTIMENTOS) as [Sentimento, { label: string; icon: string }][]).map(([k, v]) => (
                <Button
                  key={k}
                  variant={sentimento === k ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSentimento(k)}
                >
                  {v.icon} {v.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Nova Probabilidade: <span className={`font-bold ${probColor}`}>{probabilidade}%</span></Label>
            <Slider value={[probabilidade]} onValueChange={v => setProbabilidade(v[0])} min={0} max={100} step={5} className="mt-2" />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={mudaFase} onCheckedChange={setMudaFase} />
            <Label>Mudança de fase?</Label>
          </div>
          {mudaFase && (
            <Select value={faseNova || ''} onValueChange={v => setFaseNova(v as FaseFollowup)}>
              <SelectTrigger><SelectValue placeholder="Selecionar nova fase" /></SelectTrigger>
              <SelectContent>
                {FASES_ORDER.map(f => (
                  <SelectItem key={f} value={f}>{FASES_CONFIG[f].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="border-t pt-4">
            <Label className="text-sm font-semibold">Próximo Follow-up</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label className="text-xs">Data e Hora</Label>
                <Input type="datetime-local" value={proxData} onChange={e => setProxData(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={proxTipo} onValueChange={v => setProxTipo(v as TipoContacto)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS_CONTACTO).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea className="mt-2" placeholder="Notas para o próximo contacto..." value={proxNotas} onChange={e => setProxNotas(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'A guardar...' : 'Registar Contacto'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
