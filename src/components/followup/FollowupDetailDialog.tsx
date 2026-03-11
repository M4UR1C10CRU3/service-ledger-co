import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { FASES_CONFIG, TIPOS_CONTACTO, SENTIMENTOS, MOTIVOS_ARQUIVO, type FaseFollowup } from '@/types/followup';
import type { Oportunidade, Contacto, HistoricoFase } from '@/types/followup';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Phone } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oportunidade: Oportunidade | null;
  onUpdateOportunidade: (id: string, updates: Record<string, any>) => Promise<boolean>;
  onUpdateFase: (id: string, fase: FaseFollowup, motivo?: string) => Promise<boolean>;
  fetchContactos: (id: string) => Promise<Contacto[]>;
  fetchHistorico: (id: string) => Promise<HistoricoFase[]>;
  onRegisterContact: (o: Oportunidade) => void;
}

export function FollowupDetailDialog({
  open, onOpenChange, oportunidade, onUpdateOportunidade, onUpdateFase,
  fetchContactos, fetchHistorico, onRegisterContact,
}: Props) {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [historico, setHistorico] = useState<HistoricoFase[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (open && oportunidade) {
      setLoadingContacts(true);
      Promise.all([
        fetchContactos(oportunidade.id),
        fetchHistorico(oportunidade.id),
      ]).then(([c, h]) => {
        setContactos(c);
        setHistorico(h);
        setLoadingContacts(false);
      });
    }
  }, [open, oportunidade?.id]);

  if (!oportunidade) return null;

  const o = oportunidade;
  const faseConfig = FASES_CONFIG[o.fase];
  const now = new Date();
  const diasAberto = differenceInDays(now, new Date(o.createdAt));
  const diasSemContacto = o.dataUltimoContacto ? differenceInDays(now, new Date(o.dataUltimoContacto)) : null;

  const probColor = o.probabilidade >= 90 ? '#22C55E' : o.probabilidade >= 61 ? '#3B82F6' : o.probabilidade >= 31 ? '#EAB308' : '#EF4444';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">{o.titulo}</DialogTitle>
            <Badge className={faseConfig.bgClass}>{faseConfig.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{o.clienteNome || 'Sem cliente'}</p>
        </DialogHeader>

        <Tabs defaultValue="resumo">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
            <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
            <TabsTrigger value="notas">Documentos</TabsTrigger>
          </TabsList>

          {/* RESUMO */}
          <TabsContent value="resumo" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{o.clienteNome || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Proposta Associada</p>
                  <p className="font-medium">{o.numeroProposta || 'Nenhuma'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="font-medium">{o.responsavelNome || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de Criação</p>
                  <p className="font-medium">{format(new Date(o.createdAt), 'dd/MM/yyyy', { locale: pt })}</p>
                </div>
                {o.dataAdjudicacaoEsperada && (
                  <div>
                    <p className="text-xs text-muted-foreground">Adjudicação Esperada</p>
                    <p className="font-medium">{format(new Date(o.dataAdjudicacaoEsperada), 'dd/MM/yyyy', { locale: pt })}</p>
                  </div>
                )}
                {o.motivoArquivo && (
                  <div>
                    <p className="text-xs text-muted-foreground">Motivo Arquivo</p>
                    <p className="font-medium text-red-600">{o.motivoArquivo}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="text-2xl font-bold">€{(o.totalComIva ?? o.valorEstimado ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Probabilidade</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${o.probabilidade}%`, backgroundColor: probColor }} />
                    </div>
                    <span className="font-bold" style={{ color: probColor }}>{o.probabilidade}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sentimento</p>
                  <p className="text-lg">{SENTIMENTOS[o.sentimentoAtual]?.icon} {SENTIMENTOS[o.sentimentoAtual]?.label}</p>
                </div>
              </div>
            </div>

            {o.proximoFollowupData && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-2">Próximo Follow-up</p>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      📅 {format(new Date(o.proximoFollowupData), "dd/MM/yyyy HH:mm", { locale: pt })}
                    </span>
                    {o.proximoFollowupTipo && (
                      <span className="text-sm">{TIPOS_CONTACTO[o.proximoFollowupTipo as keyof typeof TIPOS_CONTACTO]?.icon} {TIPOS_CONTACTO[o.proximoFollowupTipo as keyof typeof TIPOS_CONTACTO]?.label}</span>
                    )}
                  </div>
                  {o.proximoFollowupNotas && <p className="text-sm text-muted-foreground mt-1">{o.proximoFollowupNotas}</p>}
                  <Button size="sm" className="mt-3" onClick={() => onRegisterContact(o)}>
                    <Phone className="h-3.5 w-3.5 mr-1" /> Marcar como Feito + Agendar Próximo
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-semibold">Histórico de Contactos</p>
              <Button size="sm" onClick={() => onRegisterContact(o)}><Phone className="h-3.5 w-3.5 mr-1" /> Registar Contacto</Button>
            </div>
            {loadingContacts ? (
              <p className="text-center text-muted-foreground py-4">A carregar...</p>
            ) : contactos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum contacto registado</p>
            ) : (
              <div className="space-y-3">
                {contactos.map(c => {
                  const tipoInfo = TIPOS_CONTACTO[c.tipoContacto] || { icon: '📝', label: c.tipoContacto };
                  return (
                    <Card key={c.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{tipoInfo.icon}</span>
                          <span className="text-sm font-medium">{tipoInfo.label}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(c.dataContacto), 'dd/MM/yyyy HH:mm', { locale: pt })}
                          </span>
                          {c.utilizadorNome && <span className="text-xs text-muted-foreground">— {c.utilizadorNome}</span>}
                        </div>
                        {c.resultado && <p className="text-sm"><strong>Resultado:</strong> {c.resultado}</p>}
                        {c.feedbackCliente && <p className="text-sm mt-1"><strong>Feedback:</strong> {c.feedbackCliente}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {c.sentimento && c.sentimento !== 'desconhecido' && (
                            <span>{SENTIMENTOS[c.sentimento]?.icon} {SENTIMENTOS[c.sentimento]?.label}</span>
                          )}
                          {c.probabilidadeApos != null && <span>Prob: {c.probabilidadeApos}%</span>}
                          {c.faseNova && (
                            <Badge variant="outline" className="text-[10px]">
                              {FASES_CONFIG[c.faseAnterior as keyof typeof FASES_CONFIG]?.label || c.faseAnterior} → {FASES_CONFIG[c.faseNova as keyof typeof FASES_CONFIG]?.label || c.faseNova}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* INDICADORES */}
          <TabsContent value="indicadores" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card><CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Dias em aberto</p>
                <p className="text-2xl font-bold">{diasAberto}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Contactos realizados</p>
                <p className="text-2xl font-bold">{contactos.length}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Dias sem contacto</p>
                <p className={`text-2xl font-bold ${diasSemContacto && diasSemContacto > 7 ? 'text-red-600' : ''}`}>
                  {diasSemContacto ?? '—'}
                </p>
              </CardContent></Card>
            </div>

            {contactos.length > 1 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">Evolução da Probabilidade</p>
                  <div className="flex items-end gap-1 h-24">
                    {[...contactos].reverse().map((c, i) => {
                      const p = c.probabilidadeApos ?? 0;
                      return (
                        <div key={c.id} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] text-muted-foreground">{p}%</span>
                          <div
                            className="w-full rounded-t"
                            style={{
                              height: `${Math.max(p, 2)}%`,
                              backgroundColor: p >= 61 ? '#22C55E' : p >= 31 ? '#EAB308' : '#EF4444',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {historico.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">Histórico de Fases</p>
                  <div className="space-y-2">
                    {historico.map(h => (
                      <div key={h.id} className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-muted-foreground">{format(new Date(h.dataTransicao), 'dd/MM/yyyy HH:mm', { locale: pt })}</span>
                        {h.faseAnterior && <Badge variant="outline" className="text-[10px]">{FASES_CONFIG[h.faseAnterior as keyof typeof FASES_CONFIG]?.label || h.faseAnterior}</Badge>}
                        <span>→</span>
                        <Badge className={(FASES_CONFIG[h.faseNova as keyof typeof FASES_CONFIG]?.bgClass) || ''}>{FASES_CONFIG[h.faseNova as keyof typeof FASES_CONFIG]?.label || h.faseNova}</Badge>
                        {h.utilizadorNome && <span className="text-xs text-muted-foreground ml-auto">{h.utilizadorNome}</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* DOCUMENTOS & NOTAS */}
          <TabsContent value="notas" className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Propostas Associadas</p>
              {o.numeroProposta ? (
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">📄 {o.numeroProposta}</p>
                      <p className="text-sm text-muted-foreground">€{(o.totalComIva ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma proposta associada</p>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Notas Internas</p>
              <Textarea
                value={o.notasInternas || ''}
                placeholder="Notas internas sobre esta oportunidade..."
                onChange={async (e) => {
                  await onUpdateOportunidade(o.id, { notas_internas: e.target.value });
                }}
                className="min-h-[120px]"
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
