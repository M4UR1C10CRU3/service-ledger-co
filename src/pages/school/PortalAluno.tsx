import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePortalAluno, usePedirInscricao, useAtualizarContacto } from '@/hooks/usePortalAluno';
import { CursoDetalhe } from '@/components/portal/CursoDetalhe';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CertificadoAcoes } from '@/components/school/CertificadoAcoes';
import { BookOpen, Award, User, CalendarDays, AlertTriangle, CheckCircle2, ChevronDown, Clock, Send, Loader2 } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { pt } from 'date-fns/locale';

const STATUS_MATRICULA: Record<string, { label: string; cls: string }> = {
  confirmada:   { label: 'Confirmada',   cls: 'border-blue-500/40 text-blue-600 bg-blue-500/10'    },
  em_andamento: { label: 'Em Andamento', cls: 'border-yellow-500/40 text-yellow-600 bg-yellow-500/10' },
  concluida:    { label: 'Concluída',    cls: 'border-green-500/40 text-green-600 bg-green-500/10' },
  reprovada:    { label: 'Reprovada',    cls: 'border-red-500/40 text-red-600 bg-red-500/10'       },
  cancelada:    { label: 'Cancelada',    cls: 'text-muted-foreground'                               },
};

/**
 * As colunas do School não são todas do mesmo tipo: `inicio` e `fim` são DATE
 * ("2026-06-15") mas `emitido_em` é TIMESTAMP ("2026-06-18T00:00:00+00:00").
 * Colar 'T00:00:00' ao segundo dava uma data inválida e derrubava o portal
 * inteiro para qualquer aluno com certificado emitido.
 */
function fmt(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return isNaN(dt.getTime()) ? '—' : format(dt, 'dd/MM/yyyy', { locale: pt });
}

export default function PortalAluno() {
  const { data, isLoading } = usePortalAluno();
  const pedirInscricao = usePedirInscricao();
  const atualizar = useAtualizarContacto();
  const [tab, setTab] = useState('cursos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [contacto, setContacto] = useState({ email: '', telefone: '' });

  // O formulário parte dos valores da ficha e só se ativa quando algo muda.
  useEffect(() => {
    if (data?.aluno) {
      setContacto({ email: data.aluno.email ?? '', telefone: data.aluno.telefone ?? '' });
    }
  }, [data?.aluno?.email, data?.aluno?.telefone]);

  const alterouContacto = !!data?.aluno && (
    contacto.email !== (data.aluno.email ?? '') ||
    contacto.telefone !== (data.aluno.telefone ?? '')
  );

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

  // Os valores por omissão protegem de uma resposta em cache com a forma
  // antiga: quando o hook ganha um campo novo, o que está guardado ainda não o
  // tem, e um `.find` sobre indefinido derruba o portal inteiro.
  const {
    aluno,
    matriculas = [],
    certificados = [],
    turmasDisponiveis = [],
    inscricoes = [],
    kpis,
  } = data;

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
          ) : matriculas.map(m => {
            const aberto = expandido === m.id;
            return (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <button
                    type="button"
                    onClick={() => setExpandido(aberto ? null : m.id)}
                    className="w-full flex items-start justify-between gap-4 text-left"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{m.curso_nome}</p>
                      <p className="text-sm text-muted-foreground">{m.turma_titulo}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {m.modalidade && <span>{m.modalidade}</span>}
                        {m.inicio && <span>Início: {fmt(m.inicio)}</span>}
                        {m.fim && <span>Fim: {fmt(m.fim)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={STATUS_MATRICULA[m.status]?.cls ?? ''}>
                        {STATUS_MATRICULA[m.status]?.label ?? m.status}
                      </Badge>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${aberto ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {aberto && <CursoDetalhe m={m} fmt={fmt} />}
                </CardContent>
              </Card>
            );
          })}
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
                    {/* O PDF abria por URL directa, que num bucket privado dá
                        403. E não havia forma de confirmar a autenticidade —
                        que é o que uma entidade contratante pede. */}
                    <CertificadoAcoes codigo={c.codigo} caminhoPdf={c.url_pdf} compacto />
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
          ) : turmasDisponiveis.map(t => {
            const jaMatriculado = matriculas.some(m => m.turma_id === t.id);
            const pedido = inscricoes.find(i => i.turma_id === t.id && i.estado === 'pedido');
            const recusado = inscricoes.find(i => i.turma_id === t.id && i.estado === 'recusada');
            return (
              <Card key={t.id}>
                <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium">{t.titulo}</p>
                    <p className="text-sm text-muted-foreground">{t.curso_nome}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      {t.modalidade && <span>{t.modalidade}</span>}
                      {t.inicio && <span>Início: {fmt(t.inicio)}</span>}
                      {t.vagas && <span>{t.vagas} vagas</span>}
                    </div>
                    {recusado?.resposta && (
                      <p className="text-xs text-muted-foreground mt-2">Resposta do ITC: {recusado.resposta}</p>
                    )}
                  </div>

                  {/* Ver a turma e não poder fazer nada com ela era o que
                      faltava. O pedido não cria matrícula: há vagas, pagamento
                      e pré-requisitos que a escola decide. */}
                  {jaMatriculado ? (
                    <Badge variant="outline" className="border-green-500/40 text-green-600 bg-green-500/10">
                      Já inscrito
                    </Badge>
                  ) : pedido ? (
                    <Badge variant="outline" className="border-blue-500/40 text-blue-600 bg-blue-500/10">
                      <Clock className="h-3 w-3 mr-1" />Pedido enviado
                    </Badge>
                  ) : (
                    <Button size="sm" disabled={pedirInscricao.isPending}
                      onClick={() => pedirInscricao.mutate({
                        alunoId: aluno.id, empresaId: aluno.empresa_id, turmaId: t.id,
                      })}>
                      {pedirInscricao.isPending
                        ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        : <Send className="h-4 w-4 mr-1.5" />}
                      Pedir inscrição
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Perfil */}
        <TabsContent value="perfil" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Nome e CPF ficam com a secretaria: são o que vai impresso no
                  certificado e alteram-se contra documento, não por formulário. */}
              <Row label="Nome" value={aluno.nome} />
              <Row label="CPF" value={aluno.cpf ?? '—'} />
              <p className="text-xs text-muted-foreground -mt-1">
                Nome e CPF são os dados impressos no certificado. Para os corrigir,
                contacte a secretaria.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={contacto.email} onChange={e => setContacto(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefone</Label>
                  <Input value={contacto.telefone} onChange={e => setContacto(p => ({ ...p, telefone: e.target.value }))} />
                </div>
              </div>

              <Button size="sm" disabled={atualizar.isPending || !alterouContacto}
                onClick={() => atualizar.mutate(contacto)}>
                {atualizar.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A guardar...</>
                  : 'Guardar alterações'}
              </Button>
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
