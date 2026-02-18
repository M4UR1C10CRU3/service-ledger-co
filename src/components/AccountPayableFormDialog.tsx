import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Search } from 'lucide-react';
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
  CATEGORIAS,
  IVA_OPTIONS,
  METODOS_PAGAMENTO,
} from '@/types/accountPayable';
import { Supplier } from '@/types/supplier';
import { CostCenter } from '@/hooks/useCostCenters';
import { Article } from '@/hooks/useArticles';

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
  onAddCostCenter?: (name: string) => Promise<boolean>;
}

export function AccountPayableFormDialog({
  open, onOpenChange, formData, setFormData, onSubmit, isEditing, suppliers, costCenters, articles, onAddCostCenter,
}: Props) {
  const [articleSearch, setArticleSearch] = useState('');
  const [showArticleResults, setShowArticleResults] = useState(false);
  const [newCCName, setNewCCName] = useState('');
  const [showNewCC, setShowNewCC] = useState(false);
  const [isAddingCC, setIsAddingCC] = useState(false);

  const update = (partial: Partial<AccountPayableFormData>) => {
    setFormData({ ...formData, ...partial });
  };

  // IVA calculation
  const ivaCalc = useMemo(() => {
    const bruto = parseFloat(formData.valorBruto) || 0;
    const rate = parseFloat(formData.ivaRate) || 0;
    const ivaValue = bruto * (rate / 100);
    const total = bruto + ivaValue;
    return { ivaValue, total };
  }, [formData.valorBruto, formData.ivaRate]);

  const activeSuppliers = suppliers.filter(s => s.status === 'ativo');

  // Article autocomplete
  const filteredArticles = useMemo(() => {
    if (!articles || !articleSearch.trim()) return [];
    const q = articleSearch.toLowerCase();
    return articles.filter(a =>
      a.referenceCode.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [articles, articleSearch]);

  const selectedArticle = useMemo(() => {
    if (!articles || !formData.articleId) return null;
    return articles.find(a => a.id === formData.articleId) || null;
  }, [articles, formData.articleId]);

  const handleSelectArticle = (article: Article) => {
    update({
      articleId: article.id,
      descricao: article.description,
      supplierId: article.supplierId || formData.supplierId,
    });
    setArticleSearch(article.referenceCode + ' - ' + article.description);
    setShowArticleResults(false);
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

  const isCompra = formData.tipoLancamento === 'compra_revenda';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Compra/Despesa' : 'Nova Compra/Despesa'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* TIPO DE LANÇAMENTO */}
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

          {/* ARTIGO FIELDS (only for compra_revenda) */}
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
                        key={a.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        onClick={() => handleSelectArticle(a)}
                      >
                        <span className="font-medium">{a.referenceCode}</span> — {a.description}
                        <span className="text-xs text-muted-foreground ml-2">(Stock: {a.currentStock})</span>
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

          <div className="space-y-2">
            <Label>Fornecedor *</Label>
            <Select value={formData.supplierId} onValueChange={(v) => update({ supplierId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger>
              <SelectContent>
                {activeSuppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.razaoSocial}{s.nomeFantasia ? ` (${s.nomeFantasia})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <Calendar mode="single" selected={formData.dataEmissao} onSelect={(d) => d && update({ dataEmissao: d })} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* VALORES */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Valores</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Valor Ilíquido *</Label>
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
              <Input readOnly value={ivaCalc.ivaValue.toFixed(2)} className="bg-muted font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Valor Líquido (Total)</Label>
              <Input readOnly value={ivaCalc.total.toFixed(2)} className="bg-muted font-mono font-bold" />
            </div>
          </div>

          <Separator />

          {/* PAGAMENTO */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pagamento</h3>

          <div className="space-y-2">
            <Label>Condição de Pagamento *</Label>
            <RadioGroup
              value={formData.formaPagamento}
              onValueChange={(v) => update({ formaPagamento: v as any })}
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
  );
}
