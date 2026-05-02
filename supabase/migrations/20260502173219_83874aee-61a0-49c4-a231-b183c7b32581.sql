ALTER TABLE public.marketing_editorial_entregas
  ADD COLUMN IF NOT EXISTS tarefa_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_med_tarefa_id ON public.marketing_editorial_entregas(tarefa_id);