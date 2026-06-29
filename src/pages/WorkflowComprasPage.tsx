import { useState } from 'react';
import { ComprasKanban } from '@/components/compras/ComprasKanban';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, ExternalLink } from 'lucide-react';

export default function WorkflowComprasPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Compras — Workflow</h1>
            <p className="text-sm text-muted-foreground">
              Pipeline de notas de encomenda · Cotação → Aprovação → Entrega → Fatura
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/notas-encomenda')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Ver Notas de Encomenda
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar NE ou fornecedor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Kanban */}
      <ComprasKanban searchTerm={search} />
    </div>
  );
}
