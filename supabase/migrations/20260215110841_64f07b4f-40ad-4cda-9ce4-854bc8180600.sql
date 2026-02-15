
-- Add schedule configuration columns to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS workdays_per_week integer DEFAULT 5;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS daily_hours numeric(4,2);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS work_schedule jsonb DEFAULT '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}'::jsonb;

-- Update existing employees with default daily_hours
UPDATE public.employees SET daily_hours = 8.00 WHERE daily_hours IS NULL;

-- Create time_records table
CREATE TABLE IF NOT EXISTS public.time_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_time time,
  lunch_exit_time time,
  lunch_return_time time,
  exit_time time,
  worked_hours numeric(5,2) DEFAULT 0,
  expected_hours numeric(4,2) DEFAULT 8.00,
  overtime_hours numeric(4,2) DEFAULT 0,
  balance numeric(5,2) DEFAULT 0,
  day_type text NOT NULL DEFAULT 'normal',
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, record_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_records_empresa ON public.time_records(empresa_id);
CREATE INDEX IF NOT EXISTS idx_time_records_employee ON public.time_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_records_date ON public.time_records(record_date);
CREATE INDEX IF NOT EXISTS idx_time_records_employee_date ON public.time_records(employee_id, record_date);

-- Enable RLS
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view time_records"
  ON public.time_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert time_records"
  ON public.time_records FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update time_records"
  ON public.time_records FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete time_records"
  ON public.time_records FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_time_records_updated_at
  BEFORE UPDATE ON public.time_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to calculate worked hours on insert/update
CREATE OR REPLACE FUNCTION public.calculate_time_record_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_morning_hours numeric(5,2) := 0;
  v_afternoon_hours numeric(5,2) := 0;
  v_total_hours numeric(5,2) := 0;
  v_expected numeric(4,2);
  v_workdays integer;
  v_work_schedule jsonb;
  v_day_name text;
BEGIN
  -- Get employee schedule
  SELECT workdays_per_week, work_schedule
  INTO v_workdays, v_work_schedule
  FROM public.employees
  WHERE id = NEW.employee_id;

  v_workdays := COALESCE(v_workdays, 5);
  v_expected := 40.0 / v_workdays;

  -- Check if employee should work this day
  v_day_name := CASE EXTRACT(DOW FROM NEW.record_date)
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;

  IF v_work_schedule IS NOT NULL AND (v_work_schedule->>v_day_name)::boolean = false THEN
    v_expected := 0;
  END IF;

  NEW.expected_hours := v_expected;

  -- If special day type, set worked hours accordingly
  IF NEW.day_type IN ('feriado', 'ferias', 'folga', 'falta', 'liberacao') THEN
    NEW.worked_hours := 0;
    NEW.balance := 0 - v_expected;
    RETURN NEW;
  END IF;

  -- If not a work day
  IF v_expected = 0 THEN
    NEW.worked_hours := 0;
    NEW.balance := 0;
    RETURN NEW;
  END IF;

  -- Calculate morning hours
  IF NEW.entry_time IS NOT NULL AND NEW.lunch_exit_time IS NOT NULL THEN
    v_morning_hours := EXTRACT(EPOCH FROM (NEW.lunch_exit_time - NEW.entry_time)) / 3600.0;
  END IF;

  -- Calculate afternoon hours
  IF NEW.lunch_return_time IS NOT NULL AND NEW.exit_time IS NOT NULL THEN
    v_afternoon_hours := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.lunch_return_time)) / 3600.0;
  END IF;

  -- If only entry and exit (no lunch break recorded)
  IF NEW.entry_time IS NOT NULL AND NEW.exit_time IS NOT NULL 
     AND NEW.lunch_exit_time IS NULL AND NEW.lunch_return_time IS NULL THEN
    v_total_hours := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time)) / 3600.0;
  ELSE
    v_total_hours := GREATEST(v_morning_hours, 0) + GREATEST(v_afternoon_hours, 0);
  END IF;

  v_total_hours := v_total_hours + COALESCE(NEW.overtime_hours, 0);

  NEW.worked_hours := ROUND(v_total_hours, 2);
  NEW.balance := ROUND(v_total_hours - v_expected, 2);

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER calculate_time_record_hours_trigger
  BEFORE INSERT OR UPDATE ON public.time_records
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_time_record_hours();
