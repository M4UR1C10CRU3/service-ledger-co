-- Allow anyone to view empresas (needed for the selection screen before login)
CREATE POLICY "Anyone can view empresas"
ON public.empresas
FOR SELECT
USING (true);

-- Drop the old restrictive policy
DROP POLICY "Authenticated users can view empresas" ON public.empresas;