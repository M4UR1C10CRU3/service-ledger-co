import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useQuadros } from '@/hooks/useQuadros';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LayoutDashboard, Plus } from 'lucide-react';

const BOARD_COLORS = [
  '#6366f1','#3b82f6','#22c55e','#f59e0b',
  '#ef4444','#a855f7','#ec4899','#14b8a6',
  '#f97316','#64748b','#0ea5e9','#84cc16',
];

export default function Quadros() {
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const { quadros, isLoading, createQuadro } = useQuadros(empresa?.id);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '', cor: '#6366f1' });

  const handleCreate = async () => {
    if (!form.nome.trim()) return;
    const q = await createQuadro(form.nome.trim(), form.cor, form.descricao.trim() || undefined);
    if (q) {
      setCreating(false);
      setForm({ nome: '', descricao: '', cor: '#6366f1' });
      navigate(`/quadros/${q.id}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard size={24} /> Quadros
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie tarefas, projetos e atividades no estilo Trello</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus size={16} /> Novo Quadro
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">A carregar quadros...</div>
      ) : quadros.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayoutDashboard size={52} className="text-muted-foreground/20 mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">Nenhum quadro criado ainda</p>
          <p className="text-sm text-muted-foreground/60 mb-6 max-w-xs">
            Crie o seu primeiro quadro para começar a organizar tarefas, prazos e follow-ups.
          </p>
          <Button onClick={() => setCreating(true)} className="gap-2"><Plus size={16} /> Criar primeiro quadro</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {quadros.map(q => (
            <div
              key={q.id}
              className="relative h-28 rounded-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-sm overflow-hidden group"
              style={{ backgroundColor: q.cor }}
              onClick={() => navigate(`/quadros/${q.id}`)}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/30 to-transparent">
                <p className="text-white font-semibold text-sm leading-tight drop-shadow">{q.nome}</p>
                {q.descricao && <p className="text-white/75 text-xs mt-0.5 truncate">{q.descricao}</p>}
              </div>
            </div>
          ))}

          <div
            className="h-28 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-gray-400 hover:bg-muted/40 flex flex-col items-center justify-center gap-1.5 transition-colors"
            onClick={() => setCreating(true)}
          >
            <Plus size={20} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Novo quadro</span>
          </div>
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Quadro</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="h-20 rounded-lg flex items-end p-3 transition-colors" style={{ backgroundColor: form.cor }}>
              <p className="text-white font-semibold text-sm drop-shadow">{form.nome || 'Nome do quadro'}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Marketing, Sprint #3, Projecto XYZ..." autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea id="desc" value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Objetivo ou contexto deste quadro" rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {BOARD_COLORS.map(c => (
                  <button key={c} className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${form.cor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => setForm(p => ({ ...p, cor: c }))} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.nome.trim()}>Criar Quadro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
