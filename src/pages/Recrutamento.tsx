import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Users, Calendar, CheckCircle, Plus, Eye, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useVagas, useCandidatos, useEntrevistas } from '@/hooks/useRecrutamento';
import { VagaFormDialog } from '@/components/recrutamento/VagaFormDialog';
import { VagaDetailView } from '@/components/recrutamento/VagaDetailView';
import type { Vaga } from '@/hooks/useRecrutamento';

const estadoBadge: Record<string, string> = {
  aberta: 'bg-emerald-100 text-emerald-800',
  'em_selecao': 'bg-blue-100 text-blue-800',
  encerrada: 'bg-gray-100 text-gray-800',
  cancelada: 'bg-red-100 text-red-800',
};

const estadoLabel: Record<string, string> = {
  aberta: 'Aberta',
  em_selecao: 'Em Seleção',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
};

export default function Recrutamento() {
  const { vagas, isLoading, deleteVaga } = useVagas();
  const [showForm, setShowForm] = useState(false);
  const [editVaga, setEditVaga] = useState<Vaga | null>(null);
  const [detailVaga, setDetailVaga] = useState<Vaga | null>(null);

  const kpis = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    return {
      abertas: vagas.filter(v => v.estado === 'aberta').length,
      candidatos: 0, // will be calculated per vaga in detail
      entrevistas: 0,
      preenchidas: vagas.filter(v => v.estado === 'encerrada' && new Date(v.atualizado_em) >= startOfMonth).length,
    };
  }, [vagas]);

  if (detailVaga) {
    return <VagaDetailView vaga={detailVaga} onBack={() => setDetailVaga(null)} />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recrutamento e Seleção</h1>
          <p className="text-sm text-muted-foreground">Gestão de vagas, candidatos e entrevistas</p>
        </div>
        <Button onClick={() => { setEditVaga(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Vaga
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100"><Briefcase className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-2xl font-bold">{kpis.abertas}</p>
                <p className="text-xs text-muted-foreground">Vagas Abertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{kpis.candidatos}</p>
                <p className="text-xs text-muted-foreground">Candidatos em Processo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><Calendar className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{kpis.entrevistas}</p>
                <p className="text-xs text-muted-foreground">Entrevistas Esta Semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><CheckCircle className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{kpis.preenchidas}</p>
                <p className="text-xs text-muted-foreground">Posições Preenchidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vagas Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Vagas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cargo / Função</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Data Abertura</TableHead>
                <TableHead>Nº Vagas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : vagas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma vaga registada</TableCell></TableRow>
              ) : vagas.map(v => (
                <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailVaga(v)}>
                  <TableCell className="font-medium">{v.cargo}</TableCell>
                  <TableCell>{v.area || '—'}</TableCell>
                  <TableCell>{new Date(v.data_abertura).toLocaleDateString('pt-PT')}</TableCell>
                  <TableCell>{v.num_vagas}</TableCell>
                  <TableCell>
                    <Badge className={estadoBadge[v.estado] || 'bg-gray-100'}>{estadoLabel[v.estado] || v.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => setDetailVaga(v)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditVaga(v); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteVaga.mutate(v.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <VagaFormDialog open={showForm} onOpenChange={setShowForm} vaga={editVaga} />
    </div>
  );
}
