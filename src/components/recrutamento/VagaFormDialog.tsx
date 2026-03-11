import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVagas, type Vaga } from '@/hooks/useRecrutamento';

const cargosPreDefinidos = [
  'Técnico Comercial', 'Técnico de Obras', 'Diretor de Obras', 'Engenheiro Civil',
  'Pedreiro', 'Eletricista', 'Servente de Obras', 'Assistente Administrativo', 'Assistente de Limpezas',
];

const areas = ['Comercial', 'Obras', 'Administrativo', 'Operacional', 'Outro'];
const tiposContrato = ['Efetivo', 'Termo Certo', 'Termo Incerto', 'Estágio', 'Prestação de Serviços'];
const regimes = ['Presencial', 'Híbrido', 'Remoto'];
const estados = ['aberta', 'em_selecao', 'encerrada', 'cancelada'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaga: Vaga | null;
}

export function VagaFormDialog({ open, onOpenChange, vaga }: Props) {
  const { createVaga, updateVaga } = useVagas();
  const [form, setForm] = useState({
    cargo: '', area: '', num_vagas: 1, tipo_contrato: '', regime: '', salario_base: '',
    descricao: '', requisitos_obrig: '', requisitos_pref: '',
    data_abertura: new Date().toISOString().split('T')[0], data_limite: '', estado: 'aberta',
  });
  const [cargoOutro, setCargoOutro] = useState(false);

  useEffect(() => {
    if (vaga) {
      setForm({
        cargo: vaga.cargo, area: vaga.area || '', num_vagas: vaga.num_vagas,
        tipo_contrato: vaga.tipo_contrato || '', regime: vaga.regime || '',
        salario_base: vaga.salario_base?.toString() || '',
        descricao: vaga.descricao || '', requisitos_obrig: vaga.requisitos_obrig || '',
        requisitos_pref: vaga.requisitos_pref || '', data_abertura: vaga.data_abertura,
        data_limite: vaga.data_limite || '', estado: vaga.estado,
      });
      setCargoOutro(!cargosPreDefinidos.includes(vaga.cargo));
    } else {
      setForm({ cargo: '', area: '', num_vagas: 1, tipo_contrato: '', regime: '', salario_base: '', descricao: '', requisitos_obrig: '', requisitos_pref: '', data_abertura: new Date().toISOString().split('T')[0], data_limite: '', estado: 'aberta' });
      setCargoOutro(false);
    }
  }, [vaga, open]);

  const handleSubmit = () => {
    if (!form.cargo) return;
    const payload: any = {
      cargo: form.cargo, area: form.area || null, num_vagas: form.num_vagas,
      tipo_contrato: form.tipo_contrato || null, regime: form.regime || null,
      salario_base: form.salario_base ? parseFloat(form.salario_base) : null,
      descricao: form.descricao || null, requisitos_obrig: form.requisitos_obrig || null,
      requisitos_pref: form.requisitos_pref || null, data_abertura: form.data_abertura,
      data_limite: form.data_limite || null, estado: form.estado,
    };
    if (vaga) {
      updateVaga.mutate({ id: vaga.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createVaga.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vaga ? 'Editar Vaga' : 'Nova Vaga'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Cargo */}
          <div className="space-y-2">
            <Label>Cargo / Função *</Label>
            {!cargoOutro ? (
              <Select value={form.cargo} onValueChange={v => { if (v === '__outro__') { setCargoOutro(true); setForm(f => ({ ...f, cargo: '' })); } else setForm(f => ({ ...f, cargo: v })); }}>
                <SelectTrigger><SelectValue placeholder="Selecionar cargo" /></SelectTrigger>
                <SelectContent>
                  {cargosPreDefinidos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="__outro__">Outro (escrever)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Cargo personalizado" />
                <Button variant="outline" size="sm" onClick={() => setCargoOutro(false)}>Lista</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área / Departamento</Label>
              <Select value={form.area} onValueChange={v => setForm(f => ({ ...f, area: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nº de Vagas</Label>
              <Input type="number" min={1} value={form.num_vagas} onChange={e => setForm(f => ({ ...f, num_vagas: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select value={form.tipo_contrato} onValueChange={v => setForm(f => ({ ...f, tipo_contrato: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{tiposContrato.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Regime</Label>
              <Select value={form.regime} onValueChange={v => setForm(f => ({ ...f, regime: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{regimes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Salário Base (€)</Label>
              <Input type="number" value={form.salario_base} onChange={e => setForm(f => ({ ...f, salario_base: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição da Vaga</Label>
            <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Requisitos Obrigatórios</Label>
            <Textarea value={form.requisitos_obrig} onChange={e => setForm(f => ({ ...f, requisitos_obrig: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Requisitos Preferíveis</Label>
            <Textarea value={form.requisitos_pref} onChange={e => setForm(f => ({ ...f, requisitos_pref: e.target.value }))} rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data de Abertura *</Label>
              <Input type="date" value={form.data_abertura} onChange={e => setForm(f => ({ ...f, data_abertura: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Data Limite</Label>
              <Input type="date" value={form.data_limite} onChange={e => setForm(f => ({ ...f, data_limite: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Estado *</Label>
              <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_selecao">Em Seleção</SelectItem>
                  <SelectItem value="encerrada">Encerrada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.cargo || createVaga.isPending || updateVaga.isPending}>
              {vaga ? 'Guardar' : 'Criar Vaga'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
