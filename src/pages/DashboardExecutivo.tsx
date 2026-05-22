import { useNavigate } from 'react-router-dom';
import { useDashboardExecutivo } from '@/hooks/useDashboardExecutivo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Euro, AlertTriangle, RefreshCw,
  ClipboardList, ShoppingCart, Wrench, FileText,
  CheckCircle2, Clock, XCircle, AlertCircle,
} from 'lucide-react';
import { MarketingEditorialSection } from '@/components/dashboard/MarketingEditorialSection';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const fmtDate = (d: string) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-PT');
};

const OS_ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  nova:        { label: 'Nova',         color: 'bg-gray-100 text-gray-700' },
  aprovada:    { label: 'Aprovada',     color: 'bg-blue-100 text-blue-700' },
  em_execucao: { label: 'Em Execução',  color: 'bg-indigo-100 text-indigo-700' },
  concluida:   { label: 'Concluída',    color: 'bg-green-100 text-green-700' },
  faturada:    { label: 'Faturada',     color: 'bg-emerald-100 text-emerald-700' },
  cancelada:   { label: 'Cancelada',    color: 'bg-red-100 text-red-700' },
};

const PP_ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  pendente:             { label: 'Pendente',              color: 'bg-amber-100 text-amber-700' },
  aguarda_comprovativo: { label: 'Aguarda Comprovativo',  color: 'bg-blue-100 text-blue-700' },
  pago:                 { label: 'Pago',                  color: 'bg-green-100 text-green-700' },
};

const PRIORIDADE_LABELS: Record<string, { label: string; color: string }> = {
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
  alta:    { label: 'Alta',    color: 'bg-orange-100 text-orange-700' },
  normal:  { label: 'Normal',  color: 'bg-gray-100 text-gray-700' },
  baixa:   { label: 'Baixa',   color: 'bg-sky-100 text-sky-700' },
};

export default function DashboardExecutivo() {
  const navigate = useNavigate();
  const { metrics: m, isLoading, refetch } = useDashboardExecutivo();
  const today = new Date().toISOString().split('T')[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">A carregar dados executivos...</p>
        </div>
      </div>
    );
  }

  const hasAlerts = m.cobrancasVencidas > 0 || m.extrasAprovar > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada — Produção · Compras · Cobranças · Propostas
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="space-y-2">
          {m.cobrancasVencidas > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-800">
                  <strong>Cobranças vencidas</strong> — Total em atraso:{' '}
                  <strong>{fmt(m.cobrancasVencidas)}</strong>
                </p>
              </div>
              <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-100"
                onClick={() => navigate('/propostas')}
              >
                Ver Propostas →
              </Button>
            </div>
          )}
          {m.extrasAprovar > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  <strong>{m.extrasAprovar}</strong> trabalho{m.extrasAprovar > 1 ? 's' : ''} extra{' '}
                  aguarda{m.extrasAprovar === 1 ? '' : 'm'} aprovação —{' '}
                  <strong>{fmt(m.extrasAprovarValor)}</strong>
                </p>
              </div>
              <Button size="sm" variant="ghost" className="text-amber-700 hover:bg-amber-100"
                onClick={() => navigate('/ordens-servico')}
              >
                Ver OS →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Row 1 — Cobranças */}
      <div>
        <h2 className="text-lg font-semibold mb-3">💰 Plano de Cobranças</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">Recebido (30d)</p>
              <p className="text-2xl font-bold mt-1">{fmt(m.cobrancasPagas30d)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Euro className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm text-muted-foreground">Total a Receber</p>
              <p className="text-2xl font-bold mt-1">{fmt(m.cobrancasPendentes)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-sm text-muted-foreground">Vencido</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{fmt(m.cobrancasVencidas)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-sm text-muted-foreground">Próximos 30 dias</p>
              <p className="text-2xl font-bold mt-1">{fmt(m.cobrancasProximas30d)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2 — Operacional */}
      <div>
        <h2 className="text-lg font-semibold mb-3">⚙️ Operacional</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/ordens-servico')}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Wrench className="h-5 w-5 text-indigo-600" />
                <span className="text-2xl font-bold">{m.osEmExecucao}</span>
              </div>
              <p className="text-sm font-medium">OS em Execução</p>
              <p className="text-xs text-muted-foreground mt-1">{m.osAbertas} abertas no total</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/notas-encomenda')}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">{m.neCurso}</span>
              </div>
              <p className="text-sm font-medium">NE em Curso</p>
              <p className="text-xs text-muted-foreground mt-1">Notas de encomenda ativas</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/ordens-servico')}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <ClipboardList className="h-5 w-5 text-amber-600" />
                <span className="text-2xl font-bold">{m.extrasAprovar}</span>
              </div>
              <p className="text-sm font-medium">Extras por Aprovar</p>
              <p className="text-xs text-muted-foreground mt-1">{fmt(m.extrasAprovarValor)} em aberto</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/propostas')}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span className="text-2xl font-bold">{m.propostasEnviadas}</span>
              </div>
              <p className="text-sm font-medium">Propostas Enviadas</p>
              <p className="text-xs text-muted-foreground mt-1">Aguardam resposta do cliente</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Próximas Cobranças */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Próximas Cobranças
            </CardTitle>
          </CardHeader>
          <CardContent>
            {m.proximasCobrancas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Sem cobranças pendentes
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.proximasCobrancas.map((c) => {
                    const isOverdue = c.dataPrevista < today;
                    const estadoInfo =
                      PP_ESTADO_LABELS[c.estado] ?? {
                        label: c.estado,
                        color: 'bg-gray-100 text-gray-700',
                      };
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.descricao}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(c.valor)}</TableCell>
                        <TableCell className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {fmtDate(c.dataPrevista)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${estadoInfo.color}`}>
                            {estadoInfo.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* OS Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Ordens de Serviço Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {m.osRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma OS ativa
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº OS</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Prioridade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.osRecentes.map((os) => {
                    const estadoInfo =
                      OS_ESTADO_LABELS[os.estado] ?? {
                        label: os.estado,
                        color: 'bg-gray-100 text-gray-700',
                      };
                    const prioInfo =
                      PRIORIDADE_LABELS[os.prioridade] ?? PRIORIDADE_LABELS['normal'];
                    return (
                      <TableRow
                        key={os.id}
                        className="cursor-pointer"
                        onClick={() => navigate('/ordens-servico')}
                      >
                        <TableCell className="font-mono text-xs">{os.numeroOs}</TableCell>
                        <TableCell className="font-medium">{os.clienteNome}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${estadoInfo.color}`}>
                            {estadoInfo.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${prioInfo.color}`}>
                            {prioInfo.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Marketing Editorial */}
      <MarketingEditorialSection />
    </div>
  );
}
