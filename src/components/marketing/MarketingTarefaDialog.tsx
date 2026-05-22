import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useMarketing, type MarketingTarefaInput } from '@/hooks/useMarketing';
import { useUtilizadores } from '@/hooks/useUtilizadores';
import {
  STATUS_CONFIG,
  STATUS_ORDER,
  PRIORIDADE_CONFIG,
  TIPO_CONTEUDO_CONFIG,
  CANAL_CONFIG,
  parseCanais,
  stringifyCanais,
  parseTipos,
  stringifyTipos,
  type MarketingTarefa,
  type MarketingStatus,
  type MarketingPrioridade,
  type MarketingTipoConteudo,
  type MarketingCanal,
} from '@/types/marketing';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ChevronsUpDown, Sparkles, Undo2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: MarketingTarefa | null;
  defaultStatus?: MarketingStatus;
  defaultDate?: string;
  onSaved?: (id?: string) => void;
}

export function MarketingTarefaDialog({ open, onOpenChange, initial, defaultStatus, defaultDate, onSaved }: Props) {
  const { createTarefa, updateTarefa } = useMarketing();
  const { utilizadores } = useUtilizadores();
  const utilizadoresAtivos = utilizadores.filter(u => u.ativo);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState<null | 'copy' | 'hashtags' | 'briefing' | 'titulo'>(null);
  const [prev, setPrev] = useState<{ copy?: string; hashtags?: string; briefing?: string; titulo?: string }>({});
  const [tituloAlts, setTituloAlts] = useState<string[]>([]);

  const callAi = async (
    field: 'copy' | 'hashtags' | 'briefing' | 'titulo',
  ) => {
    setAiBusy(field);
    try {
      const tipos = parseTipos((form as any).tipoConteudo).map(t => TIPO_CONTEUDO_CONFIG[t]?.label || t).join(', ');
      const canais = parseCanais((form as any).canal).map(c => CANAL_CONFIG[c as MarketingCanal]?.label || c).join(', ');
      const payload = {
        field,
        titulo: form.titulo,
        tipoConteudo: tipos,
        canal: canais,
        copy: form.copyLegenda,
      };
      const { data, error } = await supabase.functions.invoke('marketing-ai-field', { body: payload });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      if (field === 'titulo') {
        const alts = (data as any)?.alternativas as string[] | undefined;
        if (alts && alts.length) {
          setTituloAlts(alts);
        } else {
          toast({ title: 'Sem alternativas', variant: 'destructive' });
        }
      } else {
        const text = String((data as any)?.text || '').trim();
        if (!text) { toast({ title: 'Resposta vazia', variant: 'destructive' }); return; }
        if (field === 'copy') {
          setPrev(p => ({ ...p, copy: form.copyLegenda || '' }));
          setForm(f => ({ ...f, copyLegenda: text }));
          if (initial?.id) await updateTarefa(initial.id, { copyLegenda: text } as any);
        } else if (field === 'hashtags') {
          setPrev(p => ({ ...p, hashtags: form.hashtags || '' }));
          setForm(f => ({ ...f, hashtags: text }));
          if (initial?.id) await updateTarefa(initial.id, { hashtags: text } as any);
        } else if (field === 'briefing') {
          setPrev(p => ({ ...p, briefing: form.briefing || '' }));
          setForm(f => ({ ...f, briefing: text }));
          if (initial?.id) await updateTarefa(initial.id, { briefing: text } as any);
        }
        toast({ title: '✨ Sugestão aplicada', description: initial?.id ? 'Guardado. Use "Restaurar anterior" para desfazer.' : 'Use "Restaurar anterior" para desfazer.' });

      }
    } catch (e: any) {
      toast({ title: 'Erro IA', description: e?.message || 'Falha ao gerar', variant: 'destructive' });
    } finally {
      setAiBusy(null);
    }
  };

  const escolherTitulo = (t: string) => {
    setPrev(p => ({ ...p, titulo: form.titulo }));
    setForm(f => ({ ...f, titulo: t }));
    setTituloAlts([]);
  };

  const restaurar = (k: 'copy' | 'hashtags' | 'briefing' | 'titulo') => {
    setForm(f => {
      if (k === 'copy') return { ...f, copyLegenda: prev.copy || '' };
      if (k === 'hashtags') return { ...f, hashtags: prev.hashtags || '' };
      if (k === 'briefing') return { ...f, briefing: prev.briefing || '' };
      return { ...f, titulo: prev.titulo || '' };
    });
    setPrev(p => ({ ...p, [k]: undefined }));
  };

  const AiBtn = ({ field, label }: { field: 'copy' | 'hashtags' | 'briefing' | 'titulo'; label: string }) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-6 px-2 text-xs gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
      onClick={() => callAi(field)}
      disabled={aiBusy !== null}
    >
      {aiBusy === field ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      {label}
    </Button>
  );

  const RestoreBtn = ({ field }: { field: 'copy' | 'hashtags' | 'briefing' | 'titulo' }) =>
    prev[field] !== undefined ? (
      <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1 text-muted-foreground" onClick={() => restaurar(field)}>
        <Undo2 className="h-3 w-3" /> Restaurar anterior
      </Button>
    ) : null;


  const buildInitial = (): MarketingTarefaInput => ({
    titulo: initial?.titulo || '',
    descricao: initial?.descricao || '',
    tipoConteudo: initial?.tipoConteudo || null,
    canal: initial?.canal || null,
    status: initial?.status || defaultStatus || 'ideias',
    prioridade: initial?.prioridade || 'media',
    responsavelNome: initial?.responsavelNome || '',
    delegadoPorNome: initial?.delegadoPorNome || '',
    dataPrevista: initial?.dataPrevista || '',
    dataPublicacao: initial?.dataPublicacao || defaultDate || '',
    horaPublicacao: initial?.horaPublicacao || '',
    hashtags: initial?.hashtags || '',
    copyLegenda: initial?.copyLegenda || '',
    linkExterno: initial?.linkExterno || '',
    briefing: initial?.briefing || '',
    observacoes: initial?.observacoes || '',
    aprovadorNome: initial?.aprovadorNome || '',
    solicitanteNome: initial?.solicitanteNome || '',
    prazoBriefing: initial?.prazoBriefing || '',
    prazoCriacao: initial?.prazoCriacao || '',
    prazoRevisao: initial?.prazoRevisao || '',
    prazoAprovacao: initial?.prazoAprovacao || '',
    horaBriefing: initial?.horaBriefing || '',
    horaCriacao: initial?.horaCriacao || '',
    horaRevisao: initial?.horaRevisao || '',
    horaAprovacao: initial?.horaAprovacao || '',
    revisorNome: (initial as any)?.revisorNome || '',
    agendadorNome: (initial as any)?.agendadorNome || '',
  } as any);

  const [form, setForm] = useState<MarketingTarefaInput>(buildInitial);

  const lastInitialId = initial?.id || '__new__';
  const [trackedKey, setTrackedKey] = useState(lastInitialId);
  if (open && trackedKey !== lastInitialId) {
    setTrackedKey(lastInitialId);
    setForm(buildInitial());
  }

  const handleSubmit = async () => {
    if (!form.titulo?.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload: MarketingTarefaInput = {
      ...form,
      titulo: form.titulo.trim(),
      dataPrevista: form.dataPrevista || null,
      dataPublicacao: form.dataPublicacao || null,
      horaPublicacao: form.horaPublicacao || null,
      prazoBriefing: form.prazoBriefing || null,
      prazoCriacao: form.prazoCriacao || null,
      prazoRevisao: form.prazoRevisao || null,
      prazoAprovacao: form.prazoAprovacao || null,
      horaBriefing: form.horaBriefing || null,
      horaCriacao: form.horaCriacao || null,
      horaRevisao: form.horaRevisao || null,
      horaAprovacao: form.horaAprovacao || null,
    };
    let createdId: string | undefined;
    const ok = initial
      ? await updateTarefa(initial.id, payload)
      : !!(createdId = (await createTarefa(payload)) || undefined);
    setSaving(false);
    if (ok) {
      toast({ title: initial ? 'Tarefa atualizada' : 'Tarefa criada' });
      onSaved?.(initial?.id || createdId);
      onOpenChange(false);
    } else {
      toast({ title: 'Erro ao guardar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar Tarefa' : 'Nova Tarefa de Marketing'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div>
            <div className="flex items-center justify-between">
              <Label>Título *</Label>
              <div className="flex items-center gap-1">
                <RestoreBtn field="titulo" />
                <AiBtn field="titulo" label="Alternativas" />
              </div>
            </div>
            <Input
              value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex.: Campanha Black Friday — Post Instagram"
            />
            {tituloAlts.length > 0 && (
              <div className="mt-2 border rounded-md p-2 space-y-1 bg-purple-50/50">
                <div className="text-[11px] font-semibold text-purple-700 mb-1">Escolha uma alternativa:</div>
                {tituloAlts.map((alt, i) => (
                  <label key={i} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-white rounded p-1">
                    <input type="radio" name="titulo-alt" className="mt-1" onChange={() => escolherTitulo(alt)} />
                    <span>{alt}</span>
                  </label>
                ))}
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setTituloAlts([])}>Descartar sugestões</Button>
              </div>
            )}
          </div>


          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as MarketingStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v as MarketingPrioridade })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORIDADE_CONFIG) as MarketingPrioridade[]).map(p => (
                    <SelectItem key={p} value={p}>{PRIORIDADE_CONFIG[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo de Conteúdo (selecione um ou mais)</Label>
              {(() => {
                const tiposSelecionados = parseTipos(form.tipoConteudo);
                const toggleTipo = (t: MarketingTipoConteudo) => {
                  const novo = tiposSelecionados.includes(t)
                    ? tiposSelecionados.filter(x => x !== t)
                    : [...tiposSelecionados, t];
                  setForm({ ...form, tipoConteudo: stringifyTipos(novo) as any });
                };
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal">
                        <span className="truncate">
                          {tiposSelecionados.length === 0
                            ? 'Selecione...'
                            : tiposSelecionados.map(t => `${TIPO_CONTEUDO_CONFIG[t]?.icon || ''} ${TIPO_CONTEUDO_CONFIG[t]?.label || t}`).join(', ')}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-2" align="start">
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {(Object.keys(TIPO_CONTEUDO_CONFIG) as MarketingTipoConteudo[]).map(t => {
                          const checked = tiposSelecionados.includes(t);
                          return (
                            <label key={t} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                              <Checkbox checked={checked} onCheckedChange={() => toggleTipo(t)} />
                              <span className="text-sm">{TIPO_CONTEUDO_CONFIG[t].icon} {TIPO_CONTEUDO_CONFIG[t].label}</span>
                            </label>
                          );
                        })}
                      </div>
                      {tiposSelecionados.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
                          {tiposSelecionados.map(t => (
                            <Badge key={t} variant="secondary" className="text-xs">
                              {TIPO_CONTEUDO_CONFIG[t]?.label || t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>
            <div>
              <Label>Canais (selecione um ou mais)</Label>
              {(() => {
                const canaisSelecionados = parseCanais(form.canal);
                const toggleCanal = (c: MarketingCanal) => {
                  const novo = canaisSelecionados.includes(c)
                    ? canaisSelecionados.filter(x => x !== c)
                    : [...canaisSelecionados, c];
                  setForm({ ...form, canal: stringifyCanais(novo) as any });
                };
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal">
                        <span className="truncate">
                          {canaisSelecionados.length === 0
                            ? 'Selecione...'
                            : canaisSelecionados.map(c => `${CANAL_CONFIG[c as MarketingCanal]?.icon || ''} ${CANAL_CONFIG[c as MarketingCanal]?.label || c}`).join(', ')}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-2" align="start">
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {(Object.keys(CANAL_CONFIG) as MarketingCanal[]).map(c => {
                          const checked = canaisSelecionados.includes(c);
                          return (
                            <label key={c} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                              <Checkbox checked={checked} onCheckedChange={() => toggleCanal(c)} />
                              <span className="text-sm">{CANAL_CONFIG[c].icon} {CANAL_CONFIG[c].label}</span>
                            </label>
                          );
                        })}
                      </div>
                      {canaisSelecionados.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
                          {canaisSelecionados.map(c => (
                            <Badge key={c} variant="secondary" className="text-xs">
                              {CANAL_CONFIG[c as MarketingCanal]?.label || c}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Responsável (Executor)</Label>
              <Select
                value={form.responsavelNome || '__none__'}
                onValueChange={v => setForm({ ...form, responsavelNome: v === '__none__' ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {utilizadoresAtivos.map(u => (
                    <SelectItem key={u.id} value={u.nome}>{u.nome}{u.cargo ? ` (${u.cargo})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delegado por</Label>
              <Select
                value={form.delegadoPorNome || '__none__'}
                onValueChange={v => setForm({ ...form, delegadoPorNome: v === '__none__' ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {utilizadoresAtivos.map(u => (
                    <SelectItem key={u.id} value={u.nome}>{u.nome}{u.cargo ? ` (${u.cargo})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data Prevista</Label>
              <Input
                type="date"
                value={form.dataPrevista || ''}
                onChange={e => setForm({ ...form, dataPrevista: e.target.value })}
              />
            </div>
            <div>
              <Label>Data Publicação</Label>
              <Input
                type="date"
                value={form.dataPublicacao || ''}
                onChange={e => setForm({ ...form, dataPublicacao: e.target.value })}
              />
            </div>
            <div>
              <Label>Hora</Label>
              <Input
                type="time"
                value={form.horaPublicacao || ''}
                onChange={e => setForm({ ...form, horaPublicacao: e.target.value })}
              />
            </div>
          </div>

          {/* Workflow: aprovador + prazos por etapa */}
          <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground">Fluxo de aprovação</div>
            <div>
              <Label>Aprovador (revisão final) *</Label>
              <Select
                value={form.aprovadorNome || '__none__'}
                onValueChange={v => setForm({ ...form, aprovadorNome: v === '__none__' ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o aprovador..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {utilizadoresAtivos.map(u => (
                    <SelectItem key={u.id} value={u.nome}>{u.nome}{u.cargo ? ` (${u.cargo})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Revisor</Label>
                <Select
                  value={(form as any).revisorNome || '__none__'}
                  onValueChange={v => setForm({ ...form, revisorNome: v === '__none__' ? '' : v } as any)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o revisor..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhum —</SelectItem>
                    {utilizadoresAtivos.map(u => (
                      <SelectItem key={u.id} value={u.nome}>{u.nome}{u.cargo ? ` (${u.cargo})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agendador (publicação)</Label>
                <Select
                  value={(form as any).agendadorNome || '__none__'}
                  onValueChange={v => setForm({ ...form, agendadorNome: v === '__none__' ? '' : v } as any)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o agendador..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhum —</SelectItem>
                    {utilizadoresAtivos.map(u => (
                      <SelectItem key={u.id} value={u.nome}>{u.nome}{u.cargo ? ` (${u.cargo})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Prazo Briefing</Label>
                  <Input type="date" value={form.prazoBriefing || ''} onChange={e => setForm({ ...form, prazoBriefing: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Hora</Label>
                  <Input type="time" value={form.horaBriefing || ''} onChange={e => setForm({ ...form, horaBriefing: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Prazo Criação</Label>
                  <Input type="date" value={form.prazoCriacao || ''} onChange={e => setForm({ ...form, prazoCriacao: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Hora</Label>
                  <Input type="time" value={form.horaCriacao || ''} onChange={e => setForm({ ...form, horaCriacao: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Prazo Revisão</Label>
                  <Input type="date" value={form.prazoRevisao || ''} onChange={e => setForm({ ...form, prazoRevisao: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Hora</Label>
                  <Input type="time" value={form.horaRevisao || ''} onChange={e => setForm({ ...form, horaRevisao: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Prazo Aprovação</Label>
                  <Input type="date" value={form.prazoAprovacao || ''} onChange={e => setForm({ ...form, prazoAprovacao: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Hora</Label>
                  <Input type="time" value={form.horaAprovacao || ''} onChange={e => setForm({ ...form, horaAprovacao: e.target.value })} />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Após criar o job poderás adicionar respondsáveis adicionais e checklist por etapa no separador "Workflow" dos detalhes.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Briefing / Nota Criativa</Label>
              <div className="flex items-center gap-1">
                <RestoreBtn field="briefing" />
                <AiBtn field="briefing" label="Sugerir formato visual" />
              </div>
            </div>
            <Textarea
              rows={3}
              value={form.briefing || ''}
              onChange={e => setForm({ ...form, briefing: e.target.value })}
              placeholder="Objectivo, contexto, mensagem-chave, tipo de imagem/vídeo, slides..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Copy / Legenda</Label>
              <div className="flex items-center gap-1">
                <RestoreBtn field="copy" />
                <AiBtn field="copy" label="Regenerar copy" />
              </div>
            </div>
            <Textarea
              rows={3}
              value={form.copyLegenda || ''}
              onChange={e => setForm({ ...form, copyLegenda: e.target.value })}
              placeholder="Texto da publicação..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <Label>Hashtags</Label>
                <div className="flex items-center gap-1">
                  <RestoreBtn field="hashtags" />
                  <AiBtn field="hashtags" label="Sugerir hashtags" />
                </div>
              </div>
              <Input
                value={form.hashtags || ''}
                onChange={e => setForm({ ...form, hashtags: e.target.value })}
                placeholder="#exemplo #marca"
              />
            </div>

            <div>
              <Label>Link Externo</Label>
              <Input
                value={form.linkExterno || ''}
                onChange={e => setForm({ ...form, linkExterno: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.observacoes || ''}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} style={{ backgroundColor: '#E8561A' }}>
            {saving ? 'A guardar...' : initial ? 'Guardar' : 'Criar Tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
