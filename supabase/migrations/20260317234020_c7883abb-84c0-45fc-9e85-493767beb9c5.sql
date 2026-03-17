
-- =====================================================
-- SYNC CASH FLOW ON LIQUIDAÇÃO UPDATE
-- =====================================================

-- 1. Function to update cash_flow when a liquidação is updated
CREATE OR REPLACE FUNCTION public.auto_cash_flow_on_liquidacao_update()
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
  v_metodo_label text;
BEGIN
  -- Determine new flow_type
  IF NEW.forma_pagamento IN ('numerario', 'multibanco', 'transferencia') THEN
    v_flow_type := NEW.forma_pagamento;
  ELSIF NEW.forma_pagamento = 'cheque' THEN
    v_flow_type := 'numerario';
  ELSE
    v_flow_type := NULL;
  END IF;

  -- Get full service info
  SELECT empresa_id, cliente, servico, service_id, valor_com_iva, numero_fatura
  INTO v_empresa_id, v_cliente, v_servico, v_service_id_code, v_valor_com_iva, v_numero_fatura
  FROM public.services
  WHERE service_id = NEW.service_id
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
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

  -- If flow_type is NULL (unsupported payment), delete the cash flow record
  IF v_flow_type IS NULL THEN
    DELETE FROM public.cash_flows
    WHERE source_type = 'recebimento' AND source_id = NEW.id::text;
    RETURN NEW;
  END IF;

  -- Update existing cash_flow record
  UPDATE public.cash_flows
  SET
    flow_type = v_flow_type,
    amount = NEW.valor,
    description = 'Recebimento de ' || v_cliente || 
      ' | Serviço: ' || v_servico || 
      ' | Fatura: ' || COALESCE(v_numero_fatura, 'N/D') ||
      ' | Valor Total: €' || TRIM(TO_CHAR(v_valor_com_iva, '999G999D99')) ||
      ' | Pagamento: €' || TRIM(TO_CHAR(NEW.valor, '999G999D99')) ||
      ' | Método: ' || v_metodo_label,
    reference = v_service_id_code,
    transaction_date = CASE 
      WHEN NEW.data_pagamento ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(NEW.data_pagamento, 'DD/MM/YYYY')
      ELSE CURRENT_DATE
    END,
    notes = NEW.observacoes,
    updated_at = now()
  WHERE source_type = 'recebimento' AND source_id = NEW.id::text;

  -- If no row was updated (record doesn't exist), insert it
  IF NOT FOUND THEN
    INSERT INTO public.cash_flows (
      empresa_id, flow_type, movement_type, amount,
      source_type, source_id, description, reference,
      transaction_date, notes
    ) VALUES (
      v_empresa_id, v_flow_type, 'entrada', NEW.valor,
      'recebimento', NEW.id::text,
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
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Create UPDATE trigger on liquidacoes
DROP TRIGGER IF EXISTS trg_auto_cash_flow_on_liquidacao_update ON public.liquidacoes;
CREATE TRIGGER trg_auto_cash_flow_on_liquidacao_update
  AFTER UPDATE ON public.liquidacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_cash_flow_on_liquidacao_update();

-- =====================================================
-- SYNC CASH FLOW ON SERVICE UPDATE (client name, etc.)
-- =====================================================

-- 3. Function to update all cash_flow records when a service is edited
CREATE OR REPLACE FUNCTION public.auto_cash_flow_on_service_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_metodo_label text;
BEGIN
  -- Only proceed if relevant fields changed
  IF OLD.cliente = NEW.cliente 
     AND OLD.servico = NEW.servico 
     AND OLD.numero_fatura IS NOT DISTINCT FROM NEW.numero_fatura
     AND OLD.valor_com_iva = NEW.valor_com_iva THEN
    RETURN NEW;
  END IF;

  -- Update all cash_flow records linked to this service's liquidações
  FOR rec IN
    SELECT l.id, l.valor, l.forma_pagamento, l.data_pagamento, l.observacoes
    FROM public.liquidacoes l
    WHERE l.service_id = NEW.service_id
  LOOP
    v_metodo_label := CASE rec.forma_pagamento
      WHEN 'numerario' THEN 'Numerário'
      WHEN 'multibanco' THEN 'Multibanco'
      WHEN 'transferencia' THEN 'Transferência'
      WHEN 'cheque' THEN 'Cheque'
      ELSE COALESCE(rec.forma_pagamento, 'N/D')
    END;

    UPDATE public.cash_flows
    SET
      description = 'Recebimento de ' || NEW.cliente || 
        ' | Serviço: ' || NEW.servico || 
        ' | Fatura: ' || COALESCE(NEW.numero_fatura, 'N/D') ||
        ' | Valor Total: €' || TRIM(TO_CHAR(NEW.valor_com_iva, '999G999D99')) ||
        ' | Pagamento: €' || TRIM(TO_CHAR(rec.valor, '999G999D99')) ||
        ' | Método: ' || v_metodo_label,
      reference = NEW.service_id,
      updated_at = now()
    WHERE source_type = 'recebimento' AND source_id = rec.id::text;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 4. Create UPDATE trigger on services
DROP TRIGGER IF EXISTS trg_auto_cash_flow_on_service_update ON public.services;
CREATE TRIGGER trg_auto_cash_flow_on_service_update
  AFTER UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_cash_flow_on_service_update();
