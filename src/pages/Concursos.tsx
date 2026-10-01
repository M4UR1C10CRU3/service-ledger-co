import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, Landmark, CalendarClock } from 'lucide-react';
import { useConcursos } from '@/hooks/useConcursos';
import { formatEUR } from '@/lib/formatters';
import { ESTADO_LABEL, type Concurso } from '@/types/concursos';

const dataHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** Dias até ao prazo; negativo se já passou. */
const diasAte = (iso: string | null) =>
  iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null;

const corPrazo = (dias: number | null) =>
  dias == null ? 'secondary' : dias < 0 ? 'outline' : dias <= 2 ? 'destructive' : dias <= 7 ? 'default' : 'secondary';

export default function Concursos() {
  const { concursos, loading, recarregar } = useConcursos();
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return concursos.filter(c => !q ||
      [c.designacao, c.entidade_nome, c.entidade_referencia ?? '', c.referencia_interna ?? '']
        .join(' ').toLowerCase().includes(q));
  }, [concursos, busca]);

  const emCurso = filtrados.filter(c => !['resultado', 'arquivado'].includes(c.estado));
  const fechados = filtrados.filter(c => ['resultado', 'arquivado'].includes(c.estado));

  const Linha = ({ c }: { c: Concurso }) => {
    const dias = diasAte(c.prazo_propostas);
    return (
      <TableRow className="cursor-pointer" onClick={() => navigate(`/concursos/${c.id}`)}>
        <TableCell className="font-mono text-xs text-muted-foreground">{c.referencia_interna ?? '—'}</TableCell>
        <TableCell>
          <div className="font-medium">{c.designacao}{c.versao > 1 && <span className="ml-1 text-xs text-muted-foreground">v{c.versao}</span>}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Landmark size={11} /> {c.entidade_nome} · {c.entidade_referencia ?? '—'}</div>
        </TableCell>
        <TableCell className="text-right whitespace-nowrap">{c.preco_base != null ? formatEUR(c.preco_base) : '—'}</TableCell>
        <TableCell className="text-right whitespace-nowrap">{c.preco_proposto != null ? formatEUR(c.preco_proposto) : <span className="text-muted-foreground">—</span>}</TableCell>
        <TableCell className="whitespace-nowrap">
          <Badge variant={corPrazo(dias)} className="gap-1"><CalendarClock size={11} />
            {dataHora(c.prazo_propostas)}{dias != null && dias >= 0 && ` · ${dias} d`}
          </Badge>
        </TableCell>
        <TableCell><Badge variant="outline">{ESTADO_LABEL[c.estado] ?? c.estado}</Badge></TableCell>
      </TableRow>
    );
  };

  const Tabela = ({ lista }: { lista: Concurso[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ref.</TableHead>
          <TableHead>Concurso</TableHead>
          <TableHead className="text-right">Preço base</TableHead>
          <TableHead className="text-right">Proposta</TableHead>
          <TableHead>Prazo de entrega</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lista.map(c => <Linha key={c.id} c={c} />)}
        {lista.length === 0 && (
          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
            {loading ? 'A carregar…' : 'Nenhum concurso.'}
          </TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Construção &amp; Obras</p>
          <h1 className="text-2xl font-semibold">Concursos Públicos</h1>
          <p className="text-sm text-muted-foreground">Do anúncio à adjudicação. Cada concurso é um cartão do Quadro «Concursos Públicos».</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Procurar…" className="pl-8 w-64" />
          </div>
          <Button variant="outline" size="icon" onClick={recarregar} title="Atualizar"><RefreshCw size={14} /></Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-2 border-b text-sm font-medium">Em curso · {emCurso.length}</div>
        <Tabela lista={emCurso} />
      </Card>

      {fechados.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-2 border-b text-sm font-medium text-muted-foreground">Fechados · {fechados.length}</div>
          <Tabela lista={fechados} />
        </Card>
      )}
    </div>
  );
}
