import { useState, useMemo } from 'react';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { OrdemServico, emptyOsForm } from '@/types/ordemServico';
import { OrdensServicoKanban } from '@/components/ordens-servico/OrdensServicoKanban';
import { OsFormDialog } from '@/components/ordens-servico/OsFormDialog';
import { OsDetailDialog } from '@/components/ordens-servico/OsDetailDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Factory, Plus, Search, Euro, Clock, CheckCircle2, ClipboardList } from 'lucide-react';

const formatEUR = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

export default function WorkflowProducao() {
  const { empresa } = useEmpresa();
  const {
    ordens, isInitialized, createOrdem, updateOrdem, updateEstado, deleteOrdem,
    fetchChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem,
  } = useOrdensServico(empresa?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [prioridadeFilter, setPrioridadeFilter] = useState('todas');
  const [showForm, setShowForm] = useState(false);
  const [selectedOs, setSelectedOs] = useState<OrdemServico | null>(null);

  const filtered = useMemo(() => {
    let result = ordens;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (o) => o.titulo.toLowerCase().includes(s) || o.clienteNome.toLowerCase().includes(s),
      );
    }
    if (prioridadeFilter !== 'todas') {
      result = result.filter((o) => o.prioridade === prioridadeFilter);
    }
    return result;
  }, [ordens, searchTerm, prioridadeFilter]);

  const kpis = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = now.getMonth();
    return {
      total: ordens.length,
      emExecucao: ordens.filter((o) => o.estado === 'em_execucao').length,
      concluidasMes: ordens.filter((o) => {
        if (o.estado !== 'concluida' || !o.dataAbertura) return false;
        const [y, m] = o.dataAbertura.split('-').map(Number);
        return y === yyyy && m - 1 === mm;
      }).length,
      valorAberto: ordens
        .filter((o) => o.estado !== 'cancelada' && o.estado !== 'faturada')
        .reduce((sum, o) => sum + (o.valorEstimado ?? 0), 0),
    };
  }, [ordens]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Produção — Workflow</h1>
            <p className="text-sm text-muted-foreground">
              Pipeline de ordens de serviço · Nova → Aprovada → Em Execução → Concluída → Faturada
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova OS
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-5 flex items-center gap-3">
            <ClipboardList className="h-8 w-8 opacity-80" />
            <div>
              <p className="text-sm opacity-90">Total OS</p>
              <p className="text-2xl font-bold">{kpis.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
          <CardContent className="p-5 flex items-center gap-3">
            <Clock className="h-8 w-8 opacity-80" />
            <div>
              <p className="text-sm opacity-90">Em Execução</p>
              <p className="text-2xl font-bold">{kpis.emExecucao}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 opacity-80" />
            <div>
              <p className="text-sm opacity-90">Concluídas (mês)</p>
              <p className="text-2xl font-bold">{kpis.concluidasMes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-5 flex items-center gap-3">
            <Euro className="h-8 w-8 opacity-80" />
            <div>
              <p className="text-sm opacity-90">Valor em Aberto</p>
              <p className="text-2xl font-bold text-base">{formatEUR(kpis.valorAberto)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por título ou cliente..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas prioridades</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban */}
      <OrdensServicoKanban ordens={filtered} onSelect={setSelectedOs} />

      {/* Dialogs */}
      <OsFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={async (form) => { await createOrdem(form); setShowForm(false); }}
      />

      {selectedOs && (
        <OsDetailDialog
          os={selectedOs}
          onClose={() => setSelectedOs(null)}
          onUpdate={updateOrdem}
          onUpdateEstado={updateEstado}
          onDelete={async (id: string) => { const ok = await deleteOrdem(id); setSelectedOs(null); return ok; }}
          fetchChecklist={fetchChecklist}
          addChecklistItem={addChecklistItem}
          toggleChecklistItem={toggleChecklistItem}
          deleteChecklistItem={deleteChecklistItem}
        />
      )}
    </div>
  );
}
