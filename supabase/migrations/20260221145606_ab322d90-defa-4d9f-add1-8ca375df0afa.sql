-- Backfill: Insert account_payments for existing liquidated immediate expenses
-- This will trigger auto_cash_flow_on_account_payment to create cash_flows saída entries

INSERT INTO public.account_payments (account_payable_id, empresa_id, data_pagamento, valor_original, juros, multa, desconto, valor_pago, metodo_pagamento, observacoes)
SELECT 
  ap.id,
  ap.empresa_id,
  ap.data_pagamento,
  ap.valor_liquido,
  0,
  0,
  0,
  ap.valor_liquido,
  ap.metodo_pagamento,
  'Retroalimentação automática - pagamento imediato'
FROM public.accounts_payable ap
WHERE ap.status = 'liquidado'
  AND ap.forma_pagamento = 'imediato'
  AND NOT EXISTS (
    SELECT 1 FROM public.account_payments pay 
    WHERE pay.account_payable_id = ap.id
  );