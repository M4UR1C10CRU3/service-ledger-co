import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import type { ContratoAvenca, AvencaConsumo, AvencaEstado } from '@/types/agency';

const T_AV = 'ag_contratos_avenca' as any;
const T_PER = 'ag_avenca_periodos' as any;
const V_CONSUMO = 'ag_v_avenca_consumo' as any;

/**
 * Contratos de avença — o modelo de receita dominante nas agências
 * portuguesas. O erro mais caro é a avença que consome o dobro das horas
 * contratadas sem ninguém dar por isso; daí a vista de consumo.
 */
export function useAvencas() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: avencas = [], isLoading } = useQuery<AvencaConsumo[]>({
    queryKey: ['ag_avencas', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      // A vista traz contratadas vs consumidas; o contrato traz o resto.
      const [{ data: base, error: e1 }, { data: consumo, error: e2 }] = await Promise.all([
        (supabase.from(T_AV) as any).select('*').eq('empresa_id', empresa!.id).order('designacao'),
        (supabase.from(V_CONSUMO) as any).select('*').eq('empresa_id', empresa!.id),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const porId = Object.fromEntries((consumo || []).map((c: any) => [c.contrato_id, c]));
      return (base || []).map((r: any) => {
        const c = porId[r.id];
        const horasContratadas = r.horas_contratadas != null ? Number(r.horas_contratadas) : null;
        const horasConsumidas = c?.horas_consumidas != null ? Number(c.horas_consumidas) : 0;
        return {
          id: r.id, empresaId: r.empresa_id,
          clienteId: r.cliente_id, clienteNome: r.cliente_nome,
          designacao: r.designacao,
          valorMensal: Number(r.valor_mensal),
          horasContratadas,
          periodicidade: r.periodicidade,
          dataInicio: r.data_inicio, dataFim: r.data_fim,
          mesesDuracao: r.meses_duracao,
          estado: r.estado, observacoes: r.observacoes,
          nucleoId: r.nucleo_id ?? null,
          horasConsumidas,
          horasSaldo: horasContratadas != null ? horasContratadas - horasConsumidas : null,
        } as AvencaConsumo;
      });
    },
  });

  const inval = () => qc.invalidateQueries({ queryKey: ['ag_avencas'] });

  const guardar = useMutation({
    mutationFn: async (a: Partial<ContratoAvenca> & { designacao: string; valorMensal: number; dataInicio: string }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const row = {
        empresa_id: empresa.id,
        cliente_id: a.clienteId ?? null,
        cliente_nome: a.clienteNome || null,
        designacao: a.designacao.trim(),
        valor_mensal: a.valorMensal,
        horas_contratadas: a.horasContratadas ?? null,
        periodicidade: a.periodicidade || 'mensal',
        data_inicio: a.dataInicio,
        data_fim: a.dataFim || null,
        meses_duracao: a.mesesDuracao ?? null,
        estado: a.estado || 'ativo',
        observacoes: a.observacoes || null,
        // Só o Labs envia o núcleo; os outros verticais não tocam na coluna.
        ...(a.nucleoId !== undefined ? { nucleo_id: a.nucleoId } : {}),
      };
      if (a.id) {
        const { data, error } = await (supabase.from(T_AV) as any)
          .update(row).eq('id', a.id).eq('empresa_id', empresa.id).select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('A base de dados recusou a alteração.');
        return a.id;
      }
      const { data, error } = await (supabase.from(T_AV) as any).insert(row).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => { inval(); toast({ title: 'Avença guardada' }); },
    onError: (e: any) => toast({ title: 'Erro ao guardar avença', description: e.message, variant: 'destructive' }),
  });

  /**
   * Gera os períodos de faturação recorrentes (o "3/12" do Operand).
   * Substitui os previstos; nunca mexe nos já faturados ou recebidos.
   */
  const gerarPeriodos = useMutation({
    mutationFn: async (contratoId: string) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const c = avencas.find(x => x.id === contratoId);
      if (!c) throw new Error('Avença não encontrada.');
      const meses = c.mesesDuracao ?? 12;
      const passo = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 }[c.periodicidade] ?? 1;

      await (supabase.from(T_PER) as any)
        .delete().eq('contrato_id', contratoId).eq('empresa_id', empresa.id).eq('estado', 'previsto');

      const linhas: any[] = [];
      const inicio = new Date(c.dataInicio);
      let n = 1;
      for (let m = 0; m < meses; m += passo) {
        const pi = new Date(inicio); pi.setMonth(pi.getMonth() + m);
        const pf = new Date(pi);     pf.setMonth(pf.getMonth() + passo); pf.setDate(pf.getDate() - 1);
        linhas.push({
          empresa_id: empresa.id, contrato_id: contratoId, numero: n++,
          periodo_inicio: pi.toISOString().split('T')[0],
          periodo_fim: pf.toISOString().split('T')[0],
          valor: c.valorMensal * passo,
          horas_contratadas: c.horasContratadas != null ? c.horasContratadas * passo : null,
          estado: 'previsto',
        });
      }
      const { error } = await (supabase.from(T_PER) as any).insert(linhas);
      if (error) throw error;
      return linhas.length;
    },
    onSuccess: (n) => { inval(); toast({ title: `${n} períodos de faturação gerados` }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const fetchPeriodos = async (contratoId: string) => {
    const { data, error } = await (supabase.from(T_PER) as any)
      .select('*').eq('contrato_id', contratoId).eq('empresa_id', empresa!.id).order('numero');
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id, numero: r.numero,
      periodoInicio: r.periodo_inicio, periodoFim: r.periodo_fim,
      valor: Number(r.valor),
      horasContratadas: r.horas_contratadas != null ? Number(r.horas_contratadas) : null,
      estado: r.estado as 'previsto' | 'faturado' | 'recebido',
    }));
  };

  const mudarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: AvencaEstado }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(T_AV) as any)
        .update({ estado }).eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: inval,
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { avencas, isLoading, guardar, gerarPeriodos, fetchPeriodos, mudarEstado };
}
