import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useClientes } from '@/hooks/useClientes';
import { useToast } from '@/hooks/use-toast';
import type { Nucleo } from '@/hooks/useNucleos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MessageCircle, Plus, Printer, Search, ShieldCheck, Wrench } from 'lucide-react';

/**
 * Tech Care — a bancada da loja de informática.
 *
 * Cada assistência É uma Ordem de Serviço (o módulo que já existe); a tabela
 * lb_assistencias acrescenta o que a bancada precisa: o equipamento que entrou,
 * o orçamento e a decisão do cliente, o aviso, o levantamento e a garantia.
 * O estado da OS acompanha a fase, para os relatórios gerais continuarem certos.
 *
 *   receção → diagnóstico → orçamento → aprovado → em reparação → pronto → entregue
 *                                    ↘ recusado (devolvido sem reparação)
 *
 * Nunca se escrevem aqui códigos de desbloqueio ou palavras-passe dos
 * equipamentos dos clientes.
 */
const FASES: { k: string; label: string; os: string }[] = [
  { k: 'rececao', label: 'Receção', os: 'nova' },
  { k: 'diagnostico', label: 'Diagnóstico', os: 'nova' },
  { k: 'orcamento', label: 'Orçamento enviado', os: 'nova' },
  { k: 'aprovado', label: 'Aprovado', os: 'aprovada' },
  { k: 'em_reparacao', label: 'Em reparação', os: 'em_execucao' },
  { k: 'pronto', label: 'Pronto a levantar', os: 'concluida' },
];
const FASE_OS: Record<string, string> = { ...Object.fromEntries(FASES.map(f => [f.k, f.os])), entregue: 'concluida', recusado: 'cancelada' };
const TIPOS: Record<string, string> = {
  portatil: 'Portátil', desktop: 'Desktop', telemovel: 'Telemóvel', tablet: 'Tablet', impressora: 'Impressora',
  monitor: 'Monitor', consola: 'Consola', rede: 'Rede', outro: 'Outro',
};

interface Assist {
  id: string; os_id: string; fase: string; equipamento_tipo: string | null; marca: string | null; modelo: string | null;
  numero_serie: string | null; acessorios: string | null; avaria_relatada: string | null; estado_visual: string | null;
  cliente_telefone: string | null; diagnostico: string | null; orcamento_valor: number | null; decisao_em: string | null;
  reparacao_feita: string | null; avisado_em: string | null; entregue_em: string | null; garantia_dias: number;
  garantia_ate: string | null; criado_em: string;
  ordens_servico: { numero: string; titulo: string; cliente_nome: string | null; estado: string; prioridade: string } | null;
}

const eur = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v || 0);
const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
const equipamento = (a: Partial<Assist>) => [TIPOS[a.equipamento_tipo ?? ''] ?? '', a.marca, a.modelo].filter(Boolean).join(' ');

function whatsapp(tel: string | null, texto: string) {
  let n = (tel ?? '').replace(/\D/g, '');
  if (!n) return null;
  if (n.length === 9) n = `351${n}`; // número português sem indicativo
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

export function TechCarePainel({ nucleo }: { nucleo: Nucleo }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { empresa } = useEmpresa();
  const { clientes } = useClientes();
  const [entrada, setEntrada] = useState<Partial<Assist> & { cliente_id?: string | null; cliente_nome?: string; prioridade?: string } | null>(null);
  const [acao, setAcao] = useState<{ tipo: 'diagnostico' | 'decisao' | 'pronto'; a: Assist } | null>(null);
  const [campo, setCampo] = useState({ texto: '', valor: '', canal: 'telefone' });
  const [procura, setProcura] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['lb_techcare', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from('lb_assistencias' as any) as any)
        .select('*, ordens_servico(numero, titulo, cliente_nome, estado, prioridade)')
        .eq('empresa_id', empresa!.id).order('criado_em', { ascending: false });
      if (error) return { lista: [] as Assist[], semTabela: true };
      return { lista: (data || []) as Assist[], semTabela: false };
    },
  });

  const lista = data?.lista ?? [];
  const hoje = new Date().toISOString().slice(0, 10);
  const emGarantia = lista.filter(a => a.garantia_ate && a.garantia_ate >= hoje);
  const achados = useMemo(() => {
    const q = procura.trim().toLowerCase();
    if (!q) return [];
    return lista.filter(a => `${a.ordens_servico?.numero} ${a.numero_serie} ${a.ordens_servico?.cliente_nome} ${a.marca} ${a.modelo}`.toLowerCase().includes(q)).slice(0, 8);
  }, [procura, lista]);
  const atualizar = () => { qc.invalidateQueries({ queryKey: ['lb_techcare'] }); qc.invalidateQueries({ queryKey: ['lb_nucleo_painel'] }); };

  /** Muda a fase e leva o estado da OS atrás. */
  const mover = async (a: Assist, fase: string, extra: Record<string, any> = {}, os: Record<string, any> = {}) => {
    const agora = new Date().toISOString();
    const { error } = await (supabase.from('lb_assistencias' as any) as any)
      .update({ fase, atualizado_em: agora, ...extra }).eq('id', a.id).eq('empresa_id', empresa!.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return false; }
    await (supabase.from('ordens_servico') as any).update({ estado: FASE_OS[fase], ...os }).eq('id', a.os_id).eq('empresa_id', empresa!.id);
    atualizar();
    return true;
  };

  const registarEntrada = async () => {
    if (!empresa || !entrada) return;
    const c = clientes.find(x => x.id === entrada.cliente_id);
    const nomeCliente = c?.nome ?? entrada.cliente_nome ?? '';
    const titulo = `${equipamento(entrada) || 'Equipamento'} · ${(entrada.avaria_relatada ?? '').slice(0, 60) || 'assistência'}`;
    const { data: os, error: eOs } = await (supabase.from('ordens_servico') as any).insert({
      empresa_id: empresa.id, cliente_id: entrada.cliente_id ?? null, cliente_nome: nomeCliente || null,
      cliente_telefone: entrada.cliente_telefone || null, titulo, descricao: entrada.avaria_relatada || null,
      estado: 'nova', prioridade: entrada.prioridade ?? 'normal', data_criacao: hoje, nucleo_id: nucleo.id,
    }).select('id, numero').single();
    if (eOs) { toast({ title: 'Não foi possível criar a OS', description: eOs.message, variant: 'destructive' }); return; }
    const { error } = await (supabase.from('lb_assistencias' as any) as any).insert({
      empresa_id: empresa.id, os_id: os.id, fase: 'rececao',
      equipamento_tipo: entrada.equipamento_tipo ?? null, marca: entrada.marca || null, modelo: entrada.modelo || null,
      numero_serie: entrada.numero_serie || null, acessorios: entrada.acessorios || null,
      avaria_relatada: entrada.avaria_relatada || null, estado_visual: entrada.estado_visual || null,
      cliente_telefone: entrada.cliente_telefone || null, garantia_dias: entrada.garantia_dias ?? 90,
    });
    if (error) {
      // Sem a ficha da assistência, a OS acabada de criar fica órfã: desfaz-se.
      await (supabase.from('ordens_servico') as any).delete().eq('id', os.id).eq('empresa_id', empresa.id);
      toast({ title: 'Não foi possível registar a entrada', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Entrada registada · OS ${os.numero}` });
    setEntrada(null); atualizar();
  };

  const confirmarAcao = async (decisao?: 'aprovado' | 'recusado') => {
    if (!acao) return;
    const { a } = acao, agora = new Date().toISOString();
    let ok = false;
    if (acao.tipo === 'diagnostico') {
      const valor = campo.valor ? Number(campo.valor) : null;
      ok = await mover(a, 'orcamento', { diagnostico: campo.texto || null, orcamento_valor: valor, orcamento_enviado_em: agora },
        { valor_estimado: valor });
    } else if (acao.tipo === 'decisao' && decisao) {
      ok = await mover(a, decisao, { decisao_em: agora, decisao_canal: campo.canal });
    } else if (acao.tipo === 'pronto') {
      ok = await mover(a, 'pronto', { reparacao_feita: campo.texto || null }, { valor_final: a.orcamento_valor, data_conclusao_real: hoje });
    }
    if (ok) { setAcao(null); setCampo({ texto: '', valor: '', canal: 'telefone' }); }
  };

  const entregar = async (a: Assist) => {
    const ate = new Date(); ate.setDate(ate.getDate() + (a.fase === 'recusado' ? 0 : a.garantia_dias));
    await mover(a, a.fase === 'recusado' ? 'recusado' : 'entregue',
      { entregue_em: new Date().toISOString(), garantia_ate: a.fase === 'recusado' ? null : ate.toISOString().slice(0, 10) });
  };

  const avisar = async (a: Assist) => {
    const texto = `Olá! Daqui é a Webtech Labs. O seu ${equipamento(a) || 'equipamento'} (OS ${a.ordens_servico?.numero}) está pronto a levantar`
      + `${a.orcamento_valor ? `. Valor: ${eur(Number(a.orcamento_valor))}` : ''}. Até já!`;
    const url = whatsapp(a.cliente_telefone, texto);
    if (!url) { toast({ title: 'Sem telefone', description: 'Esta assistência não tem o telefone do cliente.' }); return; }
    window.open(url, '_blank', 'noopener');
    await (supabase.from('lb_assistencias' as any) as any).update({ avisado_em: new Date().toISOString() }).eq('id', a.id).eq('empresa_id', empresa!.id);
    atualizar();
  };

  /** Talão de entrada para imprimir e entregar ao cliente. */
  const talao = (a: Assist) => {
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) return;
    const linha = (k: string, v?: string | null) => (v ? `<tr><th>${k}</th><td>${String(v).replace(/</g, '&lt;')}</td></tr>` : '');
    w.document.write(`<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>OS ${a.ordens_servico?.numero}</title>
      <style>body{font:13px/1.45 system-ui,sans-serif;margin:24px;color:#111}h1{font-size:18px;margin:0 0 4px}small{color:#666}
      table{width:100%;border-collapse:collapse;margin:14px 0}th{text-align:left;width:38%;color:#555;font-weight:500;vertical-align:top;padding:4px 0}
      td{padding:4px 0}.n{font:700 22px ui-monospace,monospace}p{font-size:11.5px;color:#444}</style></head><body>
      <h1>Webtech Labs · Tech Care</h1><small>Talão de entrada · ${new Date(a.criado_em).toLocaleString('pt-PT')}</small>
      <p class="n">OS ${a.ordens_servico?.numero ?? ''}</p>
      <table>${linha('Cliente', a.ordens_servico?.cliente_nome)}${linha('Telefone', a.cliente_telefone)}${linha('Equipamento', equipamento(a))}
      ${linha('N.º de série', a.numero_serie)}${linha('Acessórios entregues', a.acessorios)}${linha('Avaria relatada', a.avaria_relatada)}
      ${linha('Estado à entrada', a.estado_visual)}</table>
      <p>Damos-lhe o orçamento antes de reparar; nada é feito sem a sua aprovação. A reparação tem ${a.garantia_dias} dias de garantia.
      Guarde este talão: é pedido no levantamento.</p><p>Assinatura do cliente: ______________________</p>
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">A carregar...</p>;
  if (data?.semTabela) return (
    <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">A bancada do Tech Care fica ativa quando o SQL do Tech Care for aplicado.</p></CardContent></Card>
  );

  const porFase = (k: string) => lista.filter(a => a.fase === k);
  const recusadosPorDevolver = lista.filter(a => a.fase === 'recusado' && !a.entregue_em);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-3 flex-wrap text-sm">
          <span>Na loja: <b className="tabular-nums">{lista.filter(a => !['entregue'].includes(a.fase) && !a.entregue_em).length}</b></span>
          <span>À espera de aprovação: <b className="tabular-nums">{porFase('orcamento').length}</b></span>
          <span>Prontos a levantar: <b className="tabular-nums text-vertical">{porFase('pronto').length}</b></span>
          <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Em garantia: <b className="tabular-nums">{emGarantia.length}</b></span>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-9 w-[230px]" placeholder="OS, n.º de série, cliente…" value={procura} onChange={e => setProcura(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => setEntrada({ equipamento_tipo: 'portatil', prioridade: 'normal', garantia_dias: 90 })}>
            <Plus className="h-3.5 w-3.5 mr-1" />Nova entrada
          </Button>
        </div>
      </div>

      {achados.length > 0 && (
        <Card><CardContent className="p-4 divide-y divide-border">
          {achados.map(a => (
            <div key={a.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="font-mono">{a.ordens_servico?.numero}</span>
              <span className="flex-1 truncate">{equipamento(a)} · {a.ordens_servico?.cliente_nome}</span>
              <span className="text-muted-foreground">{a.fase === 'entregue' ? (a.garantia_ate && a.garantia_ate >= hoje ? `em garantia até ${new Date(a.garantia_ate).toLocaleDateString('pt-PT')}` : 'entregue') : (FASES.find(f => f.k === a.fase)?.label ?? a.fase)}</span>
            </div>
          ))}
        </CardContent></Card>
      )}

      {/* A bancada */}
      <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-3">
        {FASES.map(f => (
          <div key={f.k} className="rounded-[14px] border border-border p-2.5 space-y-2 min-h-[160px]">
            <p className="text-xs text-muted-foreground flex justify-between"><span>{f.label}</span><span className="tabular-nums">{porFase(f.k).length}</span></p>
            {porFase(f.k).map(a => {
              const dias = diasDesde(a.criado_em);
              return (
                <div key={a.id} className="rounded-[10px] bg-card border border-border p-2.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="font-mono text-vertical">{a.ordens_servico?.numero}</span>
                    <span className={`tabular-nums ${dias > 7 ? 'text-destructive' : 'text-muted-foreground'}`}>{dias}d</span>
                  </div>
                  <p className="font-medium leading-tight">{equipamento(a) || 'Equipamento'}</p>
                  <p className="text-muted-foreground leading-tight truncate">{a.ordens_servico?.cliente_nome || '—'}</p>
                  {a.avaria_relatada && <p className="text-muted-foreground leading-tight line-clamp-2">{a.avaria_relatada}</p>}
                  {a.orcamento_valor != null && <p className="tabular-nums">Orçamento {eur(Number(a.orcamento_valor))}</p>}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {f.k === 'rececao' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => mover(a, 'diagnostico')}>Começar diagnóstico</Button>}
                    {f.k === 'diagnostico' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setCampo({ texto: a.diagnostico ?? '', valor: '', canal: 'telefone' }); setAcao({ tipo: 'diagnostico', a }); }}>Orçamentar</Button>}
                    {f.k === 'orcamento' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAcao({ tipo: 'decisao', a })}>Resposta do cliente</Button>}
                    {f.k === 'aprovado' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => mover(a, 'em_reparacao', {}, { data_inicio_real: hoje })}>Reparar</Button>}
                    {f.k === 'em_reparacao' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setCampo({ texto: '', valor: '', canal: 'telefone' }); setAcao({ tipo: 'pronto', a }); }}>Pronto</Button>}
                    {f.k === 'pronto' && <>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => avisar(a)}><MessageCircle className="h-3 w-3 mr-1" />{a.avisado_em ? 'Avisar de novo' : 'Avisar'}</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={() => entregar(a)}>Entregue</Button>
                    </>}
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => talao(a)} title="Talão de entrada"><Printer className="h-3 w-3" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {recusadosPorDevolver.length > 0 && (
        <Card><CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium">Orçamento recusado · devolver ao cliente</p>
          {recusadosPorDevolver.map(a => (
            <div key={a.id} className="flex items-center gap-3 text-sm">
              <span className="font-mono">{a.ordens_servico?.numero}</span><span className="flex-1 truncate">{equipamento(a)} · {a.ordens_servico?.cliente_nome}</span>
              <Button size="sm" variant="outline" onClick={() => entregar(a)}>Devolvido</Button>
            </div>
          ))}
        </CardContent></Card>
      )}

      {/* Entrada do equipamento */}
      <Dialog open={!!entrada} onOpenChange={v => { if (!v) setEntrada(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" />Entrada de equipamento</DialogTitle></DialogHeader>
          {entrada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cliente registado</Label>
                  <Select value={entrada.cliente_id ?? ''} onValueChange={v => {
                    const c = clientes.find(x => x.id === v) as any;
                    setEntrada(e => ({ ...e!, cliente_id: v, cliente_nome: c?.nome, cliente_telefone: e?.cliente_telefone || c?.telefone || '' }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Escolher (opcional)" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Ou nome do cliente</Label><Input value={entrada.cliente_nome ?? ''} onChange={e => setEntrada(x => ({ ...x!, cliente_nome: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Telefone / WhatsApp</Label><Input value={entrada.cliente_telefone ?? ''} onChange={e => setEntrada(x => ({ ...x!, cliente_telefone: e.target.value }))} placeholder="9xx xxx xxx" /></div>
                <div><Label>Equipamento</Label>
                  <Select value={entrada.equipamento_tipo ?? 'portatil'} onValueChange={v => setEntrada(x => ({ ...x!, equipamento_tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Prioridade</Label>
                  <Select value={entrada.prioridade ?? 'normal'} onValueChange={v => setEntrada(x => ({ ...x!, prioridade: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[['baixa', 'Baixa'], ['normal', 'Normal'], ['alta', 'Alta'], ['urgente', 'Urgente']].map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Marca</Label><Input value={entrada.marca ?? ''} onChange={e => setEntrada(x => ({ ...x!, marca: e.target.value }))} /></div>
                <div><Label>Modelo</Label><Input value={entrada.modelo ?? ''} onChange={e => setEntrada(x => ({ ...x!, modelo: e.target.value }))} /></div>
                <div><Label>N.º de série</Label><Input value={entrada.numero_serie ?? ''} onChange={e => setEntrada(x => ({ ...x!, numero_serie: e.target.value }))} /></div>
              </div>
              <div><Label>Avaria relatada pelo cliente *</Label><Textarea rows={2} value={entrada.avaria_relatada ?? ''} onChange={e => setEntrada(x => ({ ...x!, avaria_relatada: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Acessórios entregues</Label><Input value={entrada.acessorios ?? ''} onChange={e => setEntrada(x => ({ ...x!, acessorios: e.target.value }))} placeholder="carregador, mala…" /></div>
                <div><Label>Estado à entrada</Label><Input value={entrada.estado_visual ?? ''} onChange={e => setEntrada(x => ({ ...x!, estado_visual: e.target.value }))} placeholder="riscos, ecrã partido…" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div><Label>Garantia da reparação (dias)</Label><Input type="number" value={entrada.garantia_dias ?? 90} onChange={e => setEntrada(x => ({ ...x!, garantia_dias: Number(e.target.value) }))} /></div>
                <p className="text-xs text-muted-foreground pb-2">Não registes códigos de desbloqueio nem palavras-passe do equipamento.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntrada(null)}>Cancelar</Button>
            <Button onClick={registarEntrada} disabled={!entrada?.avaria_relatada?.trim() || !(entrada?.cliente_id || entrada?.cliente_nome?.trim())}>Registar entrada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ações da bancada */}
      <Dialog open={!!acao} onOpenChange={v => { if (!v) setAcao(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>
            {acao?.tipo === 'diagnostico' ? 'Diagnóstico e orçamento' : acao?.tipo === 'decisao' ? 'Resposta do cliente ao orçamento' : 'Reparação concluída'}
            {acao && ` · OS ${acao.a.ordens_servico?.numero}`}
          </DialogTitle></DialogHeader>
          {acao?.tipo === 'diagnostico' && (
            <div className="space-y-4">
              <div><Label>Diagnóstico</Label><Textarea rows={3} value={campo.texto} onChange={e => setCampo(c => ({ ...c, texto: e.target.value }))} /></div>
              <div><Label>Valor do orçamento (€)</Label><Input type="number" step="0.01" value={campo.valor} onChange={e => setCampo(c => ({ ...c, valor: e.target.value }))} /></div>
            </div>
          )}
          {acao?.tipo === 'decisao' && (
            <div className="space-y-4">
              <p className="text-sm">Orçamento: <b>{eur(Number(acao.a.orcamento_valor ?? 0))}</b></p>
              <div><Label>Como respondeu</Label>
                <Select value={campo.canal} onValueChange={v => setCampo(c => ({ ...c, canal: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[['telefone', 'Telefone'], ['whatsapp', 'WhatsApp'], ['presencial', 'Presencial'], ['email', 'Email']].map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
          )}
          {acao?.tipo === 'pronto' && (
            <div><Label>O que se fez</Label><Textarea rows={3} value={campo.texto} onChange={e => setCampo(c => ({ ...c, texto: e.target.value }))} /></div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAcao(null)}>Cancelar</Button>
            {acao?.tipo === 'decisao' ? (
              <>
                <Button variant="outline" onClick={() => confirmarAcao('recusado')}>Recusou</Button>
                <Button onClick={() => confirmarAcao('aprovado')}>Aprovou</Button>
              </>
            ) : <Button onClick={() => confirmarAcao()}>Guardar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TechCarePainel;
