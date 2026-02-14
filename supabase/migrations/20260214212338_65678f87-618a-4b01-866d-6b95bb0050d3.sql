
-- =====================================================
-- MIGRATE HISTORICAL LIQUIDAÇÕES TO CASH_FLOWS
-- AND CREATE TRIGGERS FOR AUTOMATION
-- =====================================================

-- 1. Populate cash_flows from existing liquidacoes
-- Only those with a valid forma_pagamento (numerario, multibanco, transferencia)
-- data_pagamento is stored as text DD/MM/YYYY, convert to date
INSERT INTO public.cash_flows (
  empresa_id,
  flow_type,
  movement_type,
  amount,
  source_type,
  source_id,
  description,
  reference,
  transaction_date,
  notes,
  created_at
)
SELECT 
  s.empresa_id,
  l.forma_pagamento as flow_type,
  'entrada' as movement_type,
  l.valor as amount,
  'recebimento' as source_type,
  l.id::text as source_id,
  'Recebimento - ' || s.cliente || ' (' || s.servico || ')' as description,
  s.service_id as reference,
  TO_DATE(l.data_pagamento, 'DD/MM/YYYY') as transaction_date,
  l.observacoes as notes,
  l.created_at
FROM public.liquidacoes l
JOIN public.services s ON l.service_id = s.service_id
WHERE l.forma_pagamento IN ('numerario', 'multibanco', 'transferencia')
  AND l.valor > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.cash_flows cf 
    WHERE cf.source_type = 'recebimento' 
    AND cf.source_id = l.id::text
  )
ORDER BY l.created_at ASC;

-- 2. Also migrate cheque payments as 'numerario' (closest match)
INSERT INTO public.cash_flows (
  empresa_id,
  flow_type,
  movement_type,
  amount,
  source_type,
  source_id,
  description,
  reference,
  transaction_date,
  notes,
  created_at
)
SELECT 
  s.empresa_id,
  'numerario' as flow_type,
  'entrada' as movement_type,
  l.valor as amount,
  'recebimento' as source_type,
  l.id::text as source_id,
  'Recebimento (Cheque) - ' || s.cliente || ' (' || s.servico || ')' as description,
  s.service_id as reference,
  TO_DATE(l.data_pagamento, 'DD/MM/YYYY') as transaction_date,
  COALESCE(l.observacoes, '') || ' [Cheque]' as notes,
  l.created_at
FROM public.liquidacoes l
JOIN public.services s ON l.service_id = s.service_id
WHERE l.forma_pagamento = 'cheque'
  AND l.valor > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.cash_flows cf 
    WHERE cf.source_type = 'recebimento' 
    AND cf.source_id = l.id::text
  )
ORDER BY l.created_at ASC;

-- 3. Create trigger function: auto-create cash_flow on new liquidação
CREATE OR REPLACE FUNCTION public.auto_cash_flow_on_liquidacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_cliente text;
  v_servico text;
  v_service_id_code text;
  v_flow_type text;
BEGIN
  -- Determine flow_type from forma_pagamento
  IF NEW.forma_pagamento IN ('numerario', 'multibanco', 'transferencia') THEN
    v_flow_type := NEW.forma_pagamento;
  ELSIF NEW.forma_pagamento = 'cheque' THEN
    v_flow_type := 'numerario';
  ELSE
    -- No valid payment method for cash flow, skip
    RETURN NEW;
  END IF;

  -- Get service info
  SELECT empresa_id, cliente, servico, service_id
  INTO v_empresa_id, v_cliente, v_servico, v_service_id_code
  FROM public.services
  WHERE service_id = NEW.service_id
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicates
  IF EXISTS (
    SELECT 1 FROM public.cash_flows
    WHERE source_type = 'recebimento' AND source_id = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.cash_flows (
    empresa_id, flow_type, movement_type, amount,
    source_type, source_id, description, reference,
    transaction_date, notes
  ) VALUES (
    v_empresa_id,
    v_flow_type,
    'entrada',
    NEW.valor,
    'recebimento',
    NEW.id::text,
    'Recebimento - ' || v_cliente || ' (' || v_servico || ')',
    v_service_id_code,
    CASE 
      WHEN NEW.data_pagamento ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(NEW.data_pagamento, 'DD/MM/YYYY')
      ELSE CURRENT_DATE
    END,
    NEW.observacoes
  );

  RETURN NEW;
END;
$$;

-- 4. Create trigger on liquidacoes table
DROP TRIGGER IF EXISTS trigger_cash_flow_on_liquidacao ON public.liquidacoes;
CREATE TRIGGER trigger_cash_flow_on_liquidacao
  AFTER INSERT ON public.liquidacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_cash_flow_on_liquidacao();

-- 5. Create trigger function: auto-create cash_flow on account payment
CREATE OR REPLACE FUNCTION public.auto_cash_flow_on_account_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flow_type text;
  v_descricao text;
  v_tipo_lancamento text;
  v_source_type text;
BEGIN
  -- Map metodo_pagamento to flow_type
  IF NEW.metodo_pagamento IN ('numerario', 'multibanco', 'transferencia') THEN
    v_flow_type := NEW.metodo_pagamento;
  ELSIF NEW.metodo_pagamento = 'cheque' THEN
    v_flow_type := 'numerario';
  ELSE
    RETURN NEW;
  END IF;

  -- Get account details
  SELECT descricao, tipo_lancamento
  INTO v_descricao, v_tipo_lancamento
  FROM public.accounts_payable
  WHERE id = NEW.account_payable_id
  LIMIT 1;

  -- Determine source_type
  IF v_tipo_lancamento = 'compra' THEN
    v_source_type := 'pagamento_fornecedor';
  ELSE
    v_source_type := 'pagamento_despesa';
  END IF;

  -- Avoid duplicates
  IF EXISTS (
    SELECT 1 FROM public.cash_flows
    WHERE source_type IN ('pagamento_fornecedor', 'pagamento_despesa')
    AND source_id = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.cash_flows (
    empresa_id, flow_type, movement_type, amount,
    source_type, source_id, description, reference,
    transaction_date, notes
  ) VALUES (
    NEW.empresa_id,
    v_flow_type,
    'saida',
    NEW.valor_pago,
    v_source_type,
    NEW.id::text,
    'Pagamento - ' || COALESCE(v_descricao, 'Conta a pagar'),
    NEW.account_payable_id::text,
    NEW.data_pagamento,
    NEW.observacoes
  );

  RETURN NEW;
END;
$$;

-- 6. Create trigger on account_payments table
DROP TRIGGER IF EXISTS trigger_cash_flow_on_account_payment ON public.account_payments;
CREATE TRIGGER trigger_cash_flow_on_account_payment
  AFTER INSERT ON public.account_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_cash_flow_on_account_payment();
