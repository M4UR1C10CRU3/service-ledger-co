-- Adicionar coluna forma_pagamento na tabela liquidacoes
ALTER TABLE public.liquidacoes 
ADD COLUMN IF NOT EXISTS forma_pagamento text;