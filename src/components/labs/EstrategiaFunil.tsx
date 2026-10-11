import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useNucleos, type Nucleo } from '@/hooks/useNucleos';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Play } from 'lucide-react';
import { criarProjetoComFases } from '@/lib/labsProjetos';

/**
 * Estratégia & Negócios — o funil de entrada da Webtech.
 *
 *   Diagnóstico grátis (30 min) → Plano 48h → Proposta → Cliente
 *
 * - DIAGNÓSTICOS são oportunidades do Workflow Comercial com este núcleo. Os
 *   pedidos que chegam do site entram sem núcleo; aparecem em «Por
 *   classificar» para alguém dizer a que negócio pertencem.
 * - PLANO 48H: «Iniciar» cria um projeto do núcleo com os seis jobs do plano
 *   (com prazos escalonados até às 48h) e liga-o à oportunidade em
 *   lb_planos48h. O relógio fica à vista e fica vermelho se derrapar.
 * - PROPOSTAS: as dos projetos do núcleo. CLIENTES: oportunidades adjudicadas.
 *
 * As taxas de conversão entre etapas são o número que interessa ao fundador:
 * de cada 10 diagnósticos, quantos viram cliente.
 */
const JOBS_PLANO: { titulo: string; horas: number }[] = [
  { titulo: 'Rever as notas do diagnóstico', horas: 4 },
  { titulo: 'Mapear processos e ferramentas atuais', horas: 16 },
  { titulo: 'Identificar onde se perde tempo e dinheiro', horas: 24 },
  { titulo: 'Desenhar sistemas e automações recomendados', horas: 32 },
  { titulo: 'Prioridades, âmbito e investimento', horas: 40 },
  { titulo: 'Entregar o plano ao cliente', horas: 48 },
];
const FECHADAS = ['adjudicado', 'perdido', 'arquivado'];

interface Opp { id: string; titulo: string | null; cliente_id: string | null; cliente_nome: string | null; fase: string; nucleo_id: string | null; created_at: string }
interface Plano { id: string; projeto_id: string; oportunidade_id: string | null; cliente_nome: string | null; inicio: string; prazo: string; entregue_em: string | null }

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');

function relogio(prazo: string, agora = Date.now()) {
  const ms = new Date(prazo).getTime() - agora;
  const h = Math.floor(Math.abs(ms) / 36e5), m = Math.floor((Math.abs(ms) % 36e5) / 6e4);
  return { atrasado: ms < 0, texto: `${ms < 0 ? '+' : ''}${h}h${String(m).padStart(2, '0')}` };
}

export function EstrategiaFunil({ nucleo, propostas }: { nucleo: Nucleo; propostas: { estado: string }[] }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { empresa } = useEmpresa();
  const { nucleos } = useNucleos();
  const [aIniciar, setAIniciar] = useState<string | null>(null);

  const chave = ['lb_estrategia_funil', empresa?.id, nucleo.id];
  const { data, isLoading } = useQuery({
    queryKey: chave,
    enabled: !!empresa?.id,
    queryFn: async () => {
      const eid = empresa!.id;
      const [opp, planos] = await Promise.all([
        (supabase.from('followup_oportunidades') as any)
          .select('id, titulo, cliente_id, cliente_nome, fase, nucleo_id, created_at')
          .eq('empresa_id', eid).or(`nucleo_id.eq.${nucleo.id},nucleo_id.is.null`)
          .order('created_at', { ascending: false }),
        (supabase.from('lb_planos48h' as any) as any)
          .select('id, projeto_id, oportunidade_id, cliente_nome, inicio, prazo, entregue_em')
          .eq('empresa_id', eid).order('inicio', { ascending: false }),
      ]);
      if (opp.error) throw opp.error;
      const todas = (opp.data || []) as Opp[];
      return {
        porClassificar: todas.filter(o => !o.nucleo_id && !FECHADAS.includes(o.fase)),
        diagnosticos: todas.filter(o => o.nucleo_id === nucleo.id),
        planos: (planos.data || []) as Plano[],
        // Sem a tabela (SQL por aplicar), o funil mostra-se na mesma, sem planos.
        semTabela: !!planos.error,
      };
    },
  });

  const atualizar = () => {
    qc.invalidateQueries({ queryKey: chave });
    qc.invalidateQueries({ queryKey: ['ag_projetos'] });
    qc.invalidateQueries({ queryKey: ['lb_nucleo_painel'] });
  };

  const classificar = async (oppId: string, nucleoId: string) => {
    const { error } = await (supabase.from('followup_oportunidades') as any)
      .update({ nucleo_id: nucleoId }).eq('id', oppId).eq('empresa_id', empresa!.id);
    if (error) toast({ title: 'Não foi possível classificar', description: error.message, variant: 'destructive' });
    else atualizar();
  };

  /** Diagnóstico feito → abre o Plano 48h (projeto + 6 jobs + relógio). */
  const iniciarPlano = async (o: Opp) => {
    if (!empresa) return;
    setAIniciar(o.id);
    try {
      const eid = empresa.id;
      const agora = new Date();
      const prazo = new Date(agora.getTime() + 48 * 36e5);
      const quem = o.cliente_nome || o.titulo || 'Cliente';
      const projetoId = await criarProjetoComFases({
        empresaId: eid, nucleoId: nucleo.id,
        nome: `Plano 48h · ${quem}`,
        clienteId: o.cliente_id, clienteNome: o.cliente_nome,
        descricao: 'Plano de digitalização em 48h: prioridades, âmbito e investimento. O documento é do cliente, fique ou não connosco.',
        prazo, fases: JOBS_PLANO,
      });
      const proj = { id: projetoId };

      const { error: ePlano } = await (supabase.from('lb_planos48h' as any) as any).insert({
        empresa_id: eid, projeto_id: proj.id, oportunidade_id: o.id,
        cliente_id: o.cliente_id, cliente_nome: o.cliente_nome ?? o.titulo,
        inicio: agora.toISOString(), prazo: prazo.toISOString(),
      });
      if (ePlano) throw ePlano;

      toast({ title: 'Plano 48h iniciado', description: `Entrega até ${prazo.toLocaleString('pt-PT', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}.` });
      atualizar();
      navigate(`/labs/projetos/${proj.id}`);
    } catch (e: any) {
      toast({ title: 'Não foi possível iniciar o plano', description: e.message, variant: 'destructive' });
    } finally {
      setAIniciar(null);
    }
  };

  const marcarEntregue = async (p: Plano) => {
    const { error } = await (supabase.from('lb_planos48h' as any) as any)
      .update({ entregue_em: new Date().toISOString() }).eq('id', p.id).eq('empresa_id', empresa!.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Plano entregue' }); atualizar(); }
  };

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">A carregar o funil...</p>;

  const comPlano = new Set(data.planos.map(p => p.oportunidade_id));
  const diagnosticos = data.diagnosticos.length;
  const planos = data.planos.length;
  const nPropostas = propostas.length;
  const clientes = data.diagnosticos.filter(o => o.fase === 'adjudicado').length;
  const emCurso = data.planos.filter(p => !p.entregue_em);
  const etapas = [
    { label: 'Diagnósticos', n: diagnosticos, conv: null },
    { label: 'Planos 48h', n: planos, conv: pct(planos, diagnosticos) },
    { label: 'Propostas', n: nPropostas, conv: pct(nPropostas, planos) },
    { label: 'Clientes', n: clientes, conv: pct(clientes, nPropostas || planos) },
  ];

  return (
    <div className="space-y-6">
      {/* O funil */}
      <Card><CardContent className="p-5">
        <p className="ds-eyebrow mb-4">Funil · do diagnóstico ao cliente</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {etapas.map((e, i) => (
            <div key={e.label} className="rounded-[14px] border border-border p-4 relative">
              <p className="text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')} · {e.label}</p>
              <p className="ds-metric-value text-3xl font-bold tabular-nums mt-1">{e.n}</p>
              {e.conv && <p className="text-xs text-vertical mt-1 tabular-nums">{e.conv} da etapa anterior</p>}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          De cada 10 diagnósticos, {diagnosticos ? Math.round((clientes / diagnosticos) * 10) : 0} viram cliente.
        </p>
      </CardContent></Card>

      {/* Planos em curso, com o relógio */}
      <Card><CardContent className="p-5 space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-vertical" />Planos 48h em curso</h2>
        {data.semTabela ? (
          <p className="text-sm text-muted-foreground">Os Planos 48h ficam ativos quando o SQL de Estratégia for aplicado.</p>
        ) : emCurso.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nenhum plano em curso. Inicia um a partir de um diagnóstico, mais abaixo.</p>
        ) : (
          <div className="divide-y divide-border">
            {emCurso.map(p => {
              const r = relogio(p.prazo);
              return (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/labs/projetos/${p.projeto_id}`)}>
                    <p className="text-sm font-medium truncate">{p.cliente_nome || 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground">Entrega até {new Date(p.prazo).toLocaleString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className={`font-mono text-sm tabular-nums ${r.atrasado ? 'text-destructive' : 'text-vertical'}`}>
                    {r.atrasado ? <AlertTriangle className="inline h-3.5 w-3.5 mr-1" /> : null}{r.atrasado ? `atrasado ${r.texto}` : `faltam ${r.texto}`}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => marcarEntregue(p)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Entregue
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent></Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Diagnósticos deste núcleo */}
        <Card><CardContent className="p-5 space-y-3">
          <h2 className="text-lg font-bold">Diagnósticos</h2>
          {data.diagnosticos.filter(o => !FECHADAS.includes(o.fase)).length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Sem diagnósticos em aberto.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.diagnosticos.filter(o => !FECHADAS.includes(o.fase)).slice(0, 8).map(o => (
                <div key={o.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{o.cliente_nome || o.titulo || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground truncate">{o.titulo}</p>
                  </div>
                  {comPlano.has(o.id) ? (
                    <span className="text-xs text-muted-foreground">plano feito</span>
                  ) : (
                    <Button size="sm" onClick={() => iniciarPlano(o)} disabled={!!aIniciar || data.semTabela}>
                      {aIniciar === o.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                      Plano 48h
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>

        {/* Entradas do site ainda sem núcleo */}
        <Card><CardContent className="p-5 space-y-3">
          <h2 className="text-lg font-bold">Por classificar</h2>
          <p className="text-xs text-muted-foreground">Pedidos que chegaram (site, Cal.com) e ainda não têm núcleo. Diz a que negócio pertencem.</p>
          {data.porClassificar.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Tudo classificado.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.porClassificar.slice(0, 8).map(o => (
                <div key={o.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{o.cliente_nome || o.titulo || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground truncate">{o.titulo} · {new Date(o.created_at).toLocaleDateString('pt-PT')}</p>
                  </div>
                  <Select onValueChange={v => classificar(o.id, v)}>
                    <SelectTrigger className="w-[190px] h-8"><SelectValue placeholder="Núcleo…" /></SelectTrigger>
                    <SelectContent>
                      {nucleos.map(n => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}

export default EstrategiaFunil;
