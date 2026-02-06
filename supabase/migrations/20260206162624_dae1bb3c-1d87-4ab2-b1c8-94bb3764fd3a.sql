-- Add contrato (contract reference number) column to services table
ALTER TABLE public.services ADD COLUMN contrato text DEFAULT NULL;