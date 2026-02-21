
-- Trigger function to update cash_flows when account_payments is updated
CREATE OR REPLACE FUNCTION public.auto_cash_flow_on_account_payment_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_flow_type := 'numerario'; -- fallback
  END IF;

  -- Get account details
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

  -- Payment method label
  v_metodo_label := CASE NEW.metodo_pagamento
    WHEN 'numerario' THEN 'Numerário'
    WHEN 'multibanco' THEN 'Multibanco'
    WHEN 'transferencia' THEN 'Transferência'
    WHEN 'cheque' THEN 'Cheque'
    ELSE COALESCE(NEW.metodo_pagamento, 'N/D')
  END;

  -- Update the corresponding cash_flows record
  UPDATE public.cash_flows
  SET flow_type = v_flow_type,
      amount = NEW.valor_pago,
      source_type = v_source_type,
      description = 'Pagamento a ' || COALESCE(v_supplier_name, 'Fornecedor') ||
        ' | ' || COALESCE(v_descricao, 'Conta a pagar') ||
        ' | Categoria: ' || COALESCE(v_categoria, 'N/D') ||
        ' | Doc: ' || COALESCE(v_numero_documento, 'N/D') ||
        ' | Valor: €' || TRIM(TO_CHAR(NEW.valor_pago, '999G999D99')) ||
        ' | Método: ' || v_metodo_label,
      transaction_date = NEW.data_pagamento,
      notes = NEW.observacoes,
      updated_at = now()
  WHERE source_id = NEW.id::text
    AND source_type IN ('pagamento_fornecedor', 'pagamento_despesa');

  RETURN NEW;
END;
$function$;

-- Create the UPDATE trigger on account_payments
CREATE TRIGGER trg_auto_cash_flow_on_account_payment_update
  AFTER UPDATE ON public.account_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_cash_flow_on_account_payment_update();
