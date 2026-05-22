ALTER TABLE public.marketing_tarefas
  ADD COLUMN IF NOT EXISTS review_checklist jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS review_notes text;