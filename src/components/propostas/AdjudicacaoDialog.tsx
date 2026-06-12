import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildPropostaAdjudicadaEmail } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/sendEmail';
import { Proposta } from '@/types/proposta';
import { PpFormRow, PP_FASES, defaultPpRows, PP_MODELOS_SISTEMA, PpModeloLinha } from '@/types/planoPagamento';
import { usePlanoPagamentosModelos } from '@/hooks/usePlanoPagamentosModelos';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { usePlanoPagamentos } from '@/hooks/usePlanoPagamentos';
import { usePropostas } from '@/hooks/usePropostas';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useEmpresa } from '@/contexts/EmpresaContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Handshake, Plus, Trash2, AlertCircle, Loader2, BookmarkPlus, BookmarkCheck, ChevronDown, X } from 'lucide-react';
import { formatEUR } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { emptyOsForm } from '@/types/ordemServico';

interface AdjudicacaoDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proposta: Proposta | null;
  onComplete: (osId?: string) => void;
}

export function AdjudicacaoDialog({ open, onOpenChange, proposta, onComplete }: AdjudicacaoDialogProps) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const { createBatch } = usePlanoPagamentos(empresa?.id);
  const { updateEstado: updatePropostaEstado } = usePropostas();
  const { createOrdem } = useOrdensServico(empresa?.id);
  const { modelos, saveModelo, deleteModelo } = usePlanoPagamentosModelos(empresa?.id);

  const [rows, setRows] = useState<PpFormRow[]>([]);
  const [criarOs, setCriarOs] = useState(true);
  const [osTitulo, setOsTitulo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [nomeNovoModelo, setNomeNovoModelo] = useState('');
  const [showSaveModelo, setShowSaveModelo] = useState(false);

  const applyModelo = (linhas: PpModeloLinha[]) => {
    const total = proposta?.totalComIva ?? 0;
    setRows(linhas.map((l, i) => ({
      tempId: `m${i}`,
      descricao: l.descricao,
      percentagem: String(l.percentagem),
      valor: ((total * l.percentagem) / 100).toFixed(2),
      fase: l.fase,
      dataPrevista: '',
    })));
  };

  const handleSaveModelo = async () => {
    if (!nomeNovoModelo.trim()) return;
    const ok = await saveModelo(
      nomeNovoModelo.trim(),
      rows.map(r => ({
        descricao: r.descricao,
        percentagem: parseFloat(r.percentagem) || 0,
        fase: r.fase,
      })),
    );
    if (ok) {
      setNomeNovoModelo('');
      setShowSaveModelo(false);
    }
  };

  useEffect(() => {
    if (open && proposta) {
      setRows(defaultPpRows(proposta.totalComIva || 0));
      setOsTitulo(proposta.titulo ?? '');
      setCriarOs(true);
    }
  }, [open, proposta]);

  if (!proposta) return null;

  const total = proposta.totalComIva || 0;

  const updateRow = (id: string, patch: Partial<PpFormRow>) => {
    setRows(prev => prev.map(r => r.tempId === id ? { ...r, ...patch } : r));
  };

  const onPctChange = (id: string, pct: string) => {
    const n = parseFloat(pct) || 0;
    const valor = ((total * n) / 100).toFixed(2);
    updateRow(id, { percentagem: pct, valor });
  };

  const onValorChange = (id: string, valor: string) => {
    const n = parseFloat(valor) || 0;
    const pct = total > 0 ? ((n / total) * 100).toFixed(1) : '0';
    updateRow(id, { valor, percentagem: pct });
  };

  const addRow = () => {
    setRows(prev => [...prev, {
      tempId: Date.now().toString(),
      descricao: '', percentagem: '0', valor: '0',
      fase: 'outros', dataPrevista: '',
    }]);
  };

  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.tempId !== id));

  const totalValor = rows.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
  const totalPct = rows.reduce((s, r) => s + (parseFloat(r.percentagem) || 0), 0);
  const pctInvalid = totalPct > 100 || totalPct < 99.9;

  const handleConfirm = async () => {
    if (rows.length === 0) {
      toast({ title: 'Plano vazio', description: 'Adicione pelo menos uma prestação.', variant: 'destructive' });
      return;
    }
    if (rows.some(r => (parseFloat(r.valor) || 0) <= 0)) {
      toast({ title: 'Valores inválidos', description: 'Todas as prestações devem ter valor > 0.', variant: 'destructive' });
      return;
    }
    if (criarOs && !osTitulo.trim()) {
      toast({ title: 'Título da OS obrigatório', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await updatePropostaEstado(proposta.id, 'aceite');

      await createBatch(rows.map(r => ({
        empresaId: empresa!.id,
        propostaId: proposta.id,
        osId: null,
        descricao: r.descricao || PP_FASES[r.fase].label,
        percentagem: parseFloat(r.percentagem) || null,
        valor: parseFloat(r.valor) || 0,
        fase: r.fase,
        estado: 'pendente',
        dataPrevista: r.dataPrevista || null,
      })));

      let osId: string | undefined;
      if (criarOs) {
        const os = await createOrdem({
          ...emptyOsForm,
          clienteId: proposta.clienteId ?? '',
          clienteNome: proposta.clienteNome ?? '',
          propostaId: proposta.id,
          estado: 'nova',
          prioridade: 'normal',
          titulo: osTitulo,
          descricao: (proposta as any).descricaoGeral ?? '',
          dataAbertura: new Date().toISOString().split('T')[0],
          valorEstimado: total.toString(),
        });
        osId = os?.id;
      }

      // Email automático ao cliente — não bloqueia em caso de falha
      if (proposta.clienteId) {
        try {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('email')
            .eq('id', proposta.clienteId)
            .eq('empresa_id', empresa!.id)
            .single();
          if (cliente?.email) {
            const { subject, html, tipo } = buildPropostaAdjudicadaEmail({
              numeroProposta:     proposta.numeroProposta,
              clienteNome:        proposta.clienteNome || '',
              totalComIva:        proposta.totalComIva,
              dataEmissao:        proposta.dataEmissao,
              titulo:             proposta.titulo || undefined,
              duracao:            proposta.duracao || undefined,
              condicoesPagamento: proposta.condicoesPagamento || undefined,
              observacoes:        proposta.observacoes || undefined,
            }, empresa);
            const emailResult = await sendEmail({ to: cliente.email, subject, html, empresa_id: empresa?.id, tipo });
            if (emailResult.ok) {
              toast({ title: 'Email de adjudicação enviado', description: `Para: ${cliente.email}` });
            }
          }
        } catch {
          // Email failure não desfaz a adjudicação
        }
      }

      onComplete(osId);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-green-600" />
            Adjudicação — {proposta.numeroProposta}
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Aceite</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Resumo */}
        <div className="rounded-md bg-muted p-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Cliente</div>
            <div className="font-medium">{proposta.clienteNome}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total c/ IVA</div>
            <div className="font-bold">{formatEUR(total)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Condições</div>
            <div className="font-medium">{(proposta as any).condicoesPagamento || '—'}</div>
          </div>
        </div>

        {/* Modelos de Plano de Pagamentos */}
        <div className="rounded-md bg-muted/50 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Modelo:</Label>
            <Select
              onValueChange={(id) => {
                const all = [...PP_MODELOS_SISTEMA, ...modelos];
                const m = all.find((x: any) => x.id === id);
                if (m) applyModelo(m.linhas);
              }}
            >
              <SelectTrigger className="h-8 flex-1 max-w-md">
                <SelectValue placeholder="Seleccionar modelo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Modelos do Sistema</SelectLabel>
                  {PP_MODELOS_SISTEMA.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectGroup>
                {modelos.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Modelos da Empresa</SelectLabel>
                    {modelos.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span>{m.nome}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteModelo(m.id); }}
                            className="text-destructive hover:opacity-70"
                            aria-label="Eliminar modelo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>
          <Popover open={showSaveModelo} onOpenChange={setShowSaveModelo}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <BookmarkPlus className="h-4 w-4 mr-1" /> Guardar modelo
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-2" align="end">
              <Label className="text-xs">Nome do modelo</Label>
              <Input
                placeholder="Nome do modelo"
                value={nomeNovoModelo}
                onChange={(e) => setNomeNovoModelo(e.target.value)}
              />
              <Button type="button" size="sm" className="w-full" onClick={handleSaveModelo}>
                <BookmarkCheck className="h-4 w-4 mr-1" /> Guardar
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Plano de Pagamentos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Plano de Pagamentos</h3>
            <Button type="button" variant="ghost" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Prestação
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="text-left p-2">Descrição</th>
                  <th className="text-left p-2 w-32">Fase</th>
                  <th className="text-right p-2 w-20">%</th>
                  <th className="text-right p-2 w-28">Valor (€)</th>
                  <th className="text-left p-2 w-36">Data Prevista</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.tempId} className="border-t">
                    <td className="p-1">
                      <Input value={r.descricao} onChange={e => updateRow(r.tempId, { descricao: e.target.value })} className="h-8" />
                    </td>
                    <td className="p-1">
                      <Select value={r.fase} onValueChange={(v: any) => updateRow(r.tempId, { fase: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PP_FASES).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <Input type="number" min={0} max={100} step={0.1} value={r.percentagem}
                        onChange={e => onPctChange(r.tempId, e.target.value)} className="h-8 text-right" />
                    </td>
                    <td className="p-1">
                      <Input type="number" min={0} step={0.01} value={r.valor}
                        onChange={e => onValorChange(r.tempId, e.target.value)} className="h-8 text-right" />
                    </td>
                    <td className="p-1">
                      <Input type="date" value={r.dataPrevista}
                        onChange={e => updateRow(r.tempId, { dataPrevista: e.target.value })} className="h-8" />
                    </td>
                    <td className="p-1 text-center">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => removeRow(r.tempId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 border-t">
                <tr>
                  <td className="p-2 font-semibold" colSpan={2}>Total</td>
                  <td className="p-2 text-right font-semibold">{totalPct.toFixed(1)}%</td>
                  <td className="p-2 text-right font-semibold">{formatEUR(totalValor)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {pctInvalid && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {totalPct.toFixed(1)}% — deve ser 100%
            </Badge>
          )}
        </div>

        <Separator />

        {/* OS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="criarOs" className="cursor-pointer">
              Criar Ordem de Serviço automaticamente
            </Label>
            <Switch id="criarOs" checked={criarOs} onCheckedChange={setCriarOs} />
          </div>
          {criarOs && (
            <div className="space-y-1">
              <Label>Título da OS</Label>
              <Input value={osTitulo} onChange={e => setOsTitulo(e.target.value)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Adjudicação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AdjudicacaoDialog;
