
-- Add venda_id column to stock_movimentos to link material usage to sales/services
ALTER TABLE public.stock_movimentos 
ADD COLUMN IF NOT EXISTS venda_id uuid REFERENCES public.services(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stock_movimentos_venda_id ON public.stock_movimentos(venda_id);
