import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useClientes } from '@/hooks/useClientes';
import { useAvencas } from '@/hooks/useAvencas';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { somarHorasUteis, msUteisEntre, conjuntoFeriados, ROTULO_HORARIO, type Horario } from '@/lib/horasUteis';
import { AlertTriangle, CheckCircle2, Headset, MessageSquareReply, Plus, ShieldCheck } from 'lucide-react';

/**
 * Infraestrutura & Cloud — manutenção com tempo de resposta garantido.
 *
 * Um CONTRATO (lb_contratos_sla) promete responder em N horas e resolver em M.
 * Cada PEDIDO DE SUPORTE (lb_pedidos_suporte) mede-se contra o contrato do
 * cliente: o relógio corre desde que o pedido entra até à primeira resposta
 * («Respondi») e depois até à resolução. Fora do prazo, fica vermelho — é o
 * número que diz se a promessa está a ser cumprida.
 *
 * Os prazos contam só as horas do horário do contrato (lib/horasUteis): dias
 * úteis 9h–18h, ou seg–sáb 8h–22h, ou 24×7 — saltando fins de semana, os
 * feriados nacionais e os que a empresa registar em `feriados`.
 */
const PRIORIDADES: Record<string, { label: string; cor: string }> = {
  baixa:   { label: 'Baixa',   cor: 'text-muted-foreground' },
  normal:  { label: 'Normal',  cor: '' },
  alta:    { label: 'Alta',    cor: 'text-vertical' },
  critica: { label: 'Crítica', cor: 'text-destructive' },
};
const ESTADOS: Record<string, string> = {
  aberto: 'Aberto', em_curso: 'Em curso', aguarda_cliente: 'Aguarda o cliente', resolvido: 'Resolvido', fechado: 'Fechado',
};
const HORARIOS = ROTULO_HORARIO as Record<string, string>;

interface Contrato {
  id: string; cliente_id: string | null; cliente_nome: string | null; avenca_id: string | null; nome: string;
  resposta_horas: number; resolucao_horas: number | null; critico_resposta_horas: number | null; horario: string;
  horas_incluidas: number | null; inclui_deslocacao: boolean; inicio: string; fim: string | null; ativo: boolean; notas: string | null;
}
interface Pedido {
  id: string; numero: number; ano: number; cliente_id: string | null; cliente_nome: string | null; contrato_id: string | null;
  ativo_id: string | null; titulo: string; descricao: string | null; prioridade: string; estado: string; canal: string | null;
  responsavel_nome: string | null; aberto_em: string; primeira_resposta_em: string | null; resolvido_em: string | null;
  horas_gastas: number | null; solucao: string | null;
}

const hms = (ms: number) => { const h = Math.floor(Math.abs(ms) / 36e5), m = Math.floor((Math.abs(ms) % 36e5) / 6e4); return `${h}h${String(m).padStart(2, '0')}`; };

/** Estado do SLA de um pedido face ao seu contrato, em horas do horário do contrato. */
function sla(p: Pedido, c: Contrato | undefined, feriados: Set<string>, agora = new Date()) {
  if (!c) return { texto: 'sem contrato', fora: false };
  const h = (c.horario || 'uteis') as Horario;
  const aberto = new Date(p.aberto_em);
  const horasResp = p.prioridade === 'critica' && c.critico_resposta_horas ? Number(c.critico_resposta_horas) : Number(c.resposta_horas);
  const prazoResp = somarHorasUteis(aberto, horasResp, h, feriados);
  const falta = (ate: Date) => msUteisEntre(agora, ate, h, feriados);
  const passou = (de: Date) => msUteisEntre(de, agora, h, feriados);

  if (!p.primeira_resposta_em) {
    return agora <= prazoResp
      ? { texto: `responder em ${hms(falta(prazoResp))}`, fora: false }
      : { texto: `resposta atrasada ${hms(passou(prazoResp))}`, fora: true };
  }
  const respondeuFora = new Date(p.primeira_resposta_em) > prazoResp;
  if (!c.resolucao_horas) return { texto: respondeuFora ? 'respondido fora do prazo' : 'respondido a tempo', fora: respondeuFora };
  const limite = somarHorasUteis(aberto, Number(c.resolucao_horas), h, feriados);
  if (p.resolvido_em) {
    const tarde = new Date(p.resolvido_em) > limite || respondeuFora;
    return { texto: tarde ? 'resolvido fora do prazo' : 'resolvido a tempo', fora: tarde };
  }
  return agora <= limite
    ? { texto: `resolver em ${hms(falta(limite))}`, fora: respondeuFora }
    : { texto: `resolução atrasada ${hms(passou(limite))}`, fora: true };
}

export function InfraPainel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { empresa } = useEmpresa();
  const { clientes } = useClientes();
  const { avencas } = useAvencas();
  const [contrato, setContrato] = useState<Partial<Contrato> | null>(null);
  const [novo, setNovo] = useState<Partial<Pedido> | null>(null);
  const [resolver, setResolver] = useState<Pedido | null>(null);
  const [solucao, setSolucao] = useState({ texto: '', horas: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['lb_infra', empresa?.id],
    enabled: !!empresa?.id,
    refetchInterval: 60_000, // os relógios do SLA andam
    queryFn: async () => {
      const eid = empresa!.id;
      const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
      const [c, p, a, fer] = await Promise.all([
        (supabase.from('lb_contratos_sla' as any) as any).select('*').eq('empresa_id', eid).order('cliente_nome'),
        (supabase.from('lb_pedidos_suporte' as any) as any).select('*').eq('empresa_id', eid)
          .or(`estado.in.(aberto,em_curso,aguarda_cliente),aberto_em.gte.${inicioMes.toISOString()}`)
          .order('aberto_em', { ascending: false }),
        (supabase.from('lb_ativos' as any) as any).select('id, nome, cliente_id').eq('empresa_id', eid).eq('estado', 'ativo')
          .in('tipo', ['vps', 'servidor', 'rede', 'equipamento', 'licenca', 'outro']),
        (supabase.from('feriados') as any).select('data').eq('empresa_id', eid),
      ]);
      const extra = ((fer.data || []) as { data: string }[]).map(f => f.data);
      if (c.error || p.error) return { contratos: [] as Contrato[], pedidos: [] as Pedido[], ativos: [] as any[], feriados: extra, semTabela: true };
      return { contratos: (c.data || []) as Contrato[], pedidos: (p.data || []) as Pedido[], ativos: (a.data || []) as any[], feriados: extra, semTabela: false };
    },
  });

  const contratos = data?.contratos ?? [];
  const porId = useMemo(() => Object.fromEntries(contratos.map(c => [c.id, c])), [contratos]);
  const feriados = useMemo(() => conjuntoFeriados(data?.feriados ?? []), [data?.feriados]);
  const pedidos = data?.pedidos ?? [];
  const abertos = pedidos.filter(p => !['resolvido', 'fechado'].includes(p.estado));
  const foraSla = pedidos.filter(p => sla(p, porId[p.contrato_id ?? ''], feriados).fora).length;
  const horasMes = pedidos.reduce((s, p) => s + Number(p.horas_gastas ?? 0), 0);
  const atualizar = () => qc.invalidateQueries({ queryKey: ['lb_infra'] });

  const guardarContrato = async () => {
    if (!empresa || !contrato?.nome?.trim()) return;
    const c = clientes.find(x => x.id === contrato.cliente_id);
    const linha = {
      empresa_id: empresa.id, cliente_id: contrato.cliente_id ?? null, cliente_nome: c?.nome ?? contrato.cliente_nome ?? null,
      avenca_id: contrato.avenca_id ?? null, nome: contrato.nome.trim(),
      resposta_horas: contrato.resposta_horas ?? 8, resolucao_horas: contrato.resolucao_horas ?? null,
      critico_resposta_horas: contrato.critico_resposta_horas ?? null, horario: contrato.horario ?? 'uteis',
      horas_incluidas: contrato.horas_incluidas ?? null, inclui_deslocacao: !!contrato.inclui_deslocacao,
      inicio: contrato.inicio || new Date().toISOString().slice(0, 10), fim: contrato.fim || null,
      ativo: contrato.ativo ?? true, notas: contrato.notas || null,
    };
    const q = contrato.id
      ? (supabase.from('lb_contratos_sla' as any) as any).update(linha).eq('id', contrato.id).eq('empresa_id', empresa.id)
      : (supabase.from('lb_contratos_sla' as any) as any).insert(linha);
    const { error } = await q;
    if (error) { toast({ title: 'Não foi possível guardar', description: error.message, variant: 'destructive' }); return; }
    setContrato(null); atualizar();
  };

  const abrirPedido = async () => {
    if (!empresa || !novo?.titulo?.trim()) return;
    const ano = new Date().getFullYear();
    const { data: num, error: eNum } = await (supabase.rpc as any)('ag_proximo_numero', { p_empresa_id: empresa.id, p_escopo: 'suporte', p_ano: ano });
    if (eNum) { toast({ title: 'Erro', description: eNum.message, variant: 'destructive' }); return; }
    const c = clientes.find(x => x.id === novo.cliente_id);
    const { error } = await (supabase.from('lb_pedidos_suporte' as any) as any).insert({
      empresa_id: empresa.id, numero: num, ano, cliente_id: novo.cliente_id ?? null, cliente_nome: c?.nome ?? null,
      contrato_id: novo.contrato_id ?? null, ativo_id: novo.ativo_id ?? null, titulo: novo.titulo.trim(),
      descricao: novo.descricao || null, prioridade: novo.prioridade ?? 'normal', canal: novo.canal ?? null,
      responsavel_nome: novo.responsavel_nome || null,
    });
    if (error) { toast({ title: 'Não foi possível abrir o pedido', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Pedido ${num}/${ano} aberto` });
    setNovo(null); atualizar();
  };

  const mudar = async (p: Pedido, patch: Partial<Pedido>) => {
    const { error } = await (supabase.from('lb_pedidos_suporte' as any) as any).update(patch).eq('id', p.id).eq('empresa_id', empresa!.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else atualizar();
  };

  const fecharComSolucao = async () => {
    if (!resolver) return;
    const agora = new Date().toISOString();
    await mudar(resolver, {
      estado: 'resolvido', resolvido_em: agora, primeira_resposta_em: resolver.primeira_resposta_em ?? agora,
      solucao: solucao.texto || null, horas_gastas: solucao.horas ? Number(solucao.horas) : null,
    });
    setResolver(null); setSolucao({ texto: '', horas: '' });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">A carregar...</p>;
  if (data?.semTabela) return (
    <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Os contratos e os pedidos de suporte ficam ativos quando o SQL da Infra for aplicado.</p></CardContent></Card>
  );

  const contratosDoCliente = (id?: string | null) => contratos.filter(c => c.ativo && (!id || c.cliente_id === id));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Pedidos abertos', String(abertos.length), false],
          ['Fora do SLA', String(foraSla), foraSla > 0],
          ['Contratos ativos', String(contratos.filter(c => c.ativo).length), false],
          ['Horas de suporte (mês)', `${horasMes.toFixed(1)}h`, false],
        ].map(([l, v, mau]) => (
          <Card key={l as string}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className={`ds-metric-value text-2xl font-bold tabular-nums mt-1 ${mau ? 'text-destructive' : ''}`}>{v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><Headset className="h-4 w-4 text-vertical" />Pedidos de suporte</h2>
          <Button size="sm" onClick={() => setNovo({ prioridade: 'normal', canal: 'telefone' })}><Plus className="h-3.5 w-3.5 mr-1" />Novo pedido</Button>
        </div>
        {abertos.length === 0 ? <p className="text-sm text-muted-foreground py-2">Nenhum pedido em aberto.</p> : (
          <div className="divide-y divide-border">
            {abertos.map(p => {
              const s = sla(p, porId[p.contrato_id ?? ''], feriados);
              return (
                <div key={p.id} className="flex items-center gap-3 py-2.5 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums w-[70px]">{p.numero}/{p.ano}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.cliente_nome || 'Sem cliente'} · <span className={PRIORIDADES[p.prioridade].cor}>{PRIORIDADES[p.prioridade].label}</span>
                      {p.responsavel_nome ? ` · ${p.responsavel_nome}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-mono tabular-nums ${s.fora ? 'text-destructive' : 'text-vertical'}`}>
                    {s.fora && <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />}{s.texto}
                  </span>
                  <Select value={p.estado} onValueChange={v => mudar(p, { estado: v })}>
                    <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ESTADOS).filter(([k]) => k !== 'resolvido').map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                  {!p.primeira_resposta_em && (
                    <Button size="sm" variant="outline" onClick={() => mudar(p, { primeira_resposta_em: new Date().toISOString(), estado: 'em_curso' })}>
                      <MessageSquareReply className="h-3.5 w-3.5 mr-1" />Respondi
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setResolver(p)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Resolvido</Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent></Card>

      <Card><CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-vertical" />Contratos de manutenção</h2>
          <Button size="sm" variant="outline" onClick={() => setContrato({ resposta_horas: 8, horario: 'uteis', ativo: true, nome: '' })}><Plus className="h-3.5 w-3.5 mr-1" />Novo contrato</Button>
        </div>
        {contratos.length === 0 ? <p className="text-sm text-muted-foreground py-2">Ainda não há contratos.</p> : (
          <div className="divide-y divide-border">
            {contratos.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded-md" onClick={() => setContrato(c)}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.cliente_nome || 'Sem cliente'} · {HORARIOS[c.horario]}</p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums text-right">
                  resposta {Number(c.resposta_horas)}h{c.resolucao_horas ? ` · resolução ${Number(c.resolucao_horas)}h` : ''}
                  {c.horas_incluidas ? <><br />{Number(c.horas_incluidas)}h incluídas/mês</> : null}
                </span>
                {!c.ativo && <Badge variant="outline">Inativo</Badge>}
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>

      {/* Novo pedido */}
      <Dialog open={!!novo} onOpenChange={v => { if (!v) setNovo(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Novo pedido de suporte</DialogTitle></DialogHeader>
          {novo && (
            <div className="space-y-4">
              <div><Label>O que se passa *</Label><Input value={novo.titulo ?? ''} onChange={e => setNovo(n => ({ ...n!, titulo: e.target.value }))} placeholder="ex.: Impressora da receção não imprime" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cliente</Label>
                  <Select value={novo.cliente_id ?? ''} onValueChange={v => {
                    const cs = contratosDoCliente(v);
                    setNovo(n => ({ ...n!, cliente_id: v, contrato_id: cs.length === 1 ? cs[0].id : null, ativo_id: null }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Escolher cliente" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Contrato</Label>
                  <Select value={novo.contrato_id ?? 'sem'} onValueChange={v => setNovo(n => ({ ...n!, contrato_id: v === 'sem' ? null : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem">Sem contrato (avulso)</SelectItem>
                      {contratosDoCliente(novo.cliente_id).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Prioridade</Label>
                  <Select value={novo.prioridade ?? 'normal'} onValueChange={v => setNovo(n => ({ ...n!, prioridade: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PRIORIDADES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Canal</Label>
                  <Select value={novo.canal ?? 'telefone'} onValueChange={v => setNovo(n => ({ ...n!, canal: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[['telefone', 'Telefone'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['site', 'Site'], ['presencial', 'Presencial'], ['monitorizacao', 'Monitorização']].map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
                <div><Label>Equipamento</Label>
                  <Select value={novo.ativo_id ?? 'sem'} onValueChange={v => setNovo(n => ({ ...n!, ativo_id: v === 'sem' ? null : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem">—</SelectItem>
                      {(data?.ativos ?? []).filter(a => !novo.cliente_id || a.cliente_id === novo.cliente_id).map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              </div>
              <div><Label>Descrição</Label><Textarea rows={3} value={novo.descricao ?? ''} onChange={e => setNovo(n => ({ ...n!, descricao: e.target.value }))} /></div>
              <div><Label>Responsável</Label><Input value={novo.responsavel_nome ?? ''} onChange={e => setNovo(n => ({ ...n!, responsavel_nome: e.target.value }))} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovo(null)}>Cancelar</Button>
            <Button onClick={abrirPedido} disabled={!novo?.titulo?.trim()}>Abrir pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolver */}
      <Dialog open={!!resolver} onOpenChange={v => { if (!v) setResolver(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Resolver · {resolver?.titulo}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>O que se fez</Label><Textarea rows={3} value={solucao.texto} onChange={e => setSolucao(s => ({ ...s, texto: e.target.value }))} /></div>
            <div><Label>Horas gastas</Label><Input type="number" step="0.25" value={solucao.horas} onChange={e => setSolucao(s => ({ ...s, horas: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolver(null)}>Cancelar</Button>
            <Button onClick={fecharComSolucao}>Marcar resolvido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contrato */}
      <Dialog open={!!contrato} onOpenChange={v => { if (!v) setContrato(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{contrato?.id ? 'Editar contrato' : 'Novo contrato de manutenção'}</DialogTitle></DialogHeader>
          {contrato && (
            <div className="space-y-4">
              <div><Label>Nome *</Label><Input value={contrato.nome ?? ''} onChange={e => setContrato(c => ({ ...c!, nome: e.target.value }))} placeholder="ex.: Manutenção informática · Escritório X" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cliente</Label>
                  <Select value={contrato.cliente_id ?? ''} onValueChange={v => setContrato(c => ({ ...c!, cliente_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Escolher cliente" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Avença que o fatura</Label>
                  <Select value={contrato.avenca_id ?? 'sem'} onValueChange={v => setContrato(c => ({ ...c!, avenca_id: v === 'sem' ? null : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sem">Nenhuma</SelectItem>{avencas.map(a => <SelectItem key={a.id} value={a.id}>{a.designacao}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Resposta (h)</Label><Input type="number" step="0.5" value={contrato.resposta_horas ?? ''} onChange={e => setContrato(c => ({ ...c!, resposta_horas: Number(e.target.value) }))} /></div>
                <div><Label>Resposta crítica (h)</Label><Input type="number" step="0.5" value={contrato.critico_resposta_horas ?? ''} onChange={e => setContrato(c => ({ ...c!, critico_resposta_horas: e.target.value ? Number(e.target.value) : null }))} /></div>
                <div><Label>Resolução (h)</Label><Input type="number" step="0.5" value={contrato.resolucao_horas ?? ''} onChange={e => setContrato(c => ({ ...c!, resolucao_horas: e.target.value ? Number(e.target.value) : null }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Horário</Label>
                  <Select value={contrato.horario ?? 'uteis'} onValueChange={v => setContrato(c => ({ ...c!, horario: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(HORARIOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Horas incluídas / mês</Label><Input type="number" step="0.5" value={contrato.horas_incluidas ?? ''} onChange={e => setContrato(c => ({ ...c!, horas_incluidas: e.target.value ? Number(e.target.value) : null }))} /></div>
                <div className="flex items-end gap-2 pb-2"><Switch checked={!!contrato.inclui_deslocacao} onCheckedChange={v => setContrato(c => ({ ...c!, inclui_deslocacao: v }))} /><span className="text-sm">Inclui deslocação</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Início</Label><Input type="date" value={contrato.inicio ?? ''} onChange={e => setContrato(c => ({ ...c!, inicio: e.target.value }))} /></div>
                <div><Label>Fim</Label><Input type="date" value={contrato.fim ?? ''} onChange={e => setContrato(c => ({ ...c!, fim: e.target.value }))} /></div>
              </div>
              <div><Label>Notas</Label><Textarea rows={2} value={contrato.notas ?? ''} onChange={e => setContrato(c => ({ ...c!, notas: e.target.value }))} /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {contrato?.id && <Button variant="outline" className="mr-auto" onClick={() => setContrato(c => ({ ...c!, ativo: !c!.ativo }))}>{contrato.ativo ? 'Desativar' : 'Reativar'}</Button>}
            <Button variant="outline" onClick={() => setContrato(null)}>Cancelar</Button>
            <Button onClick={guardarContrato} disabled={!contrato?.nome?.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InfraPainel;
