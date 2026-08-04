import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/use-toast';
import type { Apontamento } from '@/types/agency';

const TABLE = 'ag_apontamentos' as any;
const CRONOMETRO_KEY = 'ag_cronometro_ativo';

function mapApontamento(r: any): Apontamento {
  return {
    id: r.id, empresaId: r.empresa_id, projetoId: r.projeto_id,
    jobId: r.job_id, tarefaId: r.tarefa_id,
    utilizadorId: r.utilizador_id, utilizadorNome: r.utilizador_nome,
    employeeId: r.employee_id, data: r.data,
    inicio: r.inicio, fim: r.fim, minutos: r.minutos,
    descricao: r.descricao, faturavel: r.faturavel,
    custoHoraSnap: r.custo_hora_snap != null ? Number(r.custo_hora_snap) : null,
  };
}

/**
 * O cronómetro em curso vive no localStorage, não em memória.
 * Um criativo a trabalhar 2 horas não pode perder o registo por ter recarregado
 * a página — e é exatamente isso que aconteceria com estado só em React.
 */
export interface CronometroAtivo {
  projetoId: string;
  jobId: string | null;
  tarefaId: string | null;
  rotulo: string;
  inicioISO: string;
}

export function useCronometro() {
  const [ativo, setAtivo] = useState<CronometroAtivo | null>(() => {
    try {
      const raw = localStorage.getItem(CRONOMETRO_KEY);
      return raw ? JSON.parse(raw) as CronometroAtivo : null;
    } catch { return null; }
  });
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ativo]);

  const iniciar = useCallback((c: Omit<CronometroAtivo, 'inicioISO'>) => {
    const novo: CronometroAtivo = { ...c, inicioISO: new Date().toISOString() };
    localStorage.setItem(CRONOMETRO_KEY, JSON.stringify(novo));
    setAtivo(novo);
    setAgora(Date.now());
  }, []);

  const parar = useCallback((): { inicio: string; fim: string; minutos: number } | null => {
    if (!ativo) return null;
    const inicio = ativo.inicioISO;
    const fim = new Date().toISOString();
    const minutos = Math.max(1, Math.round((Date.parse(fim) - Date.parse(inicio)) / 60000));
    localStorage.removeItem(CRONOMETRO_KEY);
    setAtivo(null);
    return { inicio, fim, minutos };
  }, [ativo]);

  const cancelar = useCallback(() => {
    localStorage.removeItem(CRONOMETRO_KEY);
    setAtivo(null);
  }, []);

  const decorridoSegundos = ativo
    ? Math.max(0, Math.floor((agora - Date.parse(ativo.inicioISO)) / 1000))
    : 0;

  return { ativo, iniciar, parar, cancelar, decorridoSegundos };
}

export function useApontamentos(filtro?: { projetoId?: string; jobId?: string; apenasMeus?: boolean }) {
  const { empresa } = useEmpresa();
  const { authId, nome } = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  /** liberty_utilizadores.id + employee_id do utilizador autenticado. */
  const { data: eu } = useQuery({
    queryKey: ['ag_eu', authId, empresa?.id],
    enabled: !!authId,
    queryFn: async () => {
      const { data: u } = await (supabase.from('liberty_utilizadores' as any) as any)
        .select('id, nome').eq('auth_user_id', authId).maybeSingle();
      if (!u) return null;
      const { data: emp } = await (supabase.from('employees' as any) as any)
        .select('id').eq('utilizador_id', u.id).eq('empresa_id', empresa?.id).maybeSingle();
      return { utilizadorId: u.id as string, nome: (u.nome as string) || nome, employeeId: (emp?.id as string) ?? null };
    },
  });

  const { data: apontamentos = [], isLoading } = useQuery<Apontamento[]>({
    queryKey: ['ag_apontamentos', empresa?.id, filtro?.projetoId, filtro?.jobId, filtro?.apenasMeus, eu?.utilizadorId],
    enabled: !!empresa?.id,
    queryFn: async () => {
      let q = (supabase.from(TABLE) as any).select('*').eq('empresa_id', empresa!.id);
      if (filtro?.projetoId) q = q.eq('projeto_id', filtro.projetoId);
      if (filtro?.jobId)     q = q.eq('job_id', filtro.jobId);
      if (filtro?.apenasMeus && eu?.utilizadorId) q = q.eq('utilizador_id', eu.utilizadorId);
      const { data, error } = await q.order('data', { ascending: false }).limit(500);
      if (error) throw error;
      return (data || []).map(mapApontamento);
    },
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['ag_apontamentos'] });
    qc.invalidateQueries({ queryKey: ['ag_projetos'] });
    qc.invalidateQueries({ queryKey: ['ag_projeto'] });
  };

  /**
   * Custo-hora do colaborador, CONGELADO no apontamento.
   * Se fosse derivado do salário atual, um aumento reescrevia retroativamente
   * a margem de todos os projetos passados.
   *
   * NOTA: por agora deriva de employees.monthly_salary / horas contratadas.
   * A fórmula com encargos reais (TSU em PT, INSS/FGTS no BR) fica na tabela
   * ag_encargos_laborais e será aplicada quando o utilizador confirmar as taxas
   * com o contabilista — ver ag_encargos_laborais.
   */
  const calcularCustoHora = async (): Promise<number | null> => {
    if (!eu?.employeeId) return null;
    const { data } = await (supabase.from('employees' as any) as any)
      .select('monthly_salary, daily_hours').eq('id', eu.employeeId).maybeSingle();
    if (!data?.monthly_salary) return null;
    const horasMes = (Number(data.daily_hours) || 8) * 22;
    return horasMes > 0 ? Number((Number(data.monthly_salary) / horasMes).toFixed(2)) : null;
  };

  const registar = useMutation({
    mutationFn: async (a: {
      projetoId: string; jobId?: string | null; tarefaId?: string | null;
      minutos: number; descricao?: string; data?: string;
      inicio?: string | null; fim?: string | null; faturavel?: boolean;
    }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const custo = await calcularCustoHora();
      const { error } = await (supabase.from(TABLE) as any).insert({
        empresa_id: empresa.id,
        projeto_id: a.projetoId,
        job_id: a.jobId ?? null,
        tarefa_id: a.tarefaId ?? null,
        utilizador_id: eu?.utilizadorId ?? null,
        utilizador_nome: eu?.nome ?? nome,
        employee_id: eu?.employeeId ?? null,
        data: a.data ?? new Date().toISOString().split('T')[0],
        inicio: a.inicio ?? null,
        fim: a.fim ?? null,
        minutos: a.minutos,
        descricao: a.descricao || null,
        faturavel: a.faturavel ?? true,
        custo_hora_snap: custo,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidar(); toast({ title: 'Horas registadas' }); },
    onError: (e: any) => toast({ title: 'Erro ao registar horas', description: e.message, variant: 'destructive' }),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(TABLE) as any)
        .delete().eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidar(); toast({ title: 'Registo eliminado' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const totalMinutos = apontamentos.reduce((s, a) => s + a.minutos, 0);
  const custoTotal = apontamentos.reduce((s, a) => s + (a.minutos / 60) * (a.custoHoraSnap ?? 0), 0);

  return { apontamentos, isLoading, registar, eliminar, totalMinutos, custoTotal, eu: eu ?? null };
}
