import { useState } from 'react';
import { useRelatorioGerencial, getPeriodoRange } from '@/hooks/useRelatorioGerencial';
import type { PeriodoTipo } from '@/hooks/useRelatorioGerencial';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { getEmpresaDocConfig } from '@/lib/empresaConfig';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, FileBarChart2, RefreshCw } from 'lucide-react';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

function KpiBox({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className={`rounded-lg border p-4 ${className ?? ''}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold border-b pb-2">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
    </div>
  );
}

export default function RelatorioGerencial() {
  const { empresa, getLogo } = useEmpresa();
  const { data, isLoading, gerar } = useRelatorioGerencial();
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>('mes_atual');
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');

  const handleGerar = () => {
    const custom = periodoTipo === 'personalizado' ? { inicio: customInicio, fim: customFim } : undefined;
    const range = getPeriodoRange(periodoTipo, custom);
    gerar(range);
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #relatorio-print, #relatorio-print * { visibility: visible; }
          #relatorio-print { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      <div className="p-6 space-y-6">
        <div className="no-print flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Relatório Gerencial</h1>
            <p className="text-sm text-muted-foreground">Exportação PDF do resumo executivo por período</p>
          </div>
        </div>

        <Card className="no-print">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={periodoTipo} onValueChange={(v) => setPeriodoTipo(v as PeriodoTipo)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes_atual">Mês Atual</SelectItem>
                    <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                    <SelectItem value="trimestre">Trimestre Atual</SelectItem>
                    <SelectItem value="ano">Ano Atual</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodoTipo === 'personalizado' && (
                <>
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input type="date" value={customInicio} onChange={(e) => setCustomInicio(e.target.value)} className="w-[160px]" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} className="w-[160px]" />
                  </div>
                </>
              )}

              <Button onClick={handleGerar} disabled={isLoading}>
                {isLoading ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> A gerar...</>
                ) : (
                  <><FileBarChart2 className="h-4 w-4 mr-2" /> Gerar Relatório</>
                )}
              </Button>

              {data && (
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" /> Exportar PDF
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {!data ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileBarChart2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Selecione um período e clique em "Gerar Relatório"</p>
            </CardContent>
          </Card>
        ) : (
          <div id="relatorio-print" className="space-y-8 bg-background p-6 rounded-lg border">
            {/* Print header — PHC style */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-4">
                {getLogo() && (
                  <img
                    src={getLogo()}
                    alt={data.empresaNome}
                    className="max-h-14 object-contain"
                    crossOrigin="anonymous"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: empresa?.corPrimaria || '#E8630A' }}>
                    {data.empresaNome}
                  </h2>
                  {empresa && (() => {
                    const cfg = getEmpresaDocConfig(empresa.slug);
                    return (
                      <p className="text-xs text-muted-foreground leading-5">
                        {cfg.morada} · {cfg.codigoPostal} {cfg.localidade} · NIF {cfg.contribuinte}
                      </p>
                    );
                  })()}
                  <p className="text-sm text-muted-foreground">Relatório Gerencial — {data.periodo.label}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase">Gerado em</p>
                <p className="text-sm font-medium">{data.geradoEm}</p>
              </div>
            </div>

            <Section title="Cobranças">
              <KpiBox label="Pagas no período" value={fmt(data.cobrancasPagas)} />
              <KpiBox label="Pendentes" value={fmt(data.cobrancasPendentes)} />
              <KpiBox
                label="Vencidas"
                value={fmt(data.cobrancasVencidas)}
                className={data.cobrancasVencidas > 0 ? 'bg-red-50 border-red-200' : ''}
              />
              <KpiBox label="Total" value={fmt(data.totalCobrancas)} />
            </Section>

            <Section title="Propostas">
              <KpiBox label="Enviadas no período" value={String(data.propostasEnviadas)} />
              <KpiBox label="Aceites no período" value={String(data.propostasAceites)} />
              <KpiBox label="Valor Adjudicado (total)" value={fmt(data.valorAdjudicado)} />
            </Section>

            <Section title="Ordens de Serviço">
              <KpiBox label="Concluídas no período" value={String(data.osConcluidas)} />
              <KpiBox label="Faturadas no período" value={String(data.osFaturadas)} />
              <KpiBox label="Em aberto" value={String(data.osAbertas)} />
              <KpiBox label="Total" value={String(data.osTotal)} />
            </Section>

            <Section title="Trabalhos Extra">
              <KpiBox label="Aprovados no período" value={String(data.extrasAprovados)} sub={fmt(data.valorExtrasAprovados)} />
              <KpiBox
                label="A aprovar"
                value={String(data.extrasAprovar)}
                sub={fmt(data.valorExtrasAprovar)}
                className={data.extrasAprovar > 0 ? 'bg-orange-50 border-orange-200' : ''}
              />
            </Section>

            <Section title="Notas de Encomenda">
              <KpiBox label="Recebidas no período" value={String(data.neRecebidas)} />
              <KpiBox label="Em curso" value={String(data.neCurso)} />
            </Section>

            <div className="border-t pt-4 mt-8">
              <p className="text-xs text-center text-muted-foreground">
                Clariza Manager — Sistema de Gestão · Relatório gerado em {data.geradoEm} · Período: {data.periodo.inicio} a {data.periodo.fim}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
