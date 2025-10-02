-- Fix search_path for calcular_valor_faturado function
CREATE OR REPLACE FUNCTION public.calcular_valor_faturado(contrato_service_id text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_faturado NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(valor_com_iva), 0) INTO total_faturado
    FROM public.services
    WHERE contrato_id = contrato_service_id AND tipo_servico = 'fatura';
    
    RETURN total_faturado;
END;
$$;

-- Fix search_path for update_valor_faturado function
CREATE OR REPLACE FUNCTION public.update_valor_faturado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se for uma fatura, atualizar o contrato pai
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.tipo_servico = 'fatura' AND NEW.contrato_id IS NOT NULL THEN
        UPDATE public.services 
        SET valor_faturado = calcular_valor_faturado(NEW.contrato_id)
        WHERE service_id = NEW.contrato_id;
    END IF;
    
    -- Se for um DELETE, atualizar o contrato pai usando OLD
    IF TG_OP = 'DELETE' AND OLD.tipo_servico = 'fatura' AND OLD.contrato_id IS NOT NULL THEN
        UPDATE public.services 
        SET valor_faturado = calcular_valor_faturado(OLD.contrato_id)
        WHERE service_id = OLD.contrato_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;