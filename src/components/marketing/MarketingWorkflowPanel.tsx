import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useMarketing } from '@/hooks/useMarketing';
import {
  ETAPA_ORDER,
  ETAPA_CONFIG,
  type MarketingTarefa,
  type MarketingResponsavel,
  type MarketingChecklistItem,
  type MarketingEtapa,
  type MarketingEtapaHistorico,
} from '@/types/marketing';
import { Plus, Trash2, ArrowRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO, isBefore, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Props {
  tarefa: MarketingTarefa;
  onChanged?: () => void;
}

export function MarketingWorkflowPanel({ tarefa, onChanged }: Props) {
  const {
    fetchResponsaveis, addResponsavel, removeResponsavel,
    fetchChecklist, addChecklistItem, toggleChecklistItem, removeChecklistItem,
    fetchEtapaHistorico, moverEtapa,
  } = useMarketing();
  const { toast } = useToast();

  const [responsaveis, setResponsaveis] = useState<MarketingResponsavel[]>([]);
  const [checklist, setChecklist] = useState<MarketingChecklistItem[]>([]);
  const [historico, setHistorico] = useState<MarketingEtapaHistorico[]>([]);
  const [novoRespNome, setNovoRespNome] = useState('');
  const [novoRespFuncao, setNovoRespFuncao] = useState('');
  const [novoChkTitulo, setNovoChkTitulo] = useState<Record<MarketingEtapa, string>>({} as any);
  const [novoChkResp, setNovoChkResp] = useState<Record<MarketingEtapa, string>>({} as any);
  const [novoChkPrazo, setNovoChkPrazo] = useState<Record<MarketingEtapa, string>>({} as any);

  const reload = async () => {
    const [r, c, h] = await Promise.all([
      fetchResponsaveis(tarefa.id),
      fetchChecklist(tarefa.id),
      fetchEtapaHistorico(tarefa.id),
    ]);
    setResponsaveis(r);
    setChecklist(c);
    setHistorico(h);
  };

  useEffect(() => { reload(); }, [tarefa.id]);

  const etapaAtual = (tarefa.etapaAtual || 'briefing') as MarketingEtapa;
  const idxAtual = ETAPA_ORDER.indexOf(etapaAtual);
  const proxima = ETAPA_ORDER[idxAtual + 1];

  const handleAddResp = async () => {
    if (!novoRespNome.trim()) return;
    const ok = await addResponsavel(tarefa.id, novoRespNome.trim(), novoRespFuncao.trim() || undefined);
    if (ok) { setNovoRespNome(''); setNovoRespFuncao(''); await reload(); }
  };

  const handleAddChk = async (etapa: MarketingEtapa) => {
    const titulo = (novoChkTitulo[etapa] || '').trim();
    if (!titulo) return;
    const ok = await addChecklistItem(
      tarefa.id, etapa, titulo,
      (novoChkResp[etapa] || '').trim() || undefined,
      (novoChkPrazo[etapa] || '').trim() || undefined,
    );
    if (ok) {
      setNovoChkTitulo({ ...novoChkTitulo, [etapa]: '' });
      setNovoChkResp({ ...novoChkResp, [etapa]: '' });
      setNovoChkPrazo({ ...novoChkPrazo, [etapa]: '' });
      await reload();
    }
  };

  const handleAvancar = async () => {
    if (!proxima) return;
    if (proxima === 'aprovacao' && !tarefa.aprovadorNome) {
      toast({ title: 'Defina o aprovador antes de enviar para aprovação', variant: 'destructive' });
      return;
    }
    const ok = await moverEtapa(tarefa.id, proxima);
    if (ok) {
      toast({ title: `Etapa avançada para ${ETAPA_CONFIG[proxima].label}` });
      onChanged?.();
      await reload();
    }
  };

  const prazoStatus = (prazo: string | null | undefined) => {
    if (!prazo) return null;
    const d = parseISO(prazo);
    if (isToday(d)) return { color: 'text-orange-600', label: 'Hoje', icon: Clock };
    if (isBefore(d, new Date())) return { color: 'text-red-600', label: 'Vencido', icon: AlertTriangle };
    return { color: 'text-muted-foreground', label: format(d, 'dd/MM', { locale: pt }), icon: Clock };
  };

  return (
    <div className="space-y-5">
      {/* Stepper de etapas */}
      <div className="border rounded-lg p-3 bg-muted/20">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {ETAPA_ORDER.map((et, i) => {
            const cfg = ETAPA_CONFIG[et];
            const ativo = et === etapaAtual;
            const completo = i < idxAtual;
            return (
              <div key={et} className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    ativo ? 'border-2' : 'border'
                  }`}
                  style={{
                    backgroundColor: ativo ? cfg.color : completo ? cfg.color + '22' : 'transparent',
                    color: ativo ? 'white' : completo ? cfg.color : 'inherit',
                    borderColor: ativo || completo ? cfg.color : '#e5e7eb',
                  }}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                  {completo && <CheckCircle2 className="h-3 w-3" />}
                </div>
                {i < ETAPA_ORDER.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="text-xs text-muted-foreground">
            Etapa actual: <strong>{ETAPA_CONFIG[etapaAtual].label}</strong>
            {tarefa.aprovadorNome && <> · Aprovador: <strong>{tarefa.aprovadorNome}</strong></>}
          </div>
          {proxima && (
            <Button size="sm" onClick={handleAvancar} style={{ backgroundColor: '#E8561A' }}>
              Avançar para {ETAPA_CONFIG[proxima].label} <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Responsáveis */}
      <div className="border rounded-lg p-3 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">Equipa do job</div>
        <div className="flex flex-wrap gap-2">
          {tarefa.solicitanteNome && (
            <Badge variant="outline" className="text-xs">📥 Solicitante: {tarefa.solicitanteNome}</Badge>
          )}
          {tarefa.aprovadorNome && (
            <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">✋ Aprovador: {tarefa.aprovadorNome}</Badge>
          )}
          {responsaveis.map(r => (
            <Badge key={r.id} variant="secondary" className="text-xs gap-1">
              👤 {r.utilizadorNome}{r.funcao ? ` (${r.funcao})` : ''}
              <button onClick={async () => { await removeResponsavel(r.id); await reload(); }} className="ml-1 hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {responsaveis.length === 0 && !tarefa.aprovadorNome && (
            <span className="text-xs text-muted-foreground">Nenhum responsável adicional</span>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Input
            placeholder="Nome"
            className="h-8 text-sm"
            value={novoRespNome}
            onChange={e => setNovoRespNome(e.target.value)}
          />
          <Input
            placeholder="Função (designer, redator...)"
            className="h-8 text-sm"
            value={novoRespFuncao}
            onChange={e => setNovoRespFuncao(e.target.value)}
          />
          <Button size="sm" onClick={handleAddResp} disabled={!novoRespNome.trim()}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Checklist por etapa */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground">Checklist por etapa</div>
        {ETAPA_ORDER.filter(e => e !== 'publicado').map(etapa => {
          const cfg = ETAPA_CONFIG[etapa];
          const itens = checklist.filter(c => c.etapa === etapa);
          const done = itens.filter(c => c.concluido).length;
          return (
            <div key={etapa} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: cfg.color }}>
                  {cfg.icon} {cfg.label}
                </span>
                <Badge variant="secondary" className="text-[10px]">{done}/{itens.length}</Badge>
              </div>
              <div className="space-y-1">
                {itens.map(item => {
                  const ps = prazoStatus(item.prazo);
                  return (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={item.concluido}
                        onCheckedChange={async v => { await toggleChecklistItem(item.id, !!v); await reload(); }}
                      />
                      <span className={item.concluido ? 'line-through text-muted-foreground flex-1' : 'flex-1'}>
                        {item.titulo}
                      </span>
                      {item.responsavelNome && (
                        <span className="text-[11px] text-muted-foreground">👤 {item.responsavelNome}</span>
                      )}
                      {ps && (
                        <span className={`text-[11px] flex items-center gap-1 ${ps.color}`}>
                          <ps.icon className="h-3 w-3" /> {ps.label}
                        </span>
                      )}
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 text-destructive"
                        onClick={async () => { await removeChecklistItem(item.id); await reload(); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
                {itens.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Sem itens</p>
                )}
              </div>
              <div className="flex gap-1 pt-1">
                <Input
                  placeholder="Adicionar tarefa..."
                  className="h-7 text-xs flex-1"
                  value={novoChkTitulo[etapa] || ''}
                  onChange={e => setNovoChkTitulo({ ...novoChkTitulo, [etapa]: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddChk(etapa); }}
                />
                <Input
                  placeholder="Responsável"
                  className="h-7 text-xs w-32"
                  value={novoChkResp[etapa] || ''}
                  onChange={e => setNovoChkResp({ ...novoChkResp, [etapa]: e.target.value })}
                />
                <Input
                  type="date"
                  className="h-7 text-xs w-36"
                  value={novoChkPrazo[etapa] || ''}
                  onChange={e => setNovoChkPrazo({ ...novoChkPrazo, [etapa]: e.target.value })}
                />
                <Button size="sm" variant="ghost" onClick={() => handleAddChk(etapa)} className="h-7 px-2">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Histórico de etapas */}
      {historico.length > 0 && (
        <div className="border rounded-lg p-3 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Histórico de etapas</div>
          {historico.map(h => (
            <div key={h.id} className="text-xs flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{format(parseISO(h.createdAt), 'dd/MM HH:mm', { locale: pt })}</span>
              <span className="font-medium text-foreground">
                {h.etapaAnterior ? `${h.etapaAnterior} → ${h.etapaNova}` : h.etapaNova}
              </span>
              {h.utilizadorNome && <span>· {h.utilizadorNome}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
