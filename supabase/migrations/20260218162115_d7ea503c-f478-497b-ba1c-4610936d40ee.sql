
-- Add new columns to accounts_payable for IVA and article tracking
ALTER TABLE public.accounts_payable 
  ADD COLUMN IF NOT EXISTS iva_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS article_id UUID,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0;

-- Create articles table for product catalog
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  reference_code TEXT NOT NULL,
  description TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  current_stock NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, reference_code)
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view articles" ON public.articles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert articles" ON public.articles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update articles" ON public.articles FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete articles" ON public.articles FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create stock_movements table for movement history
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  article_id UUID NOT NULL REFERENCES public.articles(id),
  movement_type TEXT NOT NULL DEFAULT 'entrada',
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  account_payable_id UUID REFERENCES public.accounts_payable(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view stock_movements" ON public.stock_movements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert stock_movements" ON public.stock_movements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update stock_movements" ON public.stock_movements FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete stock_movements" ON public.stock_movements FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add foreign key from accounts_payable to articles
ALTER TABLE public.accounts_payable 
  ADD CONSTRAINT accounts_payable_article_id_fkey 
  FOREIGN KEY (article_id) REFERENCES public.articles(id);

-- Trigger for updated_at on articles
CREATE TRIGGER update_articles_updated_at 
  BEFORE UPDATE ON public.articles 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_updated_at();
