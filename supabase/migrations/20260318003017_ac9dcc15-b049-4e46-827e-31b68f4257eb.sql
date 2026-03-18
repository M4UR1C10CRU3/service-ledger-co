
-- Add missing DELETE and UPDATE RLS policies on stock_movimentos
CREATE POLICY "Authenticated users can delete stock_movimentos"
  ON public.stock_movimentos
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stock_movimentos"
  ON public.stock_movimentos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
