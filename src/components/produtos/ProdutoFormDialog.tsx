import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { Produto, ProdutoInput } from '@/hooks/useProdutos';

const UNIDADES = ['un', 'm²', 'm', 'ml', 'lt', 'kg', 'cx', 'par', 'rolo'];

const CATEGORIAS = [
  '01 CONTRUÇAO', '02A ELETRICA', '02B CANALIZACAO', '02C CLIMATIZACAO',
  '02D TUB INOX FUMOS', '03 CERÂMICOS', '04 MADEIRAS', '05 CASA DE BANHO',
  '06 PINTURAS', '07 COZINHAS', '08 ELETRODOMESTICOS', '09 ARTIGOS PARA O LAR',
  '010 JARDIM', '011 FERRAMENTAS', '012 FERRAGENS', '013 QUARTO',
  '014 SALA', '015 ESCRITÓRIO', '016 MATERIAL HOSPITALAR',
];

const IVA_OPTIONS = [0, 6, 13, 23];

const NONE = '__none';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto?: Produto | null;
  onSave: (input: ProdutoInput) => Promise<boolean>;
  existingCategories: string[];
}

export function ProdutoFormDialog({ open, onOpenChange, produto, onSave, existingCategories }: Props) {
  const { suppliers, isLoading: loadingSuppliers } = useSuppliers();

  const [refInterna, setRefInterna] = useState('');
  const [refFornecedor, setRefFornecedor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [unidade, setUnidade] = useState('');
  const [customUnidade, setCustomUnidade] = useState('');
  const [customCategoria, setCustomCategoria] = useState('');
  const [showCustomCategoria, setShowCustomCategoria] = useState(false);
  const [showCustomUnidade, setShowCustomUnidade] = useState(false);
  const [fornecedor1, setFornecedor1] = useState<string>(NONE);
  const [fornecedor2, setFornecedor2] = useState<string>(NONE);
  const [fornecedor3, setFornecedor3] = useState<string>(NONE);
  const [precoCusto, setPrecoCusto] = useState<string>('0');
  const [ivaCusto, setIvaCusto] = useState<string>('23');
  const [margem, setMargem] = useState<string>('30');
  const [saving, setSaving] = useState(false);

  const isEditing = !!produto;
  const allCategories = Array.from(new Set([...CATEGORIAS, ...existingCategories])).sort();
  const activeSuppliers = useMemo(
    () => suppliers.filter(s => s.status === 'ativo' && !s.deletedAt),
    [suppliers]
  );

  useEffect(() => {
    if (open) {
      if (produto) {
        setRefInterna(produto.refInterna);
        setRefFornecedor(produto.refFornecedor || '');
        setDescricao(produto.descricao);
        setCategoria(produto.categoria);
        const isStdUnidade = UNIDADES.includes(produto.unidade || '');
        if (produto.unidade && !isStdUnidade) {
          setShowCustomUnidade(true);
          setCustomUnidade(produto.unidade);
          setUnidade('__custom');
        } else {
          setUnidade(produto.unidade || '');
          setShowCustomUnidade(false);
          setCustomUnidade('');
        }
        setShowCustomCategoria(false);
        setCustomCategoria('');
        setFornecedor1(produto.fornecedor1Id || NONE);
        setFornecedor2(produto.fornecedor2Id || NONE);
        setFornecedor3(produto.fornecedor3Id || NONE);
        setPrecoCusto(String(produto.precoCusto ?? 0));
        setIvaCusto(String(produto.ivaCusto ?? 23));
        setMargem(String(produto.margem ?? 30));
      } else {
        setRefInterna('');
        setRefFornecedor('');
        setDescricao('');
        setCategoria('');
        setUnidade('');
        setCustomUnidade('');
        setCustomCategoria('');
        setShowCustomCategoria(false);
        setShowCustomUnidade(false);
        setFornecedor1(NONE);
        setFornecedor2(NONE);
        setFornecedor3(NONE);
        setPrecoCusto('0');
        setIvaCusto('23');
        setMargem('30');
      }
    }
  }, [open, produto]);

  const custoNum = parseFloat(precoCusto.replace(',', '.')) || 0;
  const ivaNum = parseFloat(ivaCusto.replace(',', '.')) || 0;
  const margemNum = parseFloat(margem.replace(',', '.')) || 0;
  const custoComIva = custoNum * (1 + ivaNum / 100);
  const precoVenda = custoComIva * (1 + margemNum / 100);

  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);

  const handleSave = async () => {
    if (!refInterna.trim() || !descricao.trim()) return;
    const finalCategoria = showCustomCategoria ? customCategoria.trim() : categoria;
    if (!finalCategoria) return;
    const finalUnidade = showCustomUnidade ? customUnidade.trim() : (unidade === '__custom' ? '' : unidade);

    setSaving(true);
    const ok = await onSave({
      refInterna: refInterna.trim(),
      refFornecedor: refFornecedor.trim() || null,
      descricao: descricao.trim(),
      categoria: finalCategoria,
      unidade: finalUnidade || null,
      fornecedor1Id: fornecedor1 === NONE ? null : fornecedor1,
      fornecedor2Id: fornecedor2 === NONE ? null : fornecedor2,
      fornecedor3Id: fornecedor3 === NONE ? null : fornecedor3,
      precoCusto: custoNum,
      ivaCusto: ivaNum,
      margem: margemNum,
    });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  const renderFornecedorSelect = (
    value: string,
    onChange: (v: string) => void,
    excludeIds: string[],
  ) => {
    const available = activeSuppliers.filter(s => !excludeIds.includes(s.id) || s.id === value);
    const selected = activeSuppliers.find(s => s.id === value);
    const label = selected ? (selected.razaoSocial || selected.nomeFantasia) : '— Nenhum —';
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className={cn(!selected && 'text-muted-foreground')}>{label}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Pesquisar fornecedor..." />
            <CommandList>
              <CommandEmpty>
                {loadingSuppliers ? 'A carregar...' : 'Nenhum fornecedor encontrado.'}
              </CommandEmpty>
              <CommandGroup>
                <CommandItem value="__none" onSelect={() => onChange(NONE)}>
                  <Check className={cn('mr-2 h-4 w-4', value === NONE ? 'opacity-100' : 'opacity-0')} />
                  — Nenhum —
                </CommandItem>
                {available.map(s => {
                  const name = s.razaoSocial || s.nomeFantasia;
                  return (
                    <CommandItem key={s.id} value={`${name} ${s.cnpjCpf || ''}`} onSelect={() => onChange(s.id)}>
                      <Check className={cn('mr-2 h-4 w-4', value === s.id ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex flex-col">
                        <span>{name}</span>
                        {s.cnpjCpf && <span className="text-xs text-muted-foreground">NIF: {s.cnpjCpf}</span>}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Referência Interna *</Label>
              <Input value={refInterna} onChange={e => setRefInterna(e.target.value)} placeholder="Ex: 100001" disabled={isEditing} />
            </div>
            <div className="space-y-2">
              <Label>Referência Fornecedor</Label>
              <Input value={refFornecedor} onChange={e => setRefFornecedor(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição do produto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              {showCustomCategoria ? (
                <div className="flex gap-2">
                  <Input value={customCategoria} onChange={e => setCustomCategoria(e.target.value)} placeholder="Nova categoria" className="flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => setShowCustomCategoria(false)}>Cancelar</Button>
                </div>
              ) : (
                <Select value={categoria} onValueChange={v => { if (v === '__new') { setShowCustomCategoria(true); } else { setCategoria(v); } }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="__new">+ Nova Categoria</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              {showCustomUnidade ? (
                <div className="flex gap-2">
                  <Input value={customUnidade} onChange={e => setCustomUnidade(e.target.value)} placeholder="Ex: saco" className="flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => { setShowCustomUnidade(false); setUnidade(''); }}>Cancelar</Button>
                </div>
              ) : (
                <Select value={unidade} onValueChange={v => { if (v === '__custom') { setShowCustomUnidade(true); } else { setUnidade(v); } }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar unidade" /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    <SelectItem value="__custom">Outra...</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Fornecedores prováveis (até 3)</h3>
            <p className="text-xs text-muted-foreground">
              {loadingSuppliers
                ? 'A carregar fornecedores...'
                : `${activeSuppliers.length} fornecedor(es) ativo(s) disponível(eis) — usado para mapa comparativo.`}
            </p>
            <div className="space-y-2">
              <Label>Fornecedor 1</Label>
              {renderFornecedorSelect(fornecedor1, setFornecedor1, [fornecedor2, fornecedor3])}
            </div>
            <div className="space-y-2">
              <Label>Fornecedor 2</Label>
              {renderFornecedorSelect(fornecedor2, setFornecedor2, [fornecedor1, fornecedor3])}
            </div>
            <div className="space-y-2">
              <Label>Fornecedor 3</Label>
              {renderFornecedorSelect(fornecedor3, setFornecedor3, [fornecedor1, fornecedor2])}
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Custo e formação de preço</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Preço de custo (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precoCusto}
                  onChange={e => setPrecoCusto(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>IVA sobre custo (%)</Label>
                <Select value={ivaCusto} onValueChange={setIvaCusto}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IVA_OPTIONS.map(i => (
                      <SelectItem key={i} value={String(i)}>{i}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Margem (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={margem}
                  onChange={e => setMargem(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-md bg-muted/40 p-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Custo s/ IVA</p>
                <p className="font-medium">{fmt(custoNum)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo c/ IVA</p>
                <p className="font-medium">{fmt(custoComIva)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PVP (Preço de Venda)</p>
                <p className="font-semibold text-primary text-base">{fmt(precoVenda)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  = Custo × (1 + IVA%) × (1 + Margem%)
                </p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !refInterna.trim() || !descricao.trim()}>
            {saving ? 'Guardando...' : (isEditing ? 'Guardar' : 'Criar Produto')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
