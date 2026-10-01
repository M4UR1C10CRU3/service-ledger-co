import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import type { PaisAgencia, PaisConfig } from '@/types/agency';
import { VOCABULARIO, formatMoeda } from '@/types/agency';

/**
 * A chave PT/BR do Clariza Agency.
 *
 * Devolve o país ativo da empresa e toda a configuração que dele depende —
 * moeda, fuso, identificador fiscal, que campos de meios mostrar, e o
 * vocabulário. Nenhum ecrã do vertical deve escrever "€", "NIF", "Mídia" ou
 * "Pauta" diretamente: pede-os aqui.
 */
export function useAgencyPais() {
  const { empresa } = useEmpresa();

  const { data: vertical, isLoading: loadingVertical } = useQuery({
    queryKey: ['ag_empresa_vertical', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from('ag_empresas_vertical' as any) as any)
        .select('*')
        .eq('empresa_id', empresa!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { empresa_id: string; ativo: boolean; pais: PaisAgencia } | null;
    },
  });

  const pais: PaisAgencia = (vertical?.pais as PaisAgencia) || 'PT';

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ['ag_pais_config', pais],
    queryFn: async () => {
      const { data, error } = await (supabase.from('ag_paises_config' as any) as any)
        .select('*')
        .eq('pais', pais)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        pais: data.pais,
        nome: data.nome,
        locale: data.locale,
        moeda: data.moeda,
        moedaSimbolo: data.moeda_simbolo,
        simboloAEsquerda: data.simbolo_a_esquerda,
        fusoHorario: data.fuso_horario,
        idFiscalLabel: data.id_fiscal_label,
        impostoLabel: data.imposto_label,
        impostoPorFora: data.imposto_por_fora,
        docFaturaLabel: data.doc_fatura_label,
        comissaoMeiosPadrao: data.comissao_meios_padrao,
        usaPraca: data.usa_praca,
        usaBisemana: data.usa_bisemana,
        usaBonificacaoBv: data.usa_bonificacao_bv,
        usaRedeAfiliadas: data.usa_rede_afiliadas,
      } as PaisConfig;
    },
  });

  return {
    /** Empresa tem o vertical Agency ativo? Comanda o menu e as rotas. */
    verticalAtivo: !!vertical?.ativo,
    pais,
    config: config ?? null,
    isLoading: loadingVertical || loadingConfig,
    /** Termo no registo linguístico do país ativo. */
    t: (chave: string) => VOCABULARIO[pais]?.[chave] ?? VOCABULARIO.PT[chave] ?? chave,
    /** Moeda formatada no locale do país ativo. */
    eur: (valor: number | null | undefined) => formatMoeda(valor ?? 0, config ?? null),
  };
}
