import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DoorOpen, Plus, CalendarClock, AlertTriangle, ClipboardCheck, Trash2, ExternalLink } from 'lucide-react';
import { useAcolhimentos, useAcolhimento, FASE_LABEL, FASE_ORDEM, ESTADO_ACOLHIMENTO_LABEL, type FaseAcolhimento, type ItemAcolhimento } from '@/hooks/useAcolhimento';
import { useEmployees } from '@/hooks/useEmployees';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePermissions } from '@/hooks/usePermissions';

const dataPt = (iso: string | null | undefined) => iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('pt-PT') : '—';
const hoje = () => new Date().toISOString().slice(0, 10);
const diasAte = (iso: string) => Math.ceil((new Date(iso + 'T00:00:00').getTime() - new Date(hoje() + 'T00:00:00').getTime()) / 86_400_000);

/** Diálogo partilhado: iniciar um acolhimento (colaborador existente ou novo, vindo de um candidato). */
export function IniciarAcolhimentoDialog({ aberto, onFechar, onIniciar, preenchido }: {
  aberto: boolean;
  onFechar: () => void;
  onIniciar: (p: { colaborador_id?: string; data_entrada: string; periodo_experimental_dias: number; responsavel_nome: string | null; tutor_nome: string | null }) => Promise<void>;
  preenchido?: { nome: string; cargo?: string | null; semEscolha?: boolean };
}) {
  const { employees } = useEmployees();
  const [colaboradorId, setColaboradorId] = useState('');
  const [dataEntrada, setDataEntrada] = useState(hoje());
  const [periodo, setPeriodo] = useState('90');
  const [responsavel, setResponsavel] = useState('');
  const [tutor, setTutor] = useState('');
  const [aGravar, setAGravar] = useState(false);
  const podeGravar = (preenchido?.semEscolha || colaboradorId) && dataEntrada && Number(periodo) > 0;

  const submeter = async () => {
    setAGravar(true);
    try {
      await onIniciar({ colaborador_id: preenchido?.semEscolha ? undefined : colaboradorId, data_entrada: dataEntrada, periodo_experimental_dias: Number(periodo), responsavel_nome: responsavel || null, tutor_nome: tutor || null });
      onFechar();
    } finally { setAGravar(false); }
  };

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o) onFechar(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><DoorOpen size={18} /> Iniciar acolhimento</DialogTitle>
          <DialogDescription>
            Cria a checklist de integração por fases e agenda as duas avaliações do período experimental.
            {preenchido && <> Colaborador: <b>{preenchido.nome}</b>{preenchido.cargo ? ` · ${preenchido.cargo}` : ''}.</>}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {!preenchido?.semEscolha && (
            <div className="grid gap-1">
              <Label>Colaborador</Label>
              <Select value={colaboradorId} onValueChange={setColaboradorId}>
                <SelectTrigger><SelectValue placeholder="Escolher colaborador" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1"><Label>Data de entrada</Label><Input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} /></div>
            <div className="grid gap-1">
              <Label>Período experimental</Label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 dias — contrato a termo &lt; 6 meses</SelectItem>
                  <SelectItem value="60">60 dias — contrato a termo ≥ 6 meses</SelectItem>
                  <SelectItem value="90">90 dias — sem termo (geral)</SelectItem>
                  <SelectItem value="180">180 dias — complexidade técnica / confiança</SelectItem>
                  <SelectItem value="240">240 dias — direção / quadro superior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1"><Label>Responsável direto</Label><Input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="quem avalia" /></div>
            <div className="grid gap-1"><Label>Tutor de integração</Label><Input value={tutor} onChange={e => setTutor(e.target.value)} placeholder="quem acompanha no dia a dia" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={submeter} disabled={!podeGravar || aGravar}>{aGravar ? 'A criar…' : 'Iniciar acolhimento'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Lista ─────────────────────────────────────────────────────────────────────
function ListaAcolhimentos() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { acolhimentos, loading, iniciar } = useAcolhimentos();
  const [novo, setNovo] = useState(false);
  const podeEditar = can('rh_acolhimento', 'editar');

  const kpi = useMemo(() => {
    const emCurso = acolhimentos.filter(a => a.estado === 'em_curso');
    return {
      emCurso: emCurso.length,
      aTerminar: emCurso.filter(a => { const d = diasAte(a.fim_periodo_experimental); return d >= 0 && d <= 15; }).length,
      atrasados: emCurso.reduce((s, a) => s + (a.em_atraso ?? 0), 0),
    };
  }, [acolhimentos]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DoorOpen /> Acolhimento</h1>
          <p className="text-sm text-muted-foreground">Integração de novos colaboradores e período experimental</p>
        </div>
        {podeEditar && <Button className="gap-2" onClick={() => setNovo(true)}><Plus size={16} /> Novo acolhimento</Button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{kpi.emCurso}</p><p className="text-xs text-muted-foreground">Em curso</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold flex items-center gap-2"><CalendarClock size={18} /> {kpi.aTerminar}</p><p className="text-xs text-muted-foreground">Período experimental a terminar em 15 dias</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className={`text-2xl font-bold flex items-center gap-2 ${kpi.atrasados ? 'text-destructive' : ''}`}><AlertTriangle size={18} /> {kpi.atrasados}</p><p className="text-xs text-muted-foreground">Tarefas em atraso</p></CardContent></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead><TableHead>Cargo</TableHead><TableHead>Entrada</TableHead><TableHead>Fim do período</TableHead>
              <TableHead>Checklist</TableHead><TableHead>Próximo prazo</TableHead><TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar…</TableCell></TableRow>
            : acolhimentos.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Ainda não há acolhimentos. Um candidato aprovado no Recrutamento pode ser admitido daqui, ou inicie um para um colaborador já registado.</TableCell></TableRow>
            : acolhimentos.map(a => {
              const dias = diasAte(a.fim_periodo_experimental);
              return (
                <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/recursos-humanos/acolhimento/${a.id}`)}>
                  <TableCell className="font-medium">{a.colaborador_nome}</TableCell>
                  <TableCell>{a.cargo ?? '—'}</TableCell>
                  <TableCell>{dataPt(a.data_entrada)}</TableCell>
                  <TableCell>{dataPt(a.fim_periodo_experimental)} {a.estado === 'em_curso' && <span className="text-xs text-muted-foreground">({dias >= 0 ? `faltam ${dias} d` : `há ${-dias} d`})</span>}</TableCell>
                  <TableCell className="min-w-36">
                    <div className="flex items-center gap-2"><Progress value={a.itens_total ? (a.itens_feitos! / a.itens_total) * 100 : 0} className="h-2" /><span className="text-xs whitespace-nowrap">{a.itens_feitos}/{a.itens_total}</span></div>
                  </TableCell>
                  <TableCell className={a.em_atraso ? 'text-destructive' : ''}>{a.proximo_prazo ? dataPt(a.proximo_prazo) : '—'}{a.em_atraso ? <span className="text-xs"> · {a.em_atraso} em atraso</span> : null}</TableCell>
                  <TableCell><Badge variant={a.estado === 'em_curso' ? 'default' : a.estado === 'concluido' ? 'secondary' : 'destructive'}>{ESTADO_ACOLHIMENTO_LABEL[a.estado]}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <IniciarAcolhimentoDialog aberto={novo} onFechar={() => setNovo(false)} onIniciar={async p => { const id = await iniciar(p); if (id) navigate(`/recursos-humanos/acolhimento/${id}`); }} />
    </div>
  );
}

// ── Detalhe ───────────────────────────────────────────────────────────────────
function DetalheAcolhimento({ id }: { id: string }) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { nome: quem } = useCurrentUser();
  const { acolhimento, itens, loading, progresso, marcar, adicionarItem, removerItem, atualizar } = useAcolhimento(id);
  const podeEditar = can('rh_acolhimento', 'editar');
  const [novoItem, setNovoItem] = useState<{ fase: FaseAcolhimento; descricao: string; responsavel: string; prazo: string } | null>(null);
  const [notas, setNotas] = useState<string | null>(null);

  if (loading) return <div className="p-6 text-muted-foreground">A carregar…</div>;
  if (!acolhimento) return <div className="p-6"><Button variant="ghost" onClick={() => navigate('/recursos-humanos/acolhimento')}><ArrowLeft size={16} /> Acolhimento</Button><p className="mt-4 text-muted-foreground">Acolhimento não encontrado.</p></div>;

  const h = hoje();
  const dias = diasAte(acolhimento.fim_periodo_experimental);
  const porFase = FASE_ORDEM.map(f => ({ fase: f, itens: itens.filter(i => i.fase === f) })).filter(g => g.itens.length);

  const linhaItem = (i: ItemAcolhimento) => {
    const atrasado = !i.feito && i.prazo && i.prazo < h;
    return (
      <div key={i.id} className={`flex items-start gap-3 px-4 py-2 border-b last:border-b-0 ${i.feito ? 'opacity-60' : ''}`}>
        <Checkbox checked={i.feito} disabled={!podeEditar} onCheckedChange={v => marcar(i, v === true, quem)} className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${i.feito ? 'line-through' : ''}`}>{i.descricao}{!i.obrigatorio && <Badge variant="outline" className="ml-2 text-[10px]">opcional</Badge>}</p>
          <p className="text-xs text-muted-foreground">
            {i.responsavel && <>Resp.: {i.responsavel} · </>}
            {i.prazo && <span className={atrasado ? 'text-destructive font-medium' : ''}>prazo {dataPt(i.prazo)}{atrasado ? ' · em atraso' : ''}</span>}
            {i.feito && i.feito_em && <> · feito {new Date(i.feito_em).toLocaleDateString('pt-PT')}{i.feito_por_nome ? ` por ${i.feito_por_nome}` : ''}</>}
          </p>
        </div>
        {podeEditar && !i.obrigatorio && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removerItem(i)}><Trash2 size={13} /></Button>}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => navigate('/recursos-humanos/acolhimento')}><ArrowLeft size={14} /> Acolhimento</Button>
          <h1 className="text-2xl font-bold mt-1">{acolhimento.colaborador_nome}</h1>
          <p className="text-sm text-muted-foreground">{acolhimento.cargo ?? 'Cargo por definir'} · entrada {dataPt(acolhimento.data_entrada)} · período experimental de {acolhimento.periodo_experimental_dias} dias até {dataPt(acolhimento.fim_periodo_experimental)}</p>
        </div>
        <div className="flex items-center gap-2">
          {acolhimento.estado === 'em_curso' && <Badge variant={dias < 0 ? 'destructive' : dias <= 15 ? 'default' : 'secondary'} className="gap-1"><CalendarClock size={12} /> {dias >= 0 ? `faltam ${dias} dias` : `terminou há ${-dias} dias`}</Badge>}
          <Badge variant={acolhimento.estado === 'em_curso' ? 'default' : acolhimento.estado === 'concluido' ? 'secondary' : 'destructive'}>{ESTADO_ACOLHIMENTO_LABEL[acolhimento.estado]}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Checklist</p><div className="flex items-center gap-2 mt-1"><Progress value={progresso.pct} className="h-2" /><span className="text-sm font-semibold whitespace-nowrap">{progresso.feitos}/{progresso.total}</span></div></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Em atraso</p><p className={`text-2xl font-bold ${progresso.atrasados ? 'text-destructive' : ''}`}>{progresso.atrasados}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Responsável direto</p><Input className="mt-1 h-8" disabled={!podeEditar} defaultValue={acolhimento.responsavel_nome ?? ''} onBlur={e => e.target.value !== (acolhimento.responsavel_nome ?? '') && atualizar({ responsavel_nome: e.target.value || null })} /></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Tutor de integração</p><Input className="mt-1 h-8" disabled={!podeEditar} defaultValue={acolhimento.tutor_nome ?? ''} onBlur={e => e.target.value !== (acolhimento.tutor_nome ?? '') && atualizar({ tutor_nome: e.target.value || null })} /></CardContent></Card>
      </div>

      {porFase.map(g => (
        <Card key={g.fase} className="p-0 overflow-hidden">
          <div className="px-4 py-2 border-b text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2"><ClipboardCheck size={14} /> {FASE_LABEL[g.fase]} <span className="text-xs text-muted-foreground font-normal">{g.itens.filter(i => i.feito).length}/{g.itens.length}</span></span>
            {podeEditar && <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setNovoItem({ fase: g.fase, descricao: '', responsavel: '', prazo: '' })}><Plus size={12} /> tarefa</Button>}
          </div>
          {g.itens.map(linhaItem)}
        </Card>
      ))}

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-2 border-b text-sm font-medium flex items-center justify-between">
          <span>Avaliações do período experimental</span>
          <Button variant="link" size="sm" className="h-7 gap-1 text-xs" onClick={() => navigate('/recursos-humanos/avaliacoes')}><ExternalLink size={12} /> abrir Avaliações</Button>
        </div>
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Ao iniciar o acolhimento ficaram agendadas a <b>Experimental 1</b> (aos 30 dias) e a <b>Experimental 2</b> (7 dias antes do fim do período). Preenchem-se em Avaliações; a decisão de continuidade regista-se aqui em baixo.
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="grid gap-1">
          <Label>Notas do acolhimento</Label>
          <Textarea rows={3} disabled={!podeEditar} value={notas ?? acolhimento.notas ?? ''} onChange={e => setNotas(e.target.value)} onBlur={() => notas != null && notas !== (acolhimento.notas ?? '') && atualizar({ notas: notas || null })} />
        </div>
        {podeEditar && acolhimento.estado === 'em_curso' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <span className="text-sm">Fim do período experimental:</span>
            <Button size="sm" variant="secondary" onClick={() => { if (confirm('Registar continuidade e concluir o acolhimento?')) atualizar({ estado: 'concluido', decisao: 'continuidade', decisao_em: h }); }}>Continuidade</Button>
            <Button size="sm" variant="destructive" onClick={() => { if (confirm('Registar cessação no período experimental? O colaborador mantém-se na lista de Colaboradores; altere lá o estado.')) atualizar({ estado: 'cessado', decisao: 'cessacao', decisao_em: h }); }}>Cessação</Button>
          </div>
        )}
        {acolhimento.decisao && <p className="text-sm text-muted-foreground">Decisão: <b>{acolhimento.decisao === 'continuidade' ? 'continuidade' : 'cessação'}</b> em {dataPt(acolhimento.decisao_em)}.</p>}
      </Card>

      <Dialog open={!!novoItem} onOpenChange={o => { if (!o) setNovoItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova tarefa — {novoItem && FASE_LABEL[novoItem.fase]}</DialogTitle></DialogHeader>
          {novoItem && (
            <div className="grid gap-3">
              <div className="grid gap-1"><Label>Descrição</Label><Input value={novoItem.descricao} onChange={e => setNovoItem({ ...novoItem, descricao: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1"><Label>Responsável</Label><Input value={novoItem.responsavel} onChange={e => setNovoItem({ ...novoItem, responsavel: e.target.value })} /></div>
                <div className="grid gap-1"><Label>Prazo</Label><Input type="date" value={novoItem.prazo} onChange={e => setNovoItem({ ...novoItem, prazo: e.target.value })} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoItem(null)}>Cancelar</Button>
            <Button disabled={!novoItem?.descricao.trim()} onClick={async () => { if (!novoItem) return; await adicionarItem(novoItem.fase, novoItem.descricao.trim(), novoItem.responsavel || null, novoItem.prazo || null); setNovoItem(null); }}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Acolhimento() {
  const { id } = useParams<{ id: string }>();
  return id ? <DetalheAcolhimento id={id} /> : <ListaAcolhimentos />;
}
