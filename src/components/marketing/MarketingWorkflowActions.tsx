import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, RotateCcw, CalendarClock } from 'lucide-react';
import { CANAL_CONFIG, parseCanais, type MarketingCanal, type MarketingTarefa } from '@/types/marketing';

interface Props {
  tarefa: MarketingTarefa;
  actionBusy: boolean;
  changeNote: string;
  setChangeNote: (v: string) => void;
  showRequestChange: boolean;
  setShowRequestChange: (v: boolean) => void;
  onConcluirCriacao: () => void;
  onAprovarRevisao: () => void;
  onDevolverRevisao: () => void;
  onConfirmarAgendamento: (h: Record<string, string>) => void;
}

export function WorkflowActions({
  tarefa, actionBusy, changeNote, setChangeNote, showRequestChange, setShowRequestChange,
  onConcluirCriacao, onAprovarRevisao, onDevolverRevisao, onConfirmarAgendamento,
}: Props) {
  const t: any = tarefa;
  const canais = parseCanais(tarefa.canal);
  const [horarios, setHorarios] = useState<Record<string, string>>(
    () => (t.agendamentoHorarios as Record<string, string>) || {}
  );
  useEffect(() => { setHorarios((t.agendamentoHorarios as Record<string, string>) || {}); }, [tarefa.id]);

  if (tarefa.status === 'em_producao') {
    return (
      <div className="border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm">
          <span className="font-semibold">🎨 Em criação.</span>{' '}
          <span className="text-muted-foreground">
            Quando concluir, o card avança para revisão{t.revisorNome ? ` (${t.revisorNome})` : ''}.
          </span>
        </div>
        <Button size="sm" onClick={onConcluirCriacao} disabled={actionBusy} className="bg-blue-600 hover:bg-blue-700 text-white">
          <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir criação
        </Button>
      </div>
    );
  }

  if (tarefa.status === 'em_revisao') {
    return (
      <div className="border-2 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <span className="font-semibold">👀 Aguarda revisão{t.revisorNome ? ` de ${t.revisorNome}` : ''}.</span>
            {t.prazoRevisao && (
              <span className="text-muted-foreground ml-2">Prazo: {t.prazoRevisao}{t.horaRevisao ? ` ${String(t.horaRevisao).slice(0,5)}` : ''}</span>
            )}
          </div>
          {!showRequestChange && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowRequestChange(true)} disabled={actionBusy}>
                <RotateCcw className="h-4 w-4 mr-1" /> Devolver para criação
              </Button>
              <Button size="sm" onClick={onAprovarRevisao} disabled={actionBusy} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar revisão
              </Button>
            </div>
          )}
        </div>
        {showRequestChange && (
          <div className="space-y-2 pt-1">
            <Textarea rows={2} placeholder="Descreva o que deve ser alterado (obrigatório)..." value={changeNote} onChange={e => setChangeNote(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => { setShowRequestChange(false); setChangeNote(''); }} disabled={actionBusy}>Cancelar</Button>
              <Button size="sm" onClick={onDevolverRevisao} disabled={actionBusy || !changeNote.trim()}>Devolver</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tarefa.status === 'agendado') {
    const confirmed = !!t.agendamentoConfirmado;
    return (
      <div className="border-2 border-indigo-300 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-3 space-y-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <CalendarClock className="h-4 w-4" /> Agendamento por plataforma
          {confirmed && <span className="text-xs font-normal text-green-700">✓ confirmado — publicação automática activa</span>}
        </div>
        {canais.length === 0 && (
          <p className="text-xs text-muted-foreground">Sem canais selecionados — edite o card para adicionar canais.</p>
        )}
        <div className="space-y-2">
          {canais.map(c => {
            const cfg = CANAL_CONFIG[c as MarketingCanal];
            return (
              <div key={c} className="flex items-center gap-3">
                <span className="text-sm w-32">{cfg?.icon} {cfg?.label || c}</span>
                <Input
                  type="time"
                  value={horarios[c] || ''}
                  onChange={e => setHorarios({ ...horarios, [c]: e.target.value })}
                  className="w-32 h-8"
                  disabled={confirmed}
                />
              </div>
            );
          })}
        </div>
        {!confirmed && canais.length > 0 && (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => onConfirmarAgendamento(horarios)}
              disabled={actionBusy || canais.some(c => !horarios[c])}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Confirmar agendamento
            </Button>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          O card avançará automaticamente para "Publicado" quando o horário mais tardio for atingido.
        </p>
      </div>
    );
  }

  return null;
}
