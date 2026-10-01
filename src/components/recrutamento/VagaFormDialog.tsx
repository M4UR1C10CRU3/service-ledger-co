import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import { useVagas, type Vaga } from '@/hooks/useRecrutamento';
import { useRhFuncoes, type Funcao } from '@/hooks/useRhFuncoes';

const areasBase = ['Comercial', 'Obra', 'Administrativo', 'Operacional', 'Outro'];
const tiposContrato = ['Efetivo', 'Termo Certo', 'Termo Incerto', 'Estágio', 'Prestação de Serviços'];
const regimes = ['Presencial', 'Híbrido', 'Remoto'];
const OUTRA = '__outra__';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaga: Vaga | null;
}

const vazio = () => ({
  cargo: '', area: '', num_vagas: 1, tipo_contrato: '', regime: '', salario_base: '',
  descricao: '', requisitos_obrig: '', requisitos_pref: '',
  data_abertura: new Date().toISOString().split('T')[0], data_limite: '', estado: 'aberta',
});

const linhas = (v?: string[]) => (v ?? []).map(x => `• ${x}`).join('\n');

/**
 * O que a Função já define, pronto a usar na vaga. Escolher a função preenche
 * cargo, área, descrição (missão, responsabilidades, local e horário),
 * requisitos e competências. Tudo continua editável; contrato, regime,
 * salário e datas são da vaga e ficam por preencher.
 */
function preenchimentoDaFuncao(fn: Funcao) {
  const resp = fn.responsabilidades.flatMap(a => a.itens).slice(0, 8);
  const descricao = [
    fn.missao,
    resp.length ? `Principais responsabilidades:\n${linhas(resp)}` : '',
    [fn.localTrabalho && `Local: ${fn.localTrabalho}`, fn.horario && `Horário: ${fn.horario}`, fn.reportaA && `Reporta a: ${fn.reportaA}`]
      .filter(Boolean).join('\n'),
  ].filter(Boolean).join('\n\n');
  return {
    cargo: fn.nome,
    area: fn.departamento || '',
    descricao,
    requisitos_obrig: linhas(fn.requisitos?.obrigatorios),
    requisitos_pref: linhas(fn.requisitos?.valorizados),
    competencias: linhas([...(fn.competencias?.profissionais ?? []), ...(fn.competencias?.comportamentais ?? [])]),
  };
}

export function VagaFormDialog({ open, onOpenChange, vaga }: Props) {
  const { createVaga, updateVaga } = useVagas();
  const { funcoes } = useRhFuncoes();
  const [escolha, setEscolha] = useState<string>('');        // id da Função ou OUTRA
  const [competencias, setCompetencias] = useState('');
  const [form, setForm] = useState(vazio());

  // Funções agrupadas por departamento, para a lista ser fácil de percorrer.
  const porDepartamento = useMemo(() => {
    const g: Record<string, Funcao[]> = {};
    for (const f of funcoes) (g[f.departamento || 'Outras'] ||= []).push(f);
    return Object.entries(g);
  }, [funcoes]);
  const areas = useMemo(() => Array.from(new Set([...areasBase, ...funcoes.map(f => f.departamento).filter(Boolean) as string[], form.area].filter(Boolean))), [funcoes, form.area]);

  useEffect(() => {
    if (!open) return;
    if (vaga) {
      setForm({
        cargo: vaga.cargo, area: vaga.area || '', num_vagas: vaga.num_vagas,
        tipo_contrato: vaga.tipo_contrato || '', regime: vaga.regime || '',
        salario_base: vaga.salario_base?.toString() || '',
        descricao: vaga.descricao || '', requisitos_obrig: vaga.requisitos_obrig || '',
        requisitos_pref: vaga.requisitos_pref || '', data_abertura: vaga.data_abertura,
        data_limite: vaga.data_limite || '', estado: vaga.estado,
      });
      // Vagas antigas não guardavam a função: reconhece-se pelo nome do cargo.
      const fn = funcoes.find(f => f.id === vaga.funcao_id) ?? funcoes.find(f => f.nome === vaga.cargo);
      setEscolha(fn?.id ?? OUTRA);
      setCompetencias(vaga.competencias || '');
    } else {
      setForm(vazio());
      setEscolha('');
      setCompetencias('');
    }
  }, [vaga, open, funcoes.length]);

  const escolherFuncao = (id: string) => {
    setEscolha(id);
    if (id === OUTRA) { setForm(f => ({ ...f, cargo: '' })); return; }
    const fn = funcoes.find(x => x.id === id);
    if (!fn) return;
    const p = preenchimentoDaFuncao(fn);
    setForm(f => ({ ...f, cargo: p.cargo, area: p.area || f.area, descricao: p.descricao, requisitos_obrig: p.requisitos_obrig, requisitos_pref: p.requisitos_pref }));
    setCompetencias(p.competencias);
  };

  const funcaoId = escolha && escolha !== OUTRA ? escolha : null;

  const handleSubmit = () => {
    if (!form.cargo) return;
    const payload: any = {
      cargo: form.cargo, area: form.area || null, num_vagas: form.num_vagas,
      tipo_contrato: form.tipo_contrato || null, regime: form.regime || null,
      salario_base: form.salario_base ? parseFloat(form.salario_base.replace(',', '.')) : null,
      descricao: form.descricao || null, requisitos_obrig: form.requisitos_obrig || null,
      requisitos_pref: form.requisitos_pref || null, data_abertura: form.data_abertura,
      data_limite: form.data_limite || null, estado: form.estado,
      funcao_id: funcaoId, competencias: competencias.trim() || null,
    };
    if (vaga) updateVaga.mutate({ id: vaga.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    else createVaga.mutate(payload, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vaga ? 'Editar vaga' : 'Nova vaga'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vaga-funcao">Função *</Label>
            <Select value={escolha} onValueChange={escolherFuncao}>
              <SelectTrigger id="vaga-funcao"><SelectValue placeholder="Escolher a função" /></SelectTrigger>
              <SelectContent>
                {porDepartamento.map(([dep, fs]) => (
                  <SelectGroup key={dep}>
                    <SelectLabel>{dep}</SelectLabel>
                    {fs.map(fn => <SelectItem key={fn.id} value={fn.id}>{fn.nome}</SelectItem>)}
                  </SelectGroup>
                ))}
                <SelectItem value={OUTRA}>Outra função (escrever)</SelectItem>
              </SelectContent>
            </Select>
            {funcaoId ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> Descrição, requisitos e competências preenchidos a partir da função. Ajuste o que for preciso para esta vaga.</p>
            ) : escolha === OUTRA ? (
              <Input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Nome do cargo" />
            ) : (
              <p className="text-xs text-muted-foreground">Ao escolher a função, o resto do formulário é preenchido com o que já está definido para ela.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área / departamento</Label>
              <Select value={form.area} onValueChange={v => setForm(f => ({ ...f, area: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vaga-num">N.º de vagas</Label>
              <Input id="vaga-num" type="number" min={1} value={form.num_vagas} onChange={e => setForm(f => ({ ...f, num_vagas: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de contrato</Label>
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
              <Label htmlFor="vaga-sal">Salário base (€)</Label>
              <Input id="vaga-sal" inputMode="decimal" value={form.salario_base} onChange={e => setForm(f => ({ ...f, salario_base: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vaga-desc">Descrição da vaga</Label>
            <Textarea id="vaga-desc" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vaga-obr">Requisitos obrigatórios</Label>
            <Textarea id="vaga-obr" value={form.requisitos_obrig} onChange={e => setForm(f => ({ ...f, requisitos_obrig: e.target.value }))} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vaga-pref">Requisitos valorizados</Label>
            <Textarea id="vaga-pref" value={form.requisitos_pref} onChange={e => setForm(f => ({ ...f, requisitos_pref: e.target.value }))} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vaga-comp">Competências procuradas</Label>
            <Textarea id="vaga-comp" value={competencias} onChange={e => setCompetencias(e.target.value)} rows={3} placeholder="Ex.: atenção ao pormenor, boa comunicação com o cliente…" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vaga-ab">Data de abertura *</Label>
              <Input id="vaga-ab" type="date" value={form.data_abertura} onChange={e => setForm(f => ({ ...f, data_abertura: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vaga-lim">Data limite</Label>
              <Input id="vaga-lim" type="date" value={form.data_limite} onChange={e => setForm(f => ({ ...f, data_limite: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Estado *</Label>
              <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_selecao">Em seleção</SelectItem>
                  <SelectItem value="encerrada">Encerrada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.cargo || createVaga.isPending || updateVaga.isPending}>
              {vaga ? 'Guardar' : 'Criar vaga'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
