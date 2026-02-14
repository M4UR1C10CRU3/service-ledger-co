
-- =====================================================
-- ENRICH CASH FLOW RECORDS WITH DETAILED HISTORY
-- =====================================================

-- 1. Update ALL existing cash_flow records with rich, detailed descriptions
UPDATE public.cash_flows cf
SET description = 
  'Recebimento de ' || s.cliente || 
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
  reference = s.service_id,
  notes = CASE 
    WHEN l.observacoes IS NOT NULL AND l.observacoes != '' THEN l.observacoes
    ELSE NULL
  END
FROM public.liquidacoes l
JOIN public.services s ON l.service_id = s.service_id
WHERE cf.source_type = 'recebimento'
  AND cf.source_id = l.id::text;

-- 2. Update trigger function with enriched data for NEW liquidações
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
  v_valor_com_iva numeric;
  v_numero_fatura text;
  v_tipo_servico text;
  v_metodo_label text;
BEGIN
  -- Determine flow_type
  IF NEW.forma_pagamento IN ('numerario', 'multibanco', 'transferencia') THEN
    v_flow_type := NEW.forma_pagamento;
  ELSIF NEW.forma_pagamento = 'cheque' THEN
    v_flow_type := 'numerario';
  ELSE
    RETURN NEW;
  END IF;

  -- Get full service info
  SELECT empresa_id, cliente, servico, service_id, valor_com_iva, numero_fatura, tipo_servico
  INTO v_empresa_id, v_cliente, v_servico, v_service_id_code, v_valor_com_iva, v_numero_fatura, v_tipo_servico
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

  -- Payment method label
  v_metodo_label := CASE NEW.forma_pagamento
    WHEN 'numerario' THEN 'Numerário'
    WHEN 'multibanco' THEN 'Multibanco'
    WHEN 'transferencia' THEN 'Transferência'
    WHEN 'cheque' THEN 'Cheque'
    ELSE COALESCE(NEW.forma_pagamento, 'N/D')
  END;

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
    'Recebimento de ' || v_cliente || 
    ' | Serviço: ' || v_servico || 
    ' | Fatura: ' || COALESCE(v_numero_fatura, 'N/D') ||
    ' | Valor Total: €' || TRIM(TO_CHAR(v_valor_com_iva, '999G999D99')) ||
    ' | Pagamento: €' || TRIM(TO_CHAR(NEW.valor, '999G999D99')) ||
    ' | Método: ' || v_metodo_label,
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

-- 3. Update trigger for account payments with enriched data
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
  v_categoria text;
  v_supplier_name text;
  v_numero_documento text;
  v_metodo_label text;
BEGIN
  -- Map metodo_pagamento to flow_type
  IF NEW.metodo_pagamento IN ('numerario', 'multibanco', 'transferencia') THEN
    v_flow_type := NEW.metodo_pagamento;
  ELSIF NEW.metodo_pagamento = 'cheque' THEN
    v_flow_type := 'numerario';
  ELSE
    RETURN NEW;
  END IF;

  -- Get full account details
  SELECT ap.descricao, ap.tipo_lancamento, ap.categoria, ap.numero_documento,
         sup.razao_social
  INTO v_descricao, v_tipo_lancamento, v_categoria, v_numero_documento, v_supplier_name
  FROM public.accounts_payable ap
  LEFT JOIN public.suppliers sup ON ap.supplier_id = sup.id
  WHERE ap.id = NEW.account_payable_id
  LIMIT 1;

  -- Source type
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

  -- Payment method label
  v_metodo_label := CASE NEW.metodo_pagamento
    WHEN 'numerario' THEN 'Numerário'
    WHEN 'multibanco' THEN 'Multibanco'
    WHEN 'transferencia' THEN 'Transferência'
    WHEN 'cheque' THEN 'Cheque'
    ELSE COALESCE(NEW.metodo_pagamento, 'N/D')
  END;

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
    'Pagamento a ' || COALESCE(v_supplier_name, 'Fornecedor') ||
    ' | ' || COALESCE(v_descricao, 'Conta a pagar') ||
    ' | Categoria: ' || COALESCE(v_categoria, 'N/D') ||
    ' | Doc: ' || COALESCE(v_numero_documento, 'N/D') ||
    ' | Valor: €' || TRIM(TO_CHAR(NEW.valor_pago, '999G999D99')) ||
    ' | Método: ' || v_metodo_label,
    COALESCE(v_numero_documento, NEW.account_payable_id::text),
    NEW.data_pagamento,
    NEW.observacoes
  );

  RETURN NEW;
END;
$$;
