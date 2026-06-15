-- Adicionar colunas em falta em school_alunos
-- Não-destrutivo: ADD COLUMN IF NOT EXISTS
ALTER TABLE public.school_alunos
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS empresa_trabalho text,
  ADD COLUMN IF NOT EXISTS foto_url text;

-- Sincronizar status com o campo ativo existente
UPDATE public.school_alunos
SET status = CASE WHEN ativo THEN 'ativo' ELSE 'inativo' END
WHERE status IS NULL OR status = '';
