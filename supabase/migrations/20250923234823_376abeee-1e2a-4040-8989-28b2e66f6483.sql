-- Adicionar novos campos à tabela services
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS data_liquidacao TEXT,
ADD COLUMN IF NOT EXISTS liquidacao_total BOOLEAN DEFAULT true;

-- Tornar a coluna proposta opcional (NULL)
ALTER TABLE public.services 
ALTER COLUMN proposta DROP NOT NULL;