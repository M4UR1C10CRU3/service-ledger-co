-- Adicionar colunas em falta em school_docentes
-- Não-destrutivo: ADD COLUMN IF NOT EXISTS
ALTER TABLE public.school_docentes
  ADD COLUMN IF NOT EXISTS tempo_experiencia text,
  ADD COLUMN IF NOT EXISTS cursos_ids uuid[] DEFAULT '{}';
