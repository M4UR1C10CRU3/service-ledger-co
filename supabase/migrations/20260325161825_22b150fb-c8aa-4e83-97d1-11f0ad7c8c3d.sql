BEGIN;

-- Remove only the incorrect duplicate purchase registered in Tudo Casa/Warm,
-- while preserving the correct Resiserv record and keeping stock balances consistent.

-- 1) Revert stock_atual quantities for the duplicated Warm purchase items
UPDATE public.stock_atual sa
SET quantidade_atual = GREATEST(0, COALESCE(sa.quantidade_atual, 0) - mv.total_qty),
    updated_at = now()
FROM (
  SELECT empresa_id, produto_ref, SUM(quantidade) AS total_qty
  FROM public.stock_movimentos
  WHERE compra_id = 'bd1ff402-75b9-4389-866e-b976414d15e3'
    AND tipo = 'entrada'
  GROUP BY empresa_id, produto_ref
) mv
WHERE sa.empresa_id = mv.empresa_id
  AND sa.produto_ref = mv.produto_ref;

-- 2) Delete cash flow linked to the duplicated payment
DELETE FROM public.cash_flows
WHERE source_type IN ('pagamento_fornecedor', 'pagamento_despesa')
  AND source_id = '358d162d-043b-4e91-9a35-6fb31e01a817';

-- 3) Delete payment linked to the duplicated purchase
DELETE FROM public.account_payments
WHERE id = '358d162d-043b-4e91-9a35-6fb31e01a817'
  AND account_payable_id = 'bd1ff402-75b9-4389-866e-b976414d15e3';

-- 4) Delete stock movements created by the duplicated purchase
DELETE FROM public.stock_movimentos
WHERE compra_id = 'bd1ff402-75b9-4389-866e-b976414d15e3';

-- 5) Delete the duplicated purchase record in Warm
DELETE FROM public.accounts_payable
WHERE id = 'bd1ff402-75b9-4389-866e-b976414d15e3'
  AND empresa_id = '71bf4313-33ef-4cf0-991c-022cdde3f88a';

COMMIT;