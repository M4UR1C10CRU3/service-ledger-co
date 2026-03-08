import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Search, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import {
  AccountPayableFormData,
  AccountPayableItem,
  CATEGORIAS,
  IVA_OPTIONS,
  METODOS_PAGAMENTO,
} from '@/types/accountPayable';
import { Supplier, SupplierFormData, emptySupplierForm } from '@/types/supplier';
import { SupplierFormDialog } from '@/components/SupplierFormDialog';
import { CostCenter } from '@/hooks/useCostCenters';
import { Article } from '@/hooks/useArticles';
import { Produto } from '@/hooks/useProdutos';
import { useToast } from '@/hooks/use-toast';

/** Per-line article search + fields */
function LineItemRow({ item, idx, lineIva, lineTotal, isCompra, articles, produtos, onUpdate, onRemove, ivaIncluido }: {
  item: AccountPayableItem; idx: number; lineIva: number; lineTotal: number;
  isCompra: boolean; articles?: Article[]; produtos?: Produto[];
  onUpdate: (partial: Partial<AccountPayableItem>) => void; onRemove: () => void;
  ivaIncluido: boolean;
}) {
  const [lineSearch, setLineSearch] = useState('');
  const [showResults, setShowResults] = useState(false);

  const searchResults = useMemo(() => {
    if (!lineSearch.trim() || !isCompra) return [];
    const q = lineSearch.toLowerCase();
    const results: { ref: string; desc: string }[] = [];
    if (articles) {
      for (const a of articles) {
        if (a.referenceCode.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
          results.push({ ref: a.referenceCode, desc: a.description });
      }
    }
    if (produtos) {
      for (const p of produtos) {
        if (!results.some(r => r.ref === p.refInterna) && (p.refInterna.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q)))
          results.push({ ref: p.refInterna, desc: p.descricao });
      }
    }
    return results.slice(0, 10);
  }, [lineSearch, articles, produtos, isCompra]);

  return (
    <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Linha {idx + 1}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      {isCompra && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={lineSearch || (item.produtoRef ? item.produtoRef + ' - ' + item.descricao : '')}
              onChange={e => { setLineSearch(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              placeholder="Pesquisar artigo por ref. ou descrição..."
              className="pl-9 text-xs"
            />
          </div>
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
              {searchResults.map(r => (
                <button key={r.ref} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  onClick={() => { onUpdate({ produtoRef: r.ref, descricao: r.desc }); setLineSearch(''); setShowResults(false); }}>
                  <span className="font-medium">{r.ref}</span> — {r.desc}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <Input value={item.descricao} onChange={e => onUpdate({ descricao: e.target.value })} placeholder="Descrição do item" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Qtd.</Label>
          <Input type="number" step="1" min="1" value={item.quantidade} onChange={e => onUpdate({ quantidade: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{ivaIncluido ? 'Valor c/ IVA *' : 'Valor Unit. *'}</Label>
          <Input type="number" step="0.01" min="0" value={item.valorBruto} onChange={e => onUpdate({ valorBruto: e.target.value })} placeholder="0,00" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">IVA</Label>
          <Select value={item.ivaRate} onValueChange={v => onUpdate({ ivaRate: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {IVA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">IVA (€)</Label>
          <Input readOnly value={lineIva.toFixed(2)} className="bg-muted" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{ivaIncluido ? 'Valor Ilíq.' : 'Subtotal'}</Label>
          <Input readOnly value={lineTotal.toFixed(2)} className="bg-muted font-semibold" />
        </div>
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: AccountPayableFormData;
  setFormData: (data: AccountPayableFormData) => void;
  onSubmit: () => void;
  isEditing: boolean;
  suppliers: Supplier[];
  costCenters?: CostCenter[];
  articles?: Article[];
  produtos?: Produto[];
  onAddCostCenter?: (name: string) => Promise<boolean>;
  onAddSupplier?: (form: SupplierFormData) => Promise<Supplier | null>;
  /** When set, hides the radio buttons and locks the form to one mode */
  mode?: 'compra' | 'despesa';
}

export function AccountPayableFormDialog({
  open, onOpenChange, formData, setFormData, onSubmit, isEditing, suppliers, costCenters, articles, produtos, onAddCostCenter, onAddSupplier, mode,
}: Props) {
  const { toast } = useToast();
  const [articleSearch, setArticleSearch] = useState('');
  const [showArticleResults, setShowArticleResults] = useState(false);
  const [newCCName, setNewCCName] = useState('');
  const [showNewCC, setShowNewCC] = useState(false);
  const [isAddingCC, setIsAddingCC] = useState(false);
  const [ivaIncluido, setIvaIncluido] = useState(false);

  // Inline supplier creation
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState<SupplierFormData>({ ...emptySupplierForm });

  const update = (partial: Partial<AccountPayableFormData>) => {
    setFormData({ ...formData, ...partial });
  };

  // IVA calculation (single-line mode)
  const ivaCalc = useMemo(() => {
    const inputVal = parseFloat(formData.valorBruto) || 0;
    const rate = parseFloat(formData.ivaRate) || 0;
    if (ivaIncluido) {
      // User entered total (with IVA) — reverse calc
      const bruto = rate > 0 ? inputVal / (1 + rate / 100) : inputVal;
      const ivaValue = inputVal - bruto;
      return { ivaValue, total: inputVal, bruto };
    }
    // Normal: user entered valor ilíquido
    const ivaValue = inputVal * (rate / 100);
    const total = inputVal + ivaValue;
    return { ivaValue, total, bruto: inputVal };
  }, [formData.valorBruto, formData.ivaRate, ivaIncluido]);

  // Multi-line items totals
  const itemsTotals = useMemo(() => {
    const items = formData.items || [];
    if (items.length === 0) return null;
    let totalBruto = 0;
    let totalIva = 0;
    for (const item of items) {
      const qty = parseFloat(item.quantidade) || 1;
      const val = parseFloat(item.valorBruto) || 0;
      const rate = parseFloat(item.ivaRate) || 0;
      if (ivaIncluido) {
        const lineTotal = val * qty;
        const lineBruto = rate > 0 ? lineTotal / (1 + rate / 100) : lineTotal;
        totalBruto += lineBruto;
        totalIva += lineTotal - lineBruto;
      } else {
        const lineBruto = val * qty;
        totalBruto += lineBruto;
        totalIva += lineBruto * (rate / 100);
      }
    }
    return { totalBruto, totalIva, total: totalBruto + totalIva };
  }, [formData.items, ivaIncluido]);

  // Reverse calculation: from total to valor ilíquido
  const handleTotalChange = (totalStr: string) => {
    const total = parseFloat(totalStr) || 0;
    const rate = parseFloat(formData.ivaRate) || 0;
    const bruto = rate > 0 ? total / (1 + rate / 100) : total;
    update({ valorBruto: bruto > 0 ? bruto.toFixed(2) : '' });
  };

  const hasItems = (formData.items || []).length > 0;

  const addItem = () => {
    const newItem: AccountPayableItem = {
      id: crypto.randomUUID(),
      descricao: '',
      quantidade: '1',
      valorBruto: '',
      ivaRate: '23',
      produtoRef: '',
    };
    update({ items: [...(formData.items || []), newItem] });
  };

  const updateItem = (id: string, partial: Partial<AccountPayableItem>) => {
    const items = (formData.items || []).map(item =>
      item.id === id ? { ...item, ...partial } : item
    );
    update({ items });
  };

  const removeItem = (id: string) => {
    const items = (formData.items || []).filter(item => item.id !== id);
    update({ items });
  };

  const activeSuppliers = suppliers.filter(s => s.status === 'ativo');

  // Article autocomplete - search both articles and produtos
  const filteredArticles = useMemo(() => {
    if (!articleSearch.trim()) return [];
    const q = articleSearch.toLowerCase();
    const results: { id: string; referenceCode: string; description: string; supplierId: string | null; currentStock?: number; source: 'article' | 'produto' }[] = [];
    
    // Search in articles table
    if (articles) {
      for (const a of articles) {
        if (a.referenceCode.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)) {
          results.push({ id: a.id, referenceCode: a.referenceCode, description: a.description, supplierId: a.supplierId, currentStock: a.currentStock, source: 'article' });
        }
      }
    }
    
    // Search in produtos table
    if (produtos) {
      for (const p of produtos) {
        if (p.refInterna.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q) || (p.refFornecedor || '').toLowerCase().includes(q)) {
          // Avoid duplicates if same ref exists in articles
          if (!results.some(r => r.referenceCode === p.refInterna)) {
            results.push({ id: p.id, referenceCode: p.refInterna, description: p.descricao, supplierId: null, source: 'produto' });
          }
        }
      }
    }
    
    return results.slice(0, 15);
  }, [articles, produtos, articleSearch]);

  const handleSelectArticle = (item: typeof filteredArticles[number]) => {
    const qty = formData.quantity || '1';
    update({
      articleId: item.source === 'article' ? item.id : '',
      descricao: item.description,
      supplierId: item.supplierId || formData.supplierId,
    });
    setArticleSearch(item.referenceCode + ' - ' + item.description);
    setShowArticleResults(false);

    // Auto-fill first line item if in compra mode
    if (isCompra) {
      const existingItems = formData.items || [];
      if (existingItems.length === 0) {
        // Create first line with article data
        const newItem: AccountPayableItem = {
          id: crypto.randomUUID(),
          descricao: item.description,
          quantidade: qty,
          valorBruto: '',
          ivaRate: '23',
          produtoRef: item.referenceCode,
        };
        update({
          articleId: item.source === 'article' ? item.id : '',
          descricao: item.description,
          supplierId: item.supplierId || formData.supplierId,
          items: [newItem],
        });
      } else {
        // Update first line's description if it's still empty
        const first = existingItems[0];
        if (!first.descricao) {
          const updated = [...existingItems];
          updated[0] = { ...first, descricao: item.description, quantidade: qty, produtoRef: item.referenceCode };
          update({
            articleId: item.source === 'article' ? item.id : '',
            descricao: item.description,
            supplierId: item.supplierId || formData.supplierId,
            items: updated,
          });
        }
      }
    }
  };

  const handleAddCostCenter = async () => {
    if (!newCCName.trim() || !onAddCostCenter) return;
    setIsAddingCC(true);
    const ok = await onAddCostCenter(newCCName.trim());
    setIsAddingCC(false);
    if (ok) {
      setNewCCName('');
      setShowNewCC(false);
    }
  };

  const handleSupplierSubmit = async () => {
    if (!supplierFormData.razaoSocial.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }
    if (!supplierFormData.cnpjCpf.trim()) {
      toast({ title: 'Erro', description: 'NIF é obrigatório.', variant: 'destructive' });
      return;
    }
    if (!onAddSupplier) return;
    const newSupplier = await onAddSupplier(supplierFormData);
    if (newSupplier) {
      toast({ title: 'Fornecedor guardado', description: 'Fornecedor criado com sucesso.' });
      update({ supplierId: newSupplier.id });
      setShowSupplierForm(false);
      setSupplierFormData({ ...emptySupplierForm });
    } else {
      toast({ title: 'Erro', description: 'Não foi possível guardar o fornecedor.', variant: 'destructive' });
    }
  };

  const isCompra = formData.tipoLancamento === 'compra_revenda';

  const dialogTitle = mode === 'compra'
    ? (isEditing ? 'Editar Compra' : 'Nova Compra')
    : mode === 'despesa'
      ? (isEditing ? 'Editar Despesa' : 'Nova Despesa')
      : (isEditing ? 'Editar Compra/Despesa' : 'Nova Compra/Despesa');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* TIPO DE LANÇAMENTO — only show radio when no mode is set */}
            {!mode && (
              <div className="space-y-2">
                <Label className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Tipo de Lançamento *</Label>
                <RadioGroup
                  value={formData.tipoLancamento}
                  onValueChange={(v) => update({ tipoLancamento: v as any, articleId: '', quantity: '' })}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="compra_revenda" id="tipo-compra" />
                    <Label htmlFor="tipo-compra" className="font-normal">Compra de Artigos para Revenda</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="despesa" id="tipo-despesa" />
                    <Label htmlFor="tipo-despesa" className="font-normal">Despesa</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* ARTIGO FIELDS */}
            {isCompra && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-border bg-muted/30">
                <div className="space-y-2 relative">
                  <Label>Referência/Código do Artigo</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={articleSearch}
                      onChange={(e) => {
                        setArticleSearch(e.target.value);
                        setShowArticleResults(true);
                        if (!e.target.value) update({ articleId: '' });
                      }}
                      onFocus={() => setShowArticleResults(true)}
                      placeholder="Pesquisar artigo..."
                      className="pl-9"
                    />
                  </div>
                  {showArticleResults && filteredArticles.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredArticles.map(a => (
                        <button
                          key={`${a.source}-${a.id}`}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                          onClick={() => handleSelectArticle(a)}
                        >
                          <span className="font-medium">{a.referenceCode}</span> — {a.description}
                          {a.currentStock !== undefined && (
                            <span className="text-xs text-muted-foreground ml-2">(Stock: {a.currentStock})</span>
                          )}
                          {a.source === 'produto' && (
                            <span className="text-xs ml-2 px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Produto</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.quantity}
                    onChange={(e) => update({ quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* INFORMAÇÕES BÁSICAS */}
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações Básicas</h3>

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label>Fornecedor *</Label>
                <Select value={formData.supplierId} onValueChange={(v) => update({ supplierId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger>
                  <SelectContent>
                    {activeSuppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {onAddSupplier && (
                <Button type="button" variant="outline" size="sm" onClick={() => { setSupplierFormData({ ...emptySupplierForm }); setShowSupplierForm(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Fornecedor
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={formData.categoria} onValueChange={(v) => update({ categoria: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nº de Documento</Label>
                <Input value={formData.numeroDocumento} onChange={(e) => update({ numeroDocumento: e.target.value })} placeholder="NF, recibo, fatura, etc." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={formData.descricao} onChange={(e) => update({ descricao: e.target.value })} placeholder="Breve descrição" />
              </div>
              <div className="space-y-2">
                <Label>Data de Emissão *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.dataEmissao && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dataEmissao ? format(formData.dataEmissao, 'dd/MM/yyyy') : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formData.dataEmissao} onSelect={(d) => {
                      if (!d) return;
                      const updates: Partial<AccountPayableFormData> = { dataEmissao: d };
                      if (formData.formaPagamento !== 'a_credito') {
                        updates.dataPagamento = d;
                      }
                      update(updates);
                    }} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator />

            {/* VALORES */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Valores</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Linha
              </Button>
            </div>

            {/* IVA Incluído checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="iva-incluido"
                checked={ivaIncluido}
                onCheckedChange={(checked) => setIvaIncluido(checked === true)}
              />
              <Label htmlFor="iva-incluido" className="font-normal text-sm cursor-pointer">
                Valor já inclui IVA
              </Label>
            </div>

            {/* Single-line mode (when no items) */}
            {!hasItems && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{ivaIncluido ? 'Valor c/ IVA *' : 'Valor Ilíquido *'}</Label>
                  <Input type="number" step="0.01" min="0" value={formData.valorBruto} onChange={(e) => update({ valorBruto: e.target.value })} placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>IVA</Label>
                  <Select value={formData.ivaRate} onValueChange={(v) => update({ ivaRate: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IVA_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor do IVA</Label>
                  <Input readOnly value={ivaCalc.ivaValue.toFixed(2)} className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>{ivaIncluido ? 'Valor Ilíquido' : 'Valor Líquido (Total)'}</Label>
                  <Input
                    readOnly
                    value={ivaIncluido
                      ? (ivaCalc.bruto > 0 ? ivaCalc.bruto.toFixed(2) : '')
                      : (ivaCalc.total > 0 ? ivaCalc.total.toFixed(2) : '')}
                    placeholder="0,00"
                    className="bg-muted font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Multi-line items mode */}
            {hasItems && (
              <div className="space-y-3">
                {(formData.items || []).map((item, idx) => {
                  const qty = parseFloat(item.quantidade) || 1;
                  const val = parseFloat(item.valorBruto) || 0;
                  const rate = parseFloat(item.ivaRate) || 0;
                  let lineIva: number, lineTotal: number;
                  if (ivaIncluido) {
                    const gross = val * qty;
                    const bruto = rate > 0 ? gross / (1 + rate / 100) : gross;
                    lineIva = gross - bruto;
                    lineTotal = bruto; // show valor ilíquido
                  } else {
                    const lineBruto = val * qty;
                    lineIva = lineBruto * (rate / 100);
                    lineTotal = lineBruto + lineIva; // show subtotal
                  }
                  return (
                    <LineItemRow
                      key={item.id}
                      item={item}
                      idx={idx}
                      lineIva={lineIva}
                      lineTotal={lineTotal}
                      isCompra={isCompra}
                      articles={articles}
                      produtos={produtos}
                      onUpdate={(partial) => updateItem(item.id, partial)}
                      onRemove={() => removeItem(item.id)}
                      ivaIncluido={ivaIncluido}
                    />
                  );
                })}
                {/* Totals summary */}
                {itemsTotals && (
                  <div className="grid grid-cols-3 gap-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Total Ilíquido</Label>
                      <p className="text-sm font-semibold">{itemsTotals.totalBruto.toFixed(2)} €</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Total IVA</Label>
                      <p className="text-sm font-semibold">{itemsTotals.totalIva.toFixed(2)} €</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Total Geral</Label>
                      <p className="text-sm font-bold">{itemsTotals.total.toFixed(2)} €</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* PAGAMENTO */}
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pagamento</h3>

            <div className="space-y-2">
              <Label>Condição de Pagamento *</Label>
              <RadioGroup
                value={formData.formaPagamento}
                onValueChange={(v) => {
                  const updates: Partial<AccountPayableFormData> = { formaPagamento: v as any };
                  if (v !== 'a_credito') {
                    updates.dataPagamento = formData.dataEmissao;
                  }
                  update(updates);
                }}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="imediato" id="fp-imediato" />
                  <Label htmlFor="fp-imediato" className="font-normal">Imediato</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="a_credito" id="fp-credito" />
                  <Label htmlFor="fp-credito" className="font-normal">A Crédito</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select value={formData.metodoPagamento} onValueChange={(v) => update({ metodoPagamento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGAMENTO.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Pagamento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.dataPagamento, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formData.dataPagamento} onSelect={(d) => d && update({ dataPagamento: d })} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              {formData.formaPagamento === 'a_credito' && (
                <div className="space-y-2">
                  <Label>Data de Vencimento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.dataVencimento, 'dd/MM/yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={formData.dataVencimento} onSelect={(d) => d && update({ dataVencimento: d })} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <Separator />

            {/* CENTRO DE CUSTO */}
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Centro de Custo</h3>

            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label>Centro de Custo</Label>
                {costCenters && costCenters.length > 0 ? (
                  <Select value={formData.costCenterId} onValueChange={(v) => update({ costCenterId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {costCenters.map(cc => (
                        <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">Nenhum centro de custo disponível</p>
                )}
              </div>
              {onAddCostCenter && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewCC(!showNewCC)}>
                  <Plus className="w-4 h-4 mr-1" /> Novo
                </Button>
              )}
            </div>

            {showNewCC && onAddCostCenter && (
              <div className="flex items-end gap-2 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Nome do Centro de Custo</Label>
                  <Input
                    value={newCCName}
                    onChange={(e) => setNewCCName(e.target.value)}
                    placeholder="Ex: Administrativo"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCostCenter()}
                  />
                </div>
                <Button size="sm" onClick={handleAddCostCenter} disabled={isAddingCC || !newCCName.trim()}>
                  {isAddingCC ? 'A guardar...' : 'Guardar'}
                </Button>
              </div>
            )}

            <Separator />

            {/* OBSERVAÇÕES */}
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Observações</h3>
            <div className="space-y-2">
              <Textarea value={formData.observacoes} onChange={(e) => update({ observacoes: e.target.value })} rows={3} placeholder="Notas adicionais..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={onSubmit}>{isEditing ? 'Guardar' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Supplier Creation Dialog */}
      <SupplierFormDialog
        open={showSupplierForm}
        onOpenChange={(o) => { setShowSupplierForm(o); if (!o) setSupplierFormData({ ...emptySupplierForm }); }}
        formData={supplierFormData}
        setFormData={setSupplierFormData}
        onSubmit={handleSupplierSubmit}
        isEditing={false}
      />
    </>
  );
}
