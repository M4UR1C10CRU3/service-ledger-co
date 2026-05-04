ALTER TABLE public.marketing_tarefas
  ADD COLUMN IF NOT EXISTS hora_briefing time without time zone,
  ADD COLUMN IF NOT EXISTS hora_criacao time without time zone,
  ADD COLUMN IF NOT EXISTS hora_revisao time without time zone,
  ADD COLUMN IF NOT EXISTS hora_aprovacao time without time zone;