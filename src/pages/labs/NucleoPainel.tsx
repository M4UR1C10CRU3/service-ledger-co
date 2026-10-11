import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useNucleos } from '@/hooks/useNucleos';
import { useProjetos } from '@/hooks/useProjetos';
import { useAvencas } from '@/hooks/useAvencas';
import { useAgencyPais } from '@/hooks/useAgencyPais';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PROJETO_ESTADOS, PROPOSTA_AG_ESTADOS, type PropostaAgEstado } from '@/types/agency';
import { ArrowRight, FolderKanban, FileText, Repeat, Target, Wrench, Receipt, BoxSelect, Package, ClipboardList, Truck, BookOpen } from 'lucide-react';
import { EstrategiaFunil } from '@/components/labs/EstrategiaFunil';
import { ModelosProjeto } from '@/components/labs/ModelosProjeto';
import { AtivosClientes } from '@/components/labs/AtivosClientes';
import { MODELOS_PRODUTO, MODELOS_CRIATIVO } from '@/lib/labsProjetos';
import { AgendaEstudio } from '@/components/labs/AgendaEstudio';
import { InfraPainel } from '@/components/labs/InfraPainel';
import { TechCarePainel } from '@/components/labs/TechCarePainel';
import { GrowthPainel } from '@/components/labs/GrowthPainel';

/**
 * Painel de um núcleo de negócio do Clariza Labs (/labs/nucleos/:codigo).
 *
 * Junta num só ecrã o que esse negócio tem em curso — projetos, propostas,
 * avenças, oportunidades e, no Tech Care, as assistências — e os números que
 * dizem se está a correr bem. Não cria dados: lê o que já existe, filtrado
 * pelo núcleo (lb_nucleos). Os módulos próprios de cada núcleo (SLA da Infra,
 * relatórios de Growth, funil do Plano 48h…) entram aqui à medida que forem
 * feitos.
 *
 * Propostas: contam as que têm o núcleo e também as dos projetos do núcleo,
 * porque uma proposta nasce quase sempre dentro de um projeto.
 */
/**
 * Atalhos do dia a dia de cada núcleo. É aqui que vivem as ferramentas que
 * pertencem a um só negócio (as Assistências e as Vendas são do Tech Care),
 * para o menu não ter duas portas para a mesma coisa.
 */
const ATALHOS: Record<string, { titulo: string; url: string; icone: React.ElementType }[]> = {
  estrategia: [
    { titulo: 'Workflow Comercial', url: '/workflow-comercial', icone: Target },
    { titulo: 'Propostas', url: '/labs/propostas', icone: FileText },
    { titulo: 'Catálogo e textos', url: '/labs/catalogo', icone: BookOpen },
  ],
  produto: [
    { titulo: 'Projetos', url: '/labs/projetos?nucleo=produto', icone: FolderKanban },
    { titulo: 'Catálogo e textos', url: '/labs/catalogo', icone: BookOpen },
  ],
  growth: [
    { titulo: 'Avenças', url: '/labs/avencas', icone: Repeat },
    { titulo: 'Propostas', url: '/labs/propostas', icone: FileText },
  ],
  criativo: [
    { titulo: 'Projetos', url: '/labs/projetos?nucleo=criativo', icone: FolderKanban },
    { titulo: 'Catálogo e textos', url: '/labs/catalogo', icone: BookOpen },
  ],
  infra: [
    { titulo: 'Produtos', url: '/produtos', icone: BoxSelect },
    { titulo: 'Gestão de Stocks', url: '/stocks', icone: Package },
    { titulo: 'Notas de Encomenda', url: '/notas-encomenda', icone: ClipboardList },
    { titulo: 'Fornecedores', url: '/fornecedores', icone: Truck },
  ],
  techcare: [
    { titulo: 'Assistências', url: '/ordens-servico', icone: Wrench },
    { titulo: 'Vendas', url: '/vendas', icone: Receipt },
    { titulo: 'Produtos', url: '/produtos', icone: BoxSelect },
    { titulo: 'Gestão de Stocks', url: '/stocks', icone: Package },
  ],
};

const ABERTAS: PropostaAgEstado[] = ['rascunho', 'aprovacao_interna', 'aprovacao_cliente'];
const FASES_FECHADAS = ['adjudicado', 'perdido', 'arquivado'];
const OS_FECHADAS = ['concluida', 'cancelada', 'faturada'];

export default function NucleoPainel() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const { porCodigo, isLoading: loadingNucleos } = useNucleos();
  const nucleo = porCodigo(codigo);
  const { projetos } = useProjetos();
  const { avencas } = useAvencas();
  const { eur } = useAgencyPais();
  const ano = new Date().getFullYear();

  const doNucleo = useMemo(() => projetos.filter(p => p.nucleoId === nucleo?.id), [projetos, nucleo?.id]);
  const avencasNucleo = useMemo(() => avencas.filter(a => a.nucleoId === nucleo?.id), [avencas, nucleo?.id]);

  const { data: extra } = useQuery({
    queryKey: ['lb_nucleo_painel', empresa?.id, nucleo?.id, doNucleo.map(p => p.id).join(',')],
    enabled: !!empresa?.id && !!nucleo?.id,
    queryFn: async () => {
      const eid = empresa!.id, nid = nucleo!.id;
      const idsProj = doNucleo.map(p => p.id);
      const filtroProp = idsProj.length
        ? `nucleo_id.eq.${nid},projeto_id.in.(${idsProj.join(',')})`
        : `nucleo_id.eq.${nid}`;
      const [prop, opp, rec, os] = await Promise.all([
        (supabase.from('ag_propostas' as any) as any)
          .select('id, titulo, cliente_nome, estado, total_sem_imposto, data_emissao')
          .eq('empresa_id', eid).or(filtroProp).order('data_emissao', { ascending: false }),
        (supabase.from('followup_oportunidades') as any)
          .select('id, titulo, cliente_nome, fase, valor_estimado, proximo_followup_data')
          .eq('empresa_id', eid).eq('nucleo_id', nid),
        (supabase.from('services') as any)
          .select('valor_sem_iva, data_date')
          .eq('empresa_id', eid).eq('nucleo_id', nid)
          .gte('data_date', `${ano}-01-01`).lte('data_date', `${ano}-12-31`),
        // No Tech Care, as Ordens de Serviço da empresa SÃO as assistências.
        nucleo!.codigo === 'techcare'
          ? (supabase.from('ordens_servico') as any)
              .select('id, numero, titulo, cliente_nome, estado, data_prevista_conclusao')
              .eq('empresa_id', eid).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      return {
        propostas: (prop.data || []) as any[],
        oportunidades: ((opp.data || []) as any[]).filter(o => !FASES_FECHADAS.includes(o.fase)),
        receitaAno: ((rec.data || []) as any[]).reduce((s, r) => s + Number(r.valor_sem_iva || 0), 0),
        assistencias: ((os.data || []) as any[]).filter(o => !OS_FECHADAS.includes(o.estado)),
      };
    },
  });

  if (loadingNucleos) return <p className="p-6 text-muted-foreground">A carregar...</p>;
  if (!nucleo) return <p className="p-6 text-muted-foreground">Este núcleo não existe nesta empresa.</p>;

  const propostasAbertas = (extra?.propostas ?? []).filter(p => ABERTAS.includes(p.estado));
  const ativas = avencasNucleo.filter(a => a.estado === 'ativo');
  const kpis = [
    { label: `Receita ${ano}`, valor: eur(extra?.receitaAno ?? 0) },
    { label: 'Projetos ativos', valor: String(doNucleo.filter(p => p.estado === 'ativo').length) },
    { label: 'Propostas em aberto', valor: `${propostasAbertas.length} · ${eur(propostasAbertas.reduce((s, p) => s + Number(p.total_sem_imposto || 0), 0))}` },
    { label: 'Avenças / mês', valor: `${ativas.length} · ${eur(ativas.reduce((s, a) => s + a.valorMensal, 0))}` },
    { label: 'Oportunidades', valor: `${extra?.oportunidades.length ?? 0} · ${eur((extra?.oportunidades ?? []).reduce((s, o) => s + Number(o.valor_estimado || 0), 0))}` },
    ...(nucleo.codigo === 'techcare' ? [{ label: 'Assistências abertas', valor: String(extra?.assistencias.length ?? 0) }] : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="ds-eyebrow mb-2">Núcleo</p>
        <h1 className="text-3xl md:text-4xl font-bold">{nucleo.nome}</h1>
        {nucleo.descricao && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{nucleo.descricao}</p>}
        {(ATALHOS[nucleo.codigo] ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {ATALHOS[nucleo.codigo].map(a => (
              <Button key={a.url} variant="outline" size="sm" onClick={() => navigate(a.url)}>
                <a.icone className="h-3.5 w-3.5 mr-1.5" />{a.titulo}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="ds-metric-value text-xl font-bold tabular-nums mt-1">{k.valor}</p>
          </CardContent></Card>
        ))}
      </div>

      {nucleo.codigo === 'estrategia' && (
        <EstrategiaFunil nucleo={nucleo} propostas={extra?.propostas ?? []} />
      )}

      {nucleo.codigo === 'growth' && <GrowthPainel nucleo={nucleo} />}

      {nucleo.codigo === 'criativo' && (
        <>
          <AgendaEstudio />
          <ModelosProjeto nucleo={nucleo} modelos={MODELOS_CRIATIVO} />
        </>
      )}

      {nucleo.codigo === 'techcare' && <TechCarePainel nucleo={nucleo} />}

      {nucleo.codigo === 'infra' && (
        <>
          <InfraPainel />
          <AtivosClientes nucleo={nucleo} titulo="Equipamentos, servidores, VPS e licenças dos clientes"
                          tipos={['vps', 'servidor', 'rede', 'equipamento', 'licenca', 'outro']} />
        </>
      )}

      {nucleo.codigo === 'produto' && (
        <>
          <ModelosProjeto nucleo={nucleo} modelos={MODELOS_PRODUTO} />
          <AtivosClientes nucleo={nucleo} titulo="Domínios, alojamento e ambientes dos clientes"
                          tipos={['dominio', 'alojamento', 'repositorio', 'ambiente', 'email', 'certificado']} />
        </>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Bloco titulo="Projetos" icone={FolderKanban} vazio="Ainda não há projetos neste núcleo."
               acao={() => navigate(`/labs/projetos?nucleo=${nucleo.codigo}`)}>
          {doNucleo.slice(0, 6).map(p => (
            <Linha key={p.id} onClick={() => navigate(`/labs/projetos/${p.id}`)}
                   titulo={`${p.numero} · ${p.nome}`} sub={p.clienteNome || '—'}
                   fim={<Badge variant="outline" className={PROJETO_ESTADOS[p.estado].cor}>{PROJETO_ESTADOS[p.estado].label}</Badge>} />
          ))}
        </Bloco>

        <Bloco titulo="Propostas" icone={FileText} vazio="Sem propostas neste núcleo."
               acao={() => navigate('/labs/propostas')}>
          {(extra?.propostas ?? []).slice(0, 6).map(p => (
            <Linha key={p.id} titulo={p.titulo || 'Proposta'} sub={p.cliente_nome || '—'}
                   fim={<span className="text-sm tabular-nums">{eur(Number(p.total_sem_imposto || 0))}</span>}
                   badge={PROPOSTA_AG_ESTADOS[p.estado as PropostaAgEstado]?.label} />
          ))}
        </Bloco>

        <Bloco titulo="Avenças" icone={Repeat} vazio="Sem avenças neste núcleo."
               acao={() => navigate('/labs/avencas')}>
          {avencasNucleo.slice(0, 6).map(a => (
            <Linha key={a.id} titulo={a.designacao} sub={a.clienteNome || '—'}
                   fim={<span className="text-sm tabular-nums">{eur(a.valorMensal)}</span>} />
          ))}
        </Bloco>

        <Bloco titulo="Oportunidades em aberto" icone={Target} vazio="Sem oportunidades em aberto neste núcleo."
               acao={() => navigate('/workflow-comercial')}>
          {(extra?.oportunidades ?? []).slice(0, 6).map(o => (
            <Linha key={o.id} titulo={o.titulo || 'Oportunidade'} sub={o.cliente_nome || '—'}
                   fim={<span className="text-sm tabular-nums">{eur(Number(o.valor_estimado || 0))}</span>} />
          ))}
        </Bloco>

      </div>
    </div>
  );
}

function Bloco({ titulo, icone: Icone, vazio, acao, children }: {
  titulo: string; icone: React.ElementType; vazio: string; acao: () => void; children: React.ReactNode;
}) {
  const itens = Array.isArray(children) ? children.flat().filter(Boolean) : children ? [children] : [];
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><Icone className="h-4 w-4 text-vertical" />{titulo}</h2>
          <Button variant="ghost" size="sm" onClick={acao}>Ver tudo <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
        </div>
        {itens.length ? <div className="divide-y divide-border">{children}</div>
          : <p className="text-sm text-muted-foreground py-4">{vazio}</p>}
      </CardContent>
    </Card>
  );
}

function Linha({ titulo, sub, fim, badge, onClick }: {
  titulo: string; sub: string; fim?: React.ReactNode; badge?: string; onClick?: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 py-2.5 ${onClick ? 'cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded-md' : ''}`} onClick={onClick}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{titulo}</p>
        <p className="text-xs text-muted-foreground truncate">{sub}{badge ? ` · ${badge}` : ''}</p>
      </div>
      {fim}
    </div>
  );
}
