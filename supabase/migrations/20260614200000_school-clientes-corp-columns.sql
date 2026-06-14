-- Fix school_clientes_corp: alinhar colunas com o que o React espera
-- nif_cnpj → cnpj, contato_nome → responsavel, morada → endereco
-- Adicionar cargo_responsavel
-- Não-destrutivo: ADD COLUMN + copy + DROP old

-- 1. Adicionar colunas novas
ALTER TABLE public.school_clientes_corp
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS cargo_responsavel text,
  ADD COLUMN IF NOT EXISTS endereco text;

-- 2. Copiar dados das colunas antigas para as novas
UPDATE public.school_clientes_corp
SET
  cnpj       = nif_cnpj,
  responsavel = contato_nome,
  endereco   = morada
WHERE cnpj IS NULL OR responsavel IS NULL OR endereco IS NULL;

-- 3. Remover colunas antigas (já copiadas)
-- auth_user_id mantida: referenciada por políticas RLS
ALTER TABLE public.school_clientes_corp
  DROP COLUMN IF EXISTS nif_cnpj,
  DROP COLUMN IF EXISTS contato_nome,
  DROP COLUMN IF EXISTS morada;
