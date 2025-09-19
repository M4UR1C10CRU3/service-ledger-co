-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to run backup every hour
SELECT cron.schedule(
  'hourly-backup-services',
  '0 * * * *', -- every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://qeskzaodgfveidyeghbm.supabase.co/functions/v1/backup-services',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlc2t6YW9kZ2Z2ZWlkeWVnaGJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMzMwNjksImV4cCI6MjA3MzgwOTA2OX0.ZmkMokmSNUrBuYGfE0DyuY3F0NtfFJawcjicZdGUd_E"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);