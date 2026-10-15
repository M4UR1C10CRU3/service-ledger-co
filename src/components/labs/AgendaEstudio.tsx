import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useProjetos } from '@/hooks/useProjetos';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Settings2 } from 'lucide-react';

/**
 * Agenda do estúdio e do equipamento (Estúdio Criativo, e o podcast).
 *
 * Mostra a semana, dia a dia. Uma gravação reserva de uma vez o estúdio e as
 * peças de equipamento escolhidas — uma linha em lb_reservas por recurso; se
 * algum já estiver ocupado nesse horário, a base de dados recusa e a reserva
 * não fica a meio (as linhas criadas são desfeitas).
 */
const TIPOS: Record<string, string> = {
  estudio: 'Estúdio', camara: 'Câmara', objetiva: 'Objetiva', audio: 'Áudio', luz: 'Luz',
  drone: 'Drone', computador: 'Computador', outro: 'Outro',
};

interface Recurso { id: string; tipo: string; nome: string; descricao: string | null; ativo: boolean }
interface Reserva { id: string; recurso_id: string; inicio: string; fim: string; titulo: string; projeto_id: string | null; cliente_nome: string | null; responsavel_nome: string | null; notas: string | null }

const inicioSemana = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

export function AgendaEstudio() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { empresa } = useEmpresa();
  const { projetos } = useProjetos();
  const [semana, setSemana] = useState(() => inicioSemana(new Date()));
  const [nova, setNova] = useState<{ titulo: string; inicio: string; fim: string; recursos: string[]; projetoId: string | null; responsavel: string; notas: string } | null>(null);
  const [gerir, setGerir] = useState(false);
  const [novoRecurso, setNovoRecurso] = useState({ tipo: 'camara', nome: '' });

  const fimSemana = new Date(semana.getTime() + 7 * 864e5);
  const { data, isLoading } = useQuery({
    queryKey: ['lb_agenda', empresa?.id, semana.toISOString()],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const eid = empresa!.id;
      const [rec, res] = await Promise.all([
        (supabase.from('lb_recursos' as any) as any).select('*').eq('empresa_id', eid).order('tipo').order('nome'),
        (supabase.from('lb_reservas' as any) as any).select('*').eq('empresa_id', eid)
          .lt('inicio', fimSemana.toISOString()).gt('fim', semana.toISOString()).order('inicio'),
      ]);
      if (rec.error) return { recursos: [] as Recurso[], reservas: [] as Reserva[], semTabela: true };
      return { recursos: (rec.data || []) as Recurso[], reservas: (res.data || []) as Reserva[], semTabela: false };
    },
  });

  const recursos = (data?.recursos ?? []).filter(r => r.ativo);
  const nomeRecurso = (id: string) => data?.recursos.find(r => r.id === id)?.nome ?? '—';

  // Uma gravação = várias linhas (uma por recurso) com o mesmo título e horário.
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semana.getTime() + i * 864e5);
    const doDia = (data?.reservas ?? []).filter(r => new Date(r.inicio).toDateString() === d.toDateString());
    const grupos: Record<string, { r: Reserva; recursos: string[] }> = {};
    for (const r of doDia) {
      const k = `${r.titulo}|${r.inicio}|${r.fim}`;
      (grupos[k] ??= { r, recursos: [] }).recursos.push(nomeRecurso(r.recurso_id));
    }
    return { d, grupos: Object.values(grupos) };
  }), [semana, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirNova = (d?: Date) => {
    const base = d ? new Date(d) : new Date();
    base.setHours(14, 0, 0, 0); // a janela de gravação em Mirandela começa às 14h
    const estudio = recursos.find(r => r.tipo === 'estudio');
    setNova({ titulo: '', inicio: local(base), fim: local(new Date(base.getTime() + 3 * 36e5)), recursos: estudio ? [estudio.id] : [], projetoId: null, responsavel: '', notas: '' });
  };

  const guardar = async () => {
    if (!empresa || !nova?.titulo.trim() || !nova.recursos.length) return;
    const proj = projetos.find(p => p.id === nova.projetoId);
    const linhas = nova.recursos.map(recurso_id => ({
      empresa_id: empresa.id, recurso_id, titulo: nova.titulo.trim(),
      inicio: new Date(nova.inicio).toISOString(), fim: new Date(nova.fim).toISOString(),
      projeto_id: nova.projetoId, cliente_nome: proj?.clienteNome ?? null,
      responsavel_nome: nova.responsavel || null, notas: nova.notas || null,
    }));
    const criadas: string[] = [];
    for (const l of linhas) {
      const { data: row, error } = await (supabase.from('lb_reservas' as any) as any).insert(l).select('id').single();
      if (error) {
        // Desfaz as linhas desta gravação que já tinham entrado: ou fica tudo reservado, ou nada.
        if (criadas.length) await (supabase.from('lb_reservas' as any) as any).delete().in('id', criadas).eq('empresa_id', empresa.id);
        toast({ title: 'Não foi possível reservar', description: error.message, variant: 'destructive' });
        return;
      }
      criadas.push(row.id);
    }
    toast({ title: 'Reservado', description: `${linhas.length} recurso(s).` });
    setNova(null);
    qc.invalidateQueries({ queryKey: ['lb_agenda'] });
  };

  const cancelarGrupo = async (r: Reserva) => {
    const { error } = await (supabase.from('lb_reservas' as any) as any).delete()
      .eq('empresa_id', empresa!.id).eq('titulo', r.titulo).eq('inicio', r.inicio).eq('fim', r.fim);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else qc.invalidateQueries({ queryKey: ['lb_agenda'] });
  };

  const criarRecurso = async () => {
    if (!empresa || !novoRecurso.nome.trim()) return;
    const { error } = await (supabase.from('lb_recursos' as any) as any)
      .insert({ empresa_id: empresa.id, tipo: novoRecurso.tipo, nome: novoRecurso.nome.trim() });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setNovoRecurso({ tipo: novoRecurso.tipo, nome: '' });
    qc.invalidateQueries({ queryKey: ['lb_agenda'] });
  };

  const desativarRecurso = async (r: Recurso) => {
    await (supabase.from('lb_recursos' as any) as any).update({ ativo: false }).eq('id', r.id).eq('empresa_id', empresa!.id);
    qc.invalidateQueries({ queryKey: ['lb_agenda'] });
  };

  const hoje = new Date().toDateString();

  return (
    <Card><CardContent className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-vertical" />Agenda do estúdio e equipamento</h2>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => setSemana(s => new Date(s.getTime() - 7 * 864e5))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm tabular-nums">{semana.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} – {new Date(fimSemana.getTime() - 864e5).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</span>
          <Button size="icon" variant="ghost" onClick={() => setSemana(s => new Date(s.getTime() + 7 * 864e5))}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setGerir(true)} disabled={data?.semTabela}><Settings2 className="h-3.5 w-3.5 mr-1" />Equipamento</Button>
          <Button size="sm" onClick={() => abrirNova()} disabled={data?.semTabela}><Plus className="h-3.5 w-3.5 mr-1" />Reservar</Button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">A carregar...</p>
        : data?.semTabela ? <p className="text-sm text-muted-foreground">A agenda fica ativa quando o SQL do Estúdio Criativo for aplicado.</p>
        : (
          <div className="grid md:grid-cols-7 gap-2">
            {dias.map(({ d, grupos }) => (
              <div key={d.toISOString()}
                   className={`rounded-[12px] border p-2.5 min-h-[120px] space-y-2 ${d.toDateString() === hoje ? 'border-vertical-border bg-vertical-soft' : 'border-border'}`}>
                <button type="button" className="w-full flex justify-between text-xs text-muted-foreground hover:text-foreground" onClick={() => abrirNova(d)}>
                  <span className="capitalize">{d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit' })}</span><Plus className="h-3 w-3" />
                </button>
                {grupos.map(({ r, recursos: rs }) => (
                  <div key={r.id} className="rounded-[10px] bg-card border border-border p-2 text-xs space-y-1 group">
                    <p className="font-mono tabular-nums text-vertical">{hora(r.inicio)}–{hora(r.fim)}</p>
                    <p className="font-medium leading-tight">{r.titulo}</p>
                    <p className="text-muted-foreground leading-tight">{rs.join(' · ')}</p>
                    {r.responsavel_nome && <p className="text-muted-foreground">{r.responsavel_nome}</p>}
                    <button type="button" className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => cancelarGrupo(r)}>Cancelar</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

      <Dialog open={!!nova} onOpenChange={v => { if (!v) setNova(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Nova reserva</DialogTitle></DialogHeader>
          {nova && (
            <div className="space-y-4">
              <div><Label>O quê *</Label><Input value={nova.titulo} onChange={e => setNova(n => ({ ...n!, titulo: e.target.value }))} placeholder="ex.: Gravação EP.02 · Prof. Renne" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Início</Label><Input type="datetime-local" value={nova.inicio} onChange={e => setNova(n => ({ ...n!, inicio: e.target.value }))} /></div>
                <div><Label>Fim</Label><Input type="datetime-local" value={nova.fim} onChange={e => setNova(n => ({ ...n!, fim: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Recursos *</Label>
                <div className="grid sm:grid-cols-2 gap-2 mt-1.5">
                  {recursos.map(r => (
                    <label key={r.id} className="flex items-center gap-2 text-sm rounded-[10px] border border-border px-3 py-2 cursor-pointer">
                      <Checkbox checked={nova.recursos.includes(r.id)}
                                onCheckedChange={v => setNova(n => ({ ...n!, recursos: v ? [...n!.recursos, r.id] : n!.recursos.filter(x => x !== r.id) }))} />
                      <span className="truncate">{r.nome}</span><Badge variant="outline" className="ml-auto text-[10px]">{TIPOS[r.tipo]}</Badge>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Projeto</Label>
                  <Select value={nova.projetoId ?? 'sem'} onValueChange={v => setNova(n => ({ ...n!, projetoId: v === 'sem' ? null : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem">Nenhum</SelectItem>
                      {projetos.filter(p => p.estado === 'ativo').map(p => <SelectItem key={p.id} value={p.id}>{p.numero} · {p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
                <div><Label>Responsável</Label><Input value={nova.responsavel} onChange={e => setNova(n => ({ ...n!, responsavel: e.target.value }))} placeholder="ex.: Maurício Jr" /></div>
              </div>
              <div><Label>Notas</Label><Textarea rows={2} value={nova.notas} onChange={e => setNova(n => ({ ...n!, notas: e.target.value }))} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNova(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!nova?.titulo.trim() || !nova?.recursos.length}>Reservar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={gerir} onOpenChange={setGerir}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Estúdio e equipamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="divide-y divide-border">
              {recursos.map(r => (
                <div key={r.id} className="flex items-center gap-3 py-2">
                  <Badge variant="outline">{TIPOS[r.tipo]}</Badge><span className="text-sm flex-1">{r.nome}</span>
                  <Button size="sm" variant="ghost" onClick={() => desativarRecurso(r)}>Retirar</Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={novoRecurso.tipo} onValueChange={v => setNovoRecurso(n => ({ ...n, tipo: v }))}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={novoRecurso.nome} onChange={e => setNovoRecurso(n => ({ ...n, nome: e.target.value }))} placeholder="ex.: Sony FX3" />
              <Button onClick={criarRecurso} disabled={!novoRecurso.nome.trim()}>Juntar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  );
}

export default AgendaEstudio;
