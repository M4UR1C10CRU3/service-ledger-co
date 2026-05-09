
-- 1. Add new columns to marketing_tarefas
ALTER TABLE public.marketing_tarefas
  ADD COLUMN IF NOT EXISTS revisor_id uuid,
  ADD COLUMN IF NOT EXISTS revisor_nome text,
  ADD COLUMN IF NOT EXISTS agendador_id uuid,
  ADD COLUMN IF NOT EXISTS agendador_nome text,
  ADD COLUMN IF NOT EXISTS agendamento_confirmado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agendamento_horarios jsonb;

-- 2. Enable pg_cron and pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Schedule the auto-publish job (every 5 minutes)
DO $$
BEGIN
  PERFORM cron.unschedule('marketing-auto-publish');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'marketing-auto-publish',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qeskzaodgfveidyeghbm.supabase.co/functions/v1/marketing-publish-scheduled',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlc2t6YW9kZ2Z2ZWlkeWVnaGJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMzMwNjksImV4cCI6MjA3MzgwOTA2OX0.ZmkMokmSNUrBuYGfE0DyuY3F0NtfFJawcjicZdGUd_E"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);
