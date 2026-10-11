import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useNucleos } from '@/hooks/useNucleos';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ArrowRight, CalendarClock, Clock, Headset, Mic, Wrench } from 'lucide-react';

/**
 * Painel do Labs — os seis negócios lado a lado e o que pede atenção hoje.
 *
 * Por núcleo: receita do ano (receitas com núcleo), projetos ativos, propostas
 * em aberto, avenças por mês e oportunidades em aberto. Por cima, os alertas
 * que atravessam núcleos: Planos 48h atrasados, pedidos de suporte abertos,
 * equipamentos prontos a levantar, renovações a 30 dias e próximas gravações.
 *
 * Valores em EUR (moeda da empresa). Os documentos em BRL entram pela taxa
 * guardada no próprio documento quando houver; sem ela, ficam de fora do total.
 */
const ABERTAS = ['rascunho', 'aprovacao_interna', 'aprovacao_cliente'];
const FECHADAS = ['adjudicado', 'perdido', 'arquivado'];
const eur = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
const emEur = (v: any, moeda?: string | null, taxa?: any) => (moeda && moeda !== 'EUR' ? (taxa ? Number(v || 0) * Number(taxa) : 0) : Number(v || 0));

export default function LabsPainel() {
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const { nucleos } = useNucleos();
  const ano = new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ['lb_painel', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const eid = empresa!.id;
      const q = (t: string) => (supabase.from(t as any) as any);
      const hoje = new Date().toISOString().slice(0, 10);
      const em30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      const [rec, proj, prop, av, opp, planos, sup, asst, ren, eps] = await Promise.all([
        q('services').select('nucleo_id, valor_sem_iva, moeda, taxa_eur').eq('empresa_id', eid).gte('data_date', `${ano}-01-01`).lte('data_date', `${ano}-12-31`),
        q('ag_projetos').select('id, nucleo_id, estado, arquivado').eq('empresa_id', eid),
        q('ag_propostas').select('nucleo_id, projeto_id, estado, total_sem_imposto, moeda, taxa_eur').eq('empresa_id', eid),
        q('ag_contratos_avenca').select('nucleo_id, estado, valor_mensal, moeda, taxa_eur').eq('empresa_id', eid),
        q('followup_oportunidades').select('nucleo_id, fase, valor_estimado').eq('empresa_id', eid),
        q('lb_planos48h').select('cliente_nome, prazo, entregue_em, projeto_id').eq('empresa_id', eid).is('entregue_em', null),
        q('lb_pedidos_suporte').select('id').eq('empresa_id', eid).in('estado', ['aberto', 'em_curso', 'aguarda_cliente']),
        q('lb_assistencias').select('id').eq('empresa_id', eid).eq('fase', 'pronto'),
        q('lb_ativos').select('nome, cliente_nome, renovacao').eq('empresa_id', eid).eq('estado', 'ativo').gte('renovacao', hoje).lte('renovacao', em30).order('renovacao'),
        q('lb_episodios').select('gravacao_em, convidado_nome, job_id').eq('empresa_id', eid).gte('gravacao_em', new Date().toISOString()).order('gravacao_em').limit(3),
      ]);
      const projNucleo: Record<string, string | null> = Object.fromEntries((proj.data || []).map((p: any) => [p.id, p.nucleo_id]));
      return {
        rec: rec.data || [], proj: proj.data || [], prop: prop.data || [], av: av.data || [], opp: opp.data || [],
        projNucleo, planos: planos.data || [], sup: sup.data || [], asst: asst.data || [], ren: ren.data || [], eps: eps.data || [],
      };
    },
  });

  if (isLoading || !data) return <p className="p-6 text-muted-foreground">A carregar o painel...</p>;

  const linhas = [...nucleos.map(n => ({ id: n.id as string | null, codigo: n.codigo, nome: n.nome })), { id: null, codigo: '', nome: 'Sem núcleo' }].map(n => {
    const nucleoDaProposta = (p: any) => p.nucleo_id ?? (p.projeto_id ? data.projNucleo[p.projeto_id] : null) ?? null;
    const receita = data.rec.filter((r: any) => (r.nucleo_id ?? null) === n.id).reduce((s: number, r: any) => s + emEur(r.valor_sem_iva, r.moeda, r.taxa_eur), 0);
    const projetos = data.proj.filter((p: any) => (p.nucleo_id ?? null) === n.id && p.estado === 'ativo' && !p.arquivado).length;
    const props = data.prop.filter((p: any) => nucleoDaProposta(p) === n.id && ABERTAS.includes(p.estado));
    const avencas = data.av.filter((a: any) => (a.nucleo_id ?? null) === n.id && a.estado === 'ativo');
    const opps = data.opp.filter((o: any) => (o.nucleo_id ?? null) === n.id && !FECHADAS.includes(o.fase));
    return {
      ...n, receita, projetos,
      propostas: props.length, propostasValor: props.reduce((s: number, p: any) => s + emEur(p.total_sem_imposto, p.moeda, p.taxa_eur), 0),
      avencasMes: avencas.reduce((s: number, a: any) => s + emEur(a.valor_mensal, a.moeda, a.taxa_eur), 0),
      oportunidades: opps.length, oportunidadesValor: opps.reduce((s: number, o: any) => s + Number(o.valor_estimado || 0), 0),
    };
  }).filter(l => l.id || l.receita || l.projetos || l.propostas || l.avencasMes || l.oportunidades);

  const total = linhas.reduce((s, l) => ({ receita: s.receita + l.receita, avencasMes: s.avencasMes + l.avencasMes, propostasValor: s.propostasValor + l.propostasValor, oportunidadesValor: s.oportunidadesValor + l.oportunidadesValor }),
    { receita: 0, avencasMes: 0, propostasValor: 0, oportunidadesValor: 0 });
  const atrasados = data.planos.filter((p: any) => new Date(p.prazo) < new Date());

  const alertas = [
    { icone: Clock, n: atrasados.length, texto: 'Planos 48h atrasados', url: '/labs/nucleos/estrategia', mau: atrasados.length > 0 },
    { icone: Headset, n: data.sup.length, texto: 'Pedidos de suporte abertos', url: '/labs/nucleos/infra', mau: false },
    { icone: Wrench, n: data.asst.length, texto: 'Equipamentos prontos a levantar', url: '/labs/nucleos/techcare', mau: false },
    { icone: CalendarClock, n: data.ren.length, texto: 'Renovações nos próximos 30 dias', url: '/labs/nucleos/infra', mau: false },
    { icone: Mic, n: data.eps.length, texto: 'Próximas gravações do podcast', url: '/labs/podcast', mau: false },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="ds-eyebrow mb-2">Webtech Labs · {ano}</p>
        <h1 className="text-3xl md:text-4xl font-bold">Painel do Labs</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[['Receita do ano', eur(total.receita)], ['Avenças por mês', eur(total.avencasMes)], ['Propostas em aberto', eur(total.propostasValor)], ['Oportunidades em aberto', eur(total.oportunidadesValor)]].map(([l, v]) => (
          <Card key={l}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="ds-metric-value text-2xl font-bold tabular-nums mt-1">{v}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {alertas.map(a => (
          <button key={a.texto} type="button" onClick={() => navigate(a.url)}
                  className={`text-left rounded-[14px] border p-4 transition-colors hover:border-vertical-border ${a.mau ? 'border-destructive/60' : 'border-border'} bg-card`}>
            <a.icone className={`h-4 w-4 mb-2 ${a.mau ? 'text-destructive' : 'text-vertical'}`} />
            <p className={`ds-metric-value text-2xl font-bold tabular-nums ${a.mau ? 'text-destructive' : ''}`}>{a.n}</p>
            <p className="text-xs text-muted-foreground">{a.texto}</p>
          </button>
        ))}
      </div>

      <Card><CardContent className="p-5">
        <p className="ds-eyebrow mb-3">Por núcleo</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[780px]">
            <thead><tr className="text-xs text-muted-foreground text-left">
              <th className="py-2 font-medium">Núcleo</th><th className="font-medium text-right">Receita {ano}</th><th className="font-medium text-right">Projetos ativos</th>
              <th className="font-medium text-right">Propostas abertas</th><th className="font-medium text-right">Avenças / mês</th><th className="font-medium text-right">Oportunidades</th><th />
            </tr></thead>
            <tbody className="divide-y divide-border">
              {linhas.map(l => (
                <tr key={l.nome} className={l.codigo ? 'cursor-pointer hover:bg-muted/40' : ''} onClick={() => l.codigo && navigate(`/labs/nucleos/${l.codigo}`)}>
                  <td className="py-2.5 font-medium">{l.nome}</td>
                  <td className="text-right tabular-nums">{eur(l.receita)}</td>
                  <td className="text-right tabular-nums">{l.projetos}</td>
                  <td className="text-right tabular-nums">{l.propostas} · {eur(l.propostasValor)}</td>
                  <td className="text-right tabular-nums">{eur(l.avencasMes)}</td>
                  <td className="text-right tabular-nums">{l.oportunidades} · {eur(l.oportunidadesValor)}</td>
                  <td className="text-right">{l.codigo && <ArrowRight className="h-3.5 w-3.5 inline text-muted-foreground" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {linhas.some(l => !l.id) && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Há registos sem núcleo: escolhe o núcleo em cada projeto, avença ou oportunidade para os números ficarem certos.</p>
        )}
      </CardContent></Card>

      {(data.ren.length > 0 || data.eps.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {data.ren.length > 0 && (
            <Card><CardContent className="p-5 space-y-2">
              <h2 className="text-lg font-bold">Renovações a 30 dias</h2>
              {data.ren.slice(0, 8).map((r: any, i: number) => (
                <div key={i} className="flex justify-between text-sm"><span>{r.nome} <span className="text-muted-foreground">· {r.cliente_nome ?? '—'}</span></span><span className="tabular-nums text-vertical">{new Date(r.renovacao + 'T00:00:00').toLocaleDateString('pt-PT')}</span></div>
              ))}
            </CardContent></Card>
          )}
          {data.eps.length > 0 && (
            <Card><CardContent className="p-5 space-y-2">
              <h2 className="text-lg font-bold">Próximas gravações</h2>
              {data.eps.map((e: any, i: number) => (
                <div key={i} className="flex justify-between text-sm"><span>{e.convidado_nome ?? 'Episódio'}</span><span className="tabular-nums text-vertical">{new Date(e.gravacao_em).toLocaleString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
              ))}
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
