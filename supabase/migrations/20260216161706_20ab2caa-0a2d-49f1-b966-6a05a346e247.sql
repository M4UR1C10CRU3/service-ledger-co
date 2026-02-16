
-- Add default schedule time columns to employees
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS default_entry_time time without time zone DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS default_lunch_exit_time time without time zone DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS default_lunch_return_time time without time zone DEFAULT '13:00',
  ADD COLUMN IF NOT EXISTS default_exit_time time without time zone DEFAULT '17:00';

COMMENT ON COLUMN public.employees.default_entry_time IS 'Horário padrão de entrada';
COMMENT ON COLUMN public.employees.default_lunch_exit_time IS 'Horário padrão de saída para almoço';
COMMENT ON COLUMN public.employees.default_lunch_return_time IS 'Horário padrão de retorno do almoço';
COMMENT ON COLUMN public.employees.default_exit_time IS 'Horário padrão de saída';
