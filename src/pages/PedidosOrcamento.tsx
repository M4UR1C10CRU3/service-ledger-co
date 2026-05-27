import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePedidosOrcamento } from '@/hooks/usePedidosOrcamento';
import { usePropostas } from '@/hooks/usePropostas';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { PoFormDialog } from '@/components/pedidos-orcamento/PoFormDialog';
import { exportPoPdf } from '@/components/pedidos-orcamento/poPdfExport';
import type { PedidoOrcamento, POEstado } from '@/types/pedidoOrcamento';
import { Plus, Search, FileDown, Edit, Trash2, FileText, ClipboardList, Zap, Wrench } from 'lucide-react';

const estadoLabels: Record<POEstado, string> = {
  recebido: 'Recebido',
  em_analise: 'Em análise',
  proposta_elaborada: 'Proposta elaborada',
  adjudicado: 'Adjudicado',
  os_criada: 'OS criada',
  cancelado: 'Cancelado',
};

const estadoColors: Record<POEstado, string> = {
  recebido: 'bg-muted text-muted-foreground',
  em_analise: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  proposta_elaborada: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  adjudicado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  os_criada: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function PedidosOrcamento() {
  const { pedidos, isLoading, fetchLinhasPo, linkProposta, deletePedido } = usePedidosOrcamento();
  const { saveProposta } = usePropostas();
  const { empresa, getLogo } = useEmpresa();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [mesFilter, setMesFilter] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<PedidoOrcamento | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return pedidos.filter(p => {
      if (estadoFilter !== 'todos' && p.estado !== estadoFilter) return false;
      if (mesFilter !== 'todos') {
        const m = p.dataEmissao?.slice(0, 7);
        if (m !== mesFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!p.clienteNome.toLowerCase().includes(q) && !p.numeroPo.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [pedidos, search, estadoFilter, mesFilter]);

  const meses = useMemo(() => {
    const set = new Set(pedidos.map(p => p.dataEmissao?.slice(0, 7)).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [pedidos]);

  const stats = useMemo(() => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    return {
      mes: pedidos.filter(p => p.dataEmissao?.startsWith(mesAtual)).length,
      analise: pedidos.filter(p => p.estado === 'em_analise').length,
      propostaElaborada: pedidos.filter(p => p.estado === 'proposta_elaborada').length,
      adjudicadosMes: pedidos.filter(p => p.estado === 'adjudicado' && p.dataEmissao?.startsWith(mesAtual)).length,
    };
  }, [pedidos]);

  const handleNovo = () => { setSelected(null); setDialogOpen(true); };
  const handleEditar = (p: PedidoOrcamento) => { setSelected(p); setDialogOpen(true); };

  const handleGerarPdf = async (p: PedidoOrcamento) => {
    const linhas = await fetchLinhasPo(p.id);
    const linhasForm = linhas.map((l, i) => ({
      ordem: i, tipoLinha: l.tipoLinha,
      referencia: l.referencia || '', designacao: l.designacao || '',
      quantidade: l.quantidade, unidade: l.unidade,
      observacaoLinha: l.observacaoLinha || '',
    }));
    const doExport = (logoDataUrl?: string) => {
      exportPoPdf({
        numeroPo: p.numeroPo, clienteNome: p.clienteNome,
        clienteMorada: p.clienteMorada || '', clienteNif: p.clienteNif || '',
        clienteTelefone: p.clienteTelefone || '', clienteEmail: p.clienteEmail || '',
        vendedorNome: p.vendedorNome || '', dataEmissao: p.dataEmissao,
        horaEmissao: p.horaEmissao || '',
        titulo: p.titulo || '', descricaoNecessidade: p.descricaoNecessidade || '',
        obra: p.obra || '', duracaoObra: p.duracaoObra || '', localExecucao: p.localExecucao || '',
        linhas: linhasForm,
        validadeTexto: p.validadeTexto || '', condicoesPagamento: p.condicoesPagamento || '',
        condicoesGerais: p.condicoesGerais || '', observacoes: p.observacoes || '',
      }, empresa, logoDataUrl);
    };
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        doExport(canvas.toDataURL('image/png'));
      } catch { doExport(); }
    };
    img.onerror = () => doExport();
    img.src = getLogo();
  };

  const handleConverter = async (po: PedidoOrcamento) => {
    const linhas = await fetchLinhasPo(po.id);
    const propostaLinhas = linhas.map((l, i) => ({
      ordem: i,
      tipoLinha: l.tipoLinha as any,
      referencia: l.referencia || '',
      designacao: l.designacao || (l.observacaoLinha || ''),
      quantidade: l.quantidade,
      unidade: l.unidade,
      precoUnitario: 0,
      descontoPct: 0,
      totalLinha: 0,
      produtoId: null,
    }));
    const propostaId = await saveProposta({
      clienteId: po.clienteId,
      clienteNome: po.clienteNome,
      clienteMorada: po.clienteMorada || '',
      clienteNif: po.clienteNif || '',
      vendedorNome: po.vendedorNome || '',
      dataEmissao: po.dataEmissao,
      titulo: po.titulo || '',
      descricaoGeral: po.descricaoNecessidade || '',
      taxaIva: 23,
      condicoesGerais: po.condicoesGerais || '',
      validadeTexto: po.validadeTexto || '',
      duracao: po.duracaoObra || '',
      condicoesPagamento: po.condicoesPagamento || '',
      observacoes: po.observacoes || '',
      validadeDias: po.validadeDias || 30,
      linhas: propostaLinhas,
    }, 'rascunho');

    if (!propostaId) {
      toast({ title: 'Erro ao criar proposta', variant: 'destructive' });
      return;
    }

    // Link proposta and update po with numero_po reference on proposta
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: prop } = await (supabase as any).from('propostas').select('numero_proposta').eq('id', propostaId).single();
    await (supabase as any).from('propostas').update({ po_id: po.id, numero_po: po.numeroPo }).eq('id', propostaId);
    if (prop?.numero_proposta) {
      await linkProposta(po.id, propostaId, prop.numero_proposta);
    }

    toast({ title: 'Proposta criada como rascunho', description: 'Edite-a para definir os preços.' });
    navigate('/propostas');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Pedidos de Orçamento
          </h1>
          <p className="text-sm text-muted-foreground">Registo e gestão de pedidos de clientes</p>
        </div>
        <Button onClick={handleNovo} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-1" /> Novo PO
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Recebidos este mês</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.mes}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Em análise</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{stats.analise}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Proposta elaborada</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{stats.propostaElaborada}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Adjudicados este mês</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{stats.adjudicadosMes}</div></CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Pesquisar por cliente ou Nº PO..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              {Object.entries(estadoLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mesFilter} onValueChange={setMesFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os meses</SelectItem>
              {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº PO</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Título / Obra</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Proposta</TableHead>
                <TableHead className="text-right">Acções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado.</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.numeroPo}</TableCell>
                  <TableCell className="text-sm">{p.dataEmissao && new Date(p.dataEmissao).toLocaleDateString('pt-PT')}</TableCell>
                  <TableCell>{p.clienteNome}</TableCell>
                  <TableCell className="text-sm">
                    {p.titulo}{p.obra ? <div className="text-xs text-muted-foreground">Obra: {p.obra}</div> : null}
                  </TableCell>
                  <TableCell>
                    <Badge className={estadoColors[p.estado]}>{estadoLabels[p.estado]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.numeroProposta ? (
                      <button onClick={() => navigate('/propostas')}
                        className="text-primary hover:underline font-mono text-xs">
                        {p.numeroProposta}
                      </button>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEditar(p)} title="Editar">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleGerarPdf(p)} title="Gerar PDF">
                      <FileDown className="h-4 w-4" />
                    </Button>
                    {(p.estado === 'recebido' || p.estado === 'em_analise') && (
                      <Button size="icon" variant="ghost" onClick={() => handleConverter(p)} title="Converter em Proposta">
                        <FileText className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {(p.estado === 'recebido' || p.estado === 'em_analise') && (
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)} title="Eliminar">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pedido={selected}
        onConverter={handleConverter}
      />

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Pedido de Orçamento</AlertDialogTitle>
            <AlertDialogDescription>Esta acção não pode ser revertida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (deleteId) {
                const ok = await deletePedido(deleteId);
                toast({ title: ok ? 'Eliminado' : 'Não foi possível eliminar', variant: ok ? 'default' : 'destructive' });
              }
              setDeleteId(null);
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
