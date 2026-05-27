import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { usePedidosOrcamento } from '@/hooks/usePedidosOrcamento';
import { useClientes } from '@/hooks/useClientes';
import { useEmployees } from '@/hooks/useEmployees';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { exportPoPdf } from './poPdfExport';
import type { PedidoOrcamento, POLinhaForm, POFormData, TipoPedido } from '@/types/pedidoOrcamento';
import { Save, FileDown, Plus, Trash2, Search, Layers, Type, FileText as FileTextIcon, ClipboardList, Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: PedidoOrcamento | null;
  onConverter?: (pedido: PedidoOrcamento) => void;
}

const emptyLinha = (ordem: number, tipo: 'artigo' | 'seccao' | 'texto' = 'artigo'): POLinhaForm => ({
  ordem,
  tipoLinha: tipo,
  referencia: '',
  designacao: '',
  quantidade: 1,
  unidade: 'und',
  observacaoLinha: '',
});

export function PoFormDialog({ open, onOpenChange, pedido, onConverter }: Props) {
  const { savePedido, fetchLinhasPo, getNextNumber } = usePedidosOrcamento();
  const { clientes } = useClientes();
  const { employees } = useEmployees();
  const { empresa, getLogo } = useEmpresa();
  const { toast } = useToast();

  const [numeroPo, setNumeroPo] = useState('');
  const [tipoPedido, setTipoPedido] = useState<TipoPedido>('orcamentacao');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteMorada, setClienteMorada] = useState('');
  const [clienteNif, setClienteNif] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [vendedorNome, setVendedorNome] = useState('');
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [titulo, setTitulo] = useState('');
  const [descricaoNecessidade, setDescricaoNecessidade] = useState('');
  const [obra, setObra] = useState('');
  const [duracaoObra, setDuracaoObra] = useState('');
  const [localExecucao, setLocalExecucao] = useState('');
  const [validadeDias, setValidadeDias] = useState(5);
  const [validadeTexto, setValidadeTexto] = useState('Proposta tem validade de 5 dias, sujeita a rectificação após esse prazo.');
  const [condicoesPagamento, setCondicoesPagamento] = useState('');
  const [condicoesGerais, setCondicoesGerais] = useState('O valor acima indicado é acrescido de IVA à taxa legal em vigor.');
  const [observacoes, setObservacoes] = useState('');
  const [linhas, setLinhas] = useState<POLinhaForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (pedido) {
      setNumeroPo(pedido.numeroPo);
      setTipoPedido(pedido.tipoPedido || 'orcamentacao');
      setClienteId(pedido.clienteId);
      setClienteNome(pedido.clienteNome);
      setClienteMorada(pedido.clienteMorada || '');
      setClienteNif(pedido.clienteNif || '');
      setClienteTelefone(pedido.clienteTelefone || '');
      setClienteEmail(pedido.clienteEmail || '');
      setVendedorNome(pedido.vendedorNome || '');
      setDataEmissao(pedido.dataEmissao);
      setTitulo(pedido.titulo || '');
      setDescricaoNecessidade(pedido.descricaoNecessidade || '');
      setObra(pedido.obra || '');
      setDuracaoObra(pedido.duracaoObra || '');
      setLocalExecucao(pedido.localExecucao || '');
      setValidadeDias(pedido.validadeDias);
      setValidadeTexto(pedido.validadeTexto || '');
      setCondicoesPagamento(pedido.condicoesPagamento || '');
      setCondicoesGerais(pedido.condicoesGerais || '');
      setObservacoes(pedido.observacoes || '');
      fetchLinhasPo(pedido.id).then(ls => {
        setLinhas(ls.map((l, i) => ({
          id: l.id, ordem: i, tipoLinha: l.tipoLinha,
          referencia: l.referencia || '', designacao: l.designacao || '',
          quantidade: l.quantidade, unidade: l.unidade,
          observacaoLinha: l.observacaoLinha || '',
        })));
      });
    } else {
      // reset
      setTipoPedido('orcamentacao');
      setClienteId(null); setClienteNome(''); setClienteMorada(''); setClienteNif('');
      setClienteTelefone(''); setClienteEmail(''); setVendedorNome('');
      setDataEmissao(new Date().toISOString().split('T')[0]);
      setTitulo(''); setDescricaoNecessidade(''); setObra(''); setDuracaoObra(''); setLocalExecucao('');
      setValidadeDias(5);
      setValidadeTexto('Proposta tem validade de 5 dias, sujeita a rectificação após esse prazo.');
      setCondicoesPagamento('');
      setCondicoesGerais('O valor acima indicado é acrescido de IVA à taxa legal em vigor.');
      setObservacoes('');
      setLinhas([emptyLinha(0)]);
      getNextNumber().then(n => setNumeroPo(n.formatted));
    }
    setClienteSearch('');
  }, [open, pedido]);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes.slice(0, 10);
    const q = clienteSearch.toLowerCase();
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      (c.nif || '').includes(clienteSearch)
    ).slice(0, 10);
  }, [clientes, clienteSearch]);

  const selectCliente = (c: any) => {
    setClienteId(c.id);
    setClienteNome(c.nome);
    const morada = [c.moradaRua, c.moradaNumero, c.moradaConcelho, c.moradaCodigoPostal]
      .filter(Boolean).join(', ');
    setClienteMorada(morada);
    setClienteNif(c.nif || '');
    setClienteTelefone(c.telefone || '');
    setClienteEmail(c.email || '');
    setShowClienteDropdown(false);
    setClienteSearch('');
  };

  const addLinha = (tipo: 'artigo' | 'seccao' | 'texto') => {
    setLinhas([...linhas, emptyLinha(linhas.length, tipo)]);
  };

  const updateLinha = (idx: number, patch: Partial<POLinhaForm>) => {
    setLinhas(linhas.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const removeLinha = (idx: number) => {
    setLinhas(linhas.filter((_, i) => i !== idx).map((l, i) => ({ ...l, ordem: i })));
  };

  const buildFormData = (): POFormData => ({
    tipoPedido,
    clienteId, clienteNome, clienteMorada, clienteNif, clienteTelefone, clienteEmail,
    vendedorNome, dataEmissao, titulo, descricaoNecessidade, obra, duracaoObra, localExecucao,
    validadeDias, validadeTexto, condicoesPagamento, condicoesGerais, observacoes,
    linhas,
  });

  const handleSave = async (gerarPdf = false): Promise<string | null> => {
    if (!clienteNome.trim()) {
      toast({ title: 'Nome do cliente é obrigatório', variant: 'destructive' });
      return null;
    }
    setSaving(true);
    try {
      const id = await savePedido(buildFormData(), pedido?.id);
      if (id) {
        toast({ title: 'Pedido de Orçamento guardado' });
        if (gerarPdf) handleExportPdf();
        else onOpenChange(false);
      } else {
        toast({ title: 'Erro ao guardar', variant: 'destructive' });
      }
      return id;
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = () => {
    const logoSrc = getLogo();
    const horaEmissao = pedido?.horaEmissao || new Date().toLocaleTimeString('pt-PT');
    const doExport = (logoDataUrl?: string) => {
      exportPoPdf({
        numeroPo, clienteNome, clienteMorada, clienteNif, clienteTelefone, clienteEmail,
        vendedorNome, dataEmissao, horaEmissao,
        titulo, descricaoNecessidade, obra, duracaoObra, localExecucao,
        linhas, validadeTexto, condicoesPagamento, condicoesGerais, observacoes,
      }, empresa, logoDataUrl);
    };
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        doExport(canvas.toDataURL('image/png'));
      } catch {
        doExport();
      }
    };
    img.onerror = () => doExport();
    img.src = logoSrc;
  };

  const handleConverter = async () => {
    const id = pedido?.id || await handleSave(false);
    if (!id || !onConverter) return;
    const fresh: PedidoOrcamento = pedido || {
      id, empresaId: empresa?.id || '', numeroPo, numeroSequencial: 0, ano: new Date().getFullYear(),
      tipoPedido,
      clienteId, clienteNome, clienteMorada, clienteNif, clienteTelefone, clienteEmail,
      vendedorId: null, vendedorNome,
      titulo, descricaoNecessidade, obra, duracaoObra, localExecucao,
      estado: 'recebido', validadeDias, validadeTexto, condicoesPagamento, condicoesGerais, observacoes,
      propostaId: null, numeroProposta: null,
      osId: null, numeroOs: null,
      dataEmissao, horaEmissao: new Date().toLocaleTimeString('pt-PT'),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    onConverter(fresh);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {pedido ? `Editar Pedido de Orçamento — ${numeroPo}` : `Novo Pedido de Orçamento — ${numeroPo}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cliente */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-primary">Cliente</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 relative">
                <Label>Pesquisar cliente</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Nome ou NIF..."
                    value={clienteSearch}
                    onChange={e => { setClienteSearch(e.target.value); setShowClienteDropdown(true); }}
                    onFocus={() => setShowClienteDropdown(true)}
                    onBlur={() => setTimeout(() => setShowClienteDropdown(false), 200)}
                  />
                </div>
                {showClienteDropdown && filteredClientes.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredClientes.map(c => (
                      <button key={c.id} type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        onMouseDown={() => selectCliente(c)}>
                        <div className="font-medium">{c.nome}</div>
                        {c.nif && <div className="text-xs text-muted-foreground">NIF: {c.nif}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Nome *</Label>
                <Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} />
              </div>
              <div>
                <Label>NIF</Label>
                <Input value={clienteNif} onChange={e => setClienteNif(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Morada</Label>
                <Input value={clienteMorada} onChange={e => setClienteMorada(e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={clienteTelefone} onChange={e => setClienteTelefone(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} />
              </div>
            </div>
          </section>

          <Separator />

          {/* Pedido */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-primary">Pedido</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Título / Designação</Label>
                <Input value={titulo} onChange={e => setTitulo(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Descrição da necessidade</Label>
                <Textarea rows={3} value={descricaoNecessidade}
                  onChange={e => setDescricaoNecessidade(e.target.value)}
                  placeholder="O que o cliente pediu..." />
              </div>
              <div>
                <Label>Obra</Label>
                <Input value={obra} onChange={e => setObra(e.target.value)} />
              </div>
              <div>
                <Label>Duração prevista</Label>
                <Input value={duracaoObra} onChange={e => setDuracaoObra(e.target.value)} />
              </div>
              <div>
                <Label>Local de execução</Label>
                <Input value={localExecucao} onChange={e => setLocalExecucao(e.target.value)} />
              </div>
              <div>
                <Label>Responsável</Label>
                <select className="w-full h-10 px-3 border rounded-md bg-background text-sm"
                  value={vendedorNome} onChange={e => setVendedorNome(e.target.value)}>
                  <option value="">—</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.full_name}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Data de emissão</Label>
                <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
              </div>
            </div>
          </section>

          <Separator />

          {/* Linhas */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-primary">Artigos / Serviços pedidos</h3>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => addLinha('artigo')}>
                  <Plus className="h-3 w-3 mr-1" /> Artigo
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addLinha('seccao')}>
                  <Layers className="h-3 w-3 mr-1" /> Secção
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addLinha('texto')}>
                  <Type className="h-3 w-3 mr-1" /> Texto
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {linhas.map((l, idx) => (
                <div key={idx} className="border rounded-md p-2 bg-muted/30">
                  {l.tipoLinha === 'seccao' && (
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-semibold text-primary">SECÇÃO</span>
                      <Input value={l.designacao}
                        onChange={e => updateLinha(idx, { designacao: e.target.value })}
                        placeholder="Nome da secção" />
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeLinha(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {l.tipoLinha === 'texto' && (
                    <div className="flex gap-2 items-center">
                      <span className="text-xs italic text-muted-foreground">TEXTO</span>
                      <Input value={l.designacao}
                        onChange={e => updateLinha(idx, { designacao: e.target.value })}
                        placeholder="Texto livre" />
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeLinha(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {l.tipoLinha === 'artigo' && (
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-2">
                        <Label className="text-xs">Ref.</Label>
                        <Input value={l.referencia}
                          onChange={e => updateLinha(idx, { referencia: e.target.value })} />
                      </div>
                      <div className="col-span-4">
                        <Label className="text-xs">Designação</Label>
                        <Input value={l.designacao}
                          onChange={e => updateLinha(idx, { designacao: e.target.value })} />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs">Qtd.</Label>
                        <Input type="number" step="0.001" value={l.quantidade}
                          onChange={e => updateLinha(idx, { quantidade: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs">Un.</Label>
                        <Input value={l.unidade}
                          onChange={e => updateLinha(idx, { unidade: e.target.value })} />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Observação</Label>
                        <Input value={l.observacaoLinha}
                          onChange={e => updateLinha(idx, { observacaoLinha: e.target.value })} />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeLinha(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Condições */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-primary">Condições</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Validade (dias)</Label>
                <Input type="number" value={validadeDias}
                  onChange={e => setValidadeDias(parseInt(e.target.value) || 5)} />
              </div>
              <div className="col-span-2">
                <Label>Texto de validade</Label>
                <Textarea rows={2} value={validadeTexto}
                  onChange={e => setValidadeTexto(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Condições de pagamento</Label>
                <Textarea rows={2} value={condicoesPagamento}
                  onChange={e => setCondicoesPagamento(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Condições gerais</Label>
                <Textarea rows={2} value={condicoesGerais}
                  onChange={e => setCondicoesGerais(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea rows={2} value={observacoes}
                  onChange={e => setObservacoes(e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        {/* Ações */}
        <div className="flex justify-between gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            {onConverter && (
              <Button variant="secondary" onClick={handleConverter} disabled={saving}>
                <FileTextIcon className="h-4 w-4 mr-1" /> Converter em Proposta
              </Button>
            )}
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
              <FileDown className="h-4 w-4 mr-1" /> Guardar e Gerar PDF
            </Button>
            <Button onClick={() => handleSave(false)} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
