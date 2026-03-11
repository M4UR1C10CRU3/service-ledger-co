import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { usePropostas } from '@/hooks/usePropostas';
import { useClientes } from '@/hooks/useClientes';
import { useProdutos } from '@/hooks/useProdutos';
import { useEmployees } from '@/hooks/useEmployees';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { formatEUR, formatNumber, parseFormattedNumber } from '@/lib/formatters';
import { exportPropostaPdf } from '@/components/propostas/propostaPdfExport';
import { exportPropostaExcel } from '@/components/propostas/propostaExcelExport';
import type { Proposta, PropostaLinhaForm, PropostaFormData, TipoLinha } from '@/types/proposta';
import {
  Save, Send, FileDown, FileSpreadsheet, X, Plus, GripVertical, Trash2, Search,
  Layers, Type, Calculator, AlignLeft, Copy,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: Proposta | null;
}

const emptyLinha = (ordem: number, tipo: TipoLinha = 'artigo'): PropostaLinhaForm => ({
  ordem,
  tipoLinha: tipo,
  referencia: '',
  designacao: '',
  quantidade: 1,
  unidade: 'und',
  precoUnitario: 0,
  descontoPct: 0,
  totalLinha: 0,
  produtoId: null,
});

export function PropostaFormDialog({ open, onOpenChange, proposta }: Props) {
  const { saveProposta, fetchLinhas, getNextNumber } = usePropostas();
  const { clientes } = useClientes();
  const { produtos } = useProdutos();
  const { employees } = useEmployees();
  const { empresa } = useEmpresa();
  const { toast } = useToast();

  const [numeroProposta, setNumeroProposta] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteMorada, setClienteMorada] = useState('');
  const [clienteNif, setClienteNif] = useState('');
  const [vendedorNome, setVendedorNome] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricaoGeral, setDescricaoGeral] = useState('');
  const [taxaIva, setTaxaIva] = useState(23);
  const [validadeDias, setValidadeDias] = useState(30);
  const [condicoesGerais, setCondicoesGerais] = useState('O valor acima indicado é acrescido de IVA à taxa legal em vigor.');
  const [validadeTexto, setValidadeTexto] = useState('Proposta tem validade de 30 dias, sujeita a rectificação após esse prazo.');
  const [duracao, setDuracao] = useState('');
  const [condicoesPagamento, setCondicoesPagamento] = useState('Pagamento até 60 dias após a emissão de fatura.');
  const [observacoes, setObservacoes] = useState('');
  const [linhas, setLinhas] = useState<PropostaLinhaForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [produtoSearches, setProdutoSearches] = useState<Record<number, string>>({});
  const [activeProdutoDropdown, setActiveProdutoDropdown] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Load data when editing
  useEffect(() => {
    if (!open) return;
    if (proposta) {
      setNumeroProposta(proposta.numeroProposta);
      setClienteId(proposta.clienteId);
      setClienteNome(proposta.clienteNome || '');
      setClienteMorada(proposta.clienteMorada || '');
      setClienteNif(proposta.clienteNif || '');
      setVendedorNome(proposta.vendedorNome || '');
      setDataEmissao(proposta.dataEmissao);
      setTitulo(proposta.titulo || '');
      setDescricaoGeral(proposta.descricaoGeral || '');
      setTaxaIva(proposta.taxaIva);
      setValidadeDias(proposta.validadeDias);
      setCondicoesGerais(proposta.condicoesGerais || '');
      setValidadeTexto(proposta.validadeTexto || '');
      setDuracao(proposta.duracao || '');
      setCondicoesPagamento(proposta.condicoesPagamento || '');
      setObservacoes(proposta.observacoes || '');
      fetchLinhas(proposta.id).then(ls => {
        setLinhas(ls.map(l => ({
          id: l.id,
          ordem: l.ordem,
          tipoLinha: l.tipoLinha,
          referencia: l.referencia || '',
          designacao: l.designacao || '',
          quantidade: l.quantidade,
          unidade: l.unidade,
          precoUnitario: l.precoUnitario,
          descontoPct: l.descontoPct,
          totalLinha: l.totalLinha,
          produtoId: l.produtoId,
        })));
      });
    } else {
      // New
      const now = new Date();
      setDataEmissao(now.toISOString().split('T')[0]);
      setClienteId(null);
      setClienteNome('');
      setClienteMorada('');
      setClienteNif('');
      setVendedorNome('');
      setTitulo('');
      setDescricaoGeral('');
      setTaxaIva(23);
      setValidadeDias(30);
      setCondicoesGerais('O valor acima indicado é acrescido de IVA à taxa legal em vigor.');
      setValidadeTexto('Proposta tem validade de 30 dias, sujeita a rectificação após esse prazo.');
      setDuracao('');
      setCondicoesPagamento('Pagamento até 60 dias após a emissão de fatura.');
      setObservacoes('');
      setLinhas([]);
      getNextNumber().then(({ formatted }) => setNumeroProposta(formatted));
    }
  }, [open, proposta]);

  // Calculations
  const totalSemIva = useMemo(() =>
    linhas.filter(l => l.tipoLinha === 'artigo').reduce((s, l) => s + l.totalLinha, 0), [linhas]);
  const valorIva = totalSemIva * (taxaIva / 100);
  const totalComIva = totalSemIva + valorIva;

  const recalcLinhaTotal = (l: PropostaLinhaForm): number =>
    l.quantidade * l.precoUnitario * (1 - l.descontoPct / 100);

  const updateLinha = (idx: number, field: string, value: any) => {
    setLinhas(prev => {
      const next = [...prev];
      const l = { ...next[idx], [field]: value };
      if (['quantidade', 'precoUnitario', 'descontoPct'].includes(field)) {
        l.totalLinha = recalcLinhaTotal(l);
      }
      next[idx] = l;
      return next;
    });
  };

  const addLinha = (tipo: TipoLinha) => {
    setLinhas(prev => [...prev, emptyLinha(prev.length, tipo)]);
  };

  const removeLinha = (idx: number) => {
    setLinhas(prev => prev.filter((_, i) => i !== idx));
  };

  const duplicateLinha = (idx: number) => {
    setLinhas(prev => {
      const copy = { ...prev[idx], id: undefined, ordem: prev.length };
      return [...prev, copy];
    });
  };

  // Calculate subtotals for section groups
  const getSubtotal = (idx: number): number => {
    let sum = 0;
    for (let i = idx - 1; i >= 0; i--) {
      if (linhas[i].tipoLinha === 'seccao' || linhas[i].tipoLinha === 'subtotal') break;
      if (linhas[i].tipoLinha === 'artigo') sum += linhas[i].totalLinha;
    }
    return sum;
  };

  // Client search
  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes.slice(0, 10);
    const s = clienteSearch.toLowerCase();
    return clientes.filter(c => c.nome.toLowerCase().includes(s) || (c.nif || '').includes(s)).slice(0, 10);
  }, [clientes, clienteSearch]);

  const selectCliente = (c: any) => {
    setClienteId(c.id);
    setClienteNome(c.nome);
    setClienteNif(c.nif || '');
    const moradaParts = [c.moradaRua, c.moradaNumero, c.moradaCodigoPostal, c.moradaConcelho].filter(Boolean);
    setClienteMorada(moradaParts.join(', '));
    setClienteSearch('');
    setShowClienteDropdown(false);
  };

  // Product search per line
  const getFilteredProdutos = (idx: number) => {
    const s = (produtoSearches[idx] || '').toLowerCase();
    if (!s) return produtos.slice(0, 8);
    return produtos.filter(p =>
      p.refInterna.toLowerCase().includes(s) || p.descricao.toLowerCase().includes(s)
    ).slice(0, 8);
  };

  const selectProduto = (idx: number, p: any) => {
    setLinhas(prev => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        referencia: p.refInterna,
        designacao: p.descricao,
        unidade: p.unidade || 'und',
        produtoId: p.id,
      };
      return next;
    });
    setActiveProdutoDropdown(null);
    setProdutoSearches(prev => ({ ...prev, [idx]: '' }));
  };

  // Drag and drop
  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    setLinhas(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIndex(idx);
  };
  const handleDragEnd = () => setDragIndex(null);

  // Save
  const handleSave = async (estado: 'rascunho' | 'enviada') => {
    if (!clienteNome.trim()) {
      toast({ title: 'Preencha o nome do cliente', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const formData: PropostaFormData = {
      clienteId, clienteNome, clienteMorada, clienteNif,
      vendedorNome, dataEmissao, titulo, descricaoGeral,
      taxaIva, validadeDias,
      condicoesGerais, validadeTexto, duracao, condicoesPagamento, observacoes,
      linhas: linhas.map((l, i) => ({ ...l, ordem: i })),
    };
    const id = await saveProposta(formData, estado, proposta?.id);
    setSaving(false);
    if (id) {
      toast({ title: estado === 'rascunho' ? 'Rascunho guardado' : 'Proposta finalizada' });
      onOpenChange(false);
    } else {
      toast({ title: 'Erro ao guardar proposta', variant: 'destructive' });
    }
  };

  const handleExportPdf = () => {
    exportPropostaPdf({
      numeroProposta, clienteNome, clienteMorada, clienteNif,
      vendedorNome, dataEmissao,
      horaEmissao: proposta?.horaEmissao || new Date().toLocaleTimeString('pt-PT'),
      titulo, descricaoGeral, linhas, taxaIva,
      totalSemIva, valorIva, totalComIva,
      condicoesGerais, validadeTexto, duracao, condicoesPagamento, observacoes,
    }, empresa);
  };

  const handleExportExcel = () => {
    exportPropostaExcel({
      numeroProposta, clienteNome, clienteMorada, clienteNif,
      vendedorNome, dataEmissao, titulo, descricaoGeral,
      linhas, taxaIva, totalSemIva, valorIva, totalComIva,
      condicoesGerais, validadeTexto, duracao, condicoesPagamento, observacoes,
    });
  };

  const tryClose = () => {
    if (linhas.length > 0 || clienteNome) setConfirmClose(true);
    else onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) tryClose(); else onOpenChange(v); }}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-0">
          {/* Top toolbar */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between">
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-lg">
                {proposta ? `Editar Proposta — ${numeroProposta}` : `Nova Proposta — ${numeroProposta}`}
              </DialogTitle>
            </DialogHeader>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={linhas.length === 0}>
                <FileDown className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={linhas.length === 0}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSave('rascunho')} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> Guardar Rascunho
              </Button>
              <Button size="sm" onClick={() => handleSave('enviada')} disabled={saving}>
                <Send className="h-4 w-4 mr-1" /> Finalizar
              </Button>
              <Button variant="ghost" size="icon" onClick={tryClose}><X className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* SECÇÃO A & B — Metadados + Cliente */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dados empresa (read-only) */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Dados da Empresa</h3>
                <div className="text-sm space-y-1">
                  <p className="font-bold">TUDO CASA — WARM LDA</p>
                  <p>Rua Eng. Machado Vaz Nº 8, 5370-440 Mirandela</p>
                  <p>Contribuinte Nº: 518307174</p>
                  <p className="text-xs text-muted-foreground">comercialtudocasa@gmail.com | geraltudocasa@gmail.com</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nº Proposta</Label>
                    <Input value={numeroProposta} readOnly className="bg-muted/50 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Data Emissão</Label>
                    <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Vendedor</Label>
                    <Select value={vendedorNome} onValueChange={setVendedorNome}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {employees.filter(e => e.status === 'active').map(e => (
                          <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Validade (dias)</Label>
                    <Input type="number" value={validadeDias} onChange={e => setValidadeDias(Number(e.target.value))} className="text-sm" />
                  </div>
                </div>
              </div>

              {/* Cliente */}
              <div className="space-y-3 p-4 rounded-lg border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Dados do Cliente</h3>
                <div className="relative">
                  <Label className="text-xs">Pesquisar Cliente</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome ou NIF..."
                      className="pl-8 text-sm"
                      value={clienteSearch}
                      onChange={e => { setClienteSearch(e.target.value); setShowClienteDropdown(true); }}
                      onFocus={() => setShowClienteDropdown(true)}
                    />
                  </div>
                  {showClienteDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                      {filteredClientes.map(c => (
                        <div
                          key={c.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                          onClick={() => selectCliente(c)}
                        >
                          <span className="font-medium">{c.nome}</span>
                          {c.nif && <span className="text-muted-foreground ml-2">NIF: {c.nif}</span>}
                        </div>
                      ))}
                      {filteredClientes.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Morada</Label>
                    <Input value={clienteMorada} onChange={e => setClienteMorada(e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">NIF</Label>
                    <Input value={clienteNif} onChange={e => setClienteNif(e.target.value)} className="text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECÇÃO C — Título */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Trabalhos a executar:</Label>
              <Input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Título da proposta..."
                className="text-sm"
              />
              <Textarea
                value={descricaoGeral}
                onChange={e => setDescricaoGeral(e.target.value)}
                placeholder="Descrição geral (opcional)..."
                rows={2}
                className="text-sm"
              />
            </div>

            {/* SECÇÃO D — Linhas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Linhas da Proposta</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addLinha('seccao')}>
                    <Layers className="h-3 w-3 mr-1" /> Secção
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addLinha('artigo')}>
                    <Plus className="h-3 w-3 mr-1" /> Artigo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addLinha('subtotal')}>
                    <Calculator className="h-3 w-3 mr-1" /> Subtotal
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addLinha('texto')}>
                    <AlignLeft className="h-3 w-3 mr-1" /> Texto
                  </Button>
                </div>
              </div>

              {/* Lines table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="w-8 p-2"></th>
                      <th className="p-2 text-left">Referência</th>
                      <th className="p-2 text-left">Designação</th>
                      <th className="p-2 text-right w-24">Qtd.</th>
                      <th className="p-2 text-left w-16">Uni.</th>
                      <th className="p-2 text-right w-28">Preço Unit.</th>
                      <th className="p-2 text-right w-20">Desc. %</th>
                      <th className="p-2 text-right w-28">Total</th>
                      <th className="w-20 p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l, idx) => {
                      if (l.tipoLinha === 'seccao') {
                        return (
                          <tr
                            key={idx}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            className="bg-gray-100"
                          >
                            <td className="p-1 cursor-grab"><GripVertical className="h-4 w-4 text-muted-foreground" /></td>
                            <td colSpan={7} className="p-2">
                              <Input
                                value={l.designacao}
                                onChange={e => updateLinha(idx, 'designacao', e.target.value)}
                                placeholder="Nome da secção..."
                                className="font-bold text-sm border-0 bg-transparent shadow-none h-8 text-[#E8630A]"
                              />
                            </td>
                            <td className="p-1">
                              <Button variant="ghost" size="icon" onClick={() => removeLinha(idx)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        );
                      }
                      if (l.tipoLinha === 'subtotal') {
                        const sub = getSubtotal(idx);
                        return (
                          <tr
                            key={idx}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            className="bg-gray-200"
                          >
                            <td className="p-1 cursor-grab"><GripVertical className="h-4 w-4 text-muted-foreground" /></td>
                            <td colSpan={6} className="p-2 font-bold text-right">Subtotal</td>
                            <td className="p-2 text-right font-bold">{formatEUR(sub)}</td>
                            <td className="p-1">
                              <Button variant="ghost" size="icon" onClick={() => removeLinha(idx)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        );
                      }
                      if (l.tipoLinha === 'texto') {
                        return (
                          <tr
                            key={idx}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                          >
                            <td className="p-1 cursor-grab"><GripVertical className="h-4 w-4 text-muted-foreground" /></td>
                            <td colSpan={7} className="p-2">
                              <Input
                                value={l.designacao}
                                onChange={e => updateLinha(idx, 'designacao', e.target.value)}
                                placeholder="Texto livre / observação..."
                                className="text-sm h-8"
                              />
                            </td>
                            <td className="p-1">
                              <Button variant="ghost" size="icon" onClick={() => removeLinha(idx)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        );
                      }
                      // Artigo
                      return (
                        <tr
                          key={idx}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="p-1 cursor-grab"><GripVertical className="h-4 w-4 text-muted-foreground" /></td>
                          <td className="p-1 relative">
                            <Input
                              value={l.referencia}
                              onChange={e => {
                                updateLinha(idx, 'referencia', e.target.value);
                                setProdutoSearches(prev => ({ ...prev, [idx]: e.target.value }));
                                setActiveProdutoDropdown(idx);
                              }}
                              onFocus={() => setActiveProdutoDropdown(idx)}
                              onBlur={() => setTimeout(() => setActiveProdutoDropdown(null), 200)}
                              placeholder="REF..."
                              className="text-sm h-8 w-28"
                            />
                            {activeProdutoDropdown === idx && (produtoSearches[idx] || '').length > 0 && (
                              <div className="absolute z-30 mt-1 w-72 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                                {getFilteredProdutos(idx).map(p => (
                                  <div
                                    key={p.id}
                                    className="px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/50"
                                    onMouseDown={() => selectProduto(idx, p)}
                                  >
                                    <span className="font-medium">{p.refInterna}</span>
                                    <span className="text-muted-foreground ml-2">— {p.descricao}</span>
                                    {p.unidade && <span className="text-muted-foreground ml-1">({p.unidade})</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-1">
                            <Input
                              value={l.designacao}
                              onChange={e => updateLinha(idx, 'designacao', e.target.value)}
                              placeholder="Designação..."
                              className="text-sm h-8"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              type="number"
                              step="0.001"
                              value={l.quantidade}
                              onChange={e => updateLinha(idx, 'quantidade', Number(e.target.value))}
                              className="text-sm h-8 text-right w-24"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              value={l.unidade}
                              onChange={e => updateLinha(idx, 'unidade', e.target.value)}
                              className="text-sm h-8 w-16"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={l.precoUnitario}
                              onChange={e => updateLinha(idx, 'precoUnitario', Number(e.target.value))}
                              className="text-sm h-8 text-right w-28"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={l.descontoPct}
                              onChange={e => updateLinha(idx, 'descontoPct', Number(e.target.value))}
                              className="text-sm h-8 text-right w-20"
                            />
                          </td>
                          <td className="p-1 text-right font-medium pr-3">
                            {formatEUR(l.totalLinha)}
                          </td>
                          <td className="p-1 flex gap-0.5">
                            <Button variant="ghost" size="icon" onClick={() => duplicateLinha(idx)} title="Duplicar">
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => removeLinha(idx)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {linhas.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-muted-foreground">
                          Use os botões acima para adicionar linhas à proposta
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECÇÃO E — Rodapé */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conditions */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Condições Gerais</h3>
                <div>
                  <Label className="text-xs">Condições gerais</Label>
                  <Textarea value={condicoesGerais} onChange={e => setCondicoesGerais(e.target.value)} rows={2} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Validade da proposta</Label>
                  <Input value={validadeTexto} onChange={e => setValidadeTexto(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Duração</Label>
                  <Input value={duracao} onChange={e => setDuracao(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Condições de pagamento</Label>
                  <Input value={condicoesPagamento} onChange={e => setCondicoesPagamento(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Observações</Label>
                  <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} className="text-sm" />
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Totais</h3>
                <div className="p-4 rounded-lg border space-y-3">
                  <div>
                    <Label className="text-xs">Taxa IVA (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={taxaIva}
                      onChange={e => setTaxaIva(Number(e.target.value))}
                      className="text-sm w-24"
                    />
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Total sem IVA:</span>
                    <span className="font-medium">{formatEUR(totalSemIva)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Valor do IVA ({taxaIva}%):</span>
                    <span className="font-medium">{formatEUR(valorIva)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold text-[#E8630A]">
                    <span>Total com IVA:</span>
                    <span>{formatEUR(totalComIva)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem guardar?</AlertDialogTitle>
            <AlertDialogDescription>As alterações não guardadas serão perdidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar a editar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmClose(false); onOpenChange(false); }}>
              Sair sem guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
