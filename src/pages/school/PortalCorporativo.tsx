import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Building2, FileText, CalendarDays, Send, Users, Award, AlertTriangle,
  CheckCircle2, Clock, Plus, Loader2, ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { usePortalCorporativo, useCriarPedidoFormacao } from '@/hooks/usePortalCorporativo';
import { IndicarFormandos } from '@/components/portal/IndicarFormandos';
import { CertificadoAcoes } from '@/components/school/CertificadoAcoes';

function fmt(d: string | null) {
  // DATE vem "2026-06-15"; TIMESTAMP vem com hora. Ver a nota em PortalAluno.
  if (!d) return '—';
  const dt = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return isNaN(dt.getTime()) ? '—' : format(dt, 'dd/MM/yyyy', { locale: pt });
}

const eur = (v: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const ESTADO_PEDIDO: Record<string, { label: string; cls: string }> = {
  pedido:     { label: 'Enviado',    cls: 'border-blue-500/40 text-blue-600 bg-blue-500/10' },
  em_analise: { label: 'Em análise', cls: 'border-amber-500/40 text-amber-600 bg-amber-500/10' },
  respondido: { label: 'Respondido', cls: 'border-purple-500/40 text-purple-600 bg-purple-500/10' },
  aceite:     { label: 'Aceite',     cls: 'border-green-500/40 text-green-600 bg-green-500/10' },
  recusado:   { label: 'Recusado',   cls: 'text-muted-foreground' },
  cancelado:  { label: 'Cancelado',  cls: 'text-muted-foreground' },
};

export default function PortalCorporativo() {
  const { data, isLoading } = usePortalCorporativo();
  const criar = useCriarPedidoFormacao();
  const [tab, setTab] = useState('visao');
  const [pedidoAberto, setPedidoAberto] = useState(false);

  /**
   * O pedido faz-se em DOIS passos.
   *
   * Antes era um curso de cada vez: quem precisava de três formações abria o
   * formulário três vezes e repetia o local e as observações em todas. Agora
   * marca os cursos que quer — com o perfil da empresa à cabeça — e só depois
   * diz, para cada um, quantos vão e para quando.
   *
   * Continua a sair um pedido POR CURSO. Cada curso é uma turma sua, com a sua
   * data e o seu preço; juntá-los num pedido só faria o ITC ter de os separar
   * à mão do outro lado.
   */
  const [passo, setPasso] = useState<1 | 2>(1);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [detalhes, setDetalhes] = useState<Record<string, { n: string; data: string }>>({});
  const EMPTY = { modalidade: 'presencial', local_pretendido: '', observacoes: '' };
  const [form, setForm] = useState(EMPTY);

  const alternarCurso = (id: string) =>
    setEscolhidos(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const fecharPedido = () => {
    setPedidoAberto(false);
    setPasso(1); setEscolhidos([]); setDetalhes({}); setForm(EMPTY);
  };

  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  if (!data?.cliente) return (
    <div className="p-6 text-center text-muted-foreground">
      <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="font-medium">Empresa não encontrada.</p>
      <p className="text-sm mt-1">
        A sua conta ainda não está associada a nenhuma empresa cliente. Contacte o ITC.
      </p>
    </div>
  );

  const { cliente, contacto, contratos, alunos, treinamentos, certificados, pedidos, cursos, kpis } = data;

  /**
   * Um pedido por curso escolhido, com o local, a modalidade e as observações
   * partilhados. Se um falhar, os outros seguem — e diz-se quantos passaram,
   * em vez de deixar a pessoa sem saber o que ficou feito.
   */
  const submeter = async () => {
    let feitos = 0;
    for (const id of escolhidos) {
      const curso = cursos.find(c => c.id === id);
      const d = detalhes[id] ?? { n: '', data: '' };
      try {
        await criar.mutateAsync({
          cliente_id: cliente.id,
          empresa_id: cliente.empresa_id,
          curso_id: id,
          curso_nome: curso?.nome ?? '',
          n_formandos: d.n ? Number(d.n) : null,
          modalidade: form.modalidade || null,
          local_pretendido: form.local_pretendido || null,
          data_pretendida: d.data || null,
          observacoes: form.observacoes || null,
          pedido_por: contacto?.nome ?? null,
        });
        feitos++;
      } catch { /* o hook já avisa; continua para os restantes */ }
    }
    if (feitos > 0) fecharPedido();
  };

  const semQuantidade = escolhidos.filter(id => !detalhes[id]?.n);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />{cliente.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            Espaço da empresa · ITC Treinamentos
            {contacto && <> · {contacto.nome}{contacto.cargo ? ` (${contacto.cargo})` : ''}</>}
          </p>
        </div>
        <Button onClick={() => setPedidoAberto(true)}>
          <Plus className="h-4 w-4 mr-2" />Pedir orçamento de formação
        </Button>
      </div>

      {/* O que a empresa precisa de saber num relance */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Kpi icon={Users} label="Formandos" value={kpis.totalAlunos} />
        <Kpi icon={Clock} label="Em formação" value={kpis.emFormacao} cor="text-blue-600" />
        <Kpi icon={Award} label="Certificados" value={kpis.certificados} cor="text-green-600" />
        <Kpi icon={AlertTriangle} label="A caducar (90 dias)" value={kpis.vencendo} cor="text-amber-600" />
        <Kpi icon={AlertTriangle} label="Caducados" value={kpis.vencidos} cor="text-red-600" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="visao">Visão geral</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({contratos.length})</TabsTrigger>
          <TabsTrigger value="calendario">Calendarização ({treinamentos.length})</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos ({pedidos.length})</TabsTrigger>
        </TabsList>

        {/* ── Visão geral: os formandos e o estado das certificações ──────── */}
        <TabsContent value="visao" className="mt-4 space-y-4">
          {certificados.some(c => c.validade_em && c.validade_em < hoje) && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-700">Há certificações caducadas</p>
                  <p className="text-muted-foreground">
                    {kpis.vencidos} certificado{kpis.vencidos !== 1 ? 's' : ''} da sua equipa já passou da validade.
                    Peça um orçamento de reciclagem.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Formando</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="text-center">Em formação</TableHead>
                  <TableHead className="text-center">Certificados</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {alunos.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Ainda não há formandos associados à sua empresa.
                    </TableCell></TableRow>
                  ) : alunos.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nome}</TableCell>
                      <TableCell className="font-mono text-sm">{a.cpf ?? '—'}</TableCell>
                      <TableCell className="text-center">{a.cursos_em_andamento || '—'}</TableCell>
                      <TableCell className="text-center">{a.certificados_emitidos || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {certificados.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Certificado</TableHead>
                    <TableHead>Formando</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Emitido</TableHead>
                    <TableHead>Válido até</TableHead>
                    <TableHead className="text-right">Autenticidade</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {certificados.slice(0, 25).map(c => {
                      const caducado = c.validade_em ? c.validade_em < hoje : false;
                      return (
                        <TableRow key={c.id}>
                          <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{c.codigo}</code></TableCell>
                          <TableCell className="text-sm">{c.aluno_nome}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.curso_nome}</TableCell>
                          <TableCell className="text-sm">{fmt(c.emitido_em)}</TableCell>
                          <TableCell className="text-sm">
                            <span className={caducado ? 'text-red-600 font-medium' : ''}>{fmt(c.validade_em)}</span>
                            {caducado && <Badge variant="outline" className="ml-2 border-red-500/40 text-red-600">Caducado</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <CertificadoAcoes codigo={c.codigo} caminhoPdf={c.url_pdf} compacto />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Contratos ───────────────────────────────────────────────────── */}
        <TabsContent value="contratos" className="mt-4 space-y-3">
          {contratos.length === 0 ? (
            <Vazio icon={FileText} msg="Ainda não há contratos de formação registados." />
          ) : contratos.map(c => (
            <Card key={c.id}>
              <CardContent className="p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <p className="font-medium">{c.descricao ?? 'Contrato de formação'}</p>
                  <p className="text-sm text-muted-foreground">
                    {fmt(c.inicio)} a {fmt(c.fim)}
                  </p>
                  {c.observacao && <p className="text-sm text-muted-foreground">{c.observacao}</p>}
                </div>
                <div className="text-right space-y-1">
                  <p className="text-lg font-semibold">{eur(c.valor_total)}</p>
                  <Badge variant="outline" className={c.status === 'ativo'
                    ? 'border-green-500/40 text-green-600 bg-green-500/10' : 'text-muted-foreground'}>
                    {c.status === 'ativo' ? 'Ativo' : c.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── Calendarização ──────────────────────────────────────────────── */}
        <TabsContent value="calendario" className="mt-4 space-y-3">
          {treinamentos.length === 0 ? (
            <Vazio icon={CalendarDays} msg="Ainda não há formações calendarizadas para a sua equipa." />
          ) : treinamentos.map(t => {
            const futura = t.inicio ? t.inicio > hoje : false;
            const aDecorrer = t.inicio && t.fim ? t.inicio <= hoje && t.fim >= hoje : false;
            return (
              <Card key={t.id} className={aDecorrer ? 'border-blue-500/40' : ''}>
                <CardContent className="p-5 flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <p className="font-medium">{t.curso_nome}</p>
                    <p className="text-sm text-muted-foreground">{t.titulo}</p>
                    <p className="text-sm flex items-center gap-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />{fmt(t.inicio)} a {fmt(t.fim)}
                      </span>
                      {t.local && <span>{t.local}</span>}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm">
                      <strong>{t.total_alunos}</strong> formando{t.total_alunos !== 1 ? 's' : ''} seu{t.total_alunos !== 1 ? 's' : ''}
                    </p>
                    {t.concluidos > 0 && (
                      <p className="text-sm text-green-600 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />{t.concluidos} concluído{t.concluidos !== 1 ? 's' : ''}
                      </p>
                    )}
                    <div>
                      <Badge variant="outline" className={
                        aDecorrer ? 'border-blue-500/40 text-blue-600 bg-blue-500/10'
                        : futura ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                        : 'text-muted-foreground'}>
                        {aDecorrer ? 'A decorrer' : futura ? 'Agendada' : t.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Pedidos de orçamento ────────────────────────────────────────── */}
        <TabsContent value="pedidos" className="mt-4 space-y-3">
          {pedidos.length === 0 ? (
            <Vazio icon={Send} msg="Ainda não fez nenhum pedido de orçamento." />
          ) : pedidos.map(p => {
            const e = ESTADO_PEDIDO[p.estado] ?? { label: p.estado, cls: '' };
            return (
              <Card key={p.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <p className="font-medium flex items-center gap-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{p.numero}</code>
                        {p.curso_nome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {p.n_formandos ? `${p.n_formandos} formandos` : 'sem número indicado'}
                        {p.modalidade ? ` · ${p.modalidade}` : ''}
                        {p.data_pretendida ? ` · pretendida para ${fmt(p.data_pretendida)}` : ''}
                      </p>
                      {p.local_pretendido && <p className="text-sm text-muted-foreground">{p.local_pretendido}</p>}
                      {p.observacoes && <p className="text-sm">{p.observacoes}</p>}
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant="outline" className={e.cls}>{e.label}</Badge>
                      {p.valor_proposto != null && (
                        <p className="text-lg font-semibold">{eur(p.valor_proposto)}</p>
                      )}
                    </div>
                  </div>
                  {p.resposta && (
                    <div className="border-t pt-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Resposta do ITC</p>
                      <p>{p.resposta}</p>
                    </div>
                  )}

                  {/* Confirmada a turma, é aqui que a empresa diz QUEM vai.
                      Até esse momento o pedido é só uma quantidade. */}
                  {p.estado === 'confirmado' && p.turma_id && cliente && (
                    <div className="border-t pt-3">
                      <IndicarFormandos
                        pedidoId={p.id}
                        turmaId={p.turma_id}
                        clienteId={cliente.id}
                        empresaId={cliente.empresa_id}
                        quantos={p.n_formandos ?? 0}
                        jaIndicados={p.indicados ?? 0}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* ── Novo pedido ───────────────────────────────────────────────────── */}
      <Dialog open={pedidoAberto} onOpenChange={o => !o && fecharPedido()}>
        <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Pedir orçamento de formação</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {passo === 1
                ? 'Passo 1 de 2 — marque as formações que precisa.'
                : `Passo 2 de 2 — quantos vão e para quando, em cada uma das ${escolhidos.length} formações.`}
            </p>
          </DialogHeader>

          {/* ── Passo 1: escolher os cursos ─────────────────────────────── */}
          {passo === 1 && (
            <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-5">
              {(['sim', 'eventual', null] as const).map(nivel => {
                const doNivel = cursos.filter(c => c.perfil === nivel);
                if (!doNivel.length) return null;
                const titulo = nivel === 'sim'
                  ? 'Formação recorrente da sua empresa'
                  : nivel === 'eventual'
                    ? 'Já contratou anteriormente'
                    : 'Restante catálogo do ITC';
                return (
                  <div key={String(nivel)}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      {titulo}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {doNivel.map(c => {
                        const marcado = escolhidos.includes(c.id);
                        return (
                          <label key={c.id}
                            className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors
                                        ${marcado ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                            <Checkbox checked={marcado} onCheckedChange={() => alternarCurso(c.id)}
                              className="mt-0.5" />
                            <span className="text-sm leading-snug">
                              {c.nome}
                              {c.carga_horaria && (
                                <span className="text-muted-foreground"> · {c.carga_horaria}h</span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Passo 2: detalhar cada curso escolhido ──────────────────── */}
          {passo === 2 && (
            <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4">
              <div className="space-y-2">
                {escolhidos.map(id => {
                  const c = cursos.find(x => x.id === id);
                  const d = detalhes[id] ?? { n: '', data: '' };
                  return (
                    <div key={id} className="grid grid-cols-[1fr_120px_170px] gap-3 items-end
                                             rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c?.nome}</p>
                        {c?.carga_horaria && (
                          <p className="text-xs text-muted-foreground">{c.carga_horaria} horas</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nº formandos *</Label>
                        <Input type="number" min={1} value={d.n}
                          onChange={e => setDetalhes(p => ({ ...p, [id]: { ...d, n: e.target.value } }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Data pretendida</Label>
                        <Input type="date" min={hoje} value={d.data}
                          onChange={e => setDetalhes(p => ({ ...p, [id]: { ...d, data: e.target.value } }))} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comuns a todas — não faz sentido repeti-los curso a curso. */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1">
                  <Label>Modalidade</Label>
                  <Select value={form.modalidade} onValueChange={v => setForm(p => ({ ...p, modalidade: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Local pretendido</Label>
                  <Input value={form.local_pretendido} placeholder="Nas nossas instalações, no ITC..."
                    onChange={e => setForm(p => ({ ...p, local_pretendido: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea rows={2} value={form.observacoes}
                  placeholder="Turnos, requisitos específicos, prazos..."
                  onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
              </div>

              {semQuantidade.length > 0 && (
                <p className="text-xs text-amber-600">
                  Falta indicar o número de formandos em {semQuantidade.length} formação(ões).
                </p>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <span className="mr-auto text-sm text-muted-foreground self-center">
              {escolhidos.length === 0
                ? 'Nenhuma formação marcada'
                : `${escolhidos.length} formação(ões) marcada(s)`}
            </span>
            {passo === 2 && (
              <Button variant="ghost" onClick={() => setPasso(1)}>Voltar</Button>
            )}
            <Button variant="outline" onClick={fecharPedido}>Cancelar</Button>
            {passo === 1 ? (
              <Button onClick={() => setPasso(2)} disabled={escolhidos.length === 0}>
                Continuar<ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={submeter} disabled={semQuantidade.length > 0 || criar.isPending}>
                {criar.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A enviar...</>
                  : <><Send className="h-4 w-4 mr-2" />
                      Enviar {escolhidos.length} pedido{escolhidos.length === 1 ? '' : 's'}</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, cor }: { icon: any; label: string; value: number; cor?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-7 w-7 opacity-70 ${cor ?? 'text-foreground'}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Vazio({ icon: Icon, msg }: { icon: any; msg: string }) {
  return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-30" />{msg}
    </CardContent></Card>
  );
}
