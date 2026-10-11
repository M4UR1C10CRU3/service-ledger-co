import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarDays, MapPin, UserRound, Users, Building2, CalendarPlus,
  Download, Link2, RefreshCw, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { linkGoogleAgenda, descarregarICS, type EventoAgenda } from '@/lib/agendaCalendario';

interface LinhaAgenda extends EventoAgenda {
  tipo: string;
  estado: string;
  /** gestao | instrutor | aluno — porque é que esta pessoa vê este evento. */
  papel: string;
}

const PAPEL: Record<string, { label: string; cls: string }> = {
  gestao:    { label: 'Gestão',    cls: 'border-purple-500/40 text-purple-600 bg-purple-500/10' },
  instrutor: { label: 'Leciono',   cls: 'border-blue-500/40 text-blue-600 bg-blue-500/10' },
  aluno:     { label: 'Participo', cls: 'border-green-500/40 text-green-600 bg-green-500/10' },
};

/**
 * A calendarização da escola.
 *
 * O que cada pessoa vê é decidido na base de dados, não aqui: a equipa da
 * escola recebe tudo, o instrutor só as suas turmas, o aluno aquelas em que
 * anda. Filtrar apenas no ecrã deixaria a agenda de um instrutor à distância de
 * um pedido da agenda de outro.
 */
export function AgendaSchool() {
  const { toast } = useToast();
  const hoje = new Date();
  const [desde, setDesde] = useState(
    new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().slice(0, 10)
  );
  const [ate, setAte] = useState(
    new Date(hoje.getFullYear(), hoje.getMonth() + 6, 0).toISOString().slice(0, 10)
  );
  const [token, setToken] = useState<string | null>(null);
  const [aTratar, setATratar] = useState(false);

  const { data: eventos = [], isLoading } = useQuery<LinhaAgenda[]>({
    queryKey: ['school_agenda', desde, ate],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('school_agenda', {
        p_desde: desde, p_ate: ate,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Agrupado por mês: é assim que se olha para uma agenda de formação.
  const porMes = useMemo(() => {
    const mapa = new Map<string, LinhaAgenda[]>();
    eventos.forEach(e => {
      const chave = e.inicio ? e.inicio.slice(0, 7) : 'sem-data';
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(e);
    });
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [eventos]);

  const obterToken = async (renovar = false) => {
    setATratar(true);
    try {
      const fn = renovar ? 'school_agenda_token_renovar' : 'school_agenda_token';
      const { data, error } = await (supabase.rpc as any)(fn);
      if (error) throw error;
      setToken(data as string);
      if (renovar) toast({ title: 'Endereço trocado', description: 'O anterior deixou de funcionar.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setATratar(false);
    }
  };

  const fmt = (d: string | null) =>
    d ? format(new Date(`${d.slice(0, 10)}T00:00:00`), "d 'de' MMM", { locale: pt }) : '—';

  return (
    <div className="space-y-6">
      {/* ── Período e exportação ─────────────────────────────────────────── */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={ate} onChange={e => setAte(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" onClick={() => descarregarICS(eventos)} disabled={!eventos.length}>
          <Download className="h-4 w-4 mr-2" />Exportar (.ics)
        </Button>
        <Button variant="outline" onClick={() => obterToken(false)} disabled={aTratar}>
          {aTratar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
          Sincronizar com o Google
        </Button>
      </div>

      {/* ── Subscrição ───────────────────────────────────────────────────── */}
      {token && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="font-medium text-sm">Subscrever esta agenda</p>
              <p className="text-xs text-muted-foreground mt-1">
                No Google Agenda: <strong>Outros calendários → Subscrever a partir de URL</strong>.
                O Google visita este endereço sozinho e acompanha as alterações.
                Para uma cópia única, use antes o botão <strong>Exportar</strong>.
              </p>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={`${window.location.origin}/api/agenda/${token}.ics`}
                className="font-mono text-xs" onFocus={e => e.currentTarget.select()} />
              <Button variant="outline" size="icon" title="Trocar o endereço"
                onClick={() => obterToken(true)} disabled={aTratar}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este endereço é a sua credencial: quem o tiver vê a sua agenda sem
              iniciar sessão. Se o partilhar por engano, troque-o no botão ao lado.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Eventos ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : eventos.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nada calendarizado neste período.</p>
        </CardContent></Card>
      ) : porMes.map(([mes, linhas]) => (
        <div key={mes} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {mes === 'sem-data' ? 'Sem data definida'
              : format(new Date(`${mes}-01T00:00:00`), "MMMM 'de' yyyy", { locale: pt })}
          </h3>

          {linhas.map(e => {
            const google = linkGoogleAgenda(e);
            const p = PAPEL[e.papel] ?? { label: e.papel, cls: '' };
            return (
              <Card key={e.id}>
                <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{e.curso_nome ?? 'Formação'}</p>
                      <Badge variant="outline" className={p.cls}>{p.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{e.titulo}</p>
                    <div className="flex gap-x-4 gap-y-1 text-xs text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />{fmt(e.inicio)} a {fmt(e.fim)}
                      </span>
                      {e.local && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{e.local}</span>}
                      {e.docente_nome && <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{e.docente_nome}</span>}
                      {!!e.n_alunos && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{e.n_alunos}</span>}
                      {e.cliente_nome && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{e.cliente_nome}</span>}
                    </div>
                  </div>

                  {google && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={google} target="_blank" rel="noreferrer">
                        <CalendarPlus className="h-4 w-4 mr-1.5" />Google Agenda
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
