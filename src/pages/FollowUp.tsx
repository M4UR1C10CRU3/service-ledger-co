import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, Search, LayoutGrid, List } from 'lucide-react';
import { useFollowup } from '@/hooks/useFollowup';
import { useNucleos } from '@/hooks/useNucleos';
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
  const { logActivity } = useActivityLogger();

  const [newOpen, setNewOpen] = useState(false);
  const [contactOpp, setContactOpp] = useState<Oportunidade | null>(null);
  const [detailOpp, setDetailOpp] = useState<Oportunidade | null>(null);
  const [editOpp, setEditOpp] = useState<Oportunidade | null>(null);
  const [search, setSearch] = useState('');
  const [filterFase, setFilterFase] = useState<string>('todos');
  // Clariza Labs: filtro por núcleo (as outras empresas não o veem).
  const { nucleos, eLabs } = useNucleos();
  const [filterNucleo, setFilterNucleo] = useState<string>('todos');

  const filtered = useMemo(() => {
    let list = oportunidades;
    if (filterFase !== 'todos') list = list.filter(o => o.fase === filterFase);
    if (eLabs && filterNucleo !== 'todos') list = list.filter(o => filterNucleo === 'sem' ? !o.nucleoId : o.nucleoId === filterNucleo);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.titulo.toLowerCase().includes(q) ||
        (o.clienteNome || '').toLowerCase().includes(q) ||
        (o.numeroProposta || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [oportunidades, filterFase, search, eLabs, filterNucleo]);

  const handleDelete = async (o: Oportunidade) => {
    if (!confirm(`Eliminar oportunidade "${o.titulo}"?`)) return;
    const ok = await deleteOportunidade(o.id);
    if (ok) {
      toast({ title: 'Oportunidade eliminada' });
      logActivity({ modulo: 'Follow-up', acao: 'eliminou_oportunidade', descricao: `Eliminou oportunidade "${o.titulo}"`, entidade_tipo: 'oportunidade', entidade_id: o.id });
    }
  };

  const handleCreateOportunidade: typeof createOportunidade = async (data) => {
    const id = await createOportunidade(data);
    if (id) {
      logActivity({ modulo: 'Follow-up', acao: 'criou_oportunidade', descricao: `Criou oportunidade "${data.titulo}"`, entidade_tipo: 'oportunidade', entidade_id: id });
    }
    return id;
  };

  const handleUpdateOportunidade: typeof updateOportunidade = async (id, updates) => {
    const ok = await updateOportunidade(id, updates);
    if (ok) {
      logActivity({ modulo: 'Follow-up', acao: 'editou_oportunidade', descricao: 'Editou dados da oportunidade', entidade_tipo: 'oportunidade', entidade_id: id });
    }
    return ok;
  };

  const handleUpdateFase: typeof updateFase = async (id, novaFase, motivo) => {
    const ok = await updateFase(id, novaFase, motivo);
    if (ok) {
      logActivity({ modulo: 'Follow-up', acao: 'mudou_fase_oportunidade', descricao: `Mudou fase para "${FASES_CONFIG[novaFase].label}"`, entidade_tipo: 'oportunidade', entidade_id: id });
    }
    return ok;
  };

  const handleCreateContacto: typeof createContacto = async (oportunidadeId, contacto) => {
    const ok = await createContacto(oportunidadeId, contacto);
    if (ok) {
      logActivity({ modulo: 'Follow-up', acao: 'registou_contacto', descricao: 'Registou contacto com o cliente', entidade_tipo: 'oportunidade', entidade_id: oportunidadeId });
    }
    return ok;
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
          <h1 className="text-2xl font-bold">Workflow Comercial</h1>
          <p className="text-sm text-muted-foreground">Pipeline de oportunidades desde o PO até à adjudicação</p>
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
        {eLabs && (
          <Select value={filterNucleo} onValueChange={setFilterNucleo}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os núcleos</SelectItem>
              {nucleos.map(n => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}
              <SelectItem value="sem">Por classificar</SelectItem>
            </SelectContent>
          </Select>
        )}
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
              oportunidades={filtered}
              onUpdateFase={handleUpdateFase}
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
        onSave={handleCreateOportunidade}
        propostas={propostasForSelector}
      />

      <FollowupContactDialog
        open={!!contactOpp}
        onOpenChange={(v) => { if (!v) setContactOpp(null); }}
        oportunidade={contactOpp}
        onSave={handleCreateContacto}
      />

      <FollowupDetailDialog
        open={!!detailOpp}
        onOpenChange={(v) => { if (!v) setDetailOpp(null); }}
        oportunidade={detailOpp}
        onUpdateOportunidade={handleUpdateOportunidade}
        onUpdateFase={handleUpdateFase}
        fetchContactos={fetchContactos}
        fetchHistorico={fetchHistorico}
        onRegisterContact={(o) => { setDetailOpp(null); setContactOpp(o); }}
      />
    </div>
  );
};

export default FollowUp;
