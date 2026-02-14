
-- Tabela principal de fluxos de caixa
CREATE TABLE public.cash_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  
  -- Tipo de fluxo
  flow_type TEXT NOT NULL CHECK (flow_type IN ('numerario', 'multibanco', 'transferencia')),
  
  -- Tipo de movimentação
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida')),
  
  -- Valor
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  
  -- Origem da movimentação
  source_type TEXT NOT NULL CHECK (source_type IN ('venda', 'recebimento', 'pagamento_fornecedor', 'pagamento_despesa', 'ajuste_manual', 'sangria', 'reforco', 'transferencia_interna')),
  source_id TEXT, -- ID do serviço, conta a pagar, etc
  
  -- Detalhes
  description TEXT NOT NULL,
  reference TEXT,
  
  -- Data
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Notas
  notes TEXT,
  
  -- Saldo após operação
  balance_after NUMERIC(15,2) DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_cash_flows_empresa ON public.cash_flows(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cash_flows_type ON public.cash_flows(flow_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_cash_flows_date ON public.cash_flows(transaction_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_cash_flows_source ON public.cash_flows(source_type, source_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.cash_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cash_flows"
ON public.cash_flows FOR SELECT
USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert cash_flows"
ON public.cash_flows FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cash_flows"
ON public.cash_flows FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cash_flows"
ON public.cash_flows FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER update_cash_flows_updated_at
BEFORE UPDATE ON public.cash_flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular saldo de um fluxo até uma data
CREATE OR REPLACE FUNCTION public.calculate_flow_balance(
  p_empresa_id UUID,
  p_flow_type TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN movement_type = 'entrada' THEN amount
      WHEN movement_type = 'saida' THEN -amount
    END
  ), 0)
  INTO v_balance
  FROM public.cash_flows
  WHERE empresa_id = p_empresa_id
    AND flow_type = p_flow_type
    AND transaction_date <= p_date
    AND deleted_at IS NULL;
    
  RETURN v_balance;
END;
$$;
