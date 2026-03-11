import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAvaliacoes, calcularMedias, getClassificacaoBadge, type Avaliacao } from '@/hooks/useAvaliacoes';
import { useEmployees } from '@/hooks/useEmployees';

const tiposAvaliacao = [
  { value: 'experimental_1', label: 'Experimental 1 (15 dias)' },
  { value: 'experimental_2', label: 'Experimental 2 (30 dias)' },
  { value: 'trimestral_1', label: 'Trimestral 1 (3 meses)' },
  { value: 'trimestral_2', label: 'Trimestral 2 (6 meses)' },
  { value: 'trimestral_3', label: 'Trimestral 3 (9 meses)' },
  { value: 'anual', label: 'Anual (12 meses)' },
  { value: 'extra', label: 'Avaliação Extra' },
];

const recomendacoes = [
  { value: 'manter', label: '✅ Manter na função' },
  { value: 'promover', label: '🏆 Propor promoção' },
  { value: 'transferir', label: '🔄 Transferência de área/cargo' },
  { value: 'melhoria', label: '📋 Plano de melhoria' },
  { value: 'desligamento', label: '⚠️ Não renovar / Desligamento' },
];

const scaleLabels = ['', '1 — Insatisfatório', '2 — Abaixo do esperado', '3 — Adequado', '4 — Bom', '5 — Excelente'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avaliacao: Avaliacao | null;
}

export function AvaliacaoFormDialog({ open, onOpenChange, avaliacao }: Props) {
  const { createAvaliacao, updateAvaliacao } = useAvaliacoes();
  const { employees } = useEmployees();

  const [form, setForm] = useState<Partial<Avaliacao>>({
    colaborador_id: '', tipo_avaliacao: '', data_avaliacao: new Date().toISOString().split('T')[0],
    estado: 'pendente',
  });

  useEffect(() => {
    if (avaliacao) {
      setForm({ ...avaliacao });
    } else {
      setForm({
        colaborador_id: '', colaborador_nome: '', avaliador_nome: '', tipo_avaliacao: '',
        data_avaliacao: new Date().toISOString().split('T')[0], data_prevista: '', estado: 'pendente',
        periodo_inicio: '', periodo_fim: '',
        qa_qualidade: undefined, qa_produtividade: undefined, qa_conhecimento: undefined, qa_resolucao: undefined,
        qb_pontualidade: undefined, qb_postura: undefined, qb_relacionamento: undefined, qb_comunicacao: undefined,
        qc_proatividade: undefined, qc_aprendizagem: undefined, qc_adaptacao: undefined,
        qd_seguranca: undefined, qd_cuidado_equip: undefined,
        pontos_fortes: '', areas_melhoria: '', objetivos_proximo: '', plano_desenvolvimento: '', observacoes: '',
        recomendacao: '', avaliador_confirmou: false, colaborador_notificado: false,
      });
    }
  }, [avaliacao, open]);

  const medias = useMemo(() => calcularMedias(form), [form]);
  const badge = getClassificacaoBadge(medias.classificacao);

  const setScore = (key: string, value: number) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const renderSlider = (key: string, label: string) => {
    const val = (form as any)[key] || 0;
    return (
      <div key={key} className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span className="font-semibold text-xs">{val > 0 ? scaleLabels[val] : '—'}</span>
        </div>
        <Slider min={0} max={5} step={1} value={[val]} onValueChange={([v]) => setScore(key, v)} />
      </div>
    );
  };

  const handleSubmit = () => {
    if (!form.colaborador_id || !form.tipo_avaliacao) return;
    const hasScores = form.qa_qualidade || form.qb_pontualidade || form.qc_proatividade || form.qd_seguranca;
    const payload = { ...form, estado: hasScores ? 'realizada' : 'pendente' };

    if (avaliacao) {
      updateAvaliacao.mutate({ id: avaliacao.id, ...payload } as any, { onSuccess: () => onOpenChange(false) });
    } else {
      createAvaliacao.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{avaliacao ? 'Editar Avaliação' : 'Nova Avaliação de Desempenho'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados gerais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={form.colaborador_id || ''} onValueChange={v => {
                const emp = employees.find(e => e.id === v);
                setForm(f => ({ ...f, colaborador_id: v, colaborador_nome: emp?.full_name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{employees.filter(e => e.status === 'active').map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Avaliador *</Label>
              <Select value={form.avaliador_id || ''} onValueChange={v => {
                const emp = employees.find(e => e.id === v);
                setForm(f => ({ ...f, avaliador_id: v, avaliador_nome: emp?.full_name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{employees.filter(e => e.status === 'active').map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Avaliação *</Label>
              <Select value={form.tipo_avaliacao || ''} onValueChange={v => setForm(f => ({ ...f, tipo_avaliacao: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{tiposAvaliacao.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Data da Avaliação</Label><Input type="date" value={form.data_avaliacao || ''} onChange={e => setForm(f => ({ ...f, data_avaliacao: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Data Prevista</Label><Input type="date" value={form.data_prevista || ''} onChange={e => setForm(f => ({ ...f, data_prevista: e.target.value }))} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Período Início</Label><Input type="date" value={form.periodo_inicio || ''} onChange={e => setForm(f => ({ ...f, periodo_inicio: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Período Fim</Label><Input type="date" value={form.periodo_fim || ''} onChange={e => setForm(f => ({ ...f, periodo_fim: e.target.value }))} /></div>
          </div>

          {/* Score summary */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <p className="text-sm text-muted-foreground">Pontuação Final</p>
              <p className="text-3xl font-bold">{medias.pontuacao_final.toFixed(2)}</p>
            </div>
            <Badge className={`text-sm px-3 py-1.5 ${badge.color}`}>{badge.emoji} {medias.classificacao}</Badge>
          </div>

          {/* Grupo A */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Grupo A — Desempenho na Função (40%)</h3>
            <p className="text-xs text-muted-foreground">Média: {medias.media_grupo_a.toFixed(2)}</p>
            {renderSlider('qa_qualidade', 'Qualidade do trabalho realizado')}
            {renderSlider('qa_produtividade', 'Produtividade e cumprimento de prazos')}
            {renderSlider('qa_conhecimento', 'Conhecimento técnico da função')}
            {renderSlider('qa_resolucao', 'Resolução de problemas')}
          </div>

          {/* Grupo B */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Grupo B — Comportamento e Atitude (30%)</h3>
            <p className="text-xs text-muted-foreground">Média: {medias.media_grupo_b.toFixed(2)}</p>
            {renderSlider('qb_pontualidade', 'Pontualidade e assiduidade')}
            {renderSlider('qb_postura', 'Postura profissional')}
            {renderSlider('qb_relacionamento', 'Relacionamento com a equipa')}
            {renderSlider('qb_comunicacao', 'Comunicação')}
          </div>

          {/* Grupo C */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Grupo C — Iniciativa e Desenvolvimento (20%)</h3>
            <p className="text-xs text-muted-foreground">Média: {medias.media_grupo_c.toFixed(2)}</p>
            {renderSlider('qc_proatividade', 'Proatividade e iniciativa')}
            {renderSlider('qc_aprendizagem', 'Capacidade de aprendizagem')}
            {renderSlider('qc_adaptacao', 'Adaptação a novas situações')}
          </div>

          {/* Grupo D */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Grupo D — Segurança e Conformidade (10%)</h3>
            <p className="text-xs text-muted-foreground">Média: {medias.media_grupo_d.toFixed(2)}</p>
            {renderSlider('qd_seguranca', 'Cumprimento das normas de segurança')}
            {renderSlider('qd_cuidado_equip', 'Cuidado com equipamentos e materiais')}
          </div>

          {/* Qualitativos */}
          <div className="space-y-4">
            <div className="space-y-2"><Label>Pontos Fortes</Label><Textarea value={form.pontos_fortes || ''} onChange={e => setForm(f => ({ ...f, pontos_fortes: e.target.value }))} rows={2} /></div>
            <div className="space-y-2"><Label>Áreas a Melhorar</Label><Textarea value={form.areas_melhoria || ''} onChange={e => setForm(f => ({ ...f, areas_melhoria: e.target.value }))} rows={2} /></div>
            <div className="space-y-2"><Label>Objetivos para o Próximo Período</Label><Textarea value={form.objetivos_proximo || ''} onChange={e => setForm(f => ({ ...f, objetivos_proximo: e.target.value }))} rows={2} /></div>
            <div className="space-y-2"><Label>Plano de Desenvolvimento</Label><Textarea value={form.plano_desenvolvimento || ''} onChange={e => setForm(f => ({ ...f, plano_desenvolvimento: e.target.value }))} rows={2} /></div>
            <div className="space-y-2"><Label>Observações Gerais</Label><Textarea value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
          </div>

          {/* Recomendação */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm">Decisão / Recomendação</h3>
            <Select value={form.recomendacao || ''} onValueChange={v => setForm(f => ({ ...f, recomendacao: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar recomendação" /></SelectTrigger>
              <SelectContent>{recomendacoes.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>

            {form.recomendacao === 'promover' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Novo Cargo</Label><Input value={form.novo_cargo || ''} onChange={e => setForm(f => ({ ...f, novo_cargo: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Nova Remuneração (€)</Label><Input type="number" value={form.nova_remuneracao || ''} onChange={e => setForm(f => ({ ...f, nova_remuneracao: parseFloat(e.target.value) || null }))} /></div>
                <div className="space-y-2"><Label>Data Efetivação</Label><Input type="date" value={form.data_efetivacao || ''} onChange={e => setForm(f => ({ ...f, data_efetivacao: e.target.value }))} /></div>
              </div>
            )}

            {form.recomendacao === 'melhoria' && (
              <div className="space-y-4">
                <div className="space-y-2"><Label>Objetivos de Melhoria</Label><Textarea value={form.obj_melhoria || ''} onChange={e => setForm(f => ({ ...f, obj_melhoria: e.target.value }))} rows={2} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Prazo de Revisão</Label><Input type="date" value={form.prazo_revisao || ''} onChange={e => setForm(f => ({ ...f, prazo_revisao: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Responsável pelo Acompanhamento</Label><Input value={form.responsavel_acomp || ''} onChange={e => setForm(f => ({ ...f, responsavel_acomp: e.target.value }))} /></div>
                </div>
              </div>
            )}

            {form.recomendacao === 'desligamento' && (
              <div className="space-y-2"><Label>Motivo Detalhado</Label><Textarea value={form.motivo_desligamento || ''} onChange={e => setForm(f => ({ ...f, motivo_desligamento: e.target.value }))} rows={3} /></div>
            )}
          </div>

          {/* Validação */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm">Assinatura e Validação</h3>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.avaliador_confirmou || false} onCheckedChange={v => setForm(f => ({ ...f, avaliador_confirmou: !!v }))} />
              <Label className="text-sm">Confirmo que esta avaliação foi realizada e é fidedigna</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.colaborador_notificado || false} onCheckedChange={v => setForm(f => ({ ...f, colaborador_notificado: !!v }))} />
              <Label className="text-sm">Colaborador tomou conhecimento da avaliação</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data de Comunicação</Label><Input type="date" value={form.data_comunicacao || ''} onChange={e => setForm(f => ({ ...f, data_comunicacao: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Observações do Colaborador</Label><Textarea value={form.obs_colaborador || ''} onChange={e => setForm(f => ({ ...f, obs_colaborador: e.target.value }))} rows={2} /></div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.colaborador_id || !form.tipo_avaliacao || createAvaliacao.isPending || updateAvaliacao.isPending}>
              {avaliacao ? 'Guardar' : 'Criar Avaliação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
