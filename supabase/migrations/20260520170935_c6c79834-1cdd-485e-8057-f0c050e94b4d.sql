-- Recalcular expected_hours em registos existentes para refletir daily_hours_schedule atual
UPDATE public.time_records SET updated_at = now();