
-- 1. Create feriados table for company-wide holidays
CREATE TABLE public.feriados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, data)
);

ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view feriados" ON public.feriados
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert feriados" ON public.feriados
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update feriados" ON public.feriados
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete feriados" ON public.feriados
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 2. Add folga_tipo column to time_records for partial/full day off
ALTER TABLE public.time_records ADD COLUMN IF NOT EXISTS folga_tipo TEXT DEFAULT 'total';
-- values: 'total' (full day off), 'manha' (morning off), 'tarde' (afternoon off)

-- 3. Update the trigger function to handle:
--    - feriado: if employee works, all hours = overtime, expected = 0
--    - folga parcial: half-day expected hours
CREATE OR REPLACE FUNCTION public.calculate_time_record_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_morning_hours numeric(5,2) := 0;
  v_afternoon_hours numeric(5,2) := 0;
  v_total_hours numeric(5,2) := 0;
  v_expected numeric(4,2);
  v_workdays integer;
  v_work_schedule jsonb;
  v_day_name text;
  v_is_company_holiday boolean := false;
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

  -- Check if this date is a company holiday
  SELECT EXISTS (
    SELECT 1 FROM public.feriados
    WHERE empresa_id = NEW.empresa_id AND data = NEW.record_date
  ) INTO v_is_company_holiday;

  -- Auto-set day_type to feriado if it's a company holiday and type is normal
  IF v_is_company_holiday AND NEW.day_type = 'normal' THEN
    NEW.day_type := 'feriado';
  END IF;

  NEW.expected_hours := v_expected;

  -- FERIADO: day is "abonado" (paid off), but if employee works, hours count as overtime
  IF NEW.day_type = 'feriado' THEN
    -- Calculate worked hours normally
    IF NEW.entry_time IS NOT NULL AND NEW.exit_time IS NOT NULL THEN
      IF NEW.lunch_exit_time IS NOT NULL AND NEW.lunch_return_time IS NOT NULL THEN
        v_morning_hours := EXTRACT(EPOCH FROM (NEW.lunch_exit_time - NEW.entry_time)) / 3600.0;
        v_afternoon_hours := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.lunch_return_time)) / 3600.0;
        v_total_hours := GREATEST(v_morning_hours, 0) + GREATEST(v_afternoon_hours, 0);
      ELSE
        v_total_hours := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time)) / 3600.0;
      END IF;
    END IF;
    
    -- All worked hours on a holiday are overtime
    NEW.worked_hours := ROUND(v_total_hours, 2);
    NEW.overtime_hours := ROUND(v_total_hours, 2);
    NEW.expected_hours := 0;
    NEW.balance := ROUND(v_total_hours, 2);
    RETURN NEW;
  END IF;

  -- FÉRIAS, FALTA: full day off, no work expected but counts against balance
  IF NEW.day_type IN ('ferias', 'falta') THEN
    NEW.worked_hours := 0;
    NEW.balance := 0 - v_expected;
    RETURN NEW;
  END IF;

  -- FOLGA / LIBERAÇÃO: check for partial
  IF NEW.day_type IN ('folga', 'liberacao') THEN
    IF COALESCE(NEW.folga_tipo, 'total') = 'total' THEN
      -- Full day off
      NEW.worked_hours := 0;
      NEW.expected_hours := 0;
      NEW.balance := 0;
    ELSE
      -- Partial: half day expected
      NEW.expected_hours := ROUND(v_expected / 2.0, 2);
      
      -- Calculate worked hours if times provided
      IF NEW.entry_time IS NOT NULL AND NEW.exit_time IS NOT NULL THEN
        IF NEW.lunch_exit_time IS NOT NULL AND NEW.lunch_return_time IS NOT NULL THEN
          v_morning_hours := EXTRACT(EPOCH FROM (NEW.lunch_exit_time - NEW.entry_time)) / 3600.0;
          v_afternoon_hours := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.lunch_return_time)) / 3600.0;
          v_total_hours := GREATEST(v_morning_hours, 0) + GREATEST(v_afternoon_hours, 0);
        ELSE
          v_total_hours := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time)) / 3600.0;
        END IF;
      END IF;
      
      v_total_hours := v_total_hours + COALESCE(NEW.overtime_hours, 0);
      NEW.worked_hours := ROUND(v_total_hours, 2);
      NEW.balance := ROUND(v_total_hours - NEW.expected_hours, 2);
    END IF;
    RETURN NEW;
  END IF;

  -- If not a work day
  IF v_expected = 0 THEN
    NEW.worked_hours := 0;
    NEW.balance := 0;
    RETURN NEW;
  END IF;

  -- NORMAL day calculation
  IF NEW.entry_time IS NOT NULL AND NEW.lunch_exit_time IS NOT NULL THEN
    v_morning_hours := EXTRACT(EPOCH FROM (NEW.lunch_exit_time - NEW.entry_time)) / 3600.0;
  END IF;

  IF NEW.lunch_return_time IS NOT NULL AND NEW.exit_time IS NOT NULL THEN
    v_afternoon_hours := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.lunch_return_time)) / 3600.0;
  END IF;

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
$function$;
