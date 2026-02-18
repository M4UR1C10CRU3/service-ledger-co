
-- Add Portuguese-specific fields to suppliers
ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS swift_bic text,
  ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Portugal',
  ADD COLUMN IF NOT EXISTS gamas text[] DEFAULT '{}';

-- Create index for gamas filtering
CREATE INDEX IF NOT EXISTS idx_suppliers_gamas ON public.suppliers USING GIN(gamas);
