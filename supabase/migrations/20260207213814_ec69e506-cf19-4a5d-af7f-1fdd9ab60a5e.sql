
-- Create accounts_payable table
CREATE TABLE public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  
  -- Tipo e categoria
  tipo_lancamento TEXT NOT NULL CHECK (tipo_lancamento IN ('compra', 'despesa_fixa', 'custo_investimento')),
  categoria TEXT NOT NULL,
  descricao TEXT,
  numero_documento TEXT,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Valores
  valor_bruto NUMERIC NOT NULL DEFAULT 0,
  desconto NUMERIC NOT NULL DEFAULT 0,
  acrescimo NUMERIC NOT NULL DEFAULT 0,
  valor_liquido NUMERIC NOT NULL DEFAULT 0,
  
  -- Pagamento
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('a_vista', 'a_prazo')),
  data_pagamento DATE,
  data_vencimento DATE,
  metodo_pagamento TEXT,
  comprovante_url TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'liquidado', 'vencido', 'cancelado')),
  
  -- Extras
  centro_custo TEXT,
  projeto TEXT,
  observacoes TEXT,
  vincular_estoque BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view accounts_payable"
ON public.accounts_payable FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert accounts_payable"
ON public.accounts_payable FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update accounts_payable"
ON public.accounts_payable FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete accounts_payable"
ON public.accounts_payable FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_accounts_payable_updated_at
BEFORE UPDATE ON public.accounts_payable
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_accounts_payable_empresa_id ON public.accounts_payable(empresa_id);
CREATE INDEX idx_accounts_payable_supplier_id ON public.accounts_payable(supplier_id);
CREATE INDEX idx_accounts_payable_status ON public.accounts_payable(status);
CREATE INDEX idx_accounts_payable_data_vencimento ON public.accounts_payable(data_vencimento);
CREATE INDEX idx_accounts_payable_tipo ON public.accounts_payable(tipo_lancamento);
