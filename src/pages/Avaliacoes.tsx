import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Clock, CalendarCheck, Bell, Plus, Eye, Pencil } from 'lucide-react';
import { useAvaliacoes, getClassificacaoBadge } from '@/hooks/useAvaliacoes';
import { useEmployees } from '@/hooks/useEmployees';
import { AvaliacaoFormDialog } from '@/components/avaliacoes/AvaliacaoFormDialog';
import type { Avaliacao } from '@/hooks/useAvaliacoes';

const tipoLabel: Record<string, string> = {
  experimental_1: 'Experimental 1',
  experimental_2: 'Experimental 2',
  trimestral_1: 'Trimestral 1',
  trimestral_2: 'Trimestral 2',
  trimestral_3: 'Trimestral 3',
  anual: 'Anual',
  extra: 'Avaliação Extra',
};

const tipoBadgeColor: Record<string, string> = {
  experimental_1: 'bg-orange-100 text-orange-800',
  experimental_2: 'bg-orange-100 text-orange-800',
  trimestral_1: 'bg-blue-100 text-blue-800',
  trimestral_2: 'bg-blue-100 text-blue-800',
  trimestral_3: 'bg-blue-100 text-blue-800',
  anual: 'bg-purple-100 text-purple-800',
  extra: 'bg-gray-100 text-gray-800',
};

export default function Avaliacoes() {
  const { avaliacoes, isLoading } = useAvaliacoes();
  const { employees } = useEmployees();
  const [showForm, setShowForm] = useState(false);
  const [editAvaliacao, setEditAvaliacao] = useState<Avaliacao | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const kpis = useMemo(() => {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const in7days = new Date(today);
    in7days.setDate(in7days.getDate() + 7);

    const pendentes = avaliacoes.filter(a => a.estado === 'pendente' && a.data_prevista && new Date(a.data_prevista) <= today);
    const experimental = employees.filter(e => {
      if (!e.admission_date || e.status !== 'active') return false;
      const admDate = new Date(e.admission_date);
      const daysSince = Math.floor((today.getTime() - admDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince <= 30;
    });
    const esteMes = avaliacoes.filter(a => a.estado === 'realizada' && new Date(a.data_avaliacao) >= startOfMonth);
    const alertas = avaliacoes.filter(a => {
      if (a.estado !== 'pendente' || !a.data_prevista) return false;
      const dp = new Date(a.data_prevista);
      return dp <= in7days;
    });

    return {
      pendentes: pendentes.length,
      experimental: experimental.length,
      esteMes: esteMes.length,
      alertas: alertas.length,
    };
  }, [avaliacoes, employees, today]);

  const getDiasRestantes = (dataPrevista: string | null) => {
    if (!dataPrevista) return null;
    const dp = new Date(dataPrevista);
    return Math.ceil((dp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const pendentesEAgendadas = avaliacoes.filter(a => a.estado === 'pendente');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avaliação de Desempenho</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento do período experimental e avaliações periódicas</p>
        </div>
        <Button onClick={() => { setEditAvaliacao(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Avaliação
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold">{kpis.pendentes}</p>
                <p className="text-xs text-muted-foreground">Avaliações Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100"><Clock className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-2xl font-bold">{kpis.experimental}</p>
                <p className="text-xs text-muted-foreground">Em Período Experimental</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100"><CalendarCheck className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-2xl font-bold">{kpis.esteMes}</p>
                <p className="text-xs text-muted-foreground">Avaliações Este Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><Bell className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{kpis.alertas}</p>
                <p className="text-xs text-muted-foreground">Alertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avaliações Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Avaliações Pendentes / Agendadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo de Avaliação</TableHead>
                <TableHead>Data Prevista</TableHead>
                <TableHead>Dias Restantes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : pendentesEAgendadas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma avaliação pendente</TableCell></TableRow>
              ) : pendentesEAgendadas.map(av => {
                const dias = getDiasRestantes(av.data_prevista);
                const isUrgent = dias !== null && dias <= 3;
                const isOverdue = dias !== null && dias < 0;
                return (
                  <TableRow key={av.id} className={isOverdue ? 'bg-red-50' : isUrgent ? 'bg-amber-50' : ''}>
                    <TableCell className="font-medium">{av.colaborador_nome || '—'}</TableCell>
                    <TableCell>
                      <Badge className={tipoBadgeColor[av.tipo_avaliacao] || 'bg-gray-100'}>{tipoLabel[av.tipo_avaliacao] || av.tipo_avaliacao}</Badge>
                    </TableCell>
                    <TableCell>{av.data_prevista ? new Date(av.data_prevista).toLocaleDateString('pt-PT') : '—'}</TableCell>
                    <TableCell>
                      {dias !== null ? (
                        <span className={`font-semibold ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-foreground'}`}>
                          {isOverdue ? `${Math.abs(dias)} dias em atraso` : dias === 0 ? 'Hoje' : `${dias} dias`}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={av.estado === 'pendente' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}>
                        {av.estado === 'pendente' ? 'Pendente' : 'Realizada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditAvaliacao(av); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* All Evaluations - Completed */}
      {avaliacoes.filter(a => a.estado === 'realizada').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Avaliações Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pontuação</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Recomendação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avaliacoes.filter(a => a.estado === 'realizada').map(av => {
                  const badge = getClassificacaoBadge(av.classificacao || '');
                  return (
                    <TableRow key={av.id}>
                      <TableCell className="font-medium">{av.colaborador_nome || '—'}</TableCell>
                      <TableCell><Badge className={tipoBadgeColor[av.tipo_avaliacao] || 'bg-gray-100'}>{tipoLabel[av.tipo_avaliacao] || av.tipo_avaliacao}</Badge></TableCell>
                      <TableCell>{new Date(av.data_avaliacao).toLocaleDateString('pt-PT')}</TableCell>
                      <TableCell className="font-semibold">{av.pontuacao_final?.toFixed(2) || '—'}</TableCell>
                      <TableCell><Badge className={badge.color}>{badge.emoji} {av.classificacao}</Badge></TableCell>
                      <TableCell className="text-sm">{av.recomendacao || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditAvaliacao(av); setShowForm(true); }}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AvaliacaoFormDialog open={showForm} onOpenChange={setShowForm} avaliacao={editAvaliacao} />
    </div>
  );
}
