-- Add items column to store line item details (backward compatible)
ALTER TABLE public.accounts_payable
ADD COLUMN items jsonb DEFAULT NULL;