import { useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import {
  AccountPayableFormData,
  TIPO_LANCAMENTO_LABELS,
  CATEGORIAS_POR_TIPO,
  METODOS_PAGAMENTO,
} from '@/types/accountPayable';
import { Supplier } from '@/types/supplier';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: AccountPayableFormData;
  setFormData: (data: AccountPayableFormData) => void;
  onSubmit: () => void;
  isEditing: boolean;
  suppliers: Supplier[];
}

export function AccountPayableFormDialog({
  open, onOpenChange, formData, setFormData, onSubmit, isEditing, suppliers,
}: Props) {
  const update = (partial: Partial<AccountPayableFormData>) => {
    const next = { ...formData, ...partial };
    // Reset categoria when tipo changes
    if (partial.tipoLancamento && partial.tipoLancamento !== formData.tipoLancamento) {
      next.categoria = '';
    }
    setFormData(next);
  };

  const categorias = CATEGORIAS_POR_TIPO[formData.tipoLancamento] || [];

  const valorLiquido = useMemo(() => {
    const bruto = parseFloat(formData.valorBruto) || 0;
    const desc = parseFloat(formData.desconto) || 0;
    const acr = parseFloat(formData.acrescimo) || 0;
    return bruto - desc + acr;
  }, [formData.valorBruto, formData.desconto, formData.acrescimo]);

  const activeSuppliers = suppliers.filter(s => s.status === 'ativo');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Seção 1 - Informações Básicas */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações Básicas</h3>

          {/* Fornecedor */}
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

          {/* Tipo de Lançamento */}
          <div className="space-y-2">
            <Label>Tipo de Lançamento *</Label>
            <RadioGroup
              value={formData.tipoLancamento}
              onValueChange={(v) => update({ tipoLancamento: v as any })}
              className="flex flex-wrap gap-4"
            >
              {Object.entries(TIPO_LANCAMENTO_LABELS).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <RadioGroupItem value={k} id={`tipo-${k}`} />
                  <Label htmlFor={`tipo-${k}`} className="font-normal">{v}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Categoria + Descrição */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={formData.categoria} onValueChange={(v) => update({ categoria: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categorias.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nº Documento</Label>
              <Input value={formData.numeroDocumento} onChange={(e) => update({ numeroDocumento: e.target.value })} placeholder="NF, recibo, etc." />
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

          {/* Seção 2 - Valores */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Valores</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Valor Bruto *</Label>
              <Input type="number" step="0.01" min="0" value={formData.valorBruto} onChange={(e) => update({ valorBruto: e.target.value })} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Desconto</Label>
              <Input type="number" step="0.01" min="0" value={formData.desconto} onChange={(e) => update({ desconto: e.target.value })} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Acréscimo</Label>
              <Input type="number" step="0.01" min="0" value={formData.acrescimo} onChange={(e) => update({ acrescimo: e.target.value })} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Valor Líquido</Label>
              <Input readOnly value={valorLiquido.toFixed(2)} className="bg-muted font-mono" />
            </div>
          </div>

          <Separator />

          {/* Seção 3 - Pagamento */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pagamento</h3>

          <div className="space-y-2">
            <Label>Forma de Pagamento *</Label>
            <RadioGroup
              value={formData.formaPagamento}
              onValueChange={(v) => update({ formaPagamento: v as any })}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="a_vista" id="fp-vista" />
                <Label htmlFor="fp-vista" className="font-normal">À Vista</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="a_prazo" id="fp-prazo" />
                <Label htmlFor="fp-prazo" className="font-normal">A Prazo</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.formaPagamento === 'a_vista' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Método *</Label>
                <Select value={formData.metodoPagamento} onValueChange={(v) => update({ metodoPagamento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGAMENTO.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-w-xs">
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

          <Separator />

          {/* Seção 4 - Extras */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Extras</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <Input value={formData.centroCusto} onChange={(e) => update({ centroCusto: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Input value={formData.projeto} onChange={(e) => update({ projeto: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={formData.observacoes} onChange={(e) => update({ observacoes: e.target.value })} rows={3} />
          </div>

          {formData.tipoLancamento === 'compra' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="vincular-estoque"
                checked={formData.vincularEstoque}
                onCheckedChange={(c) => update({ vincularEstoque: !!c })}
              />
              <Label htmlFor="vincular-estoque" className="font-normal">Vincular ao estoque</Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit}>{isEditing ? 'Salvar' : 'Cadastrar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
