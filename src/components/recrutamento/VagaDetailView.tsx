import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, FileText, Mic, CheckCircle, XCircle, Bot, DoorOpen, Loader2, RefreshCw, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAcolhimentos } from '@/hooks/useAcolhimento';
import { IniciarAcolhimentoDialog } from '@/pages/rh/Acolhimento';
import { useCandidatos, useEntrevistas, type Vaga, type Candidato, type Entrevista } from '@/hooks/useRecrutamento';
import { useRhFuncoes } from '@/hooks/useRhFuncoes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/use-toast';
import { CandidatoFormDialog, camposAntigosIA } from './CandidatoFormDialog';
import { EntrevistaFormDialog } from './EntrevistaFormDialog';
import { EntrevistaGuiaoDialog } from './EntrevistaGuiaoDialog';
import { AnaliseCVView } from './AnaliseCVView';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AnaliseCV, DECISAO_LABEL, RECOMENDACAO_LABEL, abrirCV, caminhoCV, chamarIA, classificacaoPontuacao,
  contextoVaga, descarregarCV, textoDoPdf,
} from '@/lib/rhIA';

const estadoCandBadge: Record<string, string> = {
  recebido: 'bg-gray-100 text-gray-800',
  em_analise: 'bg-blue-100 text-blue-800',
  entrevista_agendada: 'bg-amber-100 text-amber-800',
  entrevistado: 'bg-purple-100 text-purple-800',
  aprovado: 'bg-emerald-100 text-emerald-800',
  rejeitado: 'bg-red-100 text-red-800',
  em_espera: 'bg-orange-100 text-orange-800',
  contratado: 'bg-teal-100 text-teal-800',
};

const estadoCandLabel: Record<string, string> = {
  recebido: 'Recebido', em_analise: 'Em Análise', entrevista_agendada: 'Entrevista Agendada',
  entrevistado: 'Entrevistado', aprovado: 'Aprovado', rejeitado: 'Rejeitado', em_espera: 'Em Espera', contratado: 'Contratado',
};

const estadoEntBadge: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-800',
  realizada: 'bg-emerald-100 text-emerald-800',
  cancelada: 'bg-red-100 text-red-800',
  nao_compareceu: 'bg-gray-100 text-gray-800',
};

const decisaoCor: Record<string, string> = {
  contratar: 'bg-emerald-100 text-emerald-800', reserva: 'bg-amber-100 text-amber-800', nao_contratar: 'bg-red-100 text-red-800',
};
// A decisão da direção também acerta o estado do candidato («Aprovado» abre a Admissão).
const estadoDaDecisao: Record<string, string> = { contratar: 'aprovado', reserva: 'em_espera', nao_contratar: 'rejeitado' };

const corAderencia = (v: number | null | undefined) =>
  v == null ? 'bg-muted text-muted-foreground' : v >= 75 ? 'bg-emerald-100 text-emerald-800' : v >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';

interface Props { vaga: Vaga; onBack: () => void; }

export function VagaDetailView({ vaga, onBack }: Props) {
  const { candidatos, isLoading: loadingCandidatos, updateCandidato } = useCandidatos(vaga.id);
  const { entrevistas, isLoading: loadingEntrevistas } = useEntrevistas(vaga.id);
  const { funcoes } = useRhFuncoes();
  const funcao = funcoes.find(f => f.id === vaga.funcao_id) ?? null;
  const eu = useCurrentUser();
  const { toast } = useToast();
  const [showCandForm, setShowCandForm] = useState(false);
  const [showEntForm, setShowEntForm] = useState(false);
  // admissão: candidato aprovado → colaborador + acolhimento + avaliações experimentais
  const navigate = useNavigate();
  const { iniciar: iniciarAcolhimento } = useAcolhimentos();
  const [admitir, setAdmitir] = useState<Candidato | null>(null);
  const [perfil, setPerfil] = useState<Candidato | null>(null);
  const [guiada, setGuiada] = useState<{ c: Candidato; e: Entrevista | null } | null>(null);
  const [decidir, setDecidir] = useState<Candidato | null>(null);

  const abrir = async (c: Candidato) => { const erro = await abrirCV(c); if (erro) toast({ title: erro, variant: 'destructive' }); };

  /** Entrevista mais recente do candidato. */
  const entrevistaDe = (candId: string) =>
    entrevistas.filter(e => e.candidato_id === candId).sort((a, b) => b.data_hora.localeCompare(a.data_hora))[0] ?? null;

  const abrirGuiada = (c: Candidato, e?: Entrevista | null) => setGuiada({ c, e: e === undefined ? entrevistaDe(c.id) : e });

  // Comparativo: todos os candidatos, ordenados pela entrevista e depois pelo CV.
  const comparativo = [...candidatos].sort((a, b) =>
    ((b.pontuacao_media_entrev ?? -1) - (a.pontuacao_media_entrev ?? -1)) || ((b.ia_aderencia ?? -1) - (a.ia_aderencia ?? -1)));
  const rankMedals = ['🥇', '🥈', '🥉'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">{vaga.cargo}</h1>
          <p className="text-sm text-muted-foreground">
            {vaga.area || 'Sem área'} • Aberta em {new Date(vaga.data_abertura).toLocaleDateString('pt-PT')}
            {funcao ? ` • Função: ${funcao.nome}` : ' • Sem função definida'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="candidatos">
        <TabsList>
          <TabsTrigger value="candidatos">Candidatos ({candidatos.length})</TabsTrigger>
          <TabsTrigger value="entrevistas">Entrevistas ({entrevistas.length})</TabsTrigger>
          <TabsTrigger value="resumo">Comparativo e decisão</TabsTrigger>
        </TabsList>

        <TabsContent value="candidatos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Candidatos</CardTitle>
              <Button onClick={() => setShowCandForm(true)} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Adicionar candidato</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Candidatura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Adequação do CV</TableHead>
                    <TableHead>Entrevista</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCandidatos ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
                  ) : candidatos.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum candidato</TableCell></TableRow>
                  ) : candidatos.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}<div className="text-xs text-muted-foreground">{c.fonte || ''}</div></TableCell>
                      <TableCell>{new Date(c.criado_em).toLocaleDateString('pt-PT')}</TableCell>
                      <TableCell><Badge className={estadoCandBadge[c.estado] || 'bg-gray-100'}>{estadoCandLabel[c.estado] || c.estado}</Badge></TableCell>
                      <TableCell>
                        {c.ia_resumo_perfil || c.ia_analise ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={() => setPerfil(c)}>
                                <Bot className="h-4 w-4 text-primary" />
                                <Badge className={corAderencia(c.ia_aderencia)}>{c.ia_aderencia != null ? `${c.ia_aderencia}%` : (c.ia_adequacao_vaga ?? 'Ver')}</Badge>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm"><p className="text-xs">{c.ia_resumo_perfil}</p></TooltipContent>
                          </Tooltip>
                        ) : <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPerfil(c)}>Analisar</Button>}
                      </TableCell>
                      <TableCell>{c.pontuacao_media_entrev ? `${Number(c.pontuacao_media_entrev).toFixed(0)}/100` : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {caminhoCV(c) && (
                            <Button variant="ghost" size="icon" title="Abrir CV" onClick={() => abrir(c)}><FileText className="h-4 w-4" /></Button>
                          )}
                          <Button variant="ghost" size="icon" title="Entrevista guiada" onClick={() => abrirGuiada(c)}><Mic className="h-4 w-4" /></Button>
                          {c.estado === 'aprovado' && (
                            <Button variant="outline" size="sm" className="gap-1 text-teal-700" title="Criar colaborador e iniciar acolhimento" onClick={() => setAdmitir(c)}><DoorOpen className="h-4 w-4" /> Admitir</Button>
                          )}
                          <Button variant="ghost" size="icon" className="text-emerald-600" title="Aprovar" onClick={() => updateCandidato.mutate({ id: c.id, estado: 'aprovado' })}><CheckCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-600" title="Rejeitar" onClick={() => updateCandidato.mutate({ id: c.id, estado: 'rejeitado' })}><XCircle className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entrevistas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Entrevistas</CardTitle>
              <Button onClick={() => setShowEntForm(true)} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Agendar entrevista</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Entrevistador</TableHead>
                    <TableHead>Pontuação</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Guião</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingEntrevistas ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
                  ) : entrevistas.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma entrevista</TableCell></TableRow>
                  ) : entrevistas.map(e => {
                    const c = candidatos.find(x => x.id === e.candidato_id);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.candidato_nome}</TableCell>
                        <TableCell>{new Date(e.data_hora).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                        <TableCell>{e.tipo || '—'}</TableCell>
                        <TableCell>{e.entrevistador_nome || '—'}</TableCell>
                        <TableCell>{e.pontuacao_final ? <span className="font-semibold">{Number(e.pontuacao_final).toFixed(0)}/100</span> : '—'}</TableCell>
                        <TableCell><Badge className={estadoEntBadge[e.estado] || 'bg-gray-100'}>{e.estado}</Badge></TableCell>
                        <TableCell className="text-right">
                          {c && (
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => abrirGuiada(c, e)}>
                              <ClipboardList className="h-4 w-4" /> {e.relatorio ? 'Relatório' : e.guiao ? 'Continuar' : 'Guião'}
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

        <TabsContent value="resumo">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparativo dos candidatos</CardTitle>
              <p className="text-sm text-muted-foreground">Adequação do CV à vaga, pontuação da entrevista e recomendação prévia. A decisão é da direção e fica registada aqui.</p>
            </CardHeader>
            <CardContent>
              {comparativo.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Ainda não há candidatos</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead>Candidato</TableHead>
                        <TableHead>Adequação do CV</TableHead>
                        <TableHead>Entrevista</TableHead>
                        <TableHead>Recomendação prévia</TableHead>
                        <TableHead>Mais-valia / atenção</TableHead>
                        <TableHead>Decisão da direção</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparativo.map((c, i) => {
                        const ult = entrevistaDe(c.id);
                        const rec = ult?.relatorio?.recomendacao;
                        const cls = classificacaoPontuacao(c.pontuacao_media_entrev);
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="text-lg">{c.pontuacao_media_entrev && i < 3 ? rankMedals[i] : ''}</TableCell>
                            <TableCell className="font-medium">{c.nome}</TableCell>
                            <TableCell><Badge className={corAderencia(c.ia_aderencia)}>{c.ia_aderencia != null ? `${c.ia_aderencia}%` : (c.ia_adequacao_vaga ?? '—')}</Badge></TableCell>
                            <TableCell>{c.pontuacao_media_entrev ? <Badge className={cls.cor}>{Number(c.pontuacao_media_entrev).toFixed(0)}/100 · {cls.label}</Badge> : '—'}</TableCell>
                            <TableCell>{rec ? (
                              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => abrirGuiada(c, ult)}>{RECOMENDACAO_LABEL[rec] ?? rec}</Button>
                            ) : '—'}</TableCell>
                            <TableCell className="max-w-[260px] text-xs">
                              {c.ia_pontos_fortes?.[0] && <p className="text-emerald-700">+ {c.ia_pontos_fortes[0]}</p>}
                              {c.ia_pontos_atencao?.[0] && <p className="text-amber-700">! {c.ia_pontos_atencao[0]}</p>}
                            </TableCell>
                            <TableCell>
                              {c.decisao ? (
                                <button type="button" onClick={() => setDecidir(c)} className="text-left">
                                  <Badge className={decisaoCor[c.decisao] ?? ''}>{DECISAO_LABEL[c.decisao] ?? c.decisao}</Badge>
                                  <span className="block text-[11px] text-muted-foreground mt-0.5">{c.decisao_por}{c.decisao_em ? ` · ${new Date(c.decisao_em).toLocaleDateString('pt-PT')}` : ''}</span>
                                </button>
                              ) : <Button size="sm" variant="outline" onClick={() => setDecidir(c)}>Registar decisão</Button>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CandidatoFormDialog open={showCandForm} onOpenChange={setShowCandForm} vaga={vaga} />
      <PerfilCandidatoDialog candidato={perfil} vaga={vaga} funcao={funcao} onFechar={() => setPerfil(null)} onAbrirCV={abrir}
        onEntrevista={c => { setPerfil(null); abrirGuiada(c); }} />
      {guiada && (
        <EntrevistaGuiaoDialog aberto={!!guiada} onFechar={() => setGuiada(null)} vaga={vaga} funcao={funcao} candidato={guiada.c} entrevista={guiada.e} />
      )}
      <DecisaoDialog candidato={decidir} onFechar={() => setDecidir(null)} quem={eu.nome}
        onGravar={(c, decisao, nota) => updateCandidato.mutate({
          id: c.id, decisao, decisao_nota: nota || null, decisao_por: eu.nome, decisao_em: new Date().toISOString(),
          estado: estadoDaDecisao[decisao],
        } as any, { onSuccess: () => setDecidir(null) })} />
      {admitir && (
        <IniciarAcolhimentoDialog
          aberto={!!admitir}
          onFechar={() => setAdmitir(null)}
          preenchido={{ nome: admitir.nome, cargo: vaga.cargo, semEscolha: true }}
          onIniciar={async p => {
            const id = await iniciarAcolhimento({
              novoColaborador: { full_name: admitir.nome, email: admitir.email, phone: admitir.telefone, birth_date: admitir.data_nascimento, department: vaga.area },
              candidato_id: admitir.id, vaga_id: vaga.id, cargo: vaga.cargo,
              data_entrada: p.data_entrada, periodo_experimental_dias: p.periodo_experimental_dias, responsavel_nome: p.responsavel_nome, tutor_nome: p.tutor_nome,
            });
            if (id) navigate('/recursos-humanos/acolhimento/' + id);
          }}
        />
      )}
      <EntrevistaFormDialog open={showEntForm} onOpenChange={setShowEntForm} vagaId={vaga.id} candidatos={candidatos} preSelectedCandidato={null} cargo={vaga.cargo} />
    </div>
  );
}

/** Ficha do candidato: análise do CV contra a vaga (ou a antiga, enquanto não for refeita). */
function PerfilCandidatoDialog({ candidato: c, vaga, funcao, onFechar, onAbrirCV, onEntrevista }: {
  candidato: Candidato | null; vaga: Vaga; funcao: any | null; onFechar: () => void;
  onAbrirCV: (c: Candidato) => void; onEntrevista: (c: Candidato) => void;
}) {
  const { updateCandidato } = useCandidatos(vaga.id);
  const { toast } = useToast();
  const [aAnalisar, setAAnalisar] = useState(false);
  const [nova, setNova] = useState<AnaliseCV | null>(null);
  const analise: AnaliseCV | null = nova ?? (c?.ia_analise as AnaliseCV) ?? null;

  const reanalisar = async () => {
    if (!c) return;
    setAAnalisar(true);
    try {
      const pdf = await descarregarCV(c);
      if (!pdf) throw new Error('Este candidato não tem CV guardado.');
      const texto = await textoDoPdf(pdf);
      const a = await chamarIA<AnaliseCV>('analisar_cv', { cvText: texto, vaga: contextoVaga(vaga, funcao) });
      setNova(a);
      updateCandidato.mutate({ id: c.id, ...camposAntigosIA(a) } as any);
    } catch (e: any) {
      toast({ title: 'Não foi possível analisar o CV', description: e.message, variant: 'destructive' });
    } finally {
      setAAnalisar(false);
    }
  };

  const lista = (v: string[] | null | undefined) => (v && v.length ? <ul className="list-disc pl-5 space-y-0.5 text-sm">{v.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="text-sm text-muted-foreground">—</p>);
  return (
    <Dialog open={!!c} onOpenChange={o => { if (!o) { setNova(null); onFechar(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {c && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> {c.nome}</DialogTitle>
              <DialogDescription>
                {c.ia_processado_em ? `Analisado em ${new Date(c.ia_processado_em).toLocaleDateString('pt-PT')}` : 'Ainda sem análise do CV'}
                {c.email ? ` · ${c.email}` : ''}{c.telefone ? ` · ${c.telefone}` : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {caminhoCV(c) && <Button variant="outline" size="sm" className="gap-1" onClick={() => onAbrirCV(c)}><FileText className="h-4 w-4" /> Abrir CV</Button>}
              {caminhoCV(c) && (
                <Button variant="outline" size="sm" className="gap-1" onClick={reanalisar} disabled={aAnalisar}>
                  {aAnalisar ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {analise ? 'Refazer análise contra a vaga' : 'Analisar CV contra a vaga'}
                </Button>
              )}
              <Button size="sm" className="gap-1" onClick={() => onEntrevista(c)}><Mic className="h-4 w-4" /> Entrevista guiada</Button>
            </div>
            {analise ? <AnaliseCVView a={analise} /> : (
              <div className="space-y-4">
                {c.ia_resumo_perfil && <section><h4 className="text-sm font-semibold mb-1">Resumo</h4><p className="text-sm">{c.ia_resumo_perfil}</p></section>}
                <div className="grid md:grid-cols-2 gap-4">
                  <section><h4 className="text-sm font-semibold mb-1 text-emerald-700">Pontos fortes</h4>{lista(c.ia_pontos_fortes)}</section>
                  <section><h4 className="text-sm font-semibold mb-1 text-amber-700">Pontos de atenção</h4>{lista(c.ia_pontos_atencao)}</section>
                </div>
                <p className="text-xs text-muted-foreground">Esta é a análise antiga, que não cruza o CV com os requisitos. Use «Analisar CV contra a vaga».</p>
              </div>
            )}
            {c.notas_iniciais && <section><h4 className="text-sm font-semibold mb-1">Notas iniciais</h4><p className="text-sm text-muted-foreground">{c.notas_iniciais}</p></section>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Decisão da direção: contratar, reserva ou não contratar, com o motivo. */
function DecisaoDialog({ candidato: c, onFechar, onGravar, quem }: {
  candidato: Candidato | null; onFechar: () => void; quem: string;
  onGravar: (c: Candidato, decisao: string, nota: string) => void;
}) {
  const [decisao, setDecisao] = useState('');
  const [nota, setNota] = useState<string | null>(null);
  const fechar = () => { setDecisao(''); setNota(null); onFechar(); };
  return (
    <Dialog open={!!c} onOpenChange={o => { if (!o) fechar(); }}>
      <DialogContent className="max-w-md">
        {c && (
          <>
            <DialogHeader>
              <DialogTitle>Decisão — {c.nome}</DialogTitle>
              <DialogDescription>Fica registada em nome de {quem}, com a data de hoje.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2">
              {(['contratar', 'reserva', 'nao_contratar'] as const).map(d => (
                <Button key={d} type="button" variant={(decisao || c.decisao) === d ? 'default' : 'outline'} onClick={() => setDecisao(d)}>{DECISAO_LABEL[d]}</Button>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor="dec-nota">Motivo / observações</Label>
              <Textarea id="dec-nota" rows={3} value={nota ?? c.decisao_nota ?? ''} onChange={e => setNota(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={fechar}>Cancelar</Button>
              <Button disabled={!(decisao || c.decisao)} onClick={() => { onGravar(c, decisao || c.decisao!, nota ?? c.decisao_nota ?? ''); setDecisao(''); setNota(null); }}>Gravar decisão</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
