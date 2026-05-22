ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS fornecedor_1_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fornecedor_2_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fornecedor_3_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preco_custo numeric(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_custo numeric(5,2) NOT NULL DEFAULT 23,
  ADD COLUMN IF NOT EXISTS margem numeric(5,2) NOT NULL DEFAULT 30;