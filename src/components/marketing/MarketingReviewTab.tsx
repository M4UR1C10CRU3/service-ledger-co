import { useEffect, useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useMarketing } from '@/hooks/useMarketing';
import {
  REVIEW_CHECKLIST,
  STATUS_CONFIG,
  type MarketingTarefa,
  type MarketingEtapaHistorico,
  type MarketingStatus,
} from '@/types/marketing';

interface Props {
  tarefa: MarketingTarefa;
  onChanged?: () => void;
}

export function MarketingReviewTab({ tarefa, onChanged }: Props) {
  const { updateTarefa, updateStatus, addComentario, fetchEtapaHistorico } = useMarketing();
  const { toast } = useToast();

  const initialChecklist = useMemo<Record<string, boolean>>(
    () => (tarefa as any).reviewChecklist || {},
    [tarefa.id]
  );
  const [checklist, setChecklist] = useState<Record<string, boolean>>(initialChecklist);
  const [notes, setNotes] = useState<string>(((tarefa as any).reviewNotes as string) || '');
  const [historico, setHistorico] = useState<MarketingEtapaHistorico[]>([]);
  const [busy, setBusy] = useState<null | 'aprovar' | 'devolver' | 'guardar'>(null);

  useEffect(() => {
    setChecklist((tarefa as any).reviewChecklist || {});
    setNotes(((tarefa as any).reviewNotes as string) || '');
    fetchEtapaHistorico(tarefa.id).then(setHistorico);
  }, [tarefa.id]);

  const totalChecked = REVIEW_CHECKLIST.filter(i => checklist[i.key]).length;

  const persistChecklist = async (next: Record<string, boolean>) => {
    setChecklist(next);
    await updateTarefa(tarefa.id, { reviewChecklist: next } as any);
  };

  const guardarNotas = async () => {
    setBusy('guardar');
    await updateTarefa(tarefa.id, { reviewNotes: notes } as any);
    setBusy(null);
    toast({ title: 'Notas guardadas' });
  };

  const aprovarEAgendar = async () => {
    setBusy('aprovar');
    const partial = totalChecked < REVIEW_CHECKLIST.length;
    if (partial && !confirm(`Apenas ${totalChecked}/${REVIEW_CHECKLIST.length} itens estão marcados. Aprovar mesmo assim?`)) {
      setBusy(null);
      return;
    }
    await updateTarefa(tarefa.id, { reviewNotes: notes, reviewChecklist: checklist, etapaAtual: 'publicado' } as any);
    if (notes.trim()) {
      await addComentario(tarefa.id, `✅ Notas de revisão (aprovação): ${notes.trim()}`);
    }
    const ok = await updateStatus(tarefa.id, 'agendado' as MarketingStatus);
    if (ok) {
      toast({ title: 'Aprovado e agendado', description: 'O post foi movido para Agendado.' });
      const h = await fetchEtapaHistorico(tarefa.id);
      setHistorico(h);
      onChanged?.();
    } else {
      toast({ title: 'Erro a aprovar', variant: 'destructive' });
    }
    setBusy(null);
  };

  const devolver = async () => {
    if (!notes.trim()) {
      toast({ title: 'Comentário obrigatório', description: 'Indique o que deve ser alterado nas notas.', variant: 'destructive' });
      return;
    }
    setBusy('devolver');
    await updateTarefa(tarefa.id, { reviewNotes: notes, reviewChecklist: checklist, etapaAtual: 'criacao' } as any);
    await addComentario(tarefa.id, `↩️ Devolvido para criação. Notas: ${notes.trim()}`);
    const ok = await updateStatus(tarefa.id, 'em_producao' as MarketingStatus);
    if (ok) {
      toast({ title: 'Devolvido para criação' });
      const h = await fetchEtapaHistorico(tarefa.id);
      setHistorico(h);
      onChanged?.();
    }
    setBusy(null);
  };

  const isReviewStatus = tarefa.status === 'em_revisao' || tarefa.status === 'em_aprovacao';

  return (
    <div className="space-y-5">
      {!isReviewStatus && (
        <div className="text-xs text-muted-foreground border rounded p-2 bg-muted/30">
          A checklist e o painel de aprovação são activados quando o post está em
          <Badge variant="outline" className="mx-1">Em Revisão</Badge> ou
          <Badge variant="outline" className="mx-1">Em Aprovação</Badge>.
        </div>
      )}

      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Checklist de revisão</div>
          <Badge variant="secondary">{totalChecked}/{REVIEW_CHECKLIST.length}</Badge>
        </div>
        <div className="space-y-1.5">
          {REVIEW_CHECKLIST.map(item => (
            <label key={item.key} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-muted/30 rounded p-1.5">
              <Checkbox
                checked={!!checklist[item.key]}
                onCheckedChange={v => persistChecklist({ ...checklist, [item.key]: !!v })}
                className="mt-0.5"
              />
              <span className={checklist[item.key] ? 'line-through text-muted-foreground' : ''}>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="border rounded-lg p-3 space-y-2">
        <div className="text-sm font-semibold">Notas de revisão</div>
        <Textarea
          rows={3}
          placeholder="Deixe feedback antes de aprovar ou devolver..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={guardarNotas} disabled={busy !== null}>
            {busy === 'guardar' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Guardar notas
          </Button>
        </div>
      </div>

      {isReviewStatus && (
        <div className="border-2 border-purple-300 bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={devolver} disabled={busy !== null}>
            {busy === 'devolver' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
            Devolver para revisão
          </Button>
          <Button onClick={aprovarEAgendar} disabled={busy !== null} className="bg-green-600 hover:bg-green-700 text-white">
            {busy === 'aprovar' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Aprovar e Agendar
          </Button>
        </div>
      )}

      <div className="border rounded-lg p-3 space-y-2">
        <div className="text-sm font-semibold">Histórico de estados</div>
        {historico.length === 0 && <p className="text-xs text-muted-foreground italic">Sem alterações ainda.</p>}
        {historico.map(h => {
          const novoLabel = STATUS_CONFIG[h.etapaNova as MarketingStatus]?.label || h.etapaNova;
          const antLabel = h.etapaAnterior ? (STATUS_CONFIG[h.etapaAnterior as MarketingStatus]?.label || h.etapaAnterior) : null;
          return (
            <div key={h.id} className="text-xs flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="font-mono">{format(parseISO(h.createdAt), 'dd/MM HH:mm', { locale: pt })}</span>
              <span>—</span>
              <span className="text-foreground">
                {antLabel ? `${antLabel} → ` : ''}<strong>{novoLabel}</strong>
              </span>
              {h.utilizadorNome && <span>· por {h.utilizadorNome}</span>}
              {h.observacoes && <span className="italic">— {h.observacoes}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
