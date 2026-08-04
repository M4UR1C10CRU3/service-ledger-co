import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useQuadros } from '@/hooks/useQuadros';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LayoutDashboard, Plus, Check } from 'lucide-react';
import { useQuadroModelos, useCriarQuadroDeModelo, CAMPOS_LABEL } from '@/hooks/useQuadroProcesso';

const BOARD_COLORS = [
  '#6366f1','#3b82f6','#22c55e','#f59e0b',
  '#ef4444','#a855f7','#ec4899','#14b8a6',
  '#f97316','#64748b','#0ea5e9','#84cc16',
];

export default function Quadros() {
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const { quadros, isLoading, createQuadro } = useQuadros(empresa?.id);

  const { modelos } = useQuadroModelos();
  const criarDeModelo = useCriarQuadroDeModelo();

  const [creating, setCreating] = useState(false);
  const [modelo, setModelo] = useState('livre');
  const [form, setForm] = useState({ nome: '', descricao: '', cor: '#6366f1' });

  const fecharDialogo = () => {
    setCreating(false);
    setModelo('livre');
    setForm({ nome: '', descricao: '', cor: '#6366f1' });
  };

  const handleCreate = async () => {
    if (!form.nome.trim() || criarDeModelo.isPending) return;

    // 'livre' não tem processo nenhum — continua a criar-se como sempre se criou.
    if (modelo === 'livre') {
      const q = await createQuadro(form.nome.trim(), form.cor, form.descricao.trim() || undefined);
      if (q) { fecharDialogo(); navigate(`/quadros/${q.id}`); }
      return;
    }

    const id = await criarDeModelo.mutateAsync({
      modelo,
      nome: form.nome.trim(),
      cor: form.cor,
      descricao: form.descricao.trim() || undefined,
    }).catch(() => null);
    if (id) { fecharDialogo(); navigate(`/quadros/${id}`); }
  };

  const modeloEscolhido = modelos.find(m => m.codigo === modelo);

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

      <Dialog open={creating} onOpenChange={o => (o ? setCreating(true) : fecharDialogo())}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Quadro</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="h-20 rounded-lg flex items-end p-3 transition-colors" style={{ backgroundColor: form.cor }}>
              <p className="text-white font-semibold text-sm drop-shadow">{form.nome || 'Nome do quadro'}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de quadro</Label>
              <p className="text-xs text-muted-foreground -mt-0.5">
                Um quadro livre não tem regras nenhumas. Os restantes já vêm com as colunas do processo montadas.
              </p>
              <div className="grid gap-1.5 pt-1">
                {modelos.map(m => {
                  const sel = modelo === m.codigo;
                  return (
                    <button
                      key={m.codigo}
                      type="button"
                      onClick={() => setModelo(m.codigo)}
                      className={`text-left rounded-lg border p-2.5 transition-colors ${
                        sel ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.nome}</span>
                        {m.listas.length > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            {m.listas.length} colunas
                          </span>
                        )}
                        {sel && <Check size={14} className="ml-auto text-primary shrink-0" />}
                      </div>
                      {m.descricao && (
                        <p className="text-xs text-muted-foreground mt-0.5">{m.descricao}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {modeloEscolhido && modeloEscolhido.listas.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-normal">Colunas que vão ser criadas</Label>
                <div className="flex flex-wrap gap-1.5">
                  {modeloEscolhido.listas.map(l => (
                    <span
                      key={l.estadoCodigo}
                      className="text-[11px] rounded px-1.5 py-0.5 border"
                      style={{ borderColor: l.cor ?? undefined, color: l.cor ?? undefined }}
                      title={
                        l.camposObrigatorios.length
                          ? `Para entrar aqui: ${l.camposObrigatorios.map(c => CAMPOS_LABEL[c] ?? c).join(', ')}`
                          : 'Entra sem exigências'
                      }
                    >
                      {l.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
            <Button variant="ghost" onClick={fecharDialogo}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.nome.trim() || criarDeModelo.isPending}>
              {criarDeModelo.isPending ? 'A criar...' : 'Criar Quadro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
