import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Recursos Humanos › Acolhimento (onboarding) e período experimental.
 *
 * Um acolhimento nasce quando um colaborador entra (de um candidato aprovado ou de uma
 * admissão direta). Traz uma checklist por fases com prazos relativos à data de entrada
 * e agenda as duas avaliações do período experimental em rh_avaliacoes.
 */

export type FaseAcolhimento = 'antes_entrada' | 'primeiro_dia' | 'primeira_semana' | 'primeiro_mes' | 'fim_periodo';
export const FASE_LABEL: Record<FaseAcolhimento, string> = {
  antes_entrada: 'Antes da entrada',
  primeiro_dia: 'Primeiro dia',
  primeira_semana: 'Primeira semana',
  primeiro_mes: 'Primeiro mês',
  fim_periodo: 'Fim do período experimental',
};
export const FASE_ORDEM: FaseAcolhimento[] = ['antes_entrada', 'primeiro_dia', 'primeira_semana', 'primeiro_mes', 'fim_periodo'];

export type EstadoAcolhimento = 'em_curso' | 'concluido' | 'cessado';
export const ESTADO_ACOLHIMENTO_LABEL: Record<EstadoAcolhimento, string> = { em_curso: 'Em curso', concluido: 'Concluído', cessado: 'Cessado' };

export interface Acolhimento {
  id: string;
  empresa_id: string;
  colaborador_id: string;
  candidato_id: string | null;
  vaga_id: string | null;
  cargo: string | null;
  data_entrada: string;
  periodo_experimental_dias: number;
  fim_periodo_experimental: string;
  responsavel_nome: string | null;
  tutor_nome: string | null;
  estado: EstadoAcolhimento;
  decisao: 'continuidade' | 'cessacao' | null;
  decisao_em: string | null;
  notas: string | null;
  criado_em: string;
  atualizado_em: string;
  // juntado no carregamento
  colaborador_nome?: string;
  itens_total?: number;
  itens_feitos?: number;
  proximo_prazo?: string | null;
  em_atraso?: number;
}

export interface ItemAcolhimento {
  id: string;
  empresa_id: string;
  acolhimento_id: string;
  fase: FaseAcolhimento;
  descricao: string;
  responsavel: string | null;
  prazo: string | null;
  obrigatorio: boolean;
  feito: boolean;
  feito_em: string | null;
  feito_por_nome: string | null;
  posicao: number;
  notas: string | null;
}

/** Modelo da checklist. `dia` é relativo à data de entrada (negativo = antes). 'fim' = fim do período experimental. */
export const MODELO_ACOLHIMENTO: { fase: FaseAcolhimento; descricao: string; responsavel: string; dia: number | 'fim'; obrigatorio?: boolean }[] = [
  // antes da entrada
  { fase: 'antes_entrada', descricao: 'Contrato de trabalho assinado (tipo, categoria, retribuição, período experimental)', responsavel: 'Gerência', dia: -3 },
  { fase: 'antes_entrada', descricao: 'Comunicação de admissão à Segurança Social (Segurança Social Direta) — até ao dia anterior ao início', responsavel: 'RH', dia: -1 },
  { fase: 'antes_entrada', descricao: 'Inclusão na apólice de seguro de acidentes de trabalho', responsavel: 'RH', dia: -1 },
  { fase: 'antes_entrada', descricao: 'Marcação do exame de admissão de medicina do trabalho', responsavel: 'RH', dia: -3 },
  { fase: 'antes_entrada', descricao: 'Recolha de documentos: CC/NIF/NISS, IBAN, declaração IRS (dependentes), certificado de habilitações', responsavel: 'RH', dia: -3 },
  { fase: 'antes_entrada', descricao: 'Criação de acessos: e-mail, Clariza, PHC, telefone/extensão', responsavel: 'Gerência', dia: -1 },
  { fase: 'antes_entrada', descricao: 'Posto de trabalho e material preparados', responsavel: 'Responsável', dia: -1 },
  { fase: 'antes_entrada', descricao: 'Tutor de integração nomeado e informado', responsavel: 'Gerência', dia: -3 },
  // primeiro dia
  { fase: 'primeiro_dia', descricao: 'Boas-vindas, apresentação à equipa e visita às instalações', responsavel: 'Responsável', dia: 0 },
  { fase: 'primeiro_dia', descricao: 'Entrega do manual de acolhimento, regulamento interno e política de privacidade (com registo de receção)', responsavel: 'RH', dia: 0 },
  { fase: 'primeiro_dia', descricao: 'Formação inicial de segurança e saúde no trabalho (art. 20.º da Lei 102/2009); entrega de EPI se aplicável', responsavel: 'TSHST', dia: 0 },
  { fase: 'primeiro_dia', descricao: 'Registo no controlo de ponto e comunicação do horário', responsavel: 'RH', dia: 0 },
  { fase: 'primeiro_dia', descricao: 'Explicação da função, objetivos do período experimental e critérios de avaliação', responsavel: 'Responsável', dia: 0 },
  // primeira semana
  { fase: 'primeira_semana', descricao: 'Formação nos sistemas: Clariza, PHC, arquivo e circuitos de documentos', responsavel: 'Tutor', dia: 5 },
  { fase: 'primeira_semana', descricao: 'Apresentação a clientes, fornecedores e parceiros com quem vai lidar', responsavel: 'Responsável', dia: 5 },
  { fase: 'primeira_semana', descricao: 'Reunião de fim de semana com o tutor: dúvidas e ajustes', responsavel: 'Tutor', dia: 7 },
  // primeiro mês
  { fase: 'primeiro_mes', descricao: 'Ficha de aptidão de medicina do trabalho recebida e arquivada', responsavel: 'RH', dia: 30 },
  { fase: 'primeiro_mes', descricao: 'Ponto de situação com o responsável; objetivos ajustados', responsavel: 'Responsável', dia: 30 },
  { fase: 'primeiro_mes', descricao: 'Avaliação experimental 1 registada em Avaliações', responsavel: 'Responsável', dia: 30 },
  // fim do período
  { fase: 'fim_periodo', descricao: 'Avaliação experimental 2 registada em Avaliações', responsavel: 'Responsável', dia: 'fim' },
  { fase: 'fim_periodo', descricao: 'Decisão de continuidade ou cessação (denúncia no período experimental exige aviso prévio de 7 dias se o período durou mais de 60 dias — art. 114.º CT)', responsavel: 'Gerência', dia: 'fim' },
  { fase: 'fim_periodo', descricao: 'Decisão comunicada ao colaborador e registada no processo', responsavel: 'RH', dia: 'fim' },
];

const addDias = (iso: string, dias: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
const hoje = () => new Date().toISOString().slice(0, 10);

export function useAcolhimentos() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const [acolhimentos, setAcolhimentos] = useState<Acolhimento[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!empresa?.id) { setAcolhimentos([]); setLoading(false); return; }
    setLoading(true);
    const [{ data: acs, error }, { data: itens }, { data: emps }] = await Promise.all([
      (supabase.from('rh_acolhimentos' as any) as any).select('*').eq('empresa_id', empresa.id).order('data_entrada', { ascending: false }),
      (supabase.from('rh_acolhimento_itens' as any) as any).select('acolhimento_id, feito, prazo, obrigatorio').eq('empresa_id', empresa.id),
      supabase.from('employees').select('id, full_name').eq('empresa_id', empresa.id),
    ]);
    if (error) { toast({ title: 'Não foi possível carregar os acolhimentos', description: error.message, variant: 'destructive' }); setLoading(false); return; }
    const nome = new Map((emps ?? []).map((e: any) => [e.id, e.full_name]));
    const h = hoje();
    const lista = ((acs ?? []) as Acolhimento[]).map(a => {
      const meus = ((itens ?? []) as any[]).filter(i => i.acolhimento_id === a.id);
      const pendentes = meus.filter(i => !i.feito);
      const prazos = pendentes.map(i => i.prazo).filter(Boolean).sort();
      return {
        ...a,
        colaborador_nome: nome.get(a.colaborador_id) ?? '—',
        itens_total: meus.length,
        itens_feitos: meus.length - pendentes.length,
        proximo_prazo: prazos[0] ?? null,
        em_atraso: pendentes.filter(i => i.prazo && i.prazo < h).length,
      };
    });
    setAcolhimentos(lista);
    setLoading(false);
  }, [empresa?.id, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  /**
   * Cria colaborador (se necessário), o acolhimento, a checklist e as duas avaliações experimentais.
   * Devolve o id do acolhimento.
   */
  const iniciar = useCallback(async (p: {
    colaborador_id?: string;
    novoColaborador?: { full_name: string; email?: string | null; phone?: string | null; birth_date?: string | null; department?: string | null };
    candidato_id?: string | null;
    vaga_id?: string | null;
    cargo?: string | null;
    data_entrada: string;
    periodo_experimental_dias: number;
    responsavel_nome?: string | null;
    tutor_nome?: string | null;
  }): Promise<string | null> => {
    if (!empresa?.id) return null;
    let colaboradorId = p.colaborador_id ?? null;
    let colaboradorNome = '';
    if (!colaboradorId && p.novoColaborador) {
      const { data, error } = await supabase.from('employees')
        .insert({ empresa_id: empresa.id, full_name: p.novoColaborador.full_name, email: p.novoColaborador.email ?? null, phone: p.novoColaborador.phone ?? null,
          birth_date: p.novoColaborador.birth_date ?? null, department: p.novoColaborador.department ?? null, admission_date: p.data_entrada, status: 'active' } as any)
        .select('id, full_name').single();
      if (error || !data) { toast({ title: 'Não foi possível criar o colaborador', description: error?.message, variant: 'destructive' }); return null; }
      colaboradorId = data.id; colaboradorNome = data.full_name;
    } else if (colaboradorId) {
      const { data } = await supabase.from('employees').select('full_name').eq('id', colaboradorId).maybeSingle();
      colaboradorNome = data?.full_name ?? '';
    }
    if (!colaboradorId) return null;

    const { data: ac, error: e1 } = await (supabase.from('rh_acolhimentos' as any) as any)
      .insert({ empresa_id: empresa.id, colaborador_id: colaboradorId, candidato_id: p.candidato_id ?? null, vaga_id: p.vaga_id ?? null, cargo: p.cargo ?? null,
        data_entrada: p.data_entrada, periodo_experimental_dias: p.periodo_experimental_dias, responsavel_nome: p.responsavel_nome ?? null, tutor_nome: p.tutor_nome ?? null })
      .select('id, fim_periodo_experimental').single();
    if (e1 || !ac) { toast({ title: 'Não foi possível criar o acolhimento', description: e1?.message, variant: 'destructive' }); return null; }

    const fim = ac.fim_periodo_experimental as string;
    const itens = MODELO_ACOLHIMENTO.map((m, i) => ({
      empresa_id: empresa.id, acolhimento_id: ac.id, fase: m.fase, descricao: m.descricao, responsavel: m.responsavel,
      prazo: m.dia === 'fim' ? addDias(fim, -7) : addDias(p.data_entrada, m.dia), obrigatorio: m.obrigatorio ?? true, posicao: i,
    }));
    const { error: e2 } = await (supabase.from('rh_acolhimento_itens' as any) as any).insert(itens);
    if (e2) toast({ title: 'Acolhimento criado, mas a checklist falhou', description: e2.message, variant: 'destructive' });

    // avaliações do período experimental já agendadas
    const avals = [
      { tipo_avaliacao: 'experimental_1', data_prevista: addDias(p.data_entrada, 30), periodo_inicio: p.data_entrada, periodo_fim: addDias(p.data_entrada, 30) },
      { tipo_avaliacao: 'experimental_2', data_prevista: addDias(fim, -7), periodo_inicio: addDias(p.data_entrada, 31), periodo_fim: fim },
    ].map(a => ({ ...a, empresa_id: empresa.id, colaborador_id: colaboradorId, colaborador_nome: colaboradorNome, avaliador_nome: p.responsavel_nome ?? null, estado: 'pendente' }));
    const { error: e3 } = await supabase.from('rh_avaliacoes').insert(avals as any);
    if (e3) toast({ title: 'Acolhimento criado, mas as avaliações experimentais não ficaram agendadas', description: e3.message, variant: 'destructive' });

    if (p.candidato_id) await supabase.from('rh_candidatos').update({ estado: 'contratado' } as any).eq('id', p.candidato_id);
    await carregar();
    return ac.id as string;
  }, [empresa?.id, toast, carregar]);

  return { acolhimentos, loading, recarregar: carregar, iniciar };
}

export function useAcolhimento(id: string | undefined) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const [acolhimento, setAcolhimento] = useState<Acolhimento | null>(null);
  const [itens, setItens] = useState<ItemAcolhimento[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!id || !empresa?.id) { setLoading(false); return; }
    setLoading(true);
    const [{ data: a, error }, { data: its }] = await Promise.all([
      (supabase.from('rh_acolhimentos' as any) as any).select('*').eq('id', id).eq('empresa_id', empresa.id).maybeSingle(),
      (supabase.from('rh_acolhimento_itens' as any) as any).select('*').eq('acolhimento_id', id).order('posicao'),
    ]);
    if (error) toast({ title: 'Não foi possível carregar o acolhimento', description: error.message, variant: 'destructive' });
    if (a) {
      const { data: emp } = await supabase.from('employees').select('full_name').eq('id', a.colaborador_id).maybeSingle();
      setAcolhimento({ ...a, colaborador_nome: emp?.full_name ?? '—' });
    } else setAcolhimento(null);
    setItens((its ?? []) as ItemAcolhimento[]);
    setLoading(false);
  }, [id, empresa?.id, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const marcar = useCallback(async (item: ItemAcolhimento, feito: boolean, quem: string | null) => {
    const patch = { feito, feito_em: feito ? new Date().toISOString() : null, feito_por_nome: feito ? quem : null };
    const { data, error } = await (supabase.from('rh_acolhimento_itens' as any) as any).update(patch).eq('id', item.id).select('id').maybeSingle();
    if (error || !data) { toast({ title: 'Não foi possível gravar', description: error?.message ?? 'sem permissão', variant: 'destructive' }); return; }
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, ...patch } : i));
  }, [toast]);

  const adicionarItem = useCallback(async (fase: FaseAcolhimento, descricao: string, responsavel: string | null, prazo: string | null) => {
    if (!acolhimento || !empresa?.id) return;
    const posicao = (itens.filter(i => i.fase === fase).map(i => i.posicao).sort((a, b) => b - a)[0] ?? 0) + 1;
    const { data, error } = await (supabase.from('rh_acolhimento_itens' as any) as any)
      .insert({ empresa_id: empresa.id, acolhimento_id: acolhimento.id, fase, descricao, responsavel, prazo, obrigatorio: false, posicao }).select('*').single();
    if (error || !data) { toast({ title: 'Não foi possível adicionar', description: error?.message, variant: 'destructive' }); return; }
    setItens(prev => [...prev, data as ItemAcolhimento].sort((a, b) => FASE_ORDEM.indexOf(a.fase) - FASE_ORDEM.indexOf(b.fase) || a.posicao - b.posicao));
  }, [acolhimento, empresa?.id, itens, toast]);

  const removerItem = useCallback(async (item: ItemAcolhimento) => {
    const { error } = await (supabase.from('rh_acolhimento_itens' as any) as any).delete().eq('id', item.id);
    if (error) { toast({ title: 'Não foi possível remover', description: error.message, variant: 'destructive' }); return; }
    setItens(prev => prev.filter(i => i.id !== item.id));
  }, [toast]);

  const atualizar = useCallback(async (patch: Partial<Pick<Acolhimento, 'responsavel_nome' | 'tutor_nome' | 'notas' | 'estado' | 'decisao' | 'decisao_em' | 'periodo_experimental_dias'>>) => {
    if (!acolhimento) return;
    const { data, error } = await (supabase.from('rh_acolhimentos' as any) as any).update(patch).eq('id', acolhimento.id).select('*').maybeSingle();
    if (error || !data) { toast({ title: 'Não foi possível gravar', description: error?.message ?? 'sem permissão', variant: 'destructive' }); return; }
    setAcolhimento(prev => prev ? { ...prev, ...data } : prev);
  }, [acolhimento, toast]);

  const progresso = useMemo(() => {
    const total = itens.length, feitos = itens.filter(i => i.feito).length;
    const h = hoje();
    return { total, feitos, atrasados: itens.filter(i => !i.feito && i.prazo && i.prazo < h).length, pct: total ? Math.round(feitos / total * 100) : 0 };
  }, [itens]);

  return { acolhimento, itens, loading, progresso, recarregar: carregar, marcar, adicionarItem, removerItem, atualizar };
}
