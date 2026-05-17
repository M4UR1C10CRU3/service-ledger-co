import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Plus, Trash2, Upload, Copy, Archive, Paperclip, FileText, MessageSquare,
} from 'lucide-react';
import {
  AREAS_NEGOCIO, PLANEAMENTO_COLUNAS, PRIORIDADE_CONFIG, TIPOS_CONSULTA, DECISAO_LABEL,
  type PlaneamentoCard, type PlaneamentoColuna, type PlaneamentoPrioridade,
  type PlaneamentoConsulta, type PlaneamentoChecklistItem, type PlaneamentoAnexo,
  type PlaneamentoHistorico, type CriterioValidacao, type DecisaoFinal,
} from '@/types/planeamento';
import { usePlaneamento } from '@/hooks/usePlaneamento';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  card: PlaneamentoCard | null;
  initialColuna?: PlaneamentoColuna;
}

export function PlaneamentoCardDialog({ open, onOpenChange, card, initialColuna }: Props) {
  const api = usePlaneamento();
  const isNew = !card;

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [problema, setProblema] = useState('');
  const [impacto, setImpacto] = useState('');
  const [coluna, setColuna] = useState<PlaneamentoColuna>('ideia');
  const [area, setArea] = useState<string>('');
  const [areasAfetadas, setAreasAfetadas] = useState<string[]>([]);
  const [prioridade, setPrioridade] = useState<PlaneamentoPrioridade>('media');
  const [responsavel, setResponsavel] = useState('');
  const [responsaveisExtra, setResponsaveisExtra] = useState<string[]>([]);
  const [prazo, setPrazo] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [dataReal, setDataReal] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [extraInput, setExtraInput] = useState('');
  const [infoInternas, setInfoInternas] = useState('');
  const [referencias, setReferencias] = useState('');
  const [notasPesquisa, setNotasPesquisa] = useState('');
  const [criterios, setCriterios] = useState<CriterioValidacao[]>([]);
  const [criterioInput, setCriterioInput] = useState('');
  const [parecer, setParecer] = useState('');
  const [decisao, setDecisao] = useState<DecisaoFinal | ''>('');
  const [dataDecisao, setDataDecisao] = useState('');
  const [decObs, setDecObs] = useState('');
  const [plano, setPlano] = useState('');

  // sub-dados
  const [consultas, setConsultas] = useState<PlaneamentoConsulta[]>([]);
  const [checklist, setChecklist] = useState<PlaneamentoChecklistItem[]>([]);
  const [anexos, setAnexos] = useState<PlaneamentoAnexo[]>([]);
  const [historico, setHistorico] = useState<PlaneamentoHistorico[]>([]);
  const [comentario, setComentario] = useState('');

  // forms
  const [newConsulta, setNewConsulta] = useState({ entidade: '', tipo: 'Outra', data: '', resumo: '' });
  const [newCheck, setNewCheck] = useState({ titulo: '', responsavel: '', prazo: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState('visao');

  useEffect(() => {
    if (!open) return;
    if (card) {
      setTitulo(card.titulo); setDescricao(card.descricao || ''); setObjetivo(card.objetivo || '');
      setProblema(card.problema_oportunidade || ''); setImpacto(card.impacto_esperado || '');
      setColuna(card.coluna); setArea(card.area_negocio || ''); setAreasAfetadas(card.areas_afetadas || []);
      setPrioridade(card.prioridade); setResponsavel(card.responsavel_nome || '');
      setResponsaveisExtra(card.responsaveis_extra || []);
      setPrazo(card.prazo_estimado || ''); setDataInicio(card.data_inicio_real || '');
      setDataPrevista(card.data_conclusao_prevista || ''); setDataReal(card.data_conclusao_real || '');
      setTags(card.tags || []); setInfoInternas(card.info_internas || '');
      setReferencias(card.referencias_externas || ''); setNotasPesquisa(card.notas_pesquisa || '');
      setCriterios(card.criterios_validacao || []); setParecer(card.parecer || '');
      setDecisao((card.decisao_final as any) || ''); setDataDecisao(card.data_decisao || '');
      setDecObs(card.decisao_observacoes || ''); setPlano(card.plano_implementacao || '');
      reloadSub(card.id);
    } else {
      setTitulo(''); setDescricao(''); setObjetivo(''); setProblema(''); setImpacto('');
      setColuna(initialColuna || 'ideia'); setArea(''); setAreasAfetadas([]);
      setPrioridade('media'); setResponsavel(''); setResponsaveisExtra([]);
      setPrazo(''); setDataInicio(''); setDataPrevista(''); setDataReal('');
      setTags([]); setInfoInternas(''); setReferencias(''); setNotasPesquisa('');
      setCriterios([]); setParecer(''); setDecisao(''); setDataDecisao(''); setDecObs(''); setPlano('');
      setConsultas([]); setChecklist([]); setAnexos([]); setHistorico([]);
    }
    setTab('visao');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card?.id]);

  const reloadSub = async (id: string) => {
    setConsultas(await api.listConsultas(id));
    setChecklist(await api.listChecklist(id));
    setAnexos(await api.listAnexos(id));
    setHistorico(await api.listHistorico(id));
  };

  const buildPayload = (): Partial<PlaneamentoCard> => ({
    titulo, descricao, objetivo, problema_oportunidade: problema, impacto_esperado: impacto,
    coluna, area_negocio: area || null, areas_afetadas: areasAfetadas,
    prioridade, responsavel_nome: responsavel || null, responsaveis_extra: responsaveisExtra,
    prazo_estimado: prazo || null, data_inicio_real: dataInicio || null,
    data_conclusao_prevista: dataPrevista || null, data_conclusao_real: dataReal || null,
    tags, info_internas: infoInternas, referencias_externas: referencias,
    notas_pesquisa: notasPesquisa, criterios_validacao: criterios,
    parecer, decisao_final: (decisao || null) as any, data_decisao: dataDecisao || null,
    decisao_observacoes: decObs, plano_implementacao: plano,
  });

  const handleSave = async () => {
    if (!titulo.trim()) return;
    if (isNew) {
      const id = await api.createCard(buildPayload());
      if (id) onOpenChange(false);
    } else {
      const ok = await api.updateCard(card!.id, buildPayload());
      if (ok) onOpenChange(false);
    }
  };

  const addTag = () => { if (tagInput.trim()) { setTags([...new Set([...tags, tagInput.trim()])]); setTagInput(''); } };
  const removeTag = (t: string) => setTags(tags.filter(x => x !== t));
  const addExtra = () => { if (extraInput.trim()) { setResponsaveisExtra([...new Set([...responsaveisExtra, extraInput.trim()])]); setExtraInput(''); } };

  const addCriterio = () => {
    if (!criterioInput.trim()) return;
    setCriterios([...criterios, { id: crypto.randomUUID(), titulo: criterioInput.trim(), ok: false }]);
    setCriterioInput('');
  };
  const toggleCriterio = (id: string) => setCriterios(criterios.map(c => c.id === id ? { ...c, ok: !c.ok } : c));
  const removeCriterio = (id: string) => setCriterios(criterios.filter(c => c.id !== id));

  const handleAddConsulta = async () => {
    if (!card || !newConsulta.entidade.trim()) return;
    const ok = await api.createConsulta(card.id, {
      entidade: newConsulta.entidade, tipo: newConsulta.tipo,
      data_consulta: newConsulta.data || null, resumo: newConsulta.resumo,
    });
    if (ok) { setNewConsulta({ entidade: '', tipo: 'Outra', data: '', resumo: '' }); reloadSub(card.id); }
  };

  const handleAddCheck = async () => {
    if (!card || !newCheck.titulo.trim()) return;
    await api.createChecklistItem(card.id, newCheck.titulo, newCheck.responsavel || undefined, newCheck.prazo || undefined);
    setNewCheck({ titulo: '', responsavel: '', prazo: '' });
    reloadSub(card.id);
  };

  const handleToggleCheck = async (item: PlaneamentoChecklistItem) => {
    await api.toggleChecklistItem(item.id, !item.concluido);
    if (card) setChecklist(await api.listChecklist(card.id));
  };

  const handleUpload = async (files: FileList | null) => {
    if (!card || !files?.length) return;
    for (const f of Array.from(files)) await api.uploadAnexo(card.id, f);
    reloadSub(card.id);
  };

  const handleAddComment = async () => {
    if (!card || !comentario.trim()) return;
    await api.addComment(card.id, comentario.trim());
    setComentario('');
    setHistorico(await api.listHistorico(card.id));
  };

  const checkProgress = checklist.length ? Math.round((checklist.filter(c => c.concluido).length / checklist.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{isNew ? 'Nova Ideia / Projecto' : 'Editar Card'}</span>
            {!isNew && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={async () => { await api.duplicateCard(card!.id); onOpenChange(false); }}>
                  <Copy className="h-4 w-4 mr-1" /> Duplicar
                </Button>
                <Button size="sm" variant="outline" onClick={async () => { await api.archiveCard(card!.id); onOpenChange(false); }}>
                  <Archive className="h-4 w-4 mr-1" /> Arquivar
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título do projecto / ideia" className="text-base" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={coluna} onValueChange={v => setColuna(v as PlaneamentoColuna)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PLANEAMENTO_COLUNAS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={area || '__none'} onValueChange={v => setArea(v === '__none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Área de negócio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {AREAS_NEGOCIO.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={prioridade} onValueChange={v => setPrioridade(v as PlaneamentoPrioridade)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORIDADE_CONFIG) as PlaneamentoPrioridade[]).map(k => (
                  <SelectItem key={k} value={k}>{PRIORIDADE_CONFIG[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Responsável principal" />
            <div className="flex gap-1">
              <Input value={extraInput} onChange={e => setExtraInput(e.target.value)} placeholder="Adicionar co-responsável" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExtra())} />
              <Button size="sm" variant="outline" onClick={addExtra}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          {responsaveisExtra.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {responsaveisExtra.map(r => (
                <Badge key={r} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setResponsaveisExtra(responsaveisExtra.filter(x => x !== r))}>
                  {r} <Trash2 className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
          <div>
            <div className="flex gap-1">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Adicionar tag (ex: Q3 2026)" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
              <Button size="sm" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(t => (
                  <Badge key={t} variant="outline" className="gap-1 cursor-pointer" onClick={() => removeTag(t)}>
                    #{t} <Trash2 className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="visao">Visão Geral</TabsTrigger>
            <TabsTrigger value="pesquisa">Pesquisa</TabsTrigger>
            <TabsTrigger value="consultas">Consultas</TabsTrigger>
            <TabsTrigger value="validacao">Validação</TabsTrigger>
            <TabsTrigger value="implementacao">Implementação</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="visao" className="space-y-3 pt-3">
            <div><Label>Descrição</Label><Textarea rows={4} value={descricao} onChange={e => setDescricao(e.target.value)} /></div>
            <div><Label>Objectivo</Label><Textarea rows={3} value={objetivo} onChange={e => setObjetivo(e.target.value)} /></div>
            <div><Label>Problema ou oportunidade identificada</Label><Textarea rows={3} value={problema} onChange={e => setProblema(e.target.value)} /></div>
            <div><Label>Impacto esperado</Label><Textarea rows={3} value={impacto} onChange={e => setImpacto(e.target.value)} /></div>
            <div>
              <Label>Áreas afectadas</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {AREAS_NEGOCIO.map(a => (
                  <label key={a} className="flex items-center gap-1 text-sm border rounded-md px-2 py-1 cursor-pointer">
                    <Checkbox checked={areasAfetadas.includes(a)} onCheckedChange={() => {
                      setAreasAfetadas(areasAfetadas.includes(a) ? areasAfetadas.filter(x => x !== a) : [...areasAfetadas, a]);
                    }} />
                    {a}
                  </label>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pesquisa" className="space-y-3 pt-3">
            <div><Label>Informações internas recolhidas</Label><Textarea rows={5} value={infoInternas} onChange={e => setInfoInternas(e.target.value)} /></div>
            <div><Label>Referências externas (links, estudos, benchmarks)</Label><Textarea rows={5} value={referencias} onChange={e => setReferencias(e.target.value)} /></div>
            <div><Label>Notas de pesquisa</Label><Textarea rows={4} value={notasPesquisa} onChange={e => setNotasPesquisa(e.target.value)} /></div>
            {!isNew && (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Ficheiros anexos</Label>
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" /> Carregar
                  </Button>
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
                </div>
                <div className="space-y-1">
                  {anexos.filter(a => !a.consulta_id).map(a => (
                    <div key={a.id} className="flex items-center justify-between text-sm border-b py-1">
                      <a href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate hover:underline">
                        <FileText className="h-4 w-4" /> {a.nome}
                      </a>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await api.deleteAnexo(a); if (card) setAnexos(await api.listAnexos(card.id)); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {anexos.filter(a => !a.consulta_id).length === 0 && <div className="text-xs text-muted-foreground">Sem anexos.</div>}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="consultas" className="space-y-3 pt-3">
            {!isNew ? (
              <>
                <Card className="p-3 space-y-2">
                  <div className="text-sm font-medium">Adicionar consulta</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Entidade / especialista" value={newConsulta.entidade} onChange={e => setNewConsulta({ ...newConsulta, entidade: e.target.value })} />
                    <Select value={newConsulta.tipo} onValueChange={v => setNewConsulta({ ...newConsulta, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS_CONSULTA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="date" value={newConsulta.data} onChange={e => setNewConsulta({ ...newConsulta, data: e.target.value })} />
                  </div>
                  <Textarea rows={2} placeholder="Resumo e principais conclusões" value={newConsulta.resumo} onChange={e => setNewConsulta({ ...newConsulta, resumo: e.target.value })} />
                  <Button size="sm" onClick={handleAddConsulta} className="bg-[#E8561A] hover:bg-[#c64a17] text-white">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar consulta
                  </Button>
                </Card>
                <div className="space-y-2">
                  {consultas.map(c => (
                    <Card key={c.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">{c.entidade}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.tipo} · {c.data_consulta ? format(new Date(c.data_consulta), 'dd/MM/yyyy', { locale: pt }) : 'sem data'}
                          </div>
                          {c.resumo && <div className="text-sm mt-1 whitespace-pre-wrap">{c.resumo}</div>}
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await api.deleteConsulta(c.id, card!.id); reloadSub(card!.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {consultas.length === 0 && <div className="text-xs text-muted-foreground">Sem consultas registadas.</div>}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Guarda o card primeiro para registar consultas.</div>
            )}
          </TabsContent>

          <TabsContent value="validacao" className="space-y-3 pt-3">
            <div>
              <Label>Critérios de validação</Label>
              <div className="flex gap-1 mt-1">
                <Input value={criterioInput} onChange={e => setCriterioInput(e.target.value)} placeholder="Novo critério" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCriterio())} />
                <Button size="sm" variant="outline" onClick={addCriterio}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-1 mt-2">
                {criterios.map(c => (
                  <div key={c.id} className="flex items-center gap-2 border rounded-md px-2 py-1">
                    <Checkbox checked={c.ok} onCheckedChange={() => toggleCriterio(c.id)} />
                    <span className={`flex-1 text-sm ${c.ok ? 'line-through text-muted-foreground' : ''}`}>{c.titulo}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeCriterio(c.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
            <div><Label>Parecer / fundamentação</Label><Textarea rows={4} value={parecer} onChange={e => setParecer(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Decisão final</Label>
                <Select value={decisao || '__none'} onValueChange={v => setDecisao((v === '__none' ? '' : v) as DecisaoFinal)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">—</SelectItem>
                    {(Object.keys(DECISAO_LABEL) as DecisaoFinal[]).map(k => (
                      <SelectItem key={k} value={k}>{DECISAO_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data da decisão</Label><Input type="date" value={dataDecisao} onChange={e => setDataDecisao(e.target.value)} /></div>
            </div>
            <div><Label>Condições / observações</Label><Textarea rows={3} value={decObs} onChange={e => setDecObs(e.target.value)} /></div>
          </TabsContent>

          <TabsContent value="implementacao" className="space-y-3 pt-3">
            <div><Label>Plano de implementação</Label><Textarea rows={5} value={plano} onChange={e => setPlano(e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Início real</Label><Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
              <div><Label>Conclusão prevista</Label><Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} /></div>
              <div><Label>Conclusão real</Label><Input type="date" value={dataReal} onChange={e => setDataReal(e.target.value)} /></div>
            </div>
            {!isNew && (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Checklist de implementação</Label>
                  <Badge variant="secondary">{checkProgress}% ({checklist.filter(c => c.concluido).length}/{checklist.length})</Badge>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[#E8561A]" style={{ width: `${checkProgress}%` }} />
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <Input className="col-span-6" placeholder="Tarefa" value={newCheck.titulo} onChange={e => setNewCheck({ ...newCheck, titulo: e.target.value })} />
                  <Input className="col-span-3" placeholder="Responsável" value={newCheck.responsavel} onChange={e => setNewCheck({ ...newCheck, responsavel: e.target.value })} />
                  <Input className="col-span-2" type="date" value={newCheck.prazo} onChange={e => setNewCheck({ ...newCheck, prazo: e.target.value })} />
                  <Button size="icon" className="col-span-1" onClick={handleAddCheck}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-1">
                  {checklist.map(it => (
                    <div key={it.id} className="flex items-center gap-2 border rounded px-2 py-1 text-sm">
                      <Checkbox checked={it.concluido} onCheckedChange={() => handleToggleCheck(it)} />
                      <span className={`flex-1 ${it.concluido ? 'line-through text-muted-foreground' : ''}`}>{it.titulo}</span>
                      <span className="text-xs text-muted-foreground">{it.responsavel_nome || '—'}</span>
                      <span className="text-xs text-muted-foreground">{it.prazo ? format(new Date(it.prazo), 'dd/MM', { locale: pt }) : ''}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={async () => { await api.deleteChecklistItem(it.id); if (card) setChecklist(await api.listChecklist(card.id)); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-3 pt-3">
            {!isNew && (
              <>
                <div className="flex gap-2">
                  <Input placeholder="Adicionar comentário ao histórico..." value={comentario} onChange={e => setComentario(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
                  <Button onClick={handleAddComment}><MessageSquare className="h-4 w-4 mr-1" /> Adicionar</Button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {historico.map(h => (
                    <div key={h.id} className="text-sm border-l-2 border-[#E8561A]/40 pl-3 py-1">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(h.created_at), 'dd/MM/yyyy HH:mm', { locale: pt })} · {h.utilizador_nome || '—'} · <span className="uppercase tracking-wide">{h.tipo}</span>
                      </div>
                      <div>{h.descricao}</div>
                    </div>
                  ))}
                  {historico.length === 0 && <div className="text-xs text-muted-foreground">Sem registos.</div>}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {!isNew && (
            <Button variant="destructive" onClick={async () => { if (confirm('Eliminar definitivamente?')) { await api.deleteCard(card!.id); onOpenChange(false); } }}>
              Eliminar
            </Button>
          )}
          <Button onClick={handleSave} className="bg-[#E8561A] hover:bg-[#c64a17] text-white">
            {isNew ? 'Criar card' : 'Guardar alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
