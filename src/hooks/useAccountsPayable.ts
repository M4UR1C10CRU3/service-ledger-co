import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { AccountPayable, AccountPayableFormData } from '@/types/accountPayable';

function mapRow(row: any, supplierName?: string): AccountPayable {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    supplierId: row.supplier_id,
    supplierName,
    tipoLancamento: row.tipo_lancamento,
    categoria: row.categoria,
    descricao: row.descricao,
    numeroDocumento: row.numero_documento,
    dataEmissao: row.data_emissao,
    valorBruto: Number(row.valor_bruto),
    desconto: Number(row.desconto),
    acrescimo: Number(row.acrescimo),
    valorLiquido: Number(row.valor_liquido),
    formaPagamento: row.forma_pagamento,
    dataPagamento: row.data_pagamento,
    dataVencimento: row.data_vencimento,
    metodoPagamento: row.metodo_pagamento,
    comprovanteUrl: row.comprovante_url,
    status: row.status,
    centroCusto: row.centro_custo,
    projeto: row.projeto,
    observacoes: row.observacoes,
    vincularEstoque: row.vincular_estoque,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useAccountsPayable() {
  const { empresa } = useEmpresa();
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('accounts_payable')
      .select('*, suppliers(razao_social)')
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAccounts(data.map((row: any) => mapRow(row, row.suppliers?.razao_social)));
    }
    setIsLoading(false);
  }, [empresa]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = async (form: AccountPayableFormData): Promise<boolean> => {
    if (!empresa) return false;

    const bruto = parseFloat(form.valorBruto) || 0;
    const desc = parseFloat(form.desconto) || 0;
    const acr = parseFloat(form.acrescimo) || 0;
    const liquido = bruto - desc + acr;

    const isAVista = form.formaPagamento === 'a_vista';

    const { error } = await supabase.from('accounts_payable').insert({
      empresa_id: empresa.id,
      supplier_id: form.supplierId,
      tipo_lancamento: form.tipoLancamento,
      categoria: form.categoria,
      descricao: form.descricao.trim() || null,
      numero_documento: form.numeroDocumento.trim() || null,
      data_emissao: form.dataEmissao.toISOString().split('T')[0],
      valor_bruto: bruto,
      desconto: desc,
      acrescimo: acr,
      valor_liquido: liquido,
      forma_pagamento: form.formaPagamento,
      data_pagamento: isAVista ? form.dataPagamento.toISOString().split('T')[0] : null,
      data_vencimento: !isAVista ? form.dataVencimento.toISOString().split('T')[0] : null,
      metodo_pagamento: isAVista ? form.metodoPagamento : null,
      status: isAVista ? 'liquidado' : 'pendente',
      centro_custo: form.centroCusto.trim() || null,
      projeto: form.projeto.trim() || null,
      observacoes: form.observacoes.trim() || null,
      vincular_estoque: form.tipoLancamento === 'compra' ? form.vincularEstoque : false,
    });

    if (!error) {
      await fetchAccounts();
      return true;
    }
    console.error('Error adding account:', error);
    return false;
  };

  const updateAccount = async (id: string, form: AccountPayableFormData): Promise<boolean> => {
    const bruto = parseFloat(form.valorBruto) || 0;
    const desc = parseFloat(form.desconto) || 0;
    const acr = parseFloat(form.acrescimo) || 0;
    const liquido = bruto - desc + acr;
    const isAVista = form.formaPagamento === 'a_vista';

    const { error } = await supabase.from('accounts_payable').update({
      supplier_id: form.supplierId,
      tipo_lancamento: form.tipoLancamento,
      categoria: form.categoria,
      descricao: form.descricao.trim() || null,
      numero_documento: form.numeroDocumento.trim() || null,
      data_emissao: form.dataEmissao.toISOString().split('T')[0],
      valor_bruto: bruto,
      desconto: desc,
      acrescimo: acr,
      valor_liquido: liquido,
      forma_pagamento: form.formaPagamento,
      data_pagamento: isAVista ? form.dataPagamento.toISOString().split('T')[0] : null,
      data_vencimento: !isAVista ? form.dataVencimento.toISOString().split('T')[0] : null,
      metodo_pagamento: isAVista ? form.metodoPagamento : null,
      status: isAVista ? 'liquidado' : 'pendente',
      centro_custo: form.centroCusto.trim() || null,
      projeto: form.projeto.trim() || null,
      observacoes: form.observacoes.trim() || null,
      vincular_estoque: form.tipoLancamento === 'compra' ? form.vincularEstoque : false,
    }).eq('id', id);

    if (!error) {
      await fetchAccounts();
      return true;
    }
    console.error('Error updating account:', error);
    return false;
  };

  const deleteAccount = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('accounts_payable').delete().eq('id', id);
    if (!error) {
      await fetchAccounts();
      return true;
    }
    console.error('Error deleting account:', error);
    return false;
  };

  return { accounts, isLoading, addAccount, updateAccount, deleteAccount, refreshAccounts: fetchAccounts };
}
