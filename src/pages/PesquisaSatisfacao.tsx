import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Star, MessageSquare, TrendingUp, Calendar, Eye } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';

type Resposta = {
  id: string;
  criado_em: string | null;
  nome: string | null;
  email: string | null;
  tipo_cliente: string | null;
  nps: number | null;
  nav: number | null;
  vel: number | null;
  tempo: number | null;
  variedade: number | null;
  precos: number | null;
  prazo: number | null;
  atend_wp: number | null;
  atend_tel: number | null;
  entrega: number | null;
  pagamento: number | null;
  ecommerce: number | null;
  gostou: string | null;
  melhorar: string | null;
  sugestao: string | null;
  fonte: string | null;
};

const RATING_FIELDS: { key: keyof Resposta; label: string }[] = [
  { key: 'nav', label: 'Navegação' },
  { key: 'vel', label: 'Velocidade' },
  { key: 'tempo', label: 'Tempo de resposta' },
  { key: 'variedade', label: 'Variedade' },
  { key: 'precos', label: 'Preços' },
  { key: 'prazo', label: 'Prazo de entrega' },
  { key: 'atend_wp', label: 'Atendimento WhatsApp' },
  { key: 'atend_tel', label: 'Atendimento Telefone' },
  { key: 'entrega', label: 'Qualidade da entrega' },
  { key: 'pagamento', label: 'Formas de pagamento' },
  { key: 'ecommerce', label: 'E-commerce' },
];

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = parseISO(s);
  return isValid(d) ? format(d, "dd/MM/yyyy 'às' HH:mm", { locale: pt }) : '—';
};

const avgOf = (r: Resposta) => {
  const vals = RATING_FIELDS
    .map(f => r[f.key] as number | null)
    .filter((v): v is number => typeof v === 'number');
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

export default function PesquisaSatisfacao() {
  const [selected, setSelected] = useState<Resposta | null>(null);

  const { data: respostas = [], isLoading } = useQuery({
    queryKey: ['pesquisa_satisfacao_respostas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pesquisa_satisfacao_respostas')
        .select('*')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return (data || []) as Resposta[];
    },
  });

  const kpis = useMemo(() => {
    const total = respostas.length;
    const npsVals = respostas.map(r => r.nps).filter((v): v is number => typeof v === 'number');
    const npsAvg = npsVals.length ? npsVals.reduce((a, b) => a + b, 0) / npsVals.length : 0;
    const satVals = respostas.map(avgOf).filter(v => v > 0);
    const satAvg = satVals.length ? satVals.reduce((a, b) => a + b, 0) / satVals.length : 0;
    const ultima = respostas[0]?.criado_em || null;
    return { total, npsAvg, satAvg, ultima };
  }, [respostas]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-6 w-6 text-primary" />
          Pesquisa de Satisfação
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Respostas dos clientes sobre a sua experiência.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Total de respostas" value={kpis.total.toString()} icon={MessageSquare} />
        <KpiCard label="NPS médio" value={kpis.npsAvg.toFixed(1)} sub="/ 10" icon={TrendingUp} accent="text-emerald-600" />
        <KpiCard label="Satisfação geral" value={kpis.satAvg.toFixed(2)} sub="/ 5" icon={Star} accent="text-amber-600" />
        <KpiCard label="Última resposta" value={kpis.ultima ? fmtDate(kpis.ultima) : '—'} icon={Calendar} small />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Respostas recebidas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : respostas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma resposta registada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo Cliente</TableHead>
                  <TableHead className="text-right">NPS</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {respostas.map(r => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                    <TableCell className="whitespace-nowrap">{fmtDate(r.criado_em)}</TableCell>
                    <TableCell className="font-medium">{r.nome || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.email || '—'}</TableCell>
                    <TableCell>
                      {r.tipo_cliente ? <Badge variant="secondary">{r.tipo_cliente}</Badge> : '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {typeof r.nps === 'number' ? r.nps : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setSelected(r); }}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da resposta</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <Field label="Nome" value={selected.nome} />
                <Field label="Email" value={selected.email} />
                <Field label="Tipo Cliente" value={selected.tipo_cliente} />
                <Field label="Data" value={fmtDate(selected.criado_em)} />
                <Field label="Fonte" value={selected.fonte} />
              </div>

              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">NPS (0-10)</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {typeof selected.nps === 'number' ? selected.nps : '—'}
                  </span>
                </div>
                <Progress value={typeof selected.nps === 'number' ? (selected.nps / 10) * 100 : 0} />
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Avaliações (1-5)</h3>
                <div className="space-y-3">
                  {RATING_FIELDS.map(f => {
                    const v = selected[f.key] as number | null;
                    return (
                      <div key={f.key}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{f.label}</span>
                          <span className="font-semibold">
                            {typeof v === 'number' ? `${v} / 5` : '—'}
                          </span>
                        </div>
                        <Progress value={typeof v === 'number' ? (v / 5) * 100 : 0} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <TextBlock label="O que gostou" value={selected.gostou} />
                <TextBlock label="O que melhorar" value={selected.melhorar} />
                <TextBlock label="Sugestão" value={selected.sugestao} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  label, value, sub, icon: Icon, accent, small,
}: { label: string; value: string; sub?: string; icon: any; accent?: string; small?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`${small ? 'text-sm' : 'text-2xl'} font-bold mt-1 truncate ${accent || ''}`}>
            {value}
            {sub && <span className="text-sm text-muted-foreground font-normal ml-1">{sub}</span>}
          </p>
        </div>
        <Icon className={`h-8 w-8 shrink-0 ${accent || 'text-muted-foreground/50'}`} />
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value || '—'}</p>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value || <span className="text-muted-foreground italic">Sem resposta</span>}</p>
    </div>
  );
}
