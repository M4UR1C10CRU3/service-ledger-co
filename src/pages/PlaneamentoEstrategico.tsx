import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePlaneamento } from '@/hooks/usePlaneamento';
import { PlaneamentoKpis } from '@/components/planeamento/PlaneamentoKpis';
import { PlaneamentoFiltros, type PlaneamentoFiltrosState } from '@/components/planeamento/PlaneamentoFiltros';
import { PlaneamentoKanban } from '@/components/planeamento/PlaneamentoKanban';
import { PlaneamentoCardDialog } from '@/components/planeamento/PlaneamentoCardDialog';
import type { PlaneamentoCard } from '@/types/planeamento';

export default function PlaneamentoEstrategico() {
  const { cards, loading, moveCard } = usePlaneamento();
  const [filtros, setFiltros] = useState<PlaneamentoFiltrosState>({
    search: '', responsavel: '__all', prioridade: '__all', area: '__all', prazo: '__all',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlaneamentoCard | null>(null);

  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    cards.forEach(c => c.responsavel_nome && set.add(c.responsavel_nome));
    return Array.from(set).sort();
  }, [cards]);

  const filtered = useMemo(() => {
    const today = new Date();
    return cards.filter(c => {
      if (filtros.search) {
        const q = filtros.search.toLowerCase();
        const hay = [c.titulo, c.descricao || '', ...(c.tags || [])].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filtros.responsavel !== '__all' && c.responsavel_nome !== filtros.responsavel) return false;
      if (filtros.prioridade !== '__all' && c.prioridade !== filtros.prioridade) return false;
      if (filtros.area !== '__all' && c.area_negocio !== filtros.area) return false;
      if (filtros.prazo !== '__all') {
        const p = c.prazo_estimado ? new Date(c.prazo_estimado) : null;
        if (filtros.prazo === 'sem' && p) return false;
        if (filtros.prazo === 'vencido' && (!p || p >= today)) return false;
        if (filtros.prazo === '7d' && (!p || (p.getTime() - today.getTime()) / 86400000 > 7 || p < today)) return false;
        if (filtros.prazo === '30d' && (!p || (p.getTime() - today.getTime()) / 86400000 > 30 || p < today)) return false;
      }
      return true;
    });
  }, [cards, filtros]);

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Planeamento Estratégico</h1>
          <p className="text-sm text-muted-foreground">Gestão de ideias, projectos e estratégias de negócio</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-[#E8561A] hover:bg-[#c64a17] text-white">
          <Plus className="h-4 w-4 mr-1" /> Nova Ideia / Projecto
        </Button>
      </div>

      <PlaneamentoKpis cards={cards} />

      <PlaneamentoFiltros value={filtros} onChange={setFiltros} responsaveis={responsaveis} />

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">A carregar...</div>
      ) : (
        <PlaneamentoKanban
          cards={filtered}
          onMove={moveCard}
          onOpen={(c) => { setEditing(c); setDialogOpen(true); }}
        />
      )}

      <PlaneamentoCardDialog open={dialogOpen} onOpenChange={setDialogOpen} card={editing} />
    </div>
  );
}
