import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePortalInstrutor } from '@/hooks/usePortalInstrutor';
import { BookOpen, Users, CheckCircle2, User, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const STATUS_TURMA: Record<string, { label: string; cls: string }> = {
  aberta:       { label: 'Aberta',       cls: 'border-blue-500/40 text-blue-600 bg-blue-500/10'    },
  em_andamento: { label: 'Em Andamento', cls: 'border-yellow-500/40 text-yellow-600 bg-yellow-500/10' },
  concluida:    { label: 'Concluída',    cls: 'border-green-500/40 text-green-600 bg-green-500/10' },
  cancelada:    { label: 'Cancelada',    cls: 'text-muted-foreground'                               },
};

const STATUS_MAT: Record<string, { label: string; cls: string }> = {
  confirmada:   { label: 'Confirmada',   cls: 'border-blue-500/40 text-blue-600 bg-blue-500/10'    },
  em_andamento: { label: 'Em Andamento', cls: 'border-yellow-500/40 text-yellow-600 bg-yellow-500/10' },
  concluida:    { label: 'Concluída',    cls: 'border-green-500/40 text-green-600 bg-green-500/10' },
  reprovada:    { label: 'Reprovada',    cls: 'border-red-500/40 text-red-600 bg-red-500/10'       },
  cancelada:    { label: 'Cancelada',    cls: 'text-muted-foreground'                               },
};

function fmt(d: string | null) {
  return d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt }) : '—';
}

export default function PortalInstrutor() {
  const { data, isLoading } = usePortalInstrutor();
  const [tab, setTab] = useState('turmas');
  const [turmaFiltro, setTurmaFiltro] = useState<string | null>(null);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  if (!data?.docente) return (
    <div className="p-6 text-center text-muted-foreground">
      <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="font-medium">Perfil de instrutor não encontrado.</p>
      <p className="text-sm mt-1">Contacte a administração do ITC para associar o seu email ao cadastro de instrutores.</p>
    </div>
  );

  const { docente, turmas, matriculas, kpis } = data;
  const matsFiltradas = turmaFiltro ? matriculas.filter(m => m.turma_id === turmaFiltro) : matriculas;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {docente.nome.split(' ')[0]}</h1>
        <p className="text-sm text-muted-foreground">Portal do Instrutor · ITC Treinamentos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-500 shrink-0" />
          <div><p className="text-2xl font-bold">{kpis.turmasActivas}</p><p className="text-xs text-muted-foreground">Turmas Activas</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-amber-500 shrink-0" />
          <div><p className="text-2xl font-bold">{kpis.totalAlunos}</p><p className="text-xs text-muted-foreground">Total de Alunos</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
          <div><p className="text-2xl font-bold">{kpis.turmasConcluidas}</p><p className="text-xs text-muted-foreground">Turmas Concluídas</p></div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={v => { setTab(v); setTurmaFiltro(null); }}>
        <TabsList>
          <TabsTrigger value="turmas">Minhas Turmas</TabsTrigger>
          <TabsTrigger value="alunos">Alunos</TabsTrigger>
          <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
        </TabsList>

        {/* Turmas */}
        <TabsContent value="turmas" className="space-y-3 mt-4">
          {turmas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhuma turma atribuída.</p></div>
          ) : turmas.map(t => (
            <Card key={t.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => { setTurmaFiltro(t.id); setTab('alunos'); }}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">{t.titulo}</p>
                  <p className="text-sm text-muted-foreground">{t.curso_nome}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {t.local && <span>{t.local}</span>}
                    {t.inicio && <span>Início: {fmt(t.inicio)}</span>}
                    {t.fim && <span>Fim: {fmt(t.fim)}</span>}
                    <span>{t.total_matriculas} aluno{t.total_matriculas !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_TURMA[t.status]?.cls ?? ''}>{STATUS_TURMA[t.status]?.label ?? t.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Alunos */}
        <TabsContent value="alunos" className="mt-4">
          {turmaFiltro && (
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline">{turmas.find(t => t.id === turmaFiltro)?.titulo}</Badge>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setTurmaFiltro(null)}>Ver todos</button>
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Matrícula</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matsFiltradas.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado</TableCell></TableRow>
                  ) : matsFiltradas.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.aluno_nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.turma_titulo}</TableCell>
                      <TableCell><Badge variant="outline" className={STATUS_MAT[m.status]?.cls ?? ''}>{STATUS_MAT[m.status]?.label ?? m.status}</Badge></TableCell>
                      <TableCell className="text-sm">{m.nota_final != null ? `${m.nota_final}` : '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(m.data_matricula)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Perfil */}
        <TabsContent value="perfil" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados do Instrutor</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                ['Nome', docente.nome],
                ['Email', docente.email ?? '—'],
                ['Telefone', docente.telefone ?? '—'],
                ['Formação', docente.formacao ?? '—'],
                ['Especialização', docente.especializacao ?? '—'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
