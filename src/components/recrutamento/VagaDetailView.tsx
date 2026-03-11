import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Eye, FileText, Mic, CheckCircle, XCircle, Bot } from 'lucide-react';
import { useCandidatos, useEntrevistas, type Vaga, type Candidato } from '@/hooks/useRecrutamento';
import { CandidatoFormDialog } from './CandidatoFormDialog';
import { EntrevistaFormDialog } from './EntrevistaFormDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const estadoCandBadge: Record<string, string> = {
  recebido: 'bg-gray-100 text-gray-800',
  em_analise: 'bg-blue-100 text-blue-800',
  entrevista_agendada: 'bg-amber-100 text-amber-800',
  entrevistado: 'bg-purple-100 text-purple-800',
  aprovado: 'bg-emerald-100 text-emerald-800',
  rejeitado: 'bg-red-100 text-red-800',
  em_espera: 'bg-orange-100 text-orange-800',
};

const estadoCandLabel: Record<string, string> = {
  recebido: 'Recebido', em_analise: 'Em Análise', entrevista_agendada: 'Entrevista Agendada',
  entrevistado: 'Entrevistado', aprovado: 'Aprovado', rejeitado: 'Rejeitado', em_espera: 'Em Espera',
};

const estadoEntBadge: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-800',
  realizada: 'bg-emerald-100 text-emerald-800',
  cancelada: 'bg-red-100 text-red-800',
  nao_compareceu: 'bg-gray-100 text-gray-800',
};

interface Props { vaga: Vaga; onBack: () => void; }

export function VagaDetailView({ vaga, onBack }: Props) {
  const { candidatos, isLoading: loadingCandidatos, updateCandidato } = useCandidatos(vaga.id);
  const { entrevistas, isLoading: loadingEntrevistas } = useEntrevistas(vaga.id);
  const [showCandForm, setShowCandForm] = useState(false);
  const [showEntForm, setShowEntForm] = useState(false);
  const [selectedCandidatoForEntrevista, setSelectedCandidatoForEntrevista] = useState<string | null>(null);

  const rankMedals = ['🥇', '🥈', '🥉'];

  // Candidatos sorted by score for Resumo tab
  const candidatosEntrevistados = candidatos.filter(c =>
    c.pontuacao_media_entrev !== null && c.pontuacao_media_entrev > 0
  ).sort((a, b) => (b.pontuacao_media_entrev || 0) - (a.pontuacao_media_entrev || 0));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">{vaga.cargo}</h1>
          <p className="text-sm text-muted-foreground">{vaga.area || 'Sem área'} • Aberta em {new Date(vaga.data_abertura).toLocaleDateString('pt-PT')}</p>
        </div>
      </div>

      <Tabs defaultValue="candidatos">
        <TabsList>
          <TabsTrigger value="candidatos">Candidatos ({candidatos.length})</TabsTrigger>
          <TabsTrigger value="entrevistas">Entrevistas ({entrevistas.length})</TabsTrigger>
          <TabsTrigger value="resumo">Resumo e Decisão</TabsTrigger>
        </TabsList>

        {/* Tab Candidatos */}
        <TabsContent value="candidatos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Candidatos</CardTitle>
              <Button onClick={() => setShowCandForm(true)} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Adicionar Candidato</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Data Candidatura</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Pontuação Entrevista</TableHead>
                    <TableHead>Análise IA</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCandidatos ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
                  ) : candidatos.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum candidato</TableCell></TableRow>
                  ) : candidatos.map((c, i) => (
                    <TableRow key={c.id}>
                      <TableCell>{i < 3 && c.pontuacao_media_entrev ? rankMedals[i] : i + 1}</TableCell>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{new Date(c.criado_em).toLocaleDateString('pt-PT')}</TableCell>
                      <TableCell>{c.fonte || '—'}</TableCell>
                      <TableCell><Badge className={estadoCandBadge[c.estado] || 'bg-gray-100'}>{estadoCandLabel[c.estado] || c.estado}</Badge></TableCell>
                      <TableCell>{c.pontuacao_media_entrev ? `${c.pontuacao_media_entrev.toFixed(0)}/100` : '—'}</TableCell>
                      <TableCell>
                        {c.ia_resumo_perfil ? (
                          <Tooltip>
                            <TooltipTrigger><Bot className="h-4 w-4 text-primary" /></TooltipTrigger>
                            <TooltipContent className="max-w-sm"><p className="text-xs">{c.ia_resumo_perfil}</p></TooltipContent>
                          </Tooltip>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {c.cv_url && (
                            <Button variant="ghost" size="icon" onClick={() => window.open(c.cv_url!, '_blank')}><FileText className="h-4 w-4" /></Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedCandidatoForEntrevista(c.id); setShowEntForm(true); }}><Mic className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-emerald-600" onClick={() => updateCandidato.mutate({ id: c.id, estado: 'aprovado' })}><CheckCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-600" onClick={() => updateCandidato.mutate({ id: c.id, estado: 'rejeitado' })}><XCircle className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Entrevistas */}
        <TabsContent value="entrevistas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Entrevistas</CardTitle>
              <Button onClick={() => { setSelectedCandidatoForEntrevista(null); setShowEntForm(true); }} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Agendar Entrevista</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Entrevistador</TableHead>
                    <TableHead>Pontuação</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingEntrevistas ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
                  ) : entrevistas.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma entrevista</TableCell></TableRow>
                  ) : entrevistas.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.candidato_nome}</TableCell>
                      <TableCell>{new Date(e.data_hora).toLocaleDateString('pt-PT')}</TableCell>
                      <TableCell>{new Date(e.data_hora).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell>{e.tipo || '—'}</TableCell>
                      <TableCell>{e.entrevistador_nome || '—'}</TableCell>
                      <TableCell>
                        {e.pontuacao_final ? (
                          <span className="font-semibold">{e.pontuacao_final.toFixed(0)}/100</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell><Badge className={estadoEntBadge[e.estado] || 'bg-gray-100'}>{e.estado}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Resumo */}
        <TabsContent value="resumo">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo e Decisão</CardTitle>
            </CardHeader>
            <CardContent>
              {candidatosEntrevistados.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum candidato entrevistado ainda</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidato</TableHead>
                      <TableHead>Adequação IA</TableHead>
                      <TableHead>Pontuação Entrevista</TableHead>
                      <TableHead>Ranking</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidatosEntrevistados.map((c, i) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>
                          {c.ia_adequacao_vaga ? (
                            <Badge className={c.ia_adequacao_vaga === 'Alta' ? 'bg-emerald-100 text-emerald-800' : c.ia_adequacao_vaga === 'Média' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                              {c.ia_adequacao_vaga}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="font-semibold">{c.pontuacao_media_entrev?.toFixed(0)}/100</TableCell>
                        <TableCell className="text-lg">{i < 3 ? rankMedals[i] : `#${i + 1}`}</TableCell>
                        <TableCell><Badge className={estadoCandBadge[c.estado] || 'bg-gray-100'}>{estadoCandLabel[c.estado] || c.estado}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => updateCandidato.mutate({ id: c.id, estado: 'aprovado' })}>
                            Selecionar para Admissão
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CandidatoFormDialog open={showCandForm} onOpenChange={setShowCandForm} vagaId={vaga.id} cargo={vaga.cargo} />
      <EntrevistaFormDialog open={showEntForm} onOpenChange={setShowEntForm} vagaId={vaga.id} candidatos={candidatos} preSelectedCandidato={selectedCandidatoForEntrevista} cargo={vaga.cargo} />
    </div>
  );
}
