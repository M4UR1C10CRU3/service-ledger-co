import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useClientes } from '@/hooks/useClientes';
import { useAvencas } from '@/hooks/useAvencas';
import { useToast } from '@/hooks/use-toast';
import type { Nucleo } from '@/hooks/useNucleos';
import { criarProjetoComFases } from '@/lib/labsProjetos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileBarChart, KeyRound, Loader2, Megaphone, Plus } from 'lucide-react';

/**
 * Growth — o painel de quem gere tráfego e marketing digital.
 *
 * Dois dinheiros lado a lado e nunca somados:
 *   · o FEE da Webtech (as avenças do núcleo Growth) — é receita;
 *   · o INVESTIMENTO do cliente nas plataformas — passa pelas contas de
 *     anúncios (lb_contas_anuncios) e não é receita da Webtech.
 *
 * Por conta e por mês registam-se os resultados (lb_growth_resultados) e o
 * painel calcula o CPL (investimento ÷ leads) e o ROAS (receita ÷
 * investimento). «Relatórios do mês» cria um projeto com um job de relatório
 * por cliente com conta ativa — o trabalho mensal fica na fila da equipa.
 */
const PLATAFORMAS: Record<string, string> = {
  meta: 'Meta', google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn', youtube: 'YouTube', outra: 'Outra',
};

interface Conta {
  id: string; cliente_id: string | null; cliente_nome: string | null; avenca_id: string | null; plataforma: string;
  nome: string; referencia: string | null; acesso_onde: string | null; orcamento_mensal: number | null; moeda: string; ativa: boolean;
}
interface Resultado {
  id?: string; conta_id: string; mes: string; investimento: number; impressoes: number | null; cliques: number | null;
  leads: number | null; conversoes: number | null; receita: number | null;
}

const primeiroDia = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
const nomeMes = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
const dinheiro = (v: number, moeda = 'EUR') =>
  new Intl.NumberFormat(moeda === 'BRL' ? 'pt-BR' : 'pt-PT', { style: 'currency', currency: moeda }).format(v || 0);

export function GrowthPainel({ nucleo }: { nucleo: Nucleo }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { empresa } = useEmpresa();
  const { clientes } = useClientes();
  const { avencas } = useAvencas();
  const [mes, setMes] = useState(primeiroDia());
  const [conta, setConta] = useState<Partial<Conta> | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [aCriar, setACriar] = useState(false);

  const chave = ['lb_growth', empresa?.id, mes];
  const { data, isLoading } = useQuery({
    queryKey: chave,
    enabled: !!empresa?.id,
    queryFn: async () => {
      const eid = empresa!.id;
      const [c, r] = await Promise.all([
        (supabase.from('lb_contas_anuncios' as any) as any).select('*').eq('empresa_id', eid).order('cliente_nome'),
        (supabase.from('lb_growth_resultados' as any) as any).select('*').eq('empresa_id', eid).eq('mes', mes),
      ]);
      if (c.error) return { contas: [] as Conta[], resultados: [] as Resultado[], semTabela: true };
      return { contas: (c.data || []) as Conta[], resultados: (r.data || []) as Resultado[], semTabela: false };
    },
  });

  const contas = (data?.contas ?? []).filter(c => c.ativa);
  const porConta = useMemo(() => Object.fromEntries((data?.resultados ?? []).map(r => [r.conta_id, r])), [data?.resultados]);
  const avencasGrowth = avencas.filter(a => a.nucleoId === nucleo.id && a.estado === 'ativo');

  // Por cliente: fee (avenças Growth) vs investimento (contas) — em EUR; o BRL mostra-se à parte.
  const porCliente = useMemo(() => {
    const m: Record<string, { nome: string; fee: number; inv: number; leads: number; receita: number }> = {};
    const k = (id: string | null, nome: string | null) => id ?? `nome:${nome ?? '—'}`;
    for (const a of avencasGrowth) {
      const x = (m[k(a.clienteId, a.clienteNome)] ??= { nome: a.clienteNome ?? '—', fee: 0, inv: 0, leads: 0, receita: 0 });
      x.fee += a.valorMensal;
    }
    for (const c of contas) {
      const r = porConta[c.id];
      const x = (m[k(c.cliente_id, c.cliente_nome)] ??= { nome: c.cliente_nome ?? '—', fee: 0, inv: 0, leads: 0, receita: 0 });
      x.inv += Number(r?.investimento ?? 0); x.leads += Number(r?.leads ?? 0); x.receita += Number(r?.receita ?? 0);
    }
    return Object.values(m).sort((a, b) => b.inv + b.fee - (a.inv + a.fee));
  }, [avencasGrowth, contas, porConta]);

  const tot = porCliente.reduce((s, c) => ({ fee: s.fee + c.fee, inv: s.inv + c.inv, leads: s.leads + c.leads, receita: s.receita + c.receita }),
    { fee: 0, inv: 0, leads: 0, receita: 0 });

  const atualizar = () => qc.invalidateQueries({ queryKey: ['lb_growth'] });

  const guardarConta = async () => {
    if (!empresa || !conta?.nome?.trim()) return;
    const c = clientes.find(x => x.id === conta.cliente_id);
    const linha = {
      empresa_id: empresa.id, cliente_id: conta.cliente_id ?? null, cliente_nome: c?.nome ?? conta.cliente_nome ?? null,
      avenca_id: conta.avenca_id ?? null, plataforma: conta.plataforma ?? 'meta', nome: conta.nome.trim(),
      referencia: conta.referencia || null, acesso_onde: conta.acesso_onde || null,
      orcamento_mensal: conta.orcamento_mensal ?? null, moeda: conta.moeda ?? 'EUR', ativa: conta.ativa ?? true,
    };
    const q = conta.id
      ? (supabase.from('lb_contas_anuncios' as any) as any).update(linha).eq('id', conta.id).eq('empresa_id', empresa.id)
      : (supabase.from('lb_contas_anuncios' as any) as any).insert(linha);
    const { error } = await q;
    if (error) { toast({ title: 'Não foi possível guardar', description: error.message, variant: 'destructive' }); return; }
    setConta(null); atualizar();
  };

  const guardarResultado = async () => {
    if (!empresa || !resultado) return;
    const { id: _ignorar, ...resto } = resultado;
    const { error } = await (supabase.from('lb_growth_resultados' as any) as any)
      .upsert({ ...resto, empresa_id: empresa.id, atualizado_em: new Date().toISOString() }, { onConflict: 'conta_id,mes' });
    if (error) { toast({ title: 'Não foi possível guardar', description: error.message, variant: 'destructive' }); return; }
    setResultado(null); atualizar();
  };

  /** Um projeto «Relatórios Growth · mês» com um job por cliente com conta ativa. */
  const criarRelatorios = async () => {
    if (!empresa) return;
    const nomes = [...new Set(contas.map(c => c.cliente_nome || c.nome))];
    if (!nomes.length) { toast({ title: 'Sem contas ativas', description: 'Regista primeiro as contas de anúncios dos clientes.' }); return; }
    setACriar(true);
    try {
      const fim = new Date(new Date(mes + 'T00:00:00').getFullYear(), new Date(mes + 'T00:00:00').getMonth() + 1, 5);
      const id = await criarProjetoComFases({
        empresaId: empresa.id, nucleoId: nucleo.id,
        nome: `Relatórios Growth · ${nomeMes(mes)}`,
        descricao: 'Um relatório por cliente: investimento, leads, CPL, ROAS, o que funcionou e o que muda no mês seguinte.',
        prazo: fim,
        fases: nomes.map(n => ({ titulo: `Relatório · ${n}` })),
      });
      qc.invalidateQueries({ queryKey: ['ag_projetos'] });
      navigate(`/labs/projetos/${id}`);
    } catch (e: any) {
      toast({ title: 'Não foi possível criar os relatórios', description: e.message, variant: 'destructive' });
    } finally { setACriar(false); }
  };

  const meses = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return primeiroDia(d); });

  return (
    <div className="space-y-6">
      <Card><CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="ds-eyebrow">Fee da Webtech vs investimento do cliente</p>
          <div className="flex gap-2">
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-[190px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{meses.map(m => <SelectItem key={m} value={m}>{nomeMes(m)}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={criarRelatorios} disabled={aCriar || data?.semTabela}>
              {aCriar ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileBarChart className="h-3.5 w-3.5 mr-1" />}Relatórios do mês
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ['Fee Webtech / mês', dinheiro(tot.fee)],
            ['Investimento em media', dinheiro(tot.inv)],
            ['Leads', String(tot.leads)],
            ['CPL', tot.leads ? dinheiro(tot.inv / tot.leads) : '—'],
            ['ROAS', tot.inv && tot.receita ? `${(tot.receita / tot.inv).toFixed(1)}×` : '—'],
          ].map(([l, v]) => (
            <div key={l} className="rounded-[14px] border border-border p-4">
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className="ds-metric-value text-xl font-bold tabular-nums mt-1">{v}</p>
            </div>
          ))}
        </div>
        {porCliente.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead><tr className="text-xs text-muted-foreground text-left">
                <th className="py-2 font-medium">Cliente</th><th className="font-medium text-right">Fee</th>
                <th className="font-medium text-right">Investimento</th><th className="font-medium text-right">Leads</th>
                <th className="font-medium text-right">CPL</th><th className="font-medium text-right">ROAS</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {porCliente.map(c => (
                  <tr key={c.nome}>
                    <td className="py-2">{c.nome}</td>
                    <td className="text-right tabular-nums">{dinheiro(c.fee)}</td>
                    <td className="text-right tabular-nums">{dinheiro(c.inv)}</td>
                    <td className="text-right tabular-nums">{c.leads || '—'}</td>
                    <td className="text-right tabular-nums">{c.leads ? dinheiro(c.inv / c.leads) : '—'}</td>
                    <td className="text-right tabular-nums">{c.inv && c.receita ? `${(c.receita / c.inv).toFixed(1)}×` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>

      <Card><CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><Megaphone className="h-4 w-4 text-vertical" />Contas de anúncios · {nomeMes(mes)}</h2>
          <Button size="sm" disabled={data?.semTabela}
                  onClick={() => setConta({ plataforma: 'meta', moeda: 'EUR', ativa: true, nome: '' })}>
            <Plus className="h-3.5 w-3.5 mr-1" />Nova conta
          </Button>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">A carregar...</p>
          : data?.semTabela ? <p className="text-sm text-muted-foreground">As contas de anúncios ficam ativas quando o SQL do Growth for aplicado.</p>
          : contas.length === 0 ? <p className="text-sm text-muted-foreground py-2">Ainda não há contas registadas.</p>
          : (
            <div className="divide-y divide-border">
              {contas.map(c => {
                const r = porConta[c.id];
                const inv = Number(r?.investimento ?? 0);
                const desvio = c.orcamento_mensal ? inv / Number(c.orcamento_mensal) : null;
                return (
                  <div key={c.id} className="flex items-center gap-3 py-2.5">
                    <Badge variant="outline" className="shrink-0">{PLATAFORMAS[c.plataforma]}</Badge>
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setConta(c)}>
                      <p className="text-sm font-medium truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.cliente_nome || 'Sem cliente'}{c.orcamento_mensal ? ` · orçamento ${dinheiro(Number(c.orcamento_mensal), c.moeda)}` : ''}</p>
                    </div>
                    <span className={`text-xs tabular-nums text-right ${desvio != null && desvio > 1.05 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {r ? <>{dinheiro(inv, c.moeda)} · {r.leads ?? 0} leads</> : 'sem resultados'}
                      {desvio != null && r ? <><br />{Math.round(desvio * 100)}% do orçamento</> : null}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setResultado(r ? { ...r } : {
                      conta_id: c.id, mes, investimento: 0, impressoes: null, cliques: null, leads: null, conversoes: null, receita: null,
                    })}>Resultados</Button>
                  </div>
                );
              })}
            </div>
          )}
      </CardContent></Card>

      {/* Conta de anúncios */}
      <Dialog open={!!conta} onOpenChange={v => { if (!v) setConta(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{conta?.id ? 'Editar conta de anúncios' : 'Nova conta de anúncios'}</DialogTitle></DialogHeader>
          {conta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Plataforma</Label>
                  <Select value={conta.plataforma} onValueChange={v => setConta(c => ({ ...c!, plataforma: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PLATAFORMAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Cliente</Label>
                  <Select value={conta.cliente_id ?? ''} onValueChange={v => setConta(c => ({ ...c!, cliente_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Escolher cliente" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>
              <div><Label>Nome *</Label><Input value={conta.nome ?? ''} onChange={e => setConta(c => ({ ...c!, nome: e.target.value }))} placeholder="ex.: Meta · Loja do cliente" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>ID da conta</Label><Input value={conta.referencia ?? ''} onChange={e => setConta(c => ({ ...c!, referencia: e.target.value }))} /></div>
                <div><Label>Avença (fee) que a cobre</Label>
                  <Select value={conta.avenca_id ?? 'sem'} onValueChange={v => setConta(c => ({ ...c!, avenca_id: v === 'sem' ? null : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem">Nenhuma</SelectItem>
                      {avencas.map(a => <SelectItem key={a.id} value={a.id}>{a.designacao}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />Onde estão os acessos</Label>
                <Input value={conta.acesso_onde ?? ''} onChange={e => setConta(c => ({ ...c!, acesso_onde: e.target.value }))} placeholder="ex.: Business Manager do cliente (somos parceiros)" />
                <p className="text-xs text-muted-foreground mt-1">Só onde procurar. Nunca escrevas aqui uma palavra-passe ou token.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Orçamento mensal do cliente</Label><Input type="number" step="0.01" value={conta.orcamento_mensal ?? ''} onChange={e => setConta(c => ({ ...c!, orcamento_mensal: e.target.value ? Number(e.target.value) : null }))} /></div>
                <div><Label>Moeda</Label>
                  <Select value={conta.moeda ?? 'EUR'} onValueChange={v => setConta(c => ({ ...c!, moeda: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="EUR">EUR</SelectItem><SelectItem value="BRL">BRL</SelectItem></SelectContent>
                  </Select></div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {conta?.id && <Button variant="outline" className="mr-auto" onClick={() => setConta(c => ({ ...c!, ativa: false }))}>Desativar</Button>}
            <Button variant="outline" onClick={() => setConta(null)}>Cancelar</Button>
            <Button onClick={guardarConta} disabled={!conta?.nome?.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resultados do mês */}
      <Dialog open={!!resultado} onOpenChange={v => { if (!v) setResultado(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Resultados · {resultado ? nomeMes(resultado.mes) : ''}</DialogTitle></DialogHeader>
          {resultado && (
            <div className="grid grid-cols-2 gap-4">
              {([['investimento', 'Investimento *', '0.01'], ['impressoes', 'Impressões', '1'], ['cliques', 'Cliques', '1'],
                 ['leads', 'Leads', '1'], ['conversoes', 'Conversões', '1'], ['receita', 'Receita atribuída', '0.01']] as const).map(([k, l, step]) => (
                <div key={k}><Label>{l}</Label>
                  <Input type="number" step={step} value={(resultado as any)[k] ?? ''}
                         onChange={e => setResultado(r => ({ ...r!, [k]: e.target.value === '' ? (k === 'investimento' ? 0 : null) : Number(e.target.value) }))} /></div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultado(null)}>Cancelar</Button>
            <Button onClick={guardarResultado}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GrowthPainel;
