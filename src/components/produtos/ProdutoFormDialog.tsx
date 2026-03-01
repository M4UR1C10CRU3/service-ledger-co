import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Produto, ProdutoInput } from '@/hooks/useProdutos';

const UNIDADES = ['un', 'm²', 'm', 'ml', 'lt', 'kg', 'cx', 'par', 'rolo'];

const CATEGORIAS = [
  '01 CONTRUÇAO', '02A ELETRICA', '02B CANALIZACAO', '02C CLIMATIZACAO',
  '02D TUB INOX FUMOS', '03 CERÂMICOS', '04 MADEIRAS', '05 CASA DE BANHO',
  '06 PINTURAS', '07 COZINHAS', '08 ELETRODOMESTICOS', '09 ARTIGOS PARA O LAR',
  '010 JARDIM', '011 FERRAMENTAS', '012 FERRAGENS', '013 QUARTO',
  '014 SALA', '015 ESCRITÓRIO', '016 MATERIAL HOSPITALAR',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto?: Produto | null;
  onSave: (input: ProdutoInput) => Promise<boolean>;
  existingCategories: string[];
}

export function ProdutoFormDialog({ open, onOpenChange, produto, onSave, existingCategories }: Props) {
  const [refInterna, setRefInterna] = useState('');
  const [refFornecedor, setRefFornecedor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [unidade, setUnidade] = useState('');
  const [customUnidade, setCustomUnidade] = useState('');
  const [customCategoria, setCustomCategoria] = useState('');
  const [showCustomCategoria, setShowCustomCategoria] = useState(false);
  const [showCustomUnidade, setShowCustomUnidade] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditing = !!produto;

  // Merge default categories with existing DB categories
  const allCategories = Array.from(new Set([...CATEGORIAS, ...existingCategories])).sort();

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
      }
    }
  }, [open, produto]);

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
    });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
          <div className="space-y-2">
            <Label>Categoria *</Label>
            {showCustomCategoria ? (
              <div className="flex gap-2">
                <Input value={customCategoria} onChange={e => setCustomCategoria(e.target.value)} placeholder="Nova categoria" className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => setShowCustomCategoria(false)}>Cancelar</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={categoria} onValueChange={v => { if (v === '__new') { setShowCustomCategoria(true); } else { setCategoria(v); } }}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="__new">+ Nova Categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
