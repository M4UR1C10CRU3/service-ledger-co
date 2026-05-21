import { useState, useMemo } from 'react';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useEmpresa } from '@/contexts/EmpresaContext';
import {
  OS_ESTADOS,
  OS_ESTADOS_ORDEM,
  OS_PRIORIDADES,
  OrdemServico,
  emptyOsForm,
} from '@/types/ordemServico';
import { OsFormDialog } from '@/components/ordens-servico/OsFormDialog';
import { OsDetailDialog } from '@/components/ordens-servico/OsDetailDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardList,
  Plus,
  Search,
  Euro,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatEUR = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

const formatDatePT = (iso: string | null | undefined) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

function OrdensServico() {
  const { empresa } = useEmpresa();
  const {
    ordens,
    isInitialized,
    createOrdem,
    updateOrdem,
    updateEstado,
    deleteOrdem,
    fetchChecklist,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
  } = useOrdensServico(empresa?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>('todas');
  const [showForm, setShowForm] = useState(false);
  const [selectedOs, setSelectedOs] = useState<OrdemServico | null>(null);

  const filtered = useMemo(() => {
    let result = ordens;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (o) =>
          o.titulo.toLowerCase().includes(s) ||
          o.clienteNome.toLowerCase().includes(s),
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
              <p className="text-2xl font-bold">{formatEUR(kpis.valorAberto)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
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
      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-4">
          {OS_ESTADOS_ORDEM.map((estado) => {
            const cfg = OS_ESTADOS[estado];
            const cards = filtered.filter((o) => o.estado === estado);
            return (
              <div
                key={estado}
                className="min-w-[260px] w-[260px] flex flex-col gap-2"
              >
                <div
                  className={cn(
                    'rounded-lg border px-3 py-2 flex items-center justify-between',
                    cfg.bg,
                    cfg.border,
                  )}
                >
                  <span className={cn('font-semibold text-sm', cfg.color)}>
                    {cfg.label}
                  </span>
                  <Badge variant="outline" className="bg-background">
                    {cards.length}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {cards.map((os) => (
                    <Card
                      key={os.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedOs(os)}
                    >
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-mono">
                            {os.numero}
                          </span>
                          <span
                            className={cn(
                              'text-xs font-medium',
                              OS_PRIORIDADES[os.prioridade].color,
                            )}
                          >
                            {OS_PRIORIDADES[os.prioridade].label}
                          </span>
                        </div>
                        <p className="font-medium text-sm truncate">{os.titulo}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {os.clienteNome}
                        </p>
                        {os.dataPrevista && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Previsto: {formatDatePT(os.dataPrevista)}</span>
                          </div>
                        )}
                        {os.valorEstimado != null && os.valorEstimado > 0 && (
                          <div className="flex items-center gap-1 text-xs font-medium">
                            <Euro className="h-3 w-3" />
                            <span>{formatEUR(os.valorEstimado)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {cards.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Sem OS
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <OsFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={async (form) => {
          await createOrdem(form);
          setShowForm(false);
        }}
      />

      {selectedOs && (
        <OsDetailDialog
          os={selectedOs}
          onClose={() => setSelectedOs(null)}
          onUpdate={updateOrdem}
          onUpdateEstado={updateEstado}
          onDelete={async (id: string) => {
            const ok = await deleteOrdem(id);
            setSelectedOs(null);
            return ok;
          }}
          fetchChecklist={fetchChecklist}
          addChecklistItem={addChecklistItem}
          toggleChecklistItem={toggleChecklistItem}
          deleteChecklistItem={deleteChecklistItem}
        />
      )}
    </div>
  );
}

export default OrdensServico;
