-- Adicionar campos de contacto à tabela services
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS telefone text,
ADD COLUMN IF NOT EXISTS email text;