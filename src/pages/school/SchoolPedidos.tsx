import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSchoolPedidos, ESTADOS_PEDIDO, type PedidoITC } from '@/hooks/useSchoolPedidos';
import { Inbox, Users, CalendarDays, MapPin, Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const fmt = (d: string | null) => {
  if (!d) return '—';
  const dt = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return isNaN(dt.getTime()) ? '—' : format(dt, 'dd/MM/yyyy', { locale: pt });
};

/**
 * Pedidos de formação, do lado do ITC.
 *
 * A empresa cliente pede por quantidade; aqui responde-se com valor e, ao
 * confirmar, aponta-se a TURMA onde a formação vai decorrer. É essa turma que
 * abre à empresa a possibilidade de indicar nome e documento de cada
 * colaborador — sem ela, o pedido fica confirmado no papel e parado na prática.
 */
export default function SchoolPedidos() {
  const { pedidos, isLoading, responder, turmasDoCurso } = useSchoolPedidos();
  const [aResponder, setAResponder] = useState<PedidoITC | null>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [form, setForm] = useState({ estado: '', resposta: '', valor: '', turma_id: '' });

  useEffect(() => {
    if (!aResponder) return;
    setForm({
      estado: aResponder.estado === 'pedido' ? 'em_analise' : aResponder.estado,
      resposta: aResponder.resposta ?? '',
      valor: aResponder.valor_proposto != null ? String(aResponder.valor_proposto) : '',
      turma_id: aResponder.turma_id ?? '',
    });
    turmasDoCurso(aResponder.curso_id).then(setTurmas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aResponder?.id]);

  const submeter = async () => {
    if (!aResponder) return;
    await responder.mutateAsync({
      id: aResponder.id,
      estado: form.estado,
      resposta: form.resposta.trim() || undefined,
      valor_proposto: form.valor ? Number(form.valor) : null,
      turma_id: form.turma_id || null,
    });
    setAResponder(null);
  };

  const porTratar = pedidos.filter(p => ['pedido', 'em_analise'].includes(p.estado));
  const tratados = pedidos.filter(p => !['pedido', 'em_analise'].includes(p.estado));

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="ds-page space-y-6">
      <div>
        <p className="ds-eyebrow">Formação corporativa</p>
        <h1 className="text-2xl font-bold">Pedidos de formação</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos enviados pelas empresas clientes através do portal.
        </p>
      </div>

      <div className="ds-metric-grid">
        <Kpi label="Por tratar" valor={porTratar.length} />
        <Kpi label="Confirmados" valor={pedidos.filter(p => p.estado === 'confirmado').length} />
        <Kpi label="Concluídos" valor={pedidos.filter(p => p.estado === 'concluido').length} />
        <Kpi label="Total" valor={pedidos.length} />
      </div>

      <Seccao titulo="Por tratar" lista={porTratar} onResponder={setAResponder} vazio="Nenhum pedido por tratar." />
      <Seccao titulo="Já respondidos" lista={tratados} onResponder={setAResponder} vazio="Ainda não há pedidos respondidos." />

      <Dialog open={!!aResponder} onOpenChange={o => !o && setAResponder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Responder ao pedido {aResponder?.numero}</DialogTitle>
          </DialogHeader>
          {aResponder && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm space-y-1 bg-muted/30">
                <p className="font-medium">{aResponder.cliente_nome}</p>
                <p className="text-muted-foreground">
                  {aResponder.curso_nome} · {aResponder.n_formandos ?? '—'} formandos · {aResponder.modalidade ?? '—'}
                </p>
                <p className="text-muted-foreground text-xs">
                  Pretendida: {fmt(aResponder.data_pretendida)} · {aResponder.local_pretendido || 'local por definir'}
                </p>
                {aResponder.observacoes && (
                  <p className="text-xs text-muted-foreground pt-1 border-t mt-2">{aResponder.observacoes}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Estado *</Label>
                  <Select value={form.estado} onValueChange={v => setForm(p => ({ ...p, estado: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_analise">Em análise</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="recusado">Recusado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Valor proposto (€)</Label>
                  <Input type="number" step="0.01" value={form.valor}
                    onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} />
                </div>
              </div>

              {/* Confirmar exige turma: é ela que destranca o preenchimento
                  dos formandos do lado da empresa. */}
              {form.estado === 'confirmado' && (
                <div className="space-y-1">
                  <Label>Turma onde vai decorrer *</Label>
                  {turmas.length === 0 ? (
                    <p className="text-sm text-amber-600">
                      Não há turmas abertas deste curso. Crie a turma em Turmas e volte aqui.
                    </p>
                  ) : (
                    <Select value={form.turma_id} onValueChange={v => setForm(p => ({ ...p, turma_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Escolha a turma" /></SelectTrigger>
                      <SelectContent>
                        {turmas.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.titulo}{t.inicio ? ` · início ${fmt(t.inicio)}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Ao confirmar, a empresa passa a poder indicar nome e documento
                    de cada colaborador no portal dela.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label>Resposta à empresa</Label>
                <Textarea rows={3} value={form.resposta}
                  placeholder="Condições, datas, o que a empresa precisa de saber..."
                  onChange={e => setForm(p => ({ ...p, resposta: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAResponder(null)}>Cancelar</Button>
            <Button onClick={submeter} disabled={!form.estado || responder.isPending}>
              {responder.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A guardar...</>
                : <><Send className="h-4 w-4 mr-2" />Responder</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Seccao({ titulo, lista, onResponder, vazio }: {
  titulo: string; lista: PedidoITC[]; onResponder: (p: PedidoITC) => void; vazio: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
      {lista.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          <Inbox className="h-7 w-7 mx-auto mb-2 opacity-30" />{vazio}
        </CardContent></Card>
      ) : lista.map(p => {
        const e = ESTADOS_PEDIDO[p.estado as keyof typeof ESTADOS_PEDIDO];
        return (
          <Card key={p.id}>
            <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-xs text-muted-foreground">{p.numero}</code>
                  <Badge variant="outline" className={e?.cls}>{e?.rotulo ?? p.estado}</Badge>
                </div>
                <p className="font-medium">{p.cliente_nome}</p>
                <p className="text-sm text-muted-foreground">{p.curso_nome}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />{p.n_formandos ?? '—'} formandos
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />{fmt(p.data_pretendida)}
                  </span>
                  {p.local_pretendido && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />{p.local_pretendido}
                    </span>
                  )}
                </div>
                {p.turma_titulo && (
                  <p className="text-xs">
                    Turma: <span className="font-medium">{p.turma_titulo}</span>
                    {' · '}
                    <span className={p.indicados >= (p.n_formandos ?? 0) ? 'text-green-600' : 'text-amber-600'}>
                      {p.indicados} de {p.n_formandos ?? '?'} formandos indicados
                    </span>
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => onResponder(p)}>Responder</Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="ds-metric">
      <p className="ds-metric-value">{valor}</p>
      <p className="ds-metric-label">{label}</p>
    </div>
  );
}
