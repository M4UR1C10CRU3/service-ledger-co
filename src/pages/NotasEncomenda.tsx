import { useMemo, useState } from 'react';
import { useNotasEncomenda } from '@/hooks/useNotasEncomenda';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { NE_ESTADOS, NE_ESTADOS_ORDEM, NE_PRIORIDADES, NotaEncomenda } from '@/types/notaEncomenda';
import { NeFormDialog } from '@/components/notas-encomenda/NeFormDialog';
import { NeDetailDialog } from '@/components/notas-encomenda/NeDetailDialog';
import { ShoppingBag, Plus, Search, Package, Clock, CheckCircle2, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const fmtEUR = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const TERMINAIS = ['recebida', 'faturada', 'cancelada'];

function NotasEncomenda() {
  const { empresa } = useEmpresa();
  const {
    notas, isInitialized,
    createNota, updateEstado, deleteNota,
    fetchItems, fetchChecklist, toggleChecklistItem, addChecklistItem,
  } = useNotasEncomenda(empresa?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedNe, setSelectedNe] = useState<NotaEncomenda | null>(null);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return notas;
    return notas.filter(n =>
      n.titulo.toLowerCase().includes(q) ||
      (n.fornecedorNome ?? '').toLowerCase().includes(q)
    );
  }, [notas, searchTerm]);

  const kpis = useMemo(() => {
    const emCurso = notas.filter(n => !TERMINAIS.includes(n.estado)).length;
    const recebidas = notas.filter(n => n.estado === 'recebida').length;
    const valor = notas
      .filter(n => n.estado !== 'cancelada')
      .reduce((s, n) => s + (n.valorEstimado ?? 0), 0);
    return { total: notas.length, emCurso, recebidas, valor };
  }, [notas]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notas de Encomenda</h1>
            <p className="text-sm text-muted-foreground">Gestão de pedidos a fornecedores</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova NE
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90">Total NE</p>
                <p className="text-2xl font-bold">{kpis.total}</p>
              </div>
              <ShoppingBag className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90">Em Curso</p>
                <p className="text-2xl font-bold">{kpis.emCurso}</p>
              </div>
              <Clock className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90">Recebidas</p>
                <p className="text-2xl font-bold">{kpis.recebidas}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90">Valor Estimado</p>
                <p className="text-xl font-bold">{fmtEUR(kpis.valor)}</p>
              </div>
              <Euro className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por título ou fornecedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4">
          {NE_ESTADOS_ORDEM.map((estado) => {
            const cfg = NE_ESTADOS[estado];
            const itens = filtered.filter(n => n.estado === estado);
            return (
              <div key={estado} className="min-w-[240px] w-[240px] flex-shrink-0">
                <div className={`rounded-t-lg border ${cfg.border} ${cfg.bg} px-3 py-2 flex items-center justify-between`}>
                  <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                  <Badge variant="secondary" className="text-xs">{itens.length}</Badge>
                </div>
                <div className={`border-x border-b ${cfg.border} rounded-b-lg bg-muted/20 p-2 space-y-2 min-h-[200px]`}>
                  {itens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                      <Package className="h-6 w-6 mb-1 opacity-40" />
                      <span className="text-xs">Sem registos</span>
                    </div>
                  ) : (
                    itens.map((ne) => {
                      const prio = NE_PRIORIDADES[ne.prioridade];
                      return (
                        <Card
                          key={ne.id}
                          onClick={() => setSelectedNe(ne)}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground font-mono">{ne.numero}</span>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${prio.color}`}>
                                {prio.label}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium line-clamp-2">{ne.titulo}</p>
                            {ne.fornecedorNome && (
                              <p className="text-xs text-muted-foreground truncate">{ne.fornecedorNome}</p>
                            )}
                            {ne.dataNecessidade && (
                              <p className="text-xs text-muted-foreground">📅 {fmtDate(ne.dataNecessidade)}</p>
                            )}
                            {ne.valorEstimado !== null && (
                              <p className="text-xs font-semibold text-foreground">{fmtEUR(ne.valorEstimado)}</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <NeFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={async (form, items) => {
          await createNota(form, items);
          setShowForm(false);
        }}
      />

      <NeDetailDialog
        ne={selectedNe}
        onClose={() => setSelectedNe(null)}
        onUpdateEstado={updateEstado}
        onDelete={async (id) => {
          await deleteNota(id);
          setSelectedNe(null);
        }}
        fetchItems={fetchItems}
        fetchChecklist={fetchChecklist}
        toggleChecklistItem={toggleChecklistItem}
        addChecklistItem={addChecklistItem}
      />
    </div>
  );
}

export default NotasEncomenda;
