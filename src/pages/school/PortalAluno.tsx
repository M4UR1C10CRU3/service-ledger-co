import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePortalAluno } from '@/hooks/usePortalAluno';
import { BookOpen, Award, User, ExternalLink, CalendarDays, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { pt } from 'date-fns/locale';

const STATUS_MATRICULA: Record<string, { label: string; cls: string }> = {
  confirmada:   { label: 'Confirmada',   cls: 'border-blue-500/40 text-blue-600 bg-blue-500/10'    },
  em_andamento: { label: 'Em Andamento', cls: 'border-yellow-500/40 text-yellow-600 bg-yellow-500/10' },
  concluida:    { label: 'Concluída',    cls: 'border-green-500/40 text-green-600 bg-green-500/10' },
  reprovada:    { label: 'Reprovada',    cls: 'border-red-500/40 text-red-600 bg-red-500/10'       },
  cancelada:    { label: 'Cancelada',    cls: 'text-muted-foreground'                               },
};

function fmt(d: string | null) {
  return d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt }) : '—';
}

export default function PortalAluno() {
  const { data, isLoading } = usePortalAluno();
  const [tab, setTab] = useState('cursos');

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  if (!data?.aluno) return (
    <div className="p-6 text-center text-muted-foreground">
      <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="font-medium">Perfil de aluno não encontrado.</p>
      <p className="text-sm mt-1">Contacte a administração do ITC para associar o seu email a uma conta de aluno.</p>
    </div>
  );

  const { aluno, matriculas, certificados, turmasDisponiveis, kpis } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {aluno.nome.split(' ')[0]}</h1>
        <p className="text-sm text-muted-foreground">Portal do Aluno · ITC Treinamentos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={BookOpen} label="Em Andamento" value={kpis.emAndamento} color="blue" />
        <KpiCard icon={CheckCircle2} label="Concluídos" value={kpis.concluidos} color="green" />
        <KpiCard icon={Award} label="Certificados" value={kpis.certificados} color="amber" />
        <KpiCard icon={CalendarDays} label="Próxima Aula" value={kpis.proximaAula ? fmt(kpis.proximaAula) : '—'} color="purple" small />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="cursos">Meus Cursos</TabsTrigger>
          <TabsTrigger value="certificados">Certificados</TabsTrigger>
          <TabsTrigger value="disponiveis">Turmas Disponíveis</TabsTrigger>
          <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
        </TabsList>

        {/* Cursos */}
        <TabsContent value="cursos" className="space-y-3 mt-4">
          {matriculas.length === 0 ? (
            <EmptyState icon={BookOpen} msg="Nenhuma matrícula registada." />
          ) : matriculas.map(m => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">{m.curso_nome}</p>
                  <p className="text-sm text-muted-foreground">{m.turma_titulo}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {m.modalidade && <span>{m.modalidade}</span>}
                    {m.inicio && <span>Início: {fmt(m.inicio)}</span>}
                    {m.fim && <span>Fim: {fmt(m.fim)}</span>}
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_MATRICULA[m.status]?.cls ?? ''}>
                  {STATUS_MATRICULA[m.status]?.label ?? m.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Certificados */}
        <TabsContent value="certificados" className="space-y-3 mt-4">
          {certificados.length === 0 ? (
            <EmptyState icon={Award} msg="Nenhum certificado emitido ainda." />
          ) : certificados.map(c => {
            const vencido = c.validade_em && isPast(new Date(c.validade_em + 'T23:59:59'));
            return (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">{c.curso_nome}</p>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{c.codigo}</code>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>Emitido: {fmt(c.emitido_em)}</span>
                      {c.validade_em && <span>Válido até: {fmt(c.validade_em)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.validade_em && (
                      vencido
                        ? <Badge variant="outline" className="border-red-500/40 text-red-600 bg-red-500/10 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>
                        : <Badge variant="outline" className="border-green-500/40 text-green-600 bg-green-500/10 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Válido</Badge>
                    )}
                    {c.url_pdf && (
                      <Button size="sm" variant="outline" onClick={() => window.open(c.url_pdf!, '_blank')}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />PDF
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Turmas disponíveis */}
        <TabsContent value="disponiveis" className="space-y-3 mt-4">
          {turmasDisponiveis.length === 0 ? (
            <EmptyState icon={CalendarDays} msg="Nenhuma turma aberta no momento." />
          ) : turmasDisponiveis.map(t => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <p className="font-medium">{t.titulo}</p>
                <p className="text-sm text-muted-foreground">{t.curso_nome}</p>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  {t.modalidade && <span>{t.modalidade}</span>}
                  {t.inicio && <span>Início: {fmt(t.inicio)}</span>}
                  {t.vagas && <span>{t.vagas} vagas</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Perfil */}
        <TabsContent value="perfil" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Row label="Nome" value={aluno.nome} />
              <Row label="Email" value={aluno.email ?? '—'} />
              <Row label="CPF" value={aluno.cpf ?? '—'} />
              <Row label="Telefone" value={aluno.telefone ?? '—'} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, small }: { icon: any; label: string; value: string | number; color: string; small?: boolean }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-500', green: 'text-green-500', amber: 'text-amber-500', purple: 'text-purple-500',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-8 w-8 ${colors[color]} shrink-0`} />
        <div>
          <p className={`font-bold ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, msg }: { icon: any; msg: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm border-b border-border/50 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
