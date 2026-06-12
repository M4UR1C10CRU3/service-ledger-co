import { useMemo, useState } from 'react';
import { useNotasEncomenda } from '@/hooks/useNotasEncomenda';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { NotaEncomenda } from '@/types/notaEncomenda';
import { NeFormDialog } from '@/components/notas-encomenda/NeFormDialog';
import { NeDetailDialog } from '@/components/notas-encomenda/NeDetailDialog';
import { ComprasKanban } from '@/components/compras/ComprasKanban';
import { ShoppingBag, Plus, Search, Clock, CheckCircle2, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const fmtEUR = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

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

      {/* Kanban com drag-and-drop e automações de email */}
      <ComprasKanban searchTerm={searchTerm} onDetail={setSelectedNe} />

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
