import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSchoolClientesCorp } from '@/hooks/useSchoolClientesCorp';
import { usePortalCorporativo } from '@/hooks/usePortalCorporativo';
import { Building2, Users, Award, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { pt } from 'date-fns/locale';

const STATUS_TURMA: Record<string, { label: string; cls: string }> = {
  aberta:       { label: 'Aberta',       cls: 'border-blue-500/40 text-blue-600 bg-blue-500/10'    },
  em_andamento: { label: 'Em Andamento', cls: 'border-yellow-500/40 text-yellow-600 bg-yellow-500/10' },
  concluida:    { label: 'Concluída',    cls: 'border-green-500/40 text-green-600 bg-green-500/10' },
  cancelada:    { label: 'Cancelada',    cls: 'text-muted-foreground'                               },
};

function fmt(d: string | null) {
  return d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt }) : '—';
}

export default function PortalCorporativo() {
  const { clientes } = useSchoolClientesCorp();
  const [clienteId, setClienteId] = useState<string | undefined>(undefined);
  const { data, isLoading } = usePortalCorporativo(clienteId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portal Corporativo</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada de treinamentos por empresa cliente</p>
        </div>
        <Select value={clienteId ?? ''} onValueChange={v => setClienteId(v || undefined)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Seleccionar empresa cliente" /></SelectTrigger>
          <SelectContent>
            {clientes.filter(c => c.ativo).map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!clienteId && (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona uma empresa cliente para ver o painel.</p>
        </div>
      )}

      {clienteId && isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {clienteId && !isLoading && data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Users} label="Total de Colaboradores" value={data.kpis.totalAlunos} color="blue" />
            <KpiCard icon={Building2} label="Em Formação" value={data.kpis.emFormacao} color="yellow" />
            <KpiCard icon={Award} label="Certificados Emitidos" value={data.kpis.certificados} color="green" />
            <KpiCard icon={AlertTriangle} label="A Vencer (30 dias)" value={data.kpis.vencendo} color={data.kpis.vencendo > 0 ? 'red' : 'grey'} />
          </div>

          <Tabs defaultValue="colaboradores">
            <TabsList>
              <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
              <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
              <TabsTrigger value="certificados">Certificados</TabsTrigger>
            </TabsList>

            {/* Colaboradores */}
            <TabsContent value="colaboradores" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Em Formação</TableHead>
                        <TableHead>Certificados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.alunos.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum colaborador encontrado com o nome da empresa no cadastro.</TableCell></TableRow>
                      ) : data.alunos.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.nome}</TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">{a.cpf ?? '—'}</TableCell>
                          <TableCell><Badge variant="outline" className={a.status === 'ativo' ? 'border-green-500/40 text-green-600 bg-green-500/10' : 'text-muted-foreground'}>{a.status}</Badge></TableCell>
                          <TableCell className="text-sm">{a.cursos_em_andamento}</TableCell>
                          <TableCell className="text-sm">{a.certificados_emitidos}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Treinamentos */}
            <TabsContent value="treinamentos" className="space-y-3 mt-4">
              {data.treinamentos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhum treinamento encontrado.</p></div>
              ) : data.treinamentos.map(t => (
                <Card key={t.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium">{t.titulo}</p>
                      <p className="text-sm text-muted-foreground">{t.curso_nome}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {t.inicio && <span>Início: {fmt(t.inicio)}</span>}
                        {t.fim && <span>Fim: {fmt(t.fim)}</span>}
                        <span>{t.concluidos}/{t.total_alunos} concluídos</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={STATUS_TURMA[t.status]?.cls ?? ''}>{STATUS_TURMA[t.status]?.label ?? t.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Certificados */}
            <TabsContent value="certificados" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Curso</TableHead>
                        <TableHead>Emitido</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.certificados.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum certificado.</TableCell></TableRow>
                      ) : data.certificados.map(c => {
                        const vencido = c.validade_em && isPast(new Date(c.validade_em + 'T23:59:59'));
                        return (
                          <TableRow key={c.id}>
                            <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{c.codigo}</code></TableCell>
                            <TableCell className="font-medium">{c.aluno_nome}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{c.curso_nome}</TableCell>
                            <TableCell className="text-sm">{fmt(c.emitido_em)}</TableCell>
                            <TableCell>
                              {c.validade_em ? (
                                <span className={`text-sm ${vencido ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  {vencido ? <AlertTriangle className="h-3 w-3 inline mr-1" /> : <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-500" />}
                                  {fmt(c.validade_em)}
                                </span>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              {c.url_pdf && (
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => window.open(c.url_pdf!, '_blank')}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-500', yellow: 'text-yellow-500', green: 'text-green-500',
    red: 'text-red-500', grey: 'text-muted-foreground',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-8 w-8 shrink-0 ${colors[color]}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
