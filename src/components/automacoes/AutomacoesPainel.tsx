import { useState } from 'react';
import {
  useAutomacoes, useExecucoesAutomacao, GATILHOS, ACCOES,
  type Automacao, type Gatilho, type Accao, type ContextoAutomacao,
} from '@/hooks/useQuadroProcesso';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Zap, Trash2, Pencil, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────────────────────
// O painel de automações. Serve os Quadros e as etapas de Job do Agency — é o
// mesmo motor, logo é o mesmo ecrã. Duplicá-lo seria repetir exatamente o erro
// que a unificação veio corrigir.
//
// Cada execução fica registada em baixo, incluindo as que falham: sem esse
// registo, uma automação avariada não avisa ninguém e a equipa fica a achar que
// o email seguiu quando não seguiu.
// ─────────────────────────────────────────────────────────────────────────────

export interface ColunaGatilho {
  id: string;
  nome: string;
  estadoCodigo: string | null;
}

interface Props {
  contexto: ContextoAutomacao;
  /** Só no contexto 'quadro': a que quadro pertencem estas regras. */
  quadroId?: string;
  titulo: string;
  subtitulo: string;
  colunas: ColunaGatilho[];
  /** Texto e destino do botão de voltar. */
  voltarLabel: string;
  onVoltar: () => void;
  /** Mostrado quando não há colunas com processo. */
  vazioSemProcesso: string;
}

type Rascunho = {
  id?: string;
  nome: string;
  gatilho: Gatilho;
  gatilhoEstadoCodigo: string | null;
  accao: Accao;
  accaoConfig: Record<string, any>;
};

const NOVO: Omit<Rascunho, 'gatilhoEstadoCodigo'> = {
  nome: '',
  gatilho: 'entra_lista',
  accao: 'email',
  accaoConfig: { destinatario: 'contacto' },
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return isValid(d) ? format(d, "d 'de' MMM 'às' HH:mm", { locale: pt }) : '';
};

export default function AutomacoesPainel({
  contexto, quadroId, titulo, subtitulo, colunas, voltarLabel, onVoltar, vazioSemProcesso,
}: Props) {
  const { automacoes, guardar, alternar, eliminar } = useAutomacoes(quadroId);
  const { execucoes } = useExecucoesAutomacao(30);

  const [editar, setEditar] = useState<Rascunho | null>(null);
  const [aEliminar, setAEliminar] = useState<Automacao | null>(null);

  // Só as colunas com estado de processo servem de gatilho.
  const gatilhaveis = colunas.filter(c => !!c.estadoCodigo);
  const nomeColuna = (codigo: string | null) =>
    gatilhaveis.find(c => c.estadoCodigo === codigo)?.nome ?? '—';

  const minhas = automacoes.filter(a =>
    contexto === 'quadro' ? a.contexto === 'quadro' && a.quadroId === quadroId
                          : a.contexto === 'agency_job');

  const abrirNova = () =>
    setEditar({ ...NOVO, gatilhoEstadoCodigo: gatilhaveis[0]?.estadoCodigo ?? null });

  const abrirExistente = (a: Automacao) => setEditar({
    id: a.id, nome: a.nome, gatilho: a.gatilho,
    gatilhoEstadoCodigo: a.gatilhoEstadoCodigo, accao: a.accao,
    accaoConfig: a.accaoConfig ?? {},
  });

  const porColuna = editar?.gatilho === 'entra_lista' || editar?.gatilho === 'sai_lista';
  const temporal = editar?.gatilho === 'sem_movimento' || editar?.gatilho === 'data_limite';
  const podeGuardar = !!editar?.nome.trim() && (!porColuna || !!editar.gatilhoEstadoCodigo);

  const submeter = async () => {
    if (!editar || !podeGuardar) return;
    await guardar.mutateAsync({
      id: editar.id,
      contexto,
      quadroId: contexto === 'quadro' ? quadroId ?? null : null,
      nome: editar.nome,
      gatilho: editar.gatilho,
      gatilhoEstadoCodigo: editar.gatilhoEstadoCodigo,
      accao: editar.accao,
      accaoConfig: editar.accaoConfig,
    }).catch(() => null);
    setEditar(null);
  };

  const cfg = (k: string, v: any) =>
    setEditar(p => (p ? { ...p, accaoConfig: { ...p.accaoConfig, [k]: v } } : p));

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={onVoltar}>
        <ArrowLeft size={16} /> {voltarLabel}
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap size={22} /> {titulo}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{subtitulo}</p>
        </div>
        <Button onClick={abrirNova} disabled={gatilhaveis.length === 0} className="gap-2 shrink-0">
          <Plus size={16} /> Nova automação
        </Button>
      </div>

      {gatilhaveis.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{vazioSemProcesso}</p>
        </div>
      ) : minhas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Ainda não há automações aqui.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Por exemplo: quando algo entra em "{gatilhaveis[1]?.nome ?? gatilhaveis[0]?.nome}",
            enviar um email.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {minhas.map(a => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
              <Switch
                checked={a.ativo}
                onCheckedChange={v => alternar.mutate({ id: a.id, ativo: v })}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${a.ativo ? '' : 'text-muted-foreground line-through'}`}>
                  {a.nome}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {GATILHOS[a.gatilho]}
                  {(a.gatilho === 'entra_lista' || a.gatilho === 'sai_lista')
                    && ` "${nomeColuna(a.gatilhoEstadoCodigo)}"`}
                  {' → '}{ACCOES[a.accao]}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => abrirExistente(a)}><Pencil size={14} /></Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setAEliminar(a)}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {execucoes.length > 0 && (
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-semibold">Últimas execuções</h2>
          <div className="rounded-lg border divide-y">
            {execucoes.map(e => (
              <div key={e.id} className="flex items-start gap-2.5 p-2.5 text-sm">
                {e.estado === 'sucesso' && <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />}
                {e.estado === 'falha' && <XCircle size={15} className="text-destructive mt-0.5 shrink-0" />}
                {e.estado === 'ignorada' && <MinusCircle size={15} className="text-muted-foreground mt-0.5 shrink-0" />}
                <span className="flex-1 min-w-0">{e.detalhe || e.estado}</span>
                <span className="text-xs text-muted-foreground shrink-0">{fmt(e.executadoEm)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!editar} onOpenChange={o => !o && setEditar(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editar?.id ? 'Editar automação' : 'Nova automação'}</DialogTitle>
          </DialogHeader>

          {editar && (
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={editar.nome}
                  onChange={e => setEditar(p => (p ? { ...p, nome: e.target.value } : p))}
                  placeholder="Ex: Pedir cotação ao fornecedor"
                  autoFocus
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Quando</Label>
                  <Select
                    value={editar.gatilho}
                    onValueChange={v => setEditar(p => (p ? { ...p, gatilho: v as Gatilho } : p))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(GATILHOS) as Gatilho[]).map(g => (
                        <SelectItem key={g} value={g}>{GATILHOS[g]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {porColuna && (
                  <div className="space-y-1.5">
                    <Label>Coluna</Label>
                    <Select
                      value={editar.gatilhoEstadoCodigo ?? ''}
                      onValueChange={v => setEditar(p => (p ? { ...p, gatilhoEstadoCodigo: v } : p))}
                    >
                      <SelectTrigger><SelectValue placeholder="Escolher" /></SelectTrigger>
                      <SelectContent>
                        {gatilhaveis.map(c => (
                          <SelectItem key={c.id} value={c.estadoCodigo!}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {temporal && (
                <p className="text-xs rounded-md bg-amber-50 border border-amber-200 text-amber-900 p-2.5">
                  Os gatilhos de tempo precisam de uma tarefa agendada no servidor, que ainda não está
                  montada. Guarde à vontade — a regra fica registada, mas ainda não dispara sozinha.
                </p>
              )}

              <div className="space-y-1.5">
                <Label>Fazer o quê</Label>
                <Select
                  value={editar.accao}
                  onValueChange={v => setEditar(p => (p ? { ...p, accao: v as Accao } : p))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACCOES) as Accao[]).map(a => (
                      <SelectItem key={a} value={a}>{ACCOES[a]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editar.accao === 'email' && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Para quem</Label>
                    <Select
                      value={editar.accaoConfig.destinatario ?? 'contacto'}
                      onValueChange={v => cfg('destinatario', v)}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contacto">O contacto do cartão</SelectItem>
                        <SelectItem value="fixo">Um endereço fixo</SelectItem>
                      </SelectContent>
                    </Select>
                    {contexto === 'agency_job' && editar.accaoConfig.destinatario === 'contacto' && (
                      <p className="text-[11px] text-amber-700">
                        Um job não tem contacto próprio. Escolha um endereço fixo, ou a automação
                        fica registada como ignorada.
                      </p>
                    )}
                  </div>

                  {editar.accaoConfig.destinatario === 'fixo' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Endereço</Label>
                      <Input
                        className="h-9" type="email" placeholder="alguem@empresa.pt"
                        value={editar.accaoConfig.para ?? ''}
                        onChange={e => cfg('para', e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs">Assunto</Label>
                    <Input
                      className="h-9" placeholder="Pedido de cotação — {titulo}"
                      value={editar.accaoConfig.assunto ?? ''}
                      onChange={e => cfg('assunto', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Mensagem</Label>
                    <Textarea
                      rows={4} placeholder="Bom dia,&#10;&#10;Vimos por este meio pedir cotação para {titulo}."
                      value={editar.accaoConfig.corpo ?? ''}
                      onChange={e => cfg('corpo', e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Escreva <code className="text-[10px]">{'{titulo}'}</code> onde quiser o título.
                    </p>
                  </div>
                </div>
              )}

              {editar.accao === 'notificacao_interna' && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Título</Label>
                    <Input
                      className="h-9" placeholder="Cotação recebida"
                      value={editar.accaoConfig.titulo ?? ''}
                      onChange={e => cfg('titulo', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mensagem</Label>
                    <Textarea
                      rows={3} placeholder="{titulo} está à espera de aprovação."
                      value={editar.accaoConfig.mensagem ?? ''}
                      onChange={e => cfg('mensagem', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {editar.accao === 'webhook' && (
                <div className="space-y-1.5 rounded-lg border p-3">
                  <Label className="text-xs">Endereço da automação no n8n</Label>
                  <Input
                    className="h-9" placeholder="https://…/webhook/…"
                    value={editar.accaoConfig.url ?? ''}
                    onChange={e => cfg('url', e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    O registo inteiro segue no pedido, para o n8n fazer o resto.
                  </p>
                </div>
              )}

              {editar.accao === 'criar_documento' && (
                <p className="text-xs rounded-md bg-amber-50 border border-amber-200 text-amber-900 p-2.5">
                  A criação automática de documentos ainda não está implementada — falta decidir que
                  documento cada processo gera. A regra fica guardada e é ignorada até lá.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditar(null)}>Cancelar</Button>
            <Button onClick={submeter} disabled={!podeGuardar || guardar.isPending}>
              {guardar.isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!aEliminar} onOpenChange={o => !o && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar "{aEliminar?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Deixa de correr a partir de agora. O registo das execuções passadas mantém-se.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (aEliminar) eliminar.mutate(aEliminar.id); setAEliminar(null); }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
