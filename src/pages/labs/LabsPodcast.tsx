import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
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
import { AlertTriangle, CalendarPlus, Check, ExternalLink, Mic, ShieldAlert, Target, Trash2, X } from 'lucide-react';

/**
 * Podcast «Zeros e Uns» — a vista do showrunner.
 *
 * O podcast vive no projeto «Podcast Zeros e Uns…» (um job por episódio). As
 * propostas que chegam pelo site entram no mesmo projeto como jobs
 * «Proposta · nome · tema» (fluxo n8n wtSitePodc00001) — isso não muda.
 * Esta página junta-lhes o que o podcast precisa:
 *
 *  · EPISÓDIOS — gravação, publicação, condutor (responsável do job) e
 *    contraponto, convidado, PT⇄BR, estado, termo de cessão (lb_episodios).
 *    «Reservar estúdio» marca a gravação na agenda do Estúdio Criativo.
 *  · PROPOSTAS — triagem: aceitar transforma a proposta no episódio seguinte;
 *    recusar arquiva-a (lb_podcast_triagem).
 *  · PRIVACIDADE — os prazos da política (secção 10): propostas guardadas 12
 *    meses; a pessoa indicada é contactada uma vez e, se recusar ou não
 *    responder em 30 dias, os dados apagam-se. A página avisa; apagar é
 *    sempre um clique de uma pessoa, com confirmação.
 */
const ESTADOS: Record<string, string> = {
  planeado: 'Planeado', convidado_confirmado: 'Convidado confirmado', gravado: 'Gravado', em_edicao: 'Em edição', publicado: 'Publicado',
};

interface Job { id: string; sequencial: number; titulo: string; descricao: string | null; responsavel_nome: string | null; concluido: boolean; criado_em: string }
interface Episodio {
  job_id: string; estado: string; gravacao_em: string | null; publicacao_em: string | null; contraponto: string | null;
  convidado_nome: string | null; convidado_contacto: string | null; convidado_remoto: boolean; pt_br: boolean;
  oportunidade_id: string | null; termo_assinado: boolean; termo_assinado_em: string | null; termo_link: string | null;
  link_youtube: string | null; link_spotify: string | null; notas: string | null;
}
interface Triagem { job_id: string; decisao: string; decidida_em: string | null; indicacao: boolean; contactado_em: string | null; resposta: string | null }

const dia = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const diasAte = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 864e5);
const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '');
const ehProposta = (j: Job) => j.titulo.startsWith('Proposta ·');
const ehIndicacao = (j: Job) => (j.descricao ?? '').includes('indicação de convidado');

export default function LabsPodcast() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { empresa } = useEmpresa();
  const [ep, setEp] = useState<{ job: Job; e: Partial<Episodio> } | null>(null);
  const [apagar, setApagar] = useState<Job | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['lb_podcast', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const eid = empresa!.id;
      const { data: proj } = await (supabase.from('ag_projetos' as any) as any)
        .select('id, nome').eq('empresa_id', eid).ilike('nome', 'Podcast%Zeros%e%Uns%')
        .eq('arquivado', false).order('criado_em', { ascending: false }).limit(1);
      const projeto = proj?.[0] ?? null;
      if (!projeto) return { projeto: null, jobs: [] as Job[], eps: [] as Episodio[], tri: [] as Triagem[], semTabela: false };
      const { data: jobs } = await (supabase.from('ag_jobs' as any) as any)
        .select('id, sequencial, titulo, descricao, responsavel_nome, concluido, criado_em')
        .eq('empresa_id', eid).eq('projeto_id', projeto.id).order('sequencial');
      const ids = (jobs || []).map((j: Job) => j.id);
      const [e, t] = await Promise.all([
        (supabase.from('lb_episodios' as any) as any).select('*').eq('empresa_id', eid).in('job_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
        (supabase.from('lb_podcast_triagem' as any) as any).select('*').eq('empresa_id', eid).in('job_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
      ]);
      return { projeto, jobs: (jobs || []) as Job[], eps: (e.data || []) as Episodio[], tri: (t.data || []) as Triagem[], semTabela: !!e.error };
    },
  });

  const epPorJob = useMemo(() => Object.fromEntries((data?.eps ?? []).map(e => [e.job_id, e])), [data?.eps]);
  const triPorJob = useMemo(() => Object.fromEntries((data?.tri ?? []).map(t => [t.job_id, t])), [data?.tri]);
  const jobs = data?.jobs ?? [];
  const episodios = jobs.filter(j => !ehProposta(j));
  const propostas = jobs.filter(j => ehProposta(j) && !j.concluido && (triPorJob[j.id]?.decisao ?? 'pendente') === 'pendente');
  const atualizar = () => { qc.invalidateQueries({ queryKey: ['lb_podcast'] }); qc.invalidateQueries({ queryKey: ['ag_jobs'] }); };

  /** O que a política de privacidade manda apagar (nunca sozinho: a página só avisa). */
  const prazos = useMemo(() => jobs.filter(ehProposta).map(j => {
    const t = triPorJob[j.id];
    const limite12 = new Date(j.criado_em); limite12.setMonth(limite12.getMonth() + 12);
    if (t?.decisao === 'aceite') return null; // passou a episódio: rege-se pelo termo de cessão
    if (ehIndicacao(j) && t?.resposta === 'recusou') return { j, motivo: 'A pessoa indicada recusou', ate: new Date() };
    if (ehIndicacao(j) && t?.contactado_em && t.resposta !== 'aceitou') {
      const l30 = new Date(t.contactado_em); l30.setDate(l30.getDate() + 30);
      return { j, motivo: 'Indicação: 30 dias depois do contacto', ate: l30 };
    }
    return { j, motivo: 'Proposta: 12 meses depois de recebida', ate: limite12 };
  }).filter(Boolean).sort((a, b) => a!.ate.getTime() - b!.ate.getTime()) as { j: Job; motivo: string; ate: Date }[], [jobs, triPorJob]);
  const vencidos = prazos.filter(p => diasAte(p.ate) <= 0);

  const triar = async (j: Job, patch: Partial<Triagem>) => {
    const { error } = await (supabase.from('lb_podcast_triagem' as any) as any).upsert({
      empresa_id: empresa!.id, job_id: j.id, indicacao: ehIndicacao(j), atualizado_em: new Date().toISOString(),
      ...triPorJob[j.id] ? { decisao: triPorJob[j.id].decisao, contactado_em: triPorJob[j.id].contactado_em, resposta: triPorJob[j.id].resposta } : {},
      ...patch,
    }, { onConflict: 'job_id' });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return false; }
    return true;
  };

  /** Aceitar: a proposta passa a ser o episódio seguinte (mesmo job, novo título). */
  const aceitar = async (j: Job) => {
    const nums = episodios.map(e => Number(/^EP\.(\d+)/.exec(e.titulo)?.[1] ?? -1));
    const proximo = String(Math.max(-1, ...nums) + 1).padStart(2, '0');
    const [, quem = '', tema = ''] = j.titulo.split(' · ');
    const titulo = `EP.${proximo} · ${tema || 'Tema por fixar'} · ${quem}`;
    const { error } = await (supabase.from('ag_jobs' as any) as any).update({ titulo }).eq('id', j.id).eq('empresa_id', empresa!.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    await triar(j, { decisao: 'aceite', decidida_em: new Date().toISOString() });
    await (supabase.from('lb_episodios' as any) as any).upsert({ empresa_id: empresa!.id, job_id: j.id, estado: 'planeado', convidado_nome: quem || null }, { onConflict: 'job_id' });
    toast({ title: `Aceite: ${titulo}` });
    atualizar();
  };

  const recusar = async (j: Job) => {
    if (!(await triar(j, { decisao: 'recusada', decidida_em: new Date().toISOString() }))) return;
    await (supabase.from('ag_jobs' as any) as any).update({ concluido: true, concluido_em: new Date().toISOString() }).eq('id', j.id).eq('empresa_id', empresa!.id);
    atualizar();
  };

  const apagarDados = async () => {
    if (!apagar) return;
    const { error } = await (supabase.from('ag_jobs' as any) as any).delete().eq('id', apagar.id).eq('empresa_id', empresa!.id);
    if (error) toast({ title: 'Não foi possível apagar', description: error.message, variant: 'destructive' });
    else toast({ title: 'Dados apagados', description: 'Cumprido o prazo da política de privacidade.' });
    setApagar(null); atualizar();
  };

  const guardarEp = async () => {
    if (!ep || !empresa) return;
    const e = ep.e;
    const { error } = await (supabase.from('lb_episodios' as any) as any).upsert({
      empresa_id: empresa.id, job_id: ep.job.id, estado: e.estado ?? 'planeado',
      gravacao_em: e.gravacao_em ? new Date(e.gravacao_em).toISOString() : null, publicacao_em: e.publicacao_em || null,
      contraponto: e.contraponto || null, convidado_nome: e.convidado_nome || null, convidado_contacto: e.convidado_contacto || null,
      convidado_remoto: !!e.convidado_remoto, pt_br: !!e.pt_br, termo_assinado: !!e.termo_assinado,
      termo_assinado_em: e.termo_assinado ? (e.termo_assinado_em || new Date().toISOString().slice(0, 10)) : null,
      termo_link: e.termo_link || null, link_youtube: e.link_youtube || null, link_spotify: e.link_spotify || null,
      notas: e.notas || null, oportunidade_id: e.oportunidade_id ?? null, atualizado_em: new Date().toISOString(),
    }, { onConflict: 'job_id' });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setEp(null); atualizar();
  };

  /** Marca a gravação na agenda do estúdio (3 horas, a partir da hora de gravação). */
  const reservarEstudio = async () => {
    if (!ep?.e.gravacao_em || !empresa) return;
    const { data: est } = await (supabase.from('lb_recursos' as any) as any)
      .select('id').eq('empresa_id', empresa.id).eq('tipo', 'estudio').eq('ativo', true).limit(1);
    if (!est?.[0]) { toast({ title: 'Sem estúdio', description: 'Junta o estúdio na agenda do Estúdio Criativo.' }); return; }
    const inicio = new Date(ep.e.gravacao_em);
    const { error } = await (supabase.from('lb_reservas' as any) as any).insert({
      empresa_id: empresa.id, recurso_id: est[0].id, titulo: `Gravação ${ep.job.titulo.split(' · ')[0]} · ${ep.e.convidado_nome ?? ''}`.trim(),
      inicio: inicio.toISOString(), fim: new Date(inicio.getTime() + 3 * 36e5).toISOString(),
      projeto_id: data?.projeto?.id ?? null, job_id: ep.job.id, responsavel_nome: ep.job.responsavel_nome,
    });
    if (error) toast({ title: 'Não foi possível reservar', description: error.message, variant: 'destructive' });
    else toast({ title: 'Estúdio reservado', description: inicio.toLocaleString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) });
  };

  /** O convidado entra no Workflow Comercial: o podcast é um motor de leads. */
  const criarOportunidade = async () => {
    if (!ep?.e.convidado_nome || !empresa) return;
    const { data: row, error } = await (supabase.from('followup_oportunidades') as any).insert({
      empresa_id: empresa.id, titulo: `Convidado do podcast · ${ep.e.convidado_nome}`, cliente_nome: ep.e.convidado_nome,
      fase: 'em_analise', probabilidade: 10, notas_internas: `Veio do podcast Zeros e Uns (${ep.job.titulo}). Contacto: ${ep.e.convidado_contacto ?? '—'}`,
    }).select('id').single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setEp(x => x && ({ ...x, e: { ...x.e, oportunidade_id: row.id } }));
    toast({ title: 'Oportunidade criada no Workflow Comercial', description: 'Guarda o episódio para a ligar.' });
  };

  if (isLoading) return <p className="p-6 text-muted-foreground">A carregar o podcast...</p>;
  if (!data?.projeto) return <p className="p-6 text-muted-foreground">Ainda não há projeto do podcast nesta empresa.</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="ds-eyebrow mb-2">Podcast · um podcast Webtech Labs</p>
          <h1 className="text-3xl md:text-4xl font-bold">Zeros e Uns</h1>
          <p className="text-sm text-muted-foreground mt-2">Por trás dos zeros e uns, há pessoas.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/labs/projetos/${data.projeto.id}`)}><ExternalLink className="h-4 w-4 mr-2" />Abrir o projeto</Button>
      </div>

      {data.semTabela && <Card><CardContent className="p-5 text-sm text-muted-foreground">Os episódios e a triagem ficam ativos quando o SQL do Podcast for aplicado.</CardContent></Card>}

      {vencidos.length > 0 && (
        <Card className="border-destructive/50"><CardContent className="p-4 flex items-center gap-3 text-sm">
          <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
          <span className="flex-1">{vencidos.length} proposta(s) já passaram o prazo da política de privacidade e devem ser apagadas.</span>
          <Button size="sm" variant="outline" onClick={() => document.getElementById('privacidade')?.scrollIntoView({ behavior: 'smooth' })}>Ver</Button>
        </CardContent></Card>
      )}

      {/* Episódios */}
      <Card><CardContent className="p-5 space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2"><Mic className="h-4 w-4 text-vertical" />Episódios</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead><tr className="text-xs text-muted-foreground text-left">
              <th className="py-2 font-medium">Episódio</th><th className="font-medium">Conduz · contraponto</th><th className="font-medium">Convidado</th>
              <th className="font-medium">Gravação</th><th className="font-medium">Publicação</th><th className="font-medium">Estado</th><th className="font-medium">Termo</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {episodios.map(j => {
                const e = epPorJob[j.id];
                const semTermo = e?.gravacao_em && !e.termo_assinado && e.convidado_nome && diasAte(new Date(e.gravacao_em)) <= 7;
                return (
                  <tr key={j.id} className="cursor-pointer hover:bg-muted/40" onClick={() => !data.semTabela && setEp({ job: j, e: e ? { ...e, gravacao_em: local(e.gravacao_em) } : { estado: 'planeado' } })}>
                    <td className="py-2.5 pr-3"><p className="font-medium">{j.titulo}</p></td>
                    <td className="pr-3 text-muted-foreground">{j.responsavel_nome ?? '—'}{e?.contraponto ? ` · ${e.contraponto}` : ''}</td>
                    <td className="pr-3">{e?.convidado_nome ?? '—'}{e?.pt_br && <Badge variant="outline" className="ml-2 font-mono text-[10px]">PT⇄BR</Badge>}</td>
                    <td className="pr-3 tabular-nums">{e?.gravacao_em ? new Date(e.gravacao_em).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="pr-3 tabular-nums">{dia(e?.publicacao_em)}</td>
                    <td className="pr-3"><Badge variant="outline">{ESTADOS[e?.estado ?? 'planeado']}</Badge></td>
                    <td>{e?.termo_assinado ? <Check className="h-4 w-4 text-vertical" /> : semTermo
                      ? <span className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />falta</span>
                      : <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      {/* Propostas de convidados */}
      <Card><CardContent className="p-5 space-y-3">
        <h2 className="text-lg font-bold">Propostas de convidados</h2>
        <p className="text-xs text-muted-foreground">Chegam pelo site (podcast.html → n8n). Aceitar transforma a proposta no episódio seguinte; recusar arquiva-a.</p>
        {propostas.length === 0 ? <p className="text-sm text-muted-foreground py-2">Nenhuma proposta por decidir.</p> : (
          <div className="divide-y divide-border">
            {propostas.map(j => {
              const t = triPorJob[j.id];
              return (
                <div key={j.id} className="py-3 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{j.titulo.replace(/^Proposta · /, '')}</p>
                      <p className="text-xs text-muted-foreground">{ehIndicacao(j) ? 'Indicação' : 'O próprio convidado'} · recebida a {dia(j.criado_em)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/labs/projetos/${data.projeto.id}`)}>Ler</Button>
                    <Button size="sm" variant="outline" onClick={() => recusar(j)} disabled={data.semTabela}><X className="h-3.5 w-3.5 mr-1" />Recusar</Button>
                    <Button size="sm" onClick={() => aceitar(j)} disabled={data.semTabela}><Check className="h-3.5 w-3.5 mr-1" />Aceitar</Button>
                  </div>
                  {ehIndicacao(j) && !data.semTabela && (
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      {t?.contactado_em
                        ? <span className="text-muted-foreground">Pessoa indicada contactada a {dia(t.contactado_em)} (único contacto)</span>
                        : <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => { if (await triar(j, { contactado_em: new Date().toISOString() })) atualizar(); }}>Registar o contacto à pessoa indicada</Button>}
                      {t?.contactado_em && (
                        <Select value={t.resposta ?? ''} onValueChange={async v => { if (await triar(j, { resposta: v })) atualizar(); }}>
                          <SelectTrigger className="h-7 w-[170px] text-xs"><SelectValue placeholder="Resposta…" /></SelectTrigger>
                          <SelectContent><SelectItem value="aceitou">Aceitou</SelectItem><SelectItem value="recusou">Recusou</SelectItem><SelectItem value="sem_resposta">Sem resposta</SelectItem></SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent></Card>

      {/* Prazos da privacidade */}
      <Card id="privacidade"><CardContent className="p-5 space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-vertical" />Prazos da política de privacidade</h2>
        <p className="text-xs text-muted-foreground">Propostas: 12 meses. Pessoa indicada: um só contacto; se recusar ou não responder em 30 dias, apagam-se os dados. Nada se apaga sozinho.</p>
        {prazos.length === 0 ? <p className="text-sm text-muted-foreground py-2">Sem dados de convidados a guardar.</p> : (
          <div className="divide-y divide-border">
            {prazos.slice(0, 12).map(({ j, motivo, ate }) => {
              const d = diasAte(ate);
              return (
                <div key={j.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{j.titulo.replace(/^Proposta · /, '')}</p>
                    <p className="text-xs text-muted-foreground">{motivo}</p>
                  </div>
                  <span className={`text-xs tabular-nums ${d <= 0 ? 'text-destructive' : d <= 30 ? 'text-vertical' : 'text-muted-foreground'}`}>
                    {d <= 0 ? 'apagar já' : `apagar até ${dia(ate.toISOString())}`}
                  </span>
                  {d <= 0 && <Button size="sm" variant="outline" onClick={() => setApagar(j)}><Trash2 className="h-3.5 w-3.5 mr-1" />Apagar dados</Button>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent></Card>

      {/* Editar episódio */}
      <Dialog open={!!ep} onOpenChange={v => { if (!v) setEp(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{ep?.job.titulo}</DialogTitle></DialogHeader>
          {ep && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Estado</Label>
                  <Select value={ep.e.estado ?? 'planeado'} onValueChange={v => setEp(x => x && ({ ...x, e: { ...x.e, estado: v } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ESTADOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Gravação</Label><Input type="datetime-local" value={ep.e.gravacao_em ?? ''} onChange={e => setEp(x => x && ({ ...x, e: { ...x.e, gravacao_em: e.target.value } }))} /></div>
                <div><Label>Publicação</Label><Input type="date" value={ep.e.publicacao_em ?? ''} onChange={e => setEp(x => x && ({ ...x, e: { ...x.e, publicacao_em: e.target.value } }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Conduz</Label><Input value={ep.job.responsavel_nome ?? ''} disabled /></div>
                <div><Label>Contraponto</Label><Input value={ep.e.contraponto ?? ''} onChange={e => setEp(x => x && ({ ...x, e: { ...x.e, contraponto: e.target.value } }))} placeholder="Hugo Dias, Theo Moura, Ricardo Pessoa…" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Convidado</Label><Input value={ep.e.convidado_nome ?? ''} onChange={e => setEp(x => x && ({ ...x, e: { ...x.e, convidado_nome: e.target.value } }))} /></div>
                <div><Label>Contacto do convidado</Label><Input value={ep.e.convidado_contacto ?? ''} onChange={e => setEp(x => x && ({ ...x, e: { ...x.e, convidado_contacto: e.target.value } }))} /></div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!ep.e.pt_br} onCheckedChange={v => setEp(x => x && ({ ...x, e: { ...x.e, pt_br: v } }))} />Selo PT⇄BR</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!ep.e.convidado_remoto} onCheckedChange={v => setEp(x => x && ({ ...x, e: { ...x.e, convidado_remoto: v } }))} />Convidado à distância</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!ep.e.termo_assinado} onCheckedChange={v => setEp(x => x && ({ ...x, e: { ...x.e, termo_assinado: v } }))} />Termo de cessão assinado</label>
              </div>
              <div><Label>Onde está o termo assinado</Label><Input value={ep.e.termo_link ?? ''} onChange={e => setEp(x => x && ({ ...x, e: { ...x.e, termo_link: e.target.value } }))} placeholder="link do documento ou pasta" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>YouTube</Label><Input value={ep.e.link_youtube ?? ''} onChange={e => setEp(x => x && ({ ...x, e: { ...x.e, link_youtube: e.target.value } }))} /></div>
                <div><Label>Spotify</Label><Input value={ep.e.link_spotify ?? ''} onChange={e => setEp(x => x && ({ ...x, e: { ...x.e, link_spotify: e.target.value } }))} /></div>
              </div>
              <div><Label>Notas</Label><Textarea rows={2} value={ep.e.notas ?? ''} onChange={e => setEp(x => x && ({ ...x, e: { ...x.e, notas: e.target.value } }))} /></div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={reservarEstudio} disabled={!ep.e.gravacao_em}><CalendarPlus className="h-3.5 w-3.5 mr-1" />Reservar estúdio (3h)</Button>
                <Button size="sm" variant="outline" onClick={criarOportunidade} disabled={!ep.e.convidado_nome || !!ep.e.oportunidade_id}>
                  <Target className="h-3.5 w-3.5 mr-1" />{ep.e.oportunidade_id ? 'Já está no comercial' : 'Levar o convidado ao comercial'}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEp(null)}>Cancelar</Button>
            <Button onClick={guardarEp}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar apagamento */}
      <Dialog open={!!apagar} onOpenChange={v => { if (!v) setApagar(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Apagar os dados desta proposta?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">«{apagar?.titulo.replace(/^Proposta · /, '')}» passou o prazo da política de privacidade. A proposta e os dados pessoais que tem são apagados de vez.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApagar(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={apagarDados}>Apagar de vez</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
