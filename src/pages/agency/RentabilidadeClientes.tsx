import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useProjetos } from '@/hooks/useProjetos';
import { useAgencyPais } from '@/hooks/useAgencyPais';
import { TrendingUp, AlertTriangle } from 'lucide-react';

/**
 * O relatório que justifica o vertical: quanto tempo cada cliente consome e
 * se dá margem. É a pergunta que o Clariza hoje não sabe responder.
 */
export default function RentabilidadeClientes() {
  const { projetos, isLoading } = useProjetos(true);
  const { eur } = useAgencyPais();

  const porCliente = useMemo(() => {
    const mapa = new Map<string, {
      cliente: string; projetos: number; horas: number; custo: number; budget: number;
    }>();
    for (const p of projetos) {
      const chave = p.clienteNome || '— sem cliente —';
      const atual = mapa.get(chave) ?? { cliente: chave, projetos: 0, horas: 0, custo: 0, budget: 0 };
      atual.projetos += 1;
      atual.horas   += p.horasApontadas;
      atual.custo   += p.custoReal;
      atual.budget  += p.budget ?? 0;
      mapa.set(chave, atual);
    }
    return Array.from(mapa.values()).sort((a, b) => b.horas - a.horas);
  }, [projetos]);

  const maxHoras = Math.max(1, ...porCliente.map(c => c.horas));
  const totais = porCliente.reduce(
    (s, c) => ({ horas: s.horas + c.horas, custo: s.custo + c.custo, budget: s.budget + c.budget }),
    { horas: 0, custo: 0, budget: 0 },
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Rentabilidade por cliente</h1>
          <p className="text-sm text-muted-foreground">
            Horas consumidas e custo real, comparados com o budget acordado
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-12 text-muted-foreground">A carregar...</p>
          ) : porCliente.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              Ainda não há dados — crie projetos e aponte horas para o relatório ganhar sentido.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="w-[180px]">Peso em horas</TableHead>
                    <TableHead className="text-right">Projetos</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Custo real</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porCliente.map(c => {
                    const margem = c.budget - c.custo;
                    const semBudget = c.budget === 0;
                    const negativa = !semBudget && margem < 0;
                    return (
                      <TableRow key={c.cliente}>
                        <TableCell className="font-medium">{c.cliente}</TableCell>
                        <TableCell>
                          <Progress value={(c.horas / maxHoras) * 100} className="h-1.5" />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{c.projetos}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.horas.toFixed(1)}h</TableCell>
                        <TableCell className="text-right tabular-nums">{eur(c.custo)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {semBudget ? <span className="text-muted-foreground">—</span> : eur(c.budget)}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${
                          semBudget ? 'text-muted-foreground' : negativa ? 'text-red-600' : 'text-green-700 dark:text-green-400'
                        }`}>
                          {semBudget ? '—' : (
                            <span className="inline-flex items-center gap-1 justify-end">
                              {negativa && <AlertTriangle className="h-3 w-3" />}
                              {eur(margem)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{totais.horas.toFixed(1)}h</TableCell>
                    <TableCell className="text-right tabular-nums">{eur(totais.custo)}</TableCell>
                    <TableCell className="text-right tabular-nums">{eur(totais.budget)}</TableCell>
                    <TableCell className="text-right tabular-nums">{eur(totais.budget - totais.custo)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground max-w-2xl">
        O custo real é calculado com o custo-hora congelado no momento de cada apontamento.
        A fórmula atual deriva do salário mensal do colaborador; assim que confirmar as taxas
        de encargos com o contabilista, passa a usar os valores de <code>ag_encargos_laborais</code>
        e estes números tornam-se definitivos.
      </p>
    </div>
  );
}
