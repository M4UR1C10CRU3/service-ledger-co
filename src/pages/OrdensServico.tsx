import { useState, useMemo } from 'react';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useClientes } from '@/hooks/useClientes';
import { useEmployees } from '@/hooks/useEmployees';
import { usePropostas } from '@/hooks/usePropostas';
import { OrdemServico, OS_ESTADOS, OS_ESTADOS_ORDEM, OS_PRIORIDADES } from '@/types/ordemServico';
import { formatEUR } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OsFormDialog } from '@/components/ordens-servico/OsFormDialog';
import { OsDetailDialog } from '@/components/ordens-servico/OsDetailDialog';
import { ClipboardList, Plus, Search, User, Calendar, AlertTriangle, CheckCircle2, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OrdensServico() {
  const {
    ordens, isLoading, createOrdem, updateOrdem, updateEstado, deleteOrdem,
    fetchChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem,
  } = useOrdensServico();
  const { clientes } = useClientes();
  const { employees } = useEmployees();
  const { propostas } = usePropostas();

  const [search, setSearch] = useState('');
  const [prioridadeFilter, setPrioridadeFilter] = useState('todos');
  const [colaboradorFilter, setColaboradorFilter] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOrdem, setDetailOrdem] = useState<OrdemServico | null>(null);

  const filtered = useMemo(() => {
    let result = ordens;
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(o =>
        o.numero.toLowerCase().includes(s) ||
        o.titulo.toLowerCase().includes(s) ||
        o.clienteNome.toLowerCase().includes(s)
      );
    }
    if (prioridadeFilter !== 'todos') result = result.filter(o => o.prioridade === prioridadeFilter);
    if (colaboradorFilter !== 'todos') result = result.filter(o => o.colaboradorNome === colaboradorFilter);
    return result;
  }, [ordens, search, prioridadeFilter, colaboradorFilter]);

  const kpis = useMemo(() => ({
    total: ordens.length,
    emExecucao: ordens.filter(o => o.estado === 'em_execucao').length,
    concluidas: ordens.filter(o => o.estado === 'concluida' || o.estado === 'faturada').length,
    valorEmAberto: ordens
      .filter(o => !['faturada', 'cancelada'].includes(o.estado))
      .reduce((s, o) => s + o.valorEstimado, 0),
  }), [ordens]);

  const colaboradores = useMemo(
    () => [...new Set(ordens.map(o => o.colaboradorNome).filter(Boolean))] as string[],
    [ordens]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">A carregar ordens de serviço...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Ordens de Serviço
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão e acompanhamento de trabalhos em curso
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova OS
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total OS</p>
              <p className="text-2xl font-bold">{kpis.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Em Execução</p>
              <p className="text-2xl font-bold">{kpis.emExecucao}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">Concluídas</p>
              <p className="text-2xl font-bold">{kpis.concluidas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Banknote className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Valor em Aberto</p>
              <p className="text-2xl font-bold">{formatEUR(kpis.valorEmAberto)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por número, título ou cliente..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas prioridades</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={colaboradorFilter} onValueChange={setColaboradorFilter}>
          <SelectTrigger className="w-full md:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos colaboradores</SelectItem>
            {colaboradores.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {OS_ESTADOS_ORDEM.map(estado => {
          const config = OS_ESTADOS[estado];
          const cards = filtered.filter(o => o.estado === estado);
          return (
            <div key={estado} className={cn('rounded-lg border p-3', config.bgColor, config.borderColor)}>
              <div className="flex items-center justify-between mb-3">
                <span className={cn('font-semibold text-sm', config.textColor)}>{config.label}</span>
                <Badge variant="outline" className="bg-background">{cards.length}</Badge>
              </div>
              <div className="space-y-2">
                {cards.map(os => (
                  <Card
                    key={os.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setDetailOrdem(os)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground">{os.numero}</span>
                        <span className={cn('text-xs font-medium', OS_PRIORIDADES[os.prioridade].color)}>
                          {OS_PRIORIDADES[os.prioridade].label}
                        </span>
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{os.titulo}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate">{os.clienteNome}</span>
                      </div>
                      {os.colaboradorNome && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{os.colaboradorNome}</span>
                        </div>
                      )}
                      {os.dataPrevistaConclusao && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{os.dataPrevistaConclusao}</span>
                        </div>
                      )}
                      {os.valorEstimado > 0 && (
                        <p className="text-sm font-semibold">{formatEUR(os.valorEstimado)}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {cards.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem OS</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <OsFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        clientes={clientes}
        employees={employees}
        propostas={propostas}
        onSubmit={async (form) => { await createOrdem(form); setFormOpen(false); }}
      />

      {detailOrdem && (
        <OsDetailDialog
          open={!!detailOrdem}
          onOpenChange={(o: boolean) => { if (!o) setDetailOrdem(null); }}
          ordem={detailOrdem}
          onUpdateEstado={async (estado) => { await updateEstado(detailOrdem.id, estado); setDetailOrdem(null); }}
          onUpdateOrdem={async (form) => { await updateOrdem(detailOrdem.id, form); setDetailOrdem(null); }}
          onDelete={async () => { await deleteOrdem(detailOrdem.id); setDetailOrdem(null); }}
          fetchChecklist={fetchChecklist}
          addChecklistItem={addChecklistItem}
          toggleChecklistItem={toggleChecklistItem}
          deleteChecklistItem={deleteChecklistItem}
        />
      )}
    </div>
  );
}
