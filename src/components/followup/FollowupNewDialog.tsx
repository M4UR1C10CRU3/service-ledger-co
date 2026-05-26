import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { FASES_ORDER, FASES_CONFIG, TIPOS_CONTACTO, type FaseFollowup, type TipoContacto } from '@/types/followup';
import { useClientes } from '@/hooks/useClientes';
import { toast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => Promise<string | null>;
  propostas?: Array<{ id: string; numeroProposta: string; clienteNome: string | null; totalComIva: number }>;
}

export function FollowupNewDialog({ open, onOpenChange, onSave, propostas = [] }: Props) {
  const { clientes } = useClientes();
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [propostaId, setPropostaId] = useState<string | null>(null);
  const [fase, setFase] = useState<FaseFollowup>('po_recebido');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [probabilidade, setProbabilidade] = useState(25);
  const [valorEstimado, setValorEstimado] = useState('');
  const [dataAdj, setDataAdj] = useState('');
  const [proxData, setProxData] = useState('');
  const [proxTipo, setProxTipo] = useState<TipoContacto>('telefone');
  const [proxNotas, setProxNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast({ title: 'Erro', description: 'Título é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const result = await onSave({
      clienteId,
      clienteNome,
      propostaId,
      titulo: titulo.trim(),
      fase,
      responsavelNome: responsavelNome || null,
      probabilidade,
      valorEstimado: valorEstimado ? parseFloat(valorEstimado) : null,
      dataAdjudicacaoEsperada: dataAdj || null,
      proximoFollowupData: proxData ? new Date(proxData).toISOString() : null,
      proximoFollowupTipo: proxTipo,
      proximoFollowupNotas: proxNotas || null,
    });
    setSaving(false);
    if (result) {
      toast({ title: 'Oportunidade criada com sucesso' });
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setClienteId(null); setClienteNome(''); setTitulo(''); setPropostaId(null);
    setFase('po_recebido'); setResponsavelNome(''); setProbabilidade(25);
    setValorEstimado(''); setDataAdj(''); setProxData(''); setProxNotas('');
  };

  const probColor = probabilidade >= 90 ? 'text-green-600' : probabilidade >= 61 ? 'text-blue-600' : probabilidade >= 31 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Oportunidade</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Cliente *</Label>
            <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between" role="combobox">
                  {clienteNome || 'Selecionar cliente...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar cliente..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                    <CommandGroup>
                      {clientes.map(c => (
                        <CommandItem
                          key={c.id}
                          value={c.nome}
                          onSelect={() => {
                            setClienteId(c.id);
                            setClienteNome(c.nome);
                            setClientePopoverOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', clienteId === c.id ? 'opacity-100' : 'opacity-0')} />
                          {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Título da Oportunidade *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Remodelação casa de banho" />
          </div>

          {propostas.length > 0 && (
            <div>
              <Label>Proposta Associada</Label>
              <Select value={propostaId || 'none'} onValueChange={v => setPropostaId(v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {propostas.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.numeroProposta} — {p.clienteNome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fase Inicial</Label>
              <Select value={fase} onValueChange={v => setFase(v as FaseFollowup)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FASES_ORDER.filter(f => f !== 'adjudicado' && f !== 'perdido').map(f => (
                    <SelectItem key={f} value={f}>{FASES_CONFIG[f].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Input value={responsavelNome} onChange={e => setResponsavelNome(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Probabilidade: <span className={`font-bold ${probColor}`}>{probabilidade}%</span></Label>
            <Slider value={[probabilidade]} onValueChange={v => setProbabilidade(v[0])} min={0} max={100} step={5} className="mt-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor Estimado (€)</Label>
              <Input type="number" value={valorEstimado} onChange={e => setValorEstimado(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Data Adjudicação Esperada</Label>
              <Input type="date" value={dataAdj} onChange={e => setDataAdj(e.target.value)} />
            </div>
          </div>

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
          <Button onClick={handleSave} disabled={saving}>{saving ? 'A guardar...' : 'Criar Oportunidade'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
