
-- Add per-day hours schedule to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS daily_hours_schedule jsonb;
-- Example value: {"monday": 7.5, "tuesday": 7.5, "wednesday": 7.5, "thursday": 7.5, "friday": 7.5, "saturday": 2.5, "sunday": 0}

-- Update the trigger function to support per-day expected hours
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
  v_daily_hours_schedule jsonb;
  v_day_name text;
  v_is_company_holiday boolean := false;
BEGIN
  -- Get employee schedule
  SELECT workdays_per_week, work_schedule, daily_hours_schedule
  INTO v_workdays, v_work_schedule, v_daily_hours_schedule
  FROM public.employees
  WHERE id = NEW.employee_id;

  v_workdays := COALESCE(v_workdays, 5);

  -- Day name for schedule lookup
  v_day_name := CASE EXTRACT(DOW FROM NEW.record_date)
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;

  -- Determine expected hours: per-day schedule takes priority over uniform calculation
  IF v_daily_hours_schedule IS NOT NULL AND v_daily_hours_schedule ? v_day_name THEN
    v_expected := COALESCE((v_daily_hours_schedule->>v_day_name)::numeric, 0);
  ELSE
    v_expected := 40.0 / v_workdays;
    -- If work_schedule says this day is off, expected = 0
    IF v_work_schedule IS NOT NULL AND (v_work_schedule->>v_day_name)::boolean = false THEN
      v_expected := 0;
    END IF;
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
    IF NEW.entry_time IS NOT NULL AND NEW.exit_time IS NOT NULL THEN
      IF NEW.lunch_exit_time IS NOT NULL AND NEW.lunch_return_time IS NOT NULL THEN
        v_morning_hours := EXTRACT(EPOCH FROM (NEW.lunch_exit_time - NEW.entry_time)) / 3600.0;
        v_afternoon_hours := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.lunch_return_time)) / 3600.0;
        v_total_hours := GREATEST(v_morning_hours, 0) + GREATEST(v_afternoon_hours, 0);
      ELSE
        v_total_hours := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time)) / 3600.0;
      END IF;
    END IF;
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
      NEW.worked_hours := 0;
      NEW.expected_hours := 0;
      NEW.balance := 0;
    ELSE
      NEW.expected_hours := ROUND(v_expected / 2.0, 2);
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

  -- If not a work day (expected = 0)
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

-- Set Daniel de Oliveira Garcia's per-day schedule: Mon-Fri 7.5h, Sat 2.5h
UPDATE public.employees
SET daily_hours_schedule = '{"monday": 7.5, "tuesday": 7.5, "wednesday": 7.5, "thursday": 7.5, "friday": 7.5, "saturday": 2.5, "sunday": 0}'::jsonb
WHERE full_name = 'Daniel de Oliveira Garcia';

-- Recalculate all existing time records for employees with daily_hours_schedule
-- (touch each record to re-trigger the calculation)
UPDATE public.time_records tr
SET updated_at = now()
FROM public.employees e
WHERE tr.employee_id = e.id
  AND e.daily_hours_schedule IS NOT NULL;
