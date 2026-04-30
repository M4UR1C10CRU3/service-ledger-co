import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Search, Megaphone, Calendar as CalendarIcon, Sparkles, LayoutGrid } from 'lucide-react';
import { useMarketing } from '@/hooks/useMarketing';
import { useToast } from '@/hooks/use-toast';
import { MarketingKanban } from '@/components/marketing/MarketingKanban';
import { MarketingCalendar } from '@/components/marketing/MarketingCalendar';
import { MarketingTarefaDialog } from '@/components/marketing/MarketingTarefaDialog';
import { MarketingDetailDialog } from '@/components/marketing/MarketingDetailDialog';
import { MarketingAIDialog } from '@/components/marketing/MarketingAIDialog';
import {
  STATUS_CONFIG,
  STATUS_ORDER,
  type MarketingTarefa,
  type MarketingStatus,
} from '@/types/marketing';

export default function Marketing() {
  const { tarefas, isLoading, updateStatus, deleteTarefa } = useMarketing();
  const { toast } = useToast();

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'kanban' | 'calendario'>(
    searchParams.get('vista') === 'calendario' ? 'calendario' : 'kanban'
  );

  useEffect(() => {
    const v = searchParams.get('vista');
    if (v === 'calendario') setView('calendario');
    else if (v === 'kanban') setView('kanban');
  }, [searchParams]);
  
  const [formOpen, setFormOpen] = useState(false);
  const [editTarefa, setEditTarefa] = useState<MarketingTarefa | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<MarketingStatus | undefined>(undefined);
  const [detailTarefa, setDetailTarefa] = useState<MarketingTarefa | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return tarefas;
    const s = search.trim().toLowerCase();
    return tarefas.filter(t =>
      t.titulo.toLowerCase().includes(s) ||
      (t.responsavelNome || '').toLowerCase().includes(s) ||
      (t.copyLegenda || '').toLowerCase().includes(s) ||
      (t.hashtags || '').toLowerCase().includes(s)
    );
  }, [tarefas, search]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    STATUS_ORDER.forEach(s => { out[s] = tarefas.filter(t => t.status === s).length; });
    return out;
  }, [tarefas]);

  const handleNew = () => {
    setEditTarefa(null);
    setDefaultStatus(undefined);
    setFormOpen(true);
  };

  const handleAddInColumn = (status: MarketingStatus) => {
    setEditTarefa(null);
    setDefaultStatus(status);
    setFormOpen(true);
  };

  const handleEdit = (t: MarketingTarefa) => {
    setEditTarefa(t);
    setDefaultStatus(undefined);
    setFormOpen(true);
  };

  const handleView = (t: MarketingTarefa) => {
    setDetailTarefa(t);
    setDetailOpen(true);
  };

  const handleDelete = async (t: MarketingTarefa) => {
    if (!confirm(`Eliminar a tarefa "${t.titulo}"? Esta acção não pode ser desfeita.`)) return;
    const ok = await deleteTarefa(t.id);
    if (ok) toast({ title: 'Tarefa eliminada' });
    else toast({ title: 'Erro ao eliminar', variant: 'destructive' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-7 w-7" style={{ color: '#E8561A' }} />
            Marketing
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão de campanhas e conteúdo — Kanban, Calendário e geração com IA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1" />
            Gerar com IA
          </Button>
          <Button onClick={handleNew} style={{ backgroundColor: '#E8561A' }}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_ORDER.map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <Card key={s} className="p-3 border-l-4" style={{ borderLeftColor: cfg.color }}>
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
              <p className="text-2xl font-bold mt-1">{counts[s] ?? 0}</p>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por título, responsável, copy ou hashtag..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs Kanban / Calendário */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">A carregar...</p>
      ) : tarefas.length === 0 ? (
        <Card className="p-12 text-center">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Ainda não tem tarefas de marketing.</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button onClick={handleNew} style={{ backgroundColor: '#E8561A' }}>
              <Plus className="h-4 w-4 mr-1" /> Criar primeira tarefa
            </Button>
            <Button variant="outline" onClick={() => setAiOpen(true)}>
              <Sparkles className="h-4 w-4 mr-1" /> Gerar com IA
            </Button>
          </div>
        </Card>
      ) : (
        <Tabs value={view} onValueChange={v => setView(v as 'kanban' | 'calendario')}>
          <TabsList>
            <TabsTrigger value="kanban">
              <LayoutGrid className="h-4 w-4 mr-1" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="calendario">
              <CalendarIcon className="h-4 w-4 mr-1" /> Calendário
            </TabsTrigger>
          </TabsList>
          <TabsContent value="kanban" className="mt-4">
            <MarketingKanban
              tarefas={filtered}
              onUpdateStatus={updateStatus}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddInColumn={handleAddInColumn}
            />
          </TabsContent>
          <TabsContent value="calendario" className="mt-4">
            <MarketingCalendar tarefas={filtered} onCardClick={handleView} />
          </TabsContent>
        </Tabs>
      )}

      <MarketingTarefaDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarefa}
        defaultStatus={defaultStatus}
      />

      <MarketingDetailDialog
        tarefa={detailTarefa}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <MarketingAIDialog open={aiOpen} onOpenChange={setAiOpen} />
    </div>
  );
}
