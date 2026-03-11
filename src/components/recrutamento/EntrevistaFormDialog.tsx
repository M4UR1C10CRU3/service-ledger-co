import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useEntrevistas, type Candidato } from '@/hooks/useRecrutamento';
import { useEmployees } from '@/hooks/useEmployees';

const tipos = ['Presencial', 'Videochamada', 'Telefónica'];
const recomendacoes = ['Aprovar para próxima fase', 'Manter em espera', 'Rejeitar'];
const proximasFases = ['Segunda Entrevista', 'Proposta de Emprego', 'Admissão Direta'];

// Determine which criteria set to use based on cargo
function getCriteriaSet(cargo: string) {
  const operacionais = ['Pedreiro', 'Eletricista', 'Servente de Obras', 'Assistente de Limpezas'];
  const tecnicos = ['Técnico Comercial', 'Técnico de Obras', 'Diretor de Obras', 'Engenheiro Civil'];
  const admin = ['Assistente Administrativo'];

  if (operacionais.some(c => cargo.toLowerCase().includes(c.toLowerCase()))) return 'operacional';
  if (tecnicos.some(c => cargo.toLowerCase().includes(c.toLowerCase()))) return 'tecnico';
  if (admin.some(c => cargo.toLowerCase().includes(c.toLowerCase()))) return 'administrativo';
  return 'tecnico'; // default
}

const criteriaByType = {
  operacional: [
    { key: 'p_experiencia', label: 'Experiência na função', peso: 0.25 },
    { key: 'p_conhecimento', label: 'Conhecimentos técnicos', peso: 0.25 },
    { key: 'p_apresentacao', label: 'Apresentação e postura', peso: 0.15 },
    { key: 'p_comunicacao', label: 'Comunicação', peso: 0.15 },
    { key: 'p_disponibilidade', label: 'Disponibilidade e flexibilidade', peso: 0.10 },
    { key: 'p_referencias', label: 'Referências / histórico', peso: 0.10 },
  ],
  tecnico: [
    { key: 'p_experiencia', label: 'Experiência na função', peso: 0.20 },
    { key: 'p_conhecimento', label: 'Conhecimentos técnicos específicos', peso: 0.25 },
    { key: 'p_lideranca', label: 'Capacidade de liderança / gestão', peso: 0.15 },
    { key: 'p_comunicacao', label: 'Comunicação e negociação', peso: 0.15 },
    { key: 'p_resolucao', label: 'Resolução de problemas', peso: 0.15 },
    { key: 'p_apresentacao', label: 'Apresentação e postura', peso: 0.10 },
  ],
  administrativo: [
    { key: 'p_experiencia', label: 'Experiência administrativa', peso: 0.20 },
    { key: 'p_informatica', label: 'Conhecimentos informáticos', peso: 0.20 },
    { key: 'p_organizacao', label: 'Organização e método', peso: 0.20 },
    { key: 'p_comunicacao', label: 'Comunicação escrita e oral', peso: 0.20 },
    { key: 'p_apresentacao', label: 'Apresentação e postura', peso: 0.10 },
    { key: 'p_adaptabilidade', label: 'Adaptabilidade', peso: 0.10 },
  ],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vagaId: string;
  candidatos: Candidato[];
  preSelectedCandidato: string | null;
  cargo: string;
}

export function EntrevistaFormDialog({ open, onOpenChange, vagaId, candidatos, preSelectedCandidato, cargo }: Props) {
  const { createEntrevista } = useEntrevistas(vagaId);
  const { employees } = useEmployees();
  const criteriaType = getCriteriaSet(cargo);
  const criteria = criteriaByType[criteriaType];

  const [form, setForm] = useState({
    candidato_id: '', data: '', hora: '', tipo: '', local_link: '',
    entrevistador_id: '', entrevistador_nome: '', duracao_min: 60, notas: '', recomendacao: '', proxima_fase: '',
  });
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        candidato_id: preSelectedCandidato || '',
        data: new Date().toISOString().split('T')[0],
        hora: '10:00',
      }));
      setScores({});
    }
  }, [open, preSelectedCandidato]);

  const pontuacaoFinal = useMemo(() => {
    let total = 0;
    criteria.forEach(c => {
      total += (scores[c.key] || 0) * c.peso;
    });
    return Math.round(total * 10); // 0-100
  }, [scores, criteria]);

  const classificacao = pontuacaoFinal >= 85 ? '🏆 Excelente' : pontuacaoFinal >= 70 ? '✅ Bom' : pontuacaoFinal >= 55 ? '⚠️ Razoável' : '❌ Insuficiente';

  const handleSubmit = () => {
    if (!form.candidato_id || !form.data) return;
    const dateTime = `${form.data}T${form.hora || '10:00'}:00`;

    const scorePayload: Record<string, number | null> = {};
    criteria.forEach(c => {
      scorePayload[c.key] = scores[c.key] || null;
    });

    createEntrevista.mutate({
      vaga_id: vagaId,
      candidato_id: form.candidato_id,
      data_hora: dateTime,
      tipo: form.tipo || null,
      local_link: form.local_link || null,
      duracao_min: form.duracao_min,
      entrevistador_id: form.entrevistador_id || null,
      entrevistador_nome: form.entrevistador_nome || null,
      estado: Object.keys(scores).length > 0 ? 'realizada' : 'agendada',
      ...scorePayload,
      pontuacao_final: Object.keys(scores).length > 0 ? pontuacaoFinal : null,
      classificacao: Object.keys(scores).length > 0 ? classificacao : null,
      notas: form.notas || null,
      recomendacao: form.recomendacao || null,
      proxima_fase: form.proxima_fase || null,
    } as any, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar / Realizar Entrevista</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Candidato *</Label>
              <Select value={form.candidato_id} onValueChange={v => setForm(f => ({ ...f, candidato_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{candidatos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Data *</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Hora *</Label><Input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Duração (min)</Label><Input type="number" value={form.duracao_min} onChange={e => setForm(f => ({ ...f, duracao_min: parseInt(e.target.value) || 60 }))} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Local / Link</Label><Input value={form.local_link} onChange={e => setForm(f => ({ ...f, local_link: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Entrevistador</Label>
              <Select value={form.entrevistador_id} onValueChange={v => {
                const emp = employees.find(e => e.id === v);
                setForm(f => ({ ...f, entrevistador_id: v, entrevistador_nome: emp?.full_name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Scoring */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Pontuação por Critérios (0–10)</h3>
              <div className="text-right">
                <p className="text-lg font-bold">{pontuacaoFinal}/100</p>
                <p className="text-xs">{classificacao}</p>
              </div>
            </div>
            {criteria.map(c => (
              <div key={c.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{c.label} <span className="text-muted-foreground">({(c.peso * 100).toFixed(0)}%)</span></span>
                  <span className="font-semibold">{scores[c.key] || 0}</span>
                </div>
                <Slider min={0} max={10} step={1} value={[scores[c.key] || 0]} onValueChange={([v]) => setScores(s => ({ ...s, [c.key]: v }))} />
              </div>
            ))}
          </div>

          <div className="space-y-2"><Label>Notas e Observações</Label><Textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={3} /></div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recomendação</Label>
              <Select value={form.recomendacao} onValueChange={v => setForm(f => ({ ...f, recomendacao: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{recomendacoes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.recomendacao === 'Aprovar para próxima fase' && (
              <div className="space-y-2">
                <Label>Próxima Fase</Label>
                <Select value={form.proxima_fase} onValueChange={v => setForm(f => ({ ...f, proxima_fase: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{proximasFases.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.candidato_id || createEntrevista.isPending}>
              {Object.keys(scores).length > 0 ? 'Guardar Entrevista Realizada' : 'Agendar Entrevista'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
