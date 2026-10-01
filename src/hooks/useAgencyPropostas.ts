import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import type {
  PropostaAg, PropostaAgLinha, PropostaAgEstado, PropostaParcela,
} from '@/types/agency';

const T_PROP = 'ag_propostas' as any;
const T_LINHA = 'ag_proposta_linhas' as any;
const T_PARC = 'ag_proposta_parcelas' as any;
const T_JOBS = 'ag_jobs' as any;

function mapProposta(r: any): PropostaAg {
  return {
    id: r.id, empresaId: r.empresa_id, projetoId: r.projeto_id,
    sequencial: r.sequencial, numeroDocumento: r.numero_documento,
    clienteId: r.cliente_id, clienteNome: r.cliente_nome, titulo: r.titulo,
    estado: r.estado, dataEmissao: r.data_emissao, validadeDias: r.validade_dias,
    responsavelNome: r.responsavel_nome,
    introducao: r.introducao, consideracoes: r.consideracoes,
    condicoesPagamento: r.condicoes_pagamento, observacoes: r.observacoes,
    taxaImposto: r.taxa_imposto != null ? Number(r.taxa_imposto) : null,
    comissaoPct: r.comissao_pct != null ? Number(r.comissao_pct) : null,
    totalSemImposto: Number(r.total_sem_imposto ?? 0),
    valorImposto: Number(r.valor_imposto ?? 0),
    totalComImposto: Number(r.total_com_imposto ?? 0),
    jobsLancados: !!r.jobs_lancados,
  };
}

function mapLinha(r: any): PropostaAgLinha {
  return {
    id: r.id, ordem: r.ordem, tipoLinha: r.tipo_linha,
    itemCatalogoId: r.item_catalogo_id,
    referencia: r.referencia || '', designacao: r.designacao || '',
    quantidade: Number(r.quantidade), unidade: r.unidade,
    precoUnitario: Number(r.preco_unitario), descontoPct: Number(r.desconto_pct),
    totalLinha: Number(r.total_linha),
    horasPrevistas: r.horas_previstas != null ? Number(r.horas_previstas) : null,
    externo: !!r.externo,
  };
}

/** Total de uma linha, com desconto aplicado. */
export function calcularLinha(l: PropostaAgLinha): number {
  if (l.tipoLinha !== 'artigo') return 0;
  const bruto = l.quantidade * l.precoUnitario;
  return Number((bruto * (1 - (l.descontoPct || 0) / 100)).toFixed(2));
}

export function useAgencyPropostas(projetoId?: string) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: propostas = [], isLoading } = useQuery<PropostaAg[]>({
    queryKey: ['ag_propostas', empresa?.id, projetoId ?? 'todas'],
    enabled: !!empresa?.id,
    queryFn: async () => {
      let q = (supabase.from(T_PROP) as any).select('*').eq('empresa_id', empresa!.id);
      if (projetoId) q = q.eq('projeto_id', projetoId);
      const { data, error } = await q.order('criado_em', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapProposta);
    },
  });

  const inval = () => {
    qc.invalidateQueries({ queryKey: ['ag_propostas'] });
    qc.invalidateQueries({ queryKey: ['ag_projetos'] });
    qc.invalidateQueries({ queryKey: ['ag_projeto'] });
    qc.invalidateQueries({ queryKey: ['ag_jobs'] });
  };

  const fetchLinhas = async (propostaId: string): Promise<PropostaAgLinha[]> => {
    const { data, error } = await (supabase.from(T_LINHA) as any)
      .select('*').eq('proposta_id', propostaId).eq('empresa_id', empresa!.id).order('ordem');
    if (error) throw error;
    return (data || []).map(mapLinha);
  };

  const fetchParcelas = async (propostaId: string): Promise<PropostaParcela[]> => {
    const { data, error } = await (supabase.from(T_PARC) as any)
      .select('*').eq('proposta_id', propostaId).eq('empresa_id', empresa!.id).order('numero');
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id, numero: r.numero, total: r.total, descricao: r.descricao,
      valor: Number(r.valor), dataVencimento: r.data_vencimento,
      formaPagamento: r.forma_pagamento, estado: r.estado,
    }));
  };

  const guardar = useMutation({
    mutationFn: async (p: {
      id?: string;
      projetoId: string;
      clienteId?: string | null; clienteNome?: string;
      titulo?: string; dataEmissao?: string; validadeDias?: number;
      introducao?: string; consideracoes?: string;
      condicoesPagamento?: string; observacoes?: string;
      taxaImposto?: number | null; comissaoPct?: number | null;
      linhas: PropostaAgLinha[];
    }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');

      const linhasCalc = p.linhas.map((l, i) => ({ ...l, ordem: i, totalLinha: calcularLinha(l) }));
      const totalSem = linhasCalc.reduce((s, l) => s + l.totalLinha, 0);
      const taxa = p.taxaImposto ?? 0;
      const imposto = Number((totalSem * taxa / 100).toFixed(2));

      const row: any = {
        empresa_id: empresa.id,
        projeto_id: p.projetoId,
        cliente_id: p.clienteId ?? null,
        cliente_nome: p.clienteNome || null,
        titulo: p.titulo || null,
        data_emissao: p.dataEmissao || new Date().toISOString().split('T')[0],
        validade_dias: p.validadeDias ?? 30,
        introducao: p.introducao || null,
        consideracoes: p.consideracoes || null,
        condicoes_pagamento: p.condicoesPagamento || null,
        observacoes: p.observacoes || null,
        taxa_imposto: p.taxaImposto ?? null,
        comissao_pct: p.comissaoPct ?? null,
        total_sem_imposto: totalSem,
        valor_imposto: imposto,
        total_com_imposto: totalSem + imposto,
        atualizado_em: new Date().toISOString(),
      };

      let propId = p.id;
      if (propId) {
        const { data, error } = await (supabase.from(T_PROP) as any)
          .update(row).eq('id', propId).eq('empresa_id', empresa.id).select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('A alteração não foi aceite pela base de dados.');
        await (supabase.from(T_LINHA) as any)
          .delete().eq('proposta_id', propId).eq('empresa_id', empresa.id);
      } else {
        // Numeração hierárquica dentro do projeto (7.2, 7.3…), atómica.
        const { data: seq, error: errSeq } = await (supabase.rpc as any)('ag_proximo_numero', {
          p_empresa_id: empresa.id,
          p_escopo: `proposta:${p.projetoId}`,
          p_ano: new Date().getFullYear(),
        });
        if (errSeq) throw errSeq;
        const { data, error } = await (supabase.from(T_PROP) as any)
          .insert({ ...row, sequencial: seq }).select('id').single();
        if (error) throw error;
        propId = data.id;
      }

      if (linhasCalc.length) {
        const { error } = await (supabase.from(T_LINHA) as any).insert(
          linhasCalc.map(l => ({
            empresa_id: empresa.id, proposta_id: propId, ordem: l.ordem,
            tipo_linha: l.tipoLinha, item_catalogo_id: l.itemCatalogoId,
            referencia: l.referencia || null, designacao: l.designacao || null,
            quantidade: l.quantidade, unidade: l.unidade,
            preco_unitario: l.precoUnitario, desconto_pct: l.descontoPct,
            total_linha: l.totalLinha, horas_previstas: l.horasPrevistas,
            externo: l.externo,
          }))
        );
        if (error) throw error;
      }
      return propId as string;
    },
    onSuccess: () => { inval(); toast({ title: 'Proposta guardada' }); },
    onError: (e: any) => toast({ title: 'Erro ao guardar proposta', description: e.message, variant: 'destructive' }),
  });

  /** Máquina de estados de aprovação. */
  const mudarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: PropostaAgEstado }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { data, error } = await (supabase.from(T_PROP) as any)
        .update({ estado, atualizado_em: new Date().toISOString() })
        .eq('id', id).eq('empresa_id', empresa.id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('A base de dados recusou a alteração de estado.');
    },
    onSuccess: () => { inval(); toast({ title: 'Estado atualizado' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  /**
   * "Lançar itens na pauta de jobs" — a conversão-chave do Operand.
   * Cada linha de artigo com horas previstas vira um job no projeto, com o
   * número sequencial próprio. Evita a re-digitação entre o que se vendeu e o
   * que se executa, e é o que torna comparável orçamentado vs. apontado.
   */
  const lancarJobs = useMutation({
    mutationFn: async (propostaId: string) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const prop = propostas.find(p => p.id === propostaId);
      if (!prop) throw new Error('Proposta não encontrada.');
      if (!prop.projetoId) throw new Error('A proposta não está ligada a um projeto.');
      if (prop.jobsLancados) throw new Error('Os jobs desta proposta já foram lançados.');

      const linhas = await fetchLinhas(propostaId);
      const candidatas = linhas.filter(l => l.tipoLinha === 'artigo' && !l.externo && l.designacao.trim());
      if (!candidatas.length) throw new Error('Não há linhas de trabalho interno para lançar.');

      // Primeira etapa do kanban da empresa
      const { data: etapas } = await (supabase.from('ag_job_etapas' as any) as any)
        .select('id').eq('empresa_id', empresa.id).eq('ativo', true).order('ordem').limit(1);
      const etapaId = etapas?.[0]?.id ?? null;

      const ano = new Date().getFullYear();
      for (const l of candidatas) {
        const { data: seq, error: errSeq } = await (supabase.rpc as any)('ag_proximo_numero', {
          p_empresa_id: empresa.id, p_escopo: `job:${prop.projetoId}`, p_ano: ano,
        });
        if (errSeq) throw errSeq;
        const { error } = await (supabase.from(T_JOBS) as any).insert({
          empresa_id: empresa.id,
          projeto_id: prop.projetoId,
          sequencial: seq,
          titulo: l.designacao,
          descricao: `Lançado da proposta ${prop.numeroDocumento || '#' + prop.sequencial}`,
          etapa_id: etapaId,
          horas_previstas: l.horasPrevistas,
        });
        if (error) throw error;
      }

      const { error: errUpd } = await (supabase.from(T_PROP) as any)
        .update({ jobs_lancados: true }).eq('id', propostaId).eq('empresa_id', empresa.id);
      if (errUpd) throw errUpd;
      return candidatas.length;
    },
    onSuccess: (n) => { inval(); toast({ title: `${n} job(s) criados a partir da proposta` }); },
    onError: (e: any) => toast({ title: 'Não foi possível lançar os jobs', description: e.message, variant: 'destructive' }),
  });

  /** Plano de prestações — a ponte para o financeiro. */
  const guardarParcelas = useMutation({
    mutationFn: async ({ propostaId, parcelas }: { propostaId: string; parcelas: PropostaParcela[] }) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      await (supabase.from(T_PARC) as any)
        .delete().eq('proposta_id', propostaId).eq('empresa_id', empresa.id);
      if (!parcelas.length) return;
      const { error } = await (supabase.from(T_PARC) as any).insert(
        parcelas.map((p, i) => ({
          empresa_id: empresa.id, proposta_id: propostaId,
          numero: i + 1, total: parcelas.length,
          descricao: p.descricao || null, valor: p.valor,
          data_vencimento: p.dataVencimento || null,
          forma_pagamento: p.formaPagamento || null,
          estado: p.estado || 'previsto',
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => { inval(); toast({ title: 'Prestações guardadas' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      if (!empresa) throw new Error('Sem empresa ativa.');
      const { error } = await (supabase.from(T_PROP) as any)
        .delete().eq('id', id).eq('empresa_id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => { inval(); toast({ title: 'Proposta eliminada' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return {
    propostas, isLoading, fetchLinhas, fetchParcelas,
    guardar, mudarEstado, lancarJobs, guardarParcelas, eliminar,
  };
}
