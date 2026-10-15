import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaseVertical } from '@/hooks/useBaseVertical';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useJobs, useJobEtapas } from '@/hooks/useJobs';
import { useProjetos } from '@/hooks/useProjetos';
import { useApontamentos, useCronometro } from '@/hooks/useApontamentos';
import { useAgencyPais } from '@/hooks/useAgencyPais';
import { formatJobNumero, formatDuracao } from '@/types/agency';
import { ListTodo, Play, AlertTriangle, CalendarDays, Clock } from 'lucide-react';

/**
 * "Os meus trabalhos" (PT) / "Minha Pauta" (BR) — a vista operacional
 * transversal a projetos: o que é meu, o que está atrasado, o que é para hoje.
 */
export default function MeusTrabalhos() {
  const navigate = useNavigate();
  const base = useBaseVertical();
  const { jobs } = useJobs();               // todos os jobs da empresa
  const { projetos } = useProjetos();
  const { etapas } = useJobEtapas();
  const { eu, apontamentos } = useApontamentos({ apenasMeus: true });
  const { iniciar, ativo } = useCronometro();
  const { t } = useAgencyPais();

  const projetoDe = useMemo(
    () => Object.fromEntries(projetos.map(p => [p.id, p])),
    [projetos],
  );
  const etapaDe = useMemo(
    () => Object.fromEntries(etapas.map(e => [e.id, e])),
    [etapas],
  );

  const meus = useMemo(() => {
    if (!eu?.utilizadorId) return [];
    return jobs.filter(j => !j.concluido && j.responsavelId === eu.utilizadorId);
  }, [jobs, eu?.utilizadorId]);

  const hojeISO = new Date().toISOString().split('T')[0];
  const atrasados = meus.filter(j => j.prazo && j.prazo < hojeISO);
  const paraHoje  = meus.filter(j => j.prazo === hojeISO);
  const proximos  = meus.filter(j => !j.prazo || j.prazo > hojeISO);

  const minutosHoje = apontamentos
    .filter(a => a.data === hojeISO)
    .reduce((s, a) => s + a.minutos, 0);

  const Secao = ({ titulo, lista, icone, tom }: {
    titulo: string; lista: typeof meus; icone: React.ReactNode; tom?: string;
  }) => {
    if (lista.length === 0) return null;
    return (
      <div className="space-y-2">
        <h2 className={`text-sm font-semibold flex items-center gap-2 ${tom ?? ''}`}>
          {icone} {titulo} <span className="text-muted-foreground font-normal">({lista.length})</span>
        </h2>
        <div className="space-y-2">
          {lista.map(j => {
            const p = projetoDe[j.projetoId];
            const et = j.etapaId ? etapaDe[j.etapaId] : null;
            return (
              <Card key={j.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <button className="min-w-0 text-left flex-1"
                          onClick={() => navigate(`${base}/projetos/${j.projetoId}`)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {p && (
                        <Badge variant="outline" className="font-mono text-xs px-1.5 py-0">
                          {formatJobNumero(p.numero, j.sequencial)}
                        </Badge>
                      )}
                      {et && (
                        <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: `${et.cor}20`, color: et.cor }}>
                          {et.nome}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-1 truncate">{j.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p?.nome}{p?.clienteNome ? ` · ${p.clienteNome}` : ''}
                      {j.prazo && ` · ${new Date(j.prazo).toLocaleDateString('pt-PT')}`}
                    </p>
                  </button>
                  <Button
                    variant="outline" size="sm" className="shrink-0"
                    disabled={!!ativo}
                    onClick={() => p && iniciar({
                      projetoId: j.projetoId, jobId: j.id, tarefaId: null,
                      rotulo: `${formatJobNumero(p.numero, j.sequencial)} — ${j.titulo}`,
                    })}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" /> Iniciar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ListTodo className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('pauta')}</h1>
            <p className="text-sm text-muted-foreground">O que está atribuído a si, em todos os projetos</p>
          </div>
        </div>
        <Card><CardContent className="px-4 py-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Hoje</p>
          <p className="text-xl font-bold tabular-nums">{formatDuracao(minutosHoje)}</p>
        </CardContent></Card>
      </div>

      {meus.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <ListTodo className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            Não há jobs por concluir atribuídos a si.
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          <Secao titulo="Atrasados" lista={atrasados} tom="text-red-600"
                 icone={<AlertTriangle className="h-4 w-4" />} />
          <Secao titulo="Para hoje" lista={paraHoje} tom="text-amber-600"
                 icone={<CalendarDays className="h-4 w-4" />} />
          <Secao titulo="Próximos" lista={proximos}
                 icone={<ListTodo className="h-4 w-4" />} />
        </div>
      )}
    </div>
  );
}
