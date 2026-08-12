-- Align older meter_readings schemas with staff Assign Reading.
-- Safe to re-run. Apply in the Supabase SQL editor if assignments fail with
-- "The meter readings tables have not been set up yet" (that toast is also
-- shown for leftover NOT NULL constraints on current_reading / reading_date).

ALTER TABLE public.meter_readings
  ALTER COLUMN current_reading DROP NOT NULL,
  ALTER COLUMN reading_date DROP NOT NULL,
  ALTER COLUMN meter_id DROP NOT NULL,
  ALTER COLUMN previous_reading SET DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meter_readings'
      AND column_name = 'reading_date'
      AND data_type = 'date'
  ) THEN
    ALTER TABLE public.meter_readings
      ALTER COLUMN reading_date TYPE timestamptz
      USING reading_date::timestamptz;
  END IF;
END $$;
