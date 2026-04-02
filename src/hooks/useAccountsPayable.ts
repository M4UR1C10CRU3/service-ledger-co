import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { AccountPayable, AccountPayableFormData } from '@/types/accountPayable';
import { LiquidacaoData } from '@/components/contas-pagar/LiquidarContaDialog';

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
    ivaRate: Number(row.iva_rate || 0),
    ivaValue: Number(row.iva_value || 0),
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
    costCenterId: row.cost_center_id,
    articleId: row.article_id,
    quantity: Number(row.quantity || 0),
    items: row.items || null,
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

  const computeTotals = (form: AccountPayableFormData) => {
    const ivaIncluido = form.ivaIncluido === true;
    if (form.items && form.items.length > 0) {
      let totalBruto = 0;
      let totalIva = 0;
      for (const item of form.items) {
        const qty = parseFloat(item.quantidade) || 1;
        const val = parseFloat(item.valorBruto) || 0;
        const rate = parseFloat(item.ivaRate) || 0;
        if (ivaIncluido) {
          const lineTotal = val * qty;
          const lineBruto = rate > 0 ? lineTotal / (1 + rate / 100) : lineTotal;
          totalBruto += lineBruto;
          totalIva += lineTotal - lineBruto;
        } else {
          const lineBruto = val * qty;
          totalBruto += lineBruto;
          totalIva += lineBruto * (rate / 100);
        }
      }
      return { bruto: totalBruto, ivaRate: 0, ivaValue: totalIva, liquido: totalBruto + totalIva };
    }
    const inputVal = parseFloat(form.valorBruto) || 0;
    const ivaRate = parseFloat(form.ivaRate) || 0;
    if (ivaIncluido) {
      const bruto = ivaRate > 0 ? inputVal / (1 + ivaRate / 100) : inputVal;
      const ivaValue = inputVal - bruto;
      return { bruto, ivaRate, ivaValue, liquido: inputVal };
    }
    const ivaValue = inputVal * (ivaRate / 100);
    return { bruto: inputVal, ivaRate, ivaValue, liquido: inputVal + ivaValue };
  };

  const addAccount = async (form: AccountPayableFormData): Promise<string | null> => {
    if (!empresa) return null;

    const { bruto, ivaRate, ivaValue, liquido } = computeTotals(form);

    const isImediato = form.formaPagamento === 'imediato';
    // A Crédito but with a payment date filled = user wants it saved as liquidated
    const isCreditoPago = form.formaPagamento === 'a_credito' && form.dataPagamento != null;
    const shouldBeLiquidado = isImediato || isCreditoPago;

    const { data, error } = await supabase.from('accounts_payable').insert({
      empresa_id: empresa.id,
      supplier_id: form.supplierId,
      tipo_lancamento: form.tipoLancamento,
      categoria: form.categoria,
      descricao: form.descricao.trim() || null,
      numero_documento: form.numeroDocumento.trim() || null,
      data_emissao: form.dataEmissao.toISOString().split('T')[0],
      valor_bruto: bruto,
      desconto: 0,
      acrescimo: 0,
      valor_liquido: liquido,
      iva_rate: ivaRate,
      iva_value: ivaValue,
      forma_pagamento: form.formaPagamento,
      data_pagamento: form.dataPagamento ? form.dataPagamento.toISOString().split('T')[0] : null,
      data_vencimento: form.formaPagamento === 'a_credito' ? form.dataVencimento.toISOString().split('T')[0] : null,
      metodo_pagamento: form.metodoPagamento,
      status: shouldBeLiquidado ? 'liquidado' : 'pendente',
      observacoes: form.observacoes.trim() || null,
      vincular_estoque: form.tipoLancamento === 'compra_revenda',
      cost_center_id: form.costCenterId || null,
      article_id: form.articleId || null,
      quantity: parseFloat(form.quantity) || 0,
      items: (form.items && form.items.length > 0 ? form.items : null) as any,
    } as any).select('id').single();

    if (!error && data) {
      // For paid accounts, also insert into account_payments so the cash flow trigger fires
      if (shouldBeLiquidado && form.dataPagamento) {
        await supabase.from('account_payments').insert({
          account_payable_id: data.id,
          empresa_id: empresa.id,
          data_pagamento: form.dataPagamento.toISOString().split('T')[0],
          valor_original: liquido,
          juros: 0,
          multa: 0,
          desconto: 0,
          valor_pago: liquido,
          metodo_pagamento: form.metodoPagamento,
          observacoes: null,
        });
      }
      await fetchAccounts();
      return data.id;
    }
    console.error('Error adding account:', error);
    return null;
  };

  const updateAccount = async (id: string, form: AccountPayableFormData): Promise<boolean> => {
    const { bruto, ivaRate, ivaValue, liquido } = computeTotals(form);
    const isImediato = form.formaPagamento === 'imediato';
    const isCreditoPago = form.formaPagamento === 'a_credito' && form.dataPagamento != null;
    const shouldBeLiquidado = isImediato || isCreditoPago;

    const { error } = await supabase.from('accounts_payable').update({
      supplier_id: form.supplierId,
      tipo_lancamento: form.tipoLancamento,
      categoria: form.categoria,
      descricao: form.descricao.trim() || null,
      numero_documento: form.numeroDocumento.trim() || null,
      data_emissao: form.dataEmissao.toISOString().split('T')[0],
      valor_bruto: bruto,
      desconto: 0,
      acrescimo: 0,
      valor_liquido: liquido,
      iva_rate: ivaRate,
      iva_value: ivaValue,
      forma_pagamento: form.formaPagamento,
      data_pagamento: form.dataPagamento ? form.dataPagamento.toISOString().split('T')[0] : null,
      data_vencimento: form.formaPagamento === 'a_credito' ? form.dataVencimento.toISOString().split('T')[0] : null,
      metodo_pagamento: form.metodoPagamento,
      status: shouldBeLiquidado ? 'liquidado' : 'pendente',
      observacoes: form.observacoes.trim() || null,
      vincular_estoque: form.tipoLancamento === 'compra_revenda',
      cost_center_id: form.costCenterId || null,
      article_id: form.articleId || null,
      quantity: parseFloat(form.quantity) || 0,
      items: (form.items && form.items.length > 0 ? form.items : null) as any,
    } as any).eq('id', id);

    if (!error) {
      // Sync account_payments so the cash_flow trigger updates flow_type/amount
      if (shouldBeLiquidado && form.dataPagamento) {
        const { data: existingPayments } = await supabase
          .from('account_payments')
          .select('id')
          .eq('account_payable_id', id);

        if (existingPayments && existingPayments.length > 0) {
          await supabase.from('account_payments').update({
            data_pagamento: form.dataPagamento.toISOString().split('T')[0],
            valor_original: liquido,
            valor_pago: liquido,
            metodo_pagamento: form.metodoPagamento,
          }).eq('account_payable_id', id);
        } else {
          await supabase.from('account_payments').insert({
            account_payable_id: id,
            empresa_id: empresa!.id,
            data_pagamento: form.dataPagamento.toISOString().split('T')[0],
            valor_original: liquido,
            juros: 0,
            multa: 0,
            desconto: 0,
            valor_pago: liquido,
            metodo_pagamento: form.metodoPagamento,
            observacoes: null,
          });
        }
      }
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

  const liquidarAccount = async (data: LiquidacaoData): Promise<boolean> => {
    if (!empresa) return false;

    const { error: payError } = await supabase.from('account_payments').insert({
      account_payable_id: data.accountPayableId,
      empresa_id: empresa.id,
      data_pagamento: data.dataPagamento.toISOString().split('T')[0],
      valor_original: data.valorOriginal,
      juros: data.juros,
      multa: data.multa,
      desconto: data.desconto,
      valor_pago: data.valorPago,
      metodo_pagamento: data.metodoPagamento,
      observacoes: data.observacoes || null,
    });

    if (payError) {
      console.error('Error creating payment:', payError);
      return false;
    }

    const { data: payments } = await supabase
      .from('account_payments')
      .select('valor_pago')
      .eq('account_payable_id', data.accountPayableId);

    const totalPaid = (payments || []).reduce((s: number, p: any) => s + Number(p.valor_pago), 0);
    const account = accounts.find(a => a.id === data.accountPayableId);
    const newStatus = account && totalPaid >= account.valorLiquido ? 'liquidado' : 'parcial';

    const { error: updError } = await supabase
      .from('accounts_payable')
      .update({
        status: newStatus,
        data_pagamento: newStatus === 'liquidado' ? data.dataPagamento.toISOString().split('T')[0] : null,
        metodo_pagamento: data.metodoPagamento,
      })
      .eq('id', data.accountPayableId);

    if (updError) {
      console.error('Error updating account status:', updError);
      return false;
    }

    await fetchAccounts();
    return true;
  };

  return { accounts, isLoading, addAccount, updateAccount, deleteAccount, liquidarAccount, refreshAccounts: fetchAccounts };
}
