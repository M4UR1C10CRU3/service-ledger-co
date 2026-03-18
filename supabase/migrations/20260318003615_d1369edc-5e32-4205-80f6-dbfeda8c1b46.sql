-- Fix the out-of-sync cash_flow record for the service that was updated
-- Re-sync all cash_flow records that reference liquidacoes linked to services
-- This is a one-time data fix to correct descriptions after triggers were missing

UPDATE public.cash_flows cf
SET description = 'Recebimento de ' || s.cliente || 
  ' | Serviço: ' || s.servico || 
  ' | Fatura: ' || COALESCE(s.numero_fatura, 'N/D') ||
  ' | Valor Total: €' || TRIM(TO_CHAR(s.valor_com_iva, '999G999D99')) ||
  ' | Pagamento: €' || TRIM(TO_CHAR(l.valor, '999G999D99')) ||
  ' | Método: ' || CASE l.forma_pagamento
    WHEN 'numerario' THEN 'Numerário'
    WHEN 'multibanco' THEN 'Multibanco'
    WHEN 'transferencia' THEN 'Transferência'
    WHEN 'cheque' THEN 'Cheque'
    ELSE COALESCE(l.forma_pagamento, 'N/D')
  END,
  updated_at = now()
FROM public.liquidacoes l
JOIN public.services s ON s.service_id = l.service_id
WHERE cf.source_type = 'recebimento'
  AND cf.source_id = l.id::text
  AND cf.description NOT LIKE 'Recebimento de ' || s.cliente || ' |%';