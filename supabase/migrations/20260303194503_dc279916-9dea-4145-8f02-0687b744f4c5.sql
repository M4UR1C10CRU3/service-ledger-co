
-- Stock atual table
CREATE TABLE public.stock_atual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  produto_ref TEXT NOT NULL,
  produto_desc TEXT,
  categoria TEXT,
  unidade TEXT,
  quantidade_atual DECIMAL(10,3) DEFAULT 0,
  stock_minimo DECIMAL(10,3) DEFAULT 0,
  ultimo_preco DECIMAL(10,4),
  ultima_entrada TIMESTAMP WITH TIME ZONE,
  ultima_saida TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, produto_ref)
);

-- Stock movimentos table
CREATE TABLE public.stock_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  produto_ref TEXT NOT NULL,
  produto_desc TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade DECIMAL(10,3) NOT NULL,
  custo_unitario DECIMAL(10,4),
  origem TEXT,
  referencia_doc TEXT,
  compra_id UUID REFERENCES public.accounts_payable(id),
  observacoes TEXT,
  utilizador_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies for stock_atual
ALTER TABLE public.stock_atual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock_atual" ON public.stock_atual
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert stock_atual" ON public.stock_atual
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update stock_atual" ON public.stock_atual
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete stock_atual" ON public.stock_atual
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- RLS policies for stock_movimentos
ALTER TABLE public.stock_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock_movimentos" ON public.stock_movimentos
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert stock_movimentos" ON public.stock_movimentos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Updated_at trigger for stock_atual
CREATE TRIGGER update_stock_atual_updated_at
  BEFORE UPDATE ON public.stock_atual
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
