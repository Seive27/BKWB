-- Scheduled publish time for announcements.
-- Safe to re-run. Apply in the Supabase SQL editor if the full migration
-- has already been applied previously.

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS announcements_created_by_idx
  ON public.announcements (created_by);

CREATE INDEX IF NOT EXISTS announcements_active_created_at_idx
  ON public.announcements (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS announcements_published_feed_idx
  ON public.announcements (created_at DESC)
  WHERE deleted_at IS NULL AND is_published = TRUE;

CREATE OR REPLACE FUNCTION public.validate_announcement_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Expiration must be in the future.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.scheduled_at IS NOT NULL AND NEW.scheduled_at <= NOW() THEN
      RAISE EXCEPTION 'Schedule time must be in the future.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
       AND NEW.scheduled_at IS NOT NULL
       AND NEW.scheduled_at <= NOW() THEN
      RAISE EXCEPTION 'Schedule time must be in the future.';
    END IF;
  END IF;

  IF NEW.scheduled_at IS NOT NULL AND NEW.expires_at IS NOT NULL
     AND NEW.expires_at <= NEW.scheduled_at THEN
    RAISE EXCEPTION 'Expiration must be after the scheduled publish time.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_announcement_dates ON public.announcements;
CREATE TRIGGER on_announcement_dates
  BEFORE INSERT OR UPDATE OF expires_at, scheduled_at ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_announcement_dates();

DROP POLICY IF EXISTS "Anyone can read published announcements" ON public.announcements;
CREATE POLICY "Anyone can read published announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_published = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    AND (SELECT public.is_staff_or_admin()) = FALSE
  );

DROP POLICY IF EXISTS "Staff and admins can manage announcements" ON public.announcements;
CREATE POLICY "Staff and admins can manage announcements"
  ON public.announcements
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_staff_or_admin()))
  WITH CHECK ((SELECT public.is_staff_or_admin()));

NOTIFY pgrst, 'reload schema';
