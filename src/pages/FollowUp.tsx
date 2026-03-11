import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, Search, LayoutGrid, List } from 'lucide-react';
import { useFollowup } from '@/hooks/useFollowup';
import { usePropostas } from '@/hooks/usePropostas';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { FollowupCards } from '@/components/followup/FollowupCards';
import { FollowupKanban } from '@/components/followup/FollowupKanban';
import { FollowupTable } from '@/components/followup/FollowupTable';
import { FollowupNewDialog } from '@/components/followup/FollowupNewDialog';
import { FollowupContactDialog } from '@/components/followup/FollowupContactDialog';
import { FollowupDetailDialog } from '@/components/followup/FollowupDetailDialog';
import { FASES_ORDER, FASES_CONFIG, type FaseFollowup } from '@/types/followup';
import type { Oportunidade } from '@/types/followup';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const FollowUp = () => {
  const {
    oportunidades, isLoading, createOportunidade, updateOportunidade,
    updateFase, deleteOportunidade, fetchContactos, createContacto, fetchHistorico,
  } = useFollowup();
  const { propostas } = usePropostas();

  const [newOpen, setNewOpen] = useState(false);
  const [contactOpp, setContactOpp] = useState<Oportunidade | null>(null);
  const [detailOpp, setDetailOpp] = useState<Oportunidade | null>(null);
  const [editOpp, setEditOpp] = useState<Oportunidade | null>(null);
  const [search, setSearch] = useState('');
  const [filterFase, setFilterFase] = useState<string>('todos');

  const filtered = useMemo(() => {
    let list = oportunidades;
    if (filterFase !== 'todos') list = list.filter(o => o.fase === filterFase);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.titulo.toLowerCase().includes(q) ||
        (o.clienteNome || '').toLowerCase().includes(q) ||
        (o.numeroProposta || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [oportunidades, filterFase, search]);

  const handleDelete = async (o: Oportunidade) => {
    if (!confirm(`Eliminar oportunidade "${o.titulo}"?`)) return;
    const ok = await deleteOportunidade(o.id);
    if (ok) toast({ title: 'Oportunidade eliminada' });
  };

  const handleExport = () => {
    const data = filtered.map(o => ({
      Cliente: o.clienteNome || '',
      Oportunidade: o.titulo,
      'Nº Proposta': o.numeroProposta || '',
      Fase: FASES_CONFIG[o.fase].label,
      'Probabilidade (%)': o.probabilidade,
      Valor: o.totalComIva ?? o.valorEstimado ?? 0,
      'Último Contacto': o.dataUltimoContacto ? new Date(o.dataUltimoContacto).toLocaleDateString('pt-PT') : '',
      'Próx. Follow-up': o.proximoFollowupData ? new Date(o.proximoFollowupData).toLocaleDateString('pt-PT') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pipeline');
    XLSX.writeFile(wb, `followup_pipeline_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const propostasForSelector = propostas.map(p => ({
    id: p.id,
    numeroProposta: p.numeroProposta,
    clienteNome: p.clienteNome,
    totalComIva: p.totalComIva,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Follow-up Comercial</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento de oportunidades e pipeline de vendas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Exportar</Button>
          <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova Oportunidade</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <FollowupCards oportunidades={oportunidades} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterFase} onValueChange={setFilterFase}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas as fases" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as fases</SelectItem>
            {FASES_ORDER.map(f => (
              <SelectItem key={f} value={f}>{FASES_CONFIG[f].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Views */}
      {isLoading ? (
        <p className="text-center py-12 text-muted-foreground">A carregar...</p>
      ) : (
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-1" /> Kanban</TabsTrigger>
            <TabsTrigger value="lista"><List className="h-4 w-4 mr-1" /> Lista</TabsTrigger>
          </TabsList>
          <TabsContent value="kanban" className="mt-4">
            <FollowupKanban
              oportunidades={filterFase === 'todos' ? filtered : filtered}
              onUpdateFase={updateFase}
              onViewDetail={setDetailOpp}
              onRegisterContact={setContactOpp}
              onEdit={setDetailOpp}
            />
          </TabsContent>
          <TabsContent value="lista" className="mt-4">
            <FollowupTable
              oportunidades={filtered}
              onViewDetail={setDetailOpp}
              onRegisterContact={setContactOpp}
              onEdit={setDetailOpp}
              onDelete={handleDelete}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <FollowupNewDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSave={createOportunidade}
        propostas={propostasForSelector}
      />

      <FollowupContactDialog
        open={!!contactOpp}
        onOpenChange={(v) => { if (!v) setContactOpp(null); }}
        oportunidade={contactOpp}
        onSave={createContacto}
      />

      <FollowupDetailDialog
        open={!!detailOpp}
        onOpenChange={(v) => { if (!v) setDetailOpp(null); }}
        oportunidade={detailOpp}
        onUpdateOportunidade={updateOportunidade}
        onUpdateFase={updateFase}
        fetchContactos={fetchContactos}
        fetchHistorico={fetchHistorico}
        onRegisterContact={(o) => { setDetailOpp(null); setContactOpp(o); }}
      />
    </div>
  );
};

export default FollowUp;
