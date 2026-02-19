-- Fix forma_pagamento check constraint to accept new values
ALTER TABLE public.accounts_payable DROP CONSTRAINT accounts_payable_forma_pagamento_check;
ALTER TABLE public.accounts_payable ADD CONSTRAINT accounts_payable_forma_pagamento_check 
  CHECK (forma_pagamento = ANY (ARRAY['a_vista'::text, 'a_prazo'::text, 'imediato'::text, 'a_credito'::text]));

-- Fix tipo_lancamento check constraint to accept new values
ALTER TABLE public.accounts_payable DROP CONSTRAINT accounts_payable_tipo_lancamento_check;
ALTER TABLE public.accounts_payable ADD CONSTRAINT accounts_payable_tipo_lancamento_check 
  CHECK (tipo_lancamento = ANY (ARRAY['compra'::text, 'despesa_fixa'::text, 'custo_investimento'::text, 'compra_revenda'::text, 'despesa'::text]));

-- Fix status check to include 'parcial'
ALTER TABLE public.accounts_payable DROP CONSTRAINT accounts_payable_status_check;
ALTER TABLE public.accounts_payable ADD CONSTRAINT accounts_payable_status_check 
  CHECK (status = ANY (ARRAY['pendente'::text, 'liquidado'::text, 'vencido'::text, 'cancelado'::text, 'parcial'::text]));

-- Make suppliers visible to all companies: update RLS SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
CREATE POLICY "Authenticated users can view suppliers" 
  ON public.suppliers FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);