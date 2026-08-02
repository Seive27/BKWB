-- ============================================================
-- BKWB Database Migration
-- Run this in your Supabase SQL Editor (https://supabase.com)
--
-- This migration is fully idempotent / re-runnable:
--   * CREATE TABLE ... IF NOT EXISTS
--   * DROP POLICY IF EXISTS + CREATE POLICY (PostgreSQL has no
--     CREATE POLICY IF NOT EXISTS)
--   * DROP TRIGGER IF EXISTS + CREATE TRIGGER (PostgreSQL has no
--     CREATE OR REPLACE TRIGGER)
--   * ALTER PUBLICATION ... guarded with DO $$ IF NOT EXISTS
-- You can safely run it multiple times.
-- ============================================================

-- 1. Create the roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- 1b. Self-heal: ensure the unique constraint exists so the seed below
--     (ON CONFLICT (name)) works on tables created by older migrations.
CREATE UNIQUE INDEX IF NOT EXISTS roles_name_key ON public.roles (name);

-- 1c. Catch-all self-heal: OLDER schemas may carry extra NOT NULL columns
--      (no default) that the current design no longer uses. Relax NOT NULL
--      on any roles column outside the canonical schema so the seed below
--      always succeeds. No-op on a fresh install.
DO $$
DECLARE
  col_name TEXT;
BEGIN
  FOR col_name IN
    SELECT c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'roles'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.column_name NOT IN ('id', 'name')
  LOOP
    EXECUTE format('ALTER TABLE public.roles ALTER COLUMN %I DROP NOT NULL', col_name);
  END LOOP;
END $$;

-- 2. Seed the roles
INSERT INTO public.roles (name) VALUES
  ('super_admin'),
  ('staff'),
  ('resident'),
  ('meter_reader')
ON CONFLICT (name) DO NOTHING;

-- 3. Create the profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 4b. Self-heal: add columns added in later migration versions so the file
--     can be re-run against a schema created by an older migration.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4c. Catch-all self-heal: OLDER schemas may carry extra NOT NULL columns
--      (no default) that the current design no longer uses. Relax NOT NULL
--      on any profiles column outside the canonical schema so runtime
--      inserts (e.g. handle_new_user) always succeed. No-op on fresh install.
DO $$
DECLARE
  col_name TEXT;
BEGIN
  FOR col_name IN
    SELECT c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'profiles'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.column_name NOT IN ('id', 'role_id', 'first_name', 'middle_name', 'last_name', 'date_of_birth', 'phone', 'email', 'avatar_url', 'is_active', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('ALTER TABLE public.profiles ALTER COLUMN %I DROP NOT NULL', col_name);
  END LOOP;
END $$;

-- 5. Policies (idempotent: drop-then-create so the migration can be re-run)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can read roles" ON public.roles;
CREATE POLICY "Anyone can read roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- 6. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    (SELECT id FROM public.roles WHERE name = 'resident' LIMIT 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 8. Announcements table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('schedule', 'interruption', 'maintenance', 'billing', 'general', 'emergency')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important', 'emergency')),
  target_audience TEXT NOT NULL DEFAULT 'all'
    CHECK (target_audience IN ('all', 'residents', 'meter_readers', 'staff')),
  created_by UUID REFERENCES public.profiles(id),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 9b. Self-heal: add columns added in later migration versions.
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT 'all';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 9c. Catch-all self-heal: OLDER schemas may carry extra NOT NULL columns
--      (no default) that the current design no longer uses. Relax NOT NULL
--      on any announcements column outside the canonical schema so runtime
--      inserts always succeed. No-op on a fresh install.
DO $$
DECLARE
  col_name TEXT;
BEGIN
  FOR col_name IN
    SELECT c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'announcements'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.column_name NOT IN ('id', 'title', 'content', 'category', 'priority', 'target_audience', 'created_by', 'is_published', 'expires_at', 'deleted_at', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('ALTER TABLE public.announcements ALTER COLUMN %I DROP NOT NULL', col_name);
  END LOOP;
END $$;

-- 9d. Self-heal: ensure the announcements.created_by -> profiles.id FK exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'announcements_created_by_fkey'
      AND conrelid = 'public.announcements'::regclass
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id);
  END IF;
END $$;

-- Helper: is the current user staff or super_admin?
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND r.name IN ('staff', 'super_admin')
      AND p.is_active = TRUE
  );
$$;

-- 10. Policies (idempotent: drop-then-create so the migration can be re-run)
-- Staff and super admins may manage (insert/update/delete) announcements.
DROP POLICY IF EXISTS "Staff and admins can manage announcements" ON public.announcements;
CREATE POLICY "Staff and admins can manage announcements"
  ON public.announcements
  FOR ALL
  TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- Everyone else may only read published, non-expired, non-deleted announcements.
DROP POLICY IF EXISTS "Anyone can read published announcements" ON public.announcements;
CREATE POLICY "Anyone can read published announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_published = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND public.is_staff_or_admin() = FALSE
  );

-- Allow authenticated users to read profile names so announcement
-- creator names can be displayed across all apps.
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- 11. Updated_at trigger for announcements
DROP TRIGGER IF EXISTS on_announcement_updated ON public.announcements;
CREATE TRIGGER on_announcement_updated
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 12. Enable Realtime for the announcements table (guarded so it is re-runnable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
END $$;

-- ============================================================
-- 13. Tickets table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  resident_id UUID NOT NULL REFERENCES public.profiles(id),
  assigned_staff_id UUID REFERENCES public.profiles(id),
  category TEXT NOT NULL
    CHECK (category IN ('water_supply', 'billing', 'plumbing', 'water_quality', 'meter_concern', 'other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
  resolution TEXT,
  internal_notes TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- 13b. Self-heal: add columns added in later migration versions.
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 13c. Catch-all self-heal: OLDER schemas may carry extra NOT NULL columns
--       (no default) that the current design no longer uses. Relax NOT NULL
--       on any tickets column outside the canonical schema so runtime
--       inserts always succeed. No-op on a fresh install.
DO $$
DECLARE
  col_name TEXT;
BEGIN
  FOR col_name IN
    SELECT c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'tickets'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.column_name NOT IN ('id', 'ticket_number', 'resident_id', 'assigned_staff_id', 'category', 'subject', 'description', 'priority', 'status', 'resolution', 'internal_notes', 'attachment_url', 'created_at', 'updated_at', 'resolved_at', 'closed_at', 'deleted_at')
  LOOP
    EXECUTE format('ALTER TABLE public.tickets ALTER COLUMN %I DROP NOT NULL', col_name);
  END LOOP;
END $$;

-- 13d. Self-heal: ensure the tickets.resident_id -> profiles.id FK exists even
--      when the column already existed (ADD COLUMN IF NOT EXISTS above is a
--      no-op on existing columns, so an older migration's plain UUID column
--      would never get its FK constraint). Guarded so re-runs never duplicate.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tickets_resident_id_fkey'
      AND conrelid = 'public.tickets'::regclass
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_resident_id_fkey
      FOREIGN KEY (resident_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- 13e. Self-heal: ensure the tickets.assigned_staff_id -> profiles.id FK exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tickets_assigned_staff_id_fkey'
      AND conrelid = 'public.tickets'::regclass
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_assigned_staff_id_fkey
      FOREIGN KEY (assigned_staff_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- 14. Ticket timeline table (one row per significant event)
CREATE TABLE IF NOT EXISTS public.ticket_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created', 'assigned', 'status_change')),
  description TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14b. Self-heal: add columns added in later migration versions.
ALTER TABLE public.ticket_timeline ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.tickets(id);
ALTER TABLE public.ticket_timeline ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'created';
ALTER TABLE public.ticket_timeline ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.ticket_timeline ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES public.profiles(id);

-- 14c. Self-heal: ensure the ticket_timeline.performed_by -> profiles.id FK exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ticket_timeline_performed_by_fkey'
      AND conrelid = 'public.ticket_timeline'::regclass
  ) THEN
    ALTER TABLE public.ticket_timeline
      ADD CONSTRAINT ticket_timeline_performed_by_fkey
      FOREIGN KEY (performed_by) REFERENCES public.profiles(id);
  END IF;
END $$;

-- 14d. Catch-all self-heal: OLDER schemas may carry extra NOT NULL columns
--       (no default) that the current design no longer uses. Relax NOT NULL
--       on any ticket_timeline column outside the canonical schema so
--       runtime inserts always succeed. No-op on a fresh install.
DO $$
DECLARE
  col_name TEXT;
BEGIN
  FOR col_name IN
    SELECT c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'ticket_timeline'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.column_name NOT IN ('id', 'ticket_id', 'event_type', 'description', 'performed_by', 'created_at')
  LOOP
    EXECUTE format('ALTER TABLE public.ticket_timeline ALTER COLUMN %I DROP NOT NULL', col_name);
  END LOOP;
END $$;

-- Useful indexes for filtering + joining
CREATE INDEX IF NOT EXISTS idx_tickets_resident_id ON public.tickets (resident_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets (category);
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_ticket_id ON public.ticket_timeline (ticket_id);

-- 15. Auto-generate ticket numbers: TKT-<YYYY>-<6 digits>
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  seq_num BIGINT;
BEGIN
  seq_num := nextval('public.ticket_number_seq');
  NEW.ticket_number := 'TKT-' || to_char(NOW(), 'YYYY') || '-' || lpad(seq_num::text, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_created ON public.tickets;
CREATE TRIGGER on_ticket_created
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_number();

-- 16. Updated_at trigger for tickets
DROP TRIGGER IF EXISTS on_ticket_updated ON public.tickets;
CREATE TRIGGER on_ticket_updated
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 17. Enable Row Level Security
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_timeline ENABLE ROW LEVEL SECURITY;

-- (Policies are idempotent: drop-then-create so the migration can be re-run.)

-- Staff and super admins may manage all tickets.
DROP POLICY IF EXISTS "Staff and admins can manage tickets" ON public.tickets;
CREATE POLICY "Staff and admins can manage tickets"
  ON public.tickets
  FOR ALL
  TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- Residents create their own tickets.
DROP POLICY IF EXISTS "Residents can create tickets" ON public.tickets;
CREATE POLICY "Residents can create tickets"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (resident_id = auth.uid() AND deleted_at IS NULL);

-- Residents can read only their own non-deleted tickets.
DROP POLICY IF EXISTS "Residents can read own tickets" ON public.tickets;
CREATE POLICY "Residents can read own tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (resident_id = auth.uid() AND deleted_at IS NULL);

-- Residents may update their own tickets only while they are not resolved/closed.
DROP POLICY IF EXISTS "Residents can update own open tickets" ON public.tickets;
CREATE POLICY "Residents can update own open tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (resident_id = auth.uid() AND status NOT IN ('resolved', 'closed') AND deleted_at IS NULL)
  WITH CHECK (resident_id = auth.uid() AND status NOT IN ('resolved', 'closed') AND deleted_at IS NULL);

-- Timeline: staff and super admins may manage all events.
DROP POLICY IF EXISTS "Staff and admins can manage ticket timeline" ON public.ticket_timeline;
CREATE POLICY "Staff and admins can manage ticket timeline"
  ON public.ticket_timeline
  FOR ALL
  TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- Timeline: residents can read events for their own tickets.
DROP POLICY IF EXISTS "Residents can read timeline for own tickets" ON public.ticket_timeline;
CREATE POLICY "Residents can read timeline for own tickets"
  ON public.ticket_timeline
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE resident_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Timeline: residents can add ONLY the "created" event to their own tickets.
DROP POLICY IF EXISTS "Residents can add timeline events to own tickets" ON public.ticket_timeline;
CREATE POLICY "Residents can add timeline events to own tickets"
  ON public.ticket_timeline
  FOR INSERT
  TO authenticated
  WITH CHECK (
    event_type = 'created'
    AND ticket_id IN (
      SELECT id FROM public.tickets
      WHERE resident_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- 18. Enable Realtime for tickets + timeline
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ticket_timeline'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_timeline;
  END IF;
END $$;

-- ============================================================
-- 19. Meters table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_number TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19b. Self-heal: add columns added in later migration versions.
ALTER TABLE public.meters ADD COLUMN IF NOT EXISTS meter_number TEXT;
ALTER TABLE public.meters ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.meters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 19b2. Self-heal: OLDER migrations gave meters a NOT NULL resident_id
--       (a meter directly owned by a resident). The current design links
--       residents to meters through resident_accounts.meter_id instead, so
--       meters are standalone devices. Drop the vestigial column so the
--       meter seed below (INSERT ... ON CONFLICT (meter_number)) can run on
--       schemas created by older migrations. No app code references it.
ALTER TABLE public.meters DROP COLUMN IF EXISTS resident_id;

-- 19b3. Catch-all self-heal: OLDER schemas also carried other extra NOT NULL
--       columns (e.g. meter_serial, status, ...) that the current design no
--       longer uses. Relax NOT NULL on ANY meters column that is not part of
--       the canonical schema and has no default, so the seed below succeeds
--       no matter which old schema this runs against. No-op on fresh install.
DO $$
DECLARE
  col_name TEXT;
BEGIN
  FOR col_name IN
    SELECT c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'meters'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.column_name NOT IN ('id', 'meter_number', 'is_active', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('ALTER TABLE public.meters ALTER COLUMN %I DROP NOT NULL', col_name);
  END LOOP;
END $$;

-- 19c. Self-heal: ensure the unique constraint exists so the meter seed
--      (ON CONFLICT (meter_number)) works on older schemas.
CREATE UNIQUE INDEX IF NOT EXISTS meters_meter_number_key ON public.meters (meter_number);

-- 20. Resident accounts table (water service connections)
-- One resident may own multiple accounts (house A, house B, apartment, ...)
CREATE TABLE IF NOT EXISTS public.resident_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.profiles(id),
  account_number TEXT NOT NULL UNIQUE,
  meter_id UUID REFERENCES public.meters(id),
  service_address TEXT,
  connection_status TEXT NOT NULL DEFAULT 'active'
    CHECK (connection_status IN ('active', 'inactive', 'disconnected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20b. Self-heal: add columns added in later migration versions.
ALTER TABLE public.resident_accounts ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.resident_accounts ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.resident_accounts ADD COLUMN IF NOT EXISTS meter_id UUID REFERENCES public.meters(id);
ALTER TABLE public.resident_accounts ADD COLUMN IF NOT EXISTS service_address TEXT;
ALTER TABLE public.resident_accounts ADD COLUMN IF NOT EXISTS connection_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.resident_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 20c. Catch-all self-heal: OLDER schemas may carry extra NOT NULL columns
--      (no default) that the current design no longer uses. Relax NOT NULL
--      on any resident_accounts column outside the canonical schema so the
--      account seed below always succeeds. No-op on a fresh install.
DO $$
DECLARE
  col_name TEXT;
BEGIN
  FOR col_name IN
    SELECT c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'resident_accounts'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.column_name NOT IN ('id', 'resident_id', 'account_number', 'meter_id', 'service_address', 'connection_status', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('ALTER TABLE public.resident_accounts ALTER COLUMN %I DROP NOT NULL', col_name);
  END LOOP;
END $$;

-- 20d. Self-heal: ensure the unique constraint exists so the account seed
--      (ON CONFLICT (account_number)) works on older schemas.
CREATE UNIQUE INDEX IF NOT EXISTS resident_accounts_account_number_key ON public.resident_accounts (account_number);

-- 21. Meter readings table
CREATE TABLE IF NOT EXISTS public.meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.resident_accounts(id),
  resident_id UUID NOT NULL REFERENCES public.profiles(id),
  meter_id UUID REFERENCES public.meters(id),
  meter_reader_id UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reading_date TIMESTAMPTZ,
  previous_reading NUMERIC NOT NULL DEFAULT 0 CHECK (previous_reading >= 0),
  current_reading NUMERIC CHECK (current_reading >= 0),
  consumption NUMERIC CHECK (consumption >= 0),
  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'pending_review', 'approved', 'rejected', 'billed')),
  remarks TEXT,
  photo_url TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21b. Self-heal: add columns added in later migration versions.
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.resident_accounts(id);
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS meter_id UUID REFERENCES public.meters(id);
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS meter_reader_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS assignment_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS reading_date TIMESTAMPTZ;
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS previous_reading NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS current_reading NUMERIC CHECK (current_reading >= 0);
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS consumption NUMERIC CHECK (consumption >= 0);
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'assigned';
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 21c. Catch-all self-heal: OLDER schemas may carry extra NOT NULL columns
--       (no default) that the current design no longer uses. Relax NOT NULL
--       on any meter_readings column outside the canonical schema so runtime
--       inserts always succeed. No-op on a fresh install.
DO $$
DECLARE
  col_name TEXT;
BEGIN
  FOR col_name IN
    SELECT c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'meter_readings'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.column_name NOT IN ('id', 'account_id', 'resident_id', 'meter_id', 'meter_reader_id', 'assigned_by', 'assignment_date', 'reading_date', 'previous_reading', 'current_reading', 'consumption', 'status', 'remarks', 'photo_url', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'deleted_at', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('ALTER TABLE public.meter_readings ALTER COLUMN %I DROP NOT NULL', col_name);
  END LOOP;
END $$;

-- Useful indexes for the meter reading workflow
CREATE INDEX IF NOT EXISTS idx_meter_readings_account_id ON public.meter_readings (account_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_meter_reader_id ON public.meter_readings (meter_reader_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_status ON public.meter_readings (status);
CREATE INDEX IF NOT EXISTS idx_meter_readings_resident_id ON public.meter_readings (resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_accounts_resident_id ON public.resident_accounts (resident_id);

-- 22. Consumption is calculated automatically at the database level.
--     consumption = current_reading - previous_reading, never negative.
CREATE OR REPLACE FUNCTION public.calculate_consumption()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.current_reading IS NOT NULL THEN
    IF NEW.current_reading < NEW.previous_reading THEN
      RAISE EXCEPTION 'current_reading must be greater than or equal to previous_reading';
    END IF;
    NEW.consumption := NEW.current_reading - NEW.previous_reading;
  ELSE
    NEW.consumption := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_meter_reading_consumption ON public.meter_readings;
CREATE TRIGGER on_meter_reading_consumption
  BEFORE INSERT OR UPDATE ON public.meter_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_consumption();

-- 23. Updated_at triggers
DROP TRIGGER IF EXISTS on_meter_updated ON public.meters;
CREATE TRIGGER on_meter_updated
  BEFORE UPDATE ON public.meters
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_resident_account_updated ON public.resident_accounts;
CREATE TRIGGER on_resident_account_updated
  BEFORE UPDATE ON public.resident_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_meter_reading_updated ON public.meter_readings;
CREATE TRIGGER on_meter_reading_updated
  BEFORE UPDATE ON public.meter_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 24. Helper: is the current user plain staff (not super admin)?
--     Meter reading writes (assign/approve/reject) are staff-only;
--     super admins get read-only monitoring.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND r.name = 'staff'
      AND p.is_active = TRUE
  );
$$;

-- 25. Row Level Security
ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;

-- (Policies are idempotent: drop-then-create so the migration can be re-run.)

-- Meters: staff may manage; all authenticated users may read (for joins).
DROP POLICY IF EXISTS "Staff can manage meters" ON public.meters;
CREATE POLICY "Staff can manage meters"
  ON public.meters
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Anyone can read meters" ON public.meters;
CREATE POLICY "Anyone can read meters"
  ON public.meters
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Resident accounts: staff may manage; all authenticated users may read.
DROP POLICY IF EXISTS "Staff can manage resident accounts" ON public.resident_accounts;
CREATE POLICY "Staff can manage resident accounts"
  ON public.resident_accounts
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Anyone can read resident accounts" ON public.resident_accounts;
CREATE POLICY "Anyone can read resident accounts"
  ON public.resident_accounts
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Meter readings:
-- Staff may manage (assign, approve, reject).
DROP POLICY IF EXISTS "Staff can manage meter readings" ON public.meter_readings;
CREATE POLICY "Staff can manage meter readings"
  ON public.meter_readings
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Super admins have read-only monitoring.
DROP POLICY IF EXISTS "Admins can read meter readings" ON public.meter_readings;
CREATE POLICY "Admins can read meter readings"
  ON public.meter_readings
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_admin());

-- Meter readers can read their own assigned readings + history.
DROP POLICY IF EXISTS "Meter readers can read own readings" ON public.meter_readings;
CREATE POLICY "Meter readers can read own readings"
  ON public.meter_readings
  FOR SELECT
  TO authenticated
  USING (meter_reader_id = auth.uid() AND deleted_at IS NULL);

-- Meter readers can submit only their own currently-assigned readings.
-- The target status is locked to 'pending_review' so a reader can never
-- self-approve or mark their own reading billed/rejected.
DROP POLICY IF EXISTS "Meter readers can submit own assigned readings" ON public.meter_readings;
CREATE POLICY "Meter readers can submit own assigned readings"
  ON public.meter_readings
  FOR UPDATE
  TO authenticated
  USING (meter_reader_id = auth.uid() AND status = 'assigned' AND deleted_at IS NULL)
  WITH CHECK (
    meter_reader_id = auth.uid()
    AND deleted_at IS NULL
    AND status = 'pending_review'
  );

-- 26. Enable Realtime for meter readings (syncs assignments + submissions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'meter_readings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meter_readings;
  END IF;
END $$;

-- 27. Seed sample meters so accounts can reference them
INSERT INTO public.meters (meter_number) VALUES
  ('MTR-0001'),
  ('MTR-0002'),
  ('MTR-0003')
ON CONFLICT (meter_number) DO NOTHING;

-- 27b. Harden the meter reader UPDATE path: readers may only change the
--      reading itself (current_reading, remarks, reading_date, status).
--      Fields assigned by staff are protected from tampering even if a
--      reader bypasses the app. Staff/admins are unaffected.
CREATE OR REPLACE FUNCTION public.guard_meter_reading_reader_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Staff and super admins manage readings directly; skip the guard.
  IF public.is_staff_or_admin() THEN
    RETURN NEW;
  END IF;

  -- Meter readers must not alter assignment-level fields.
  IF (
    NEW.previous_reading IS DISTINCT FROM OLD.previous_reading
    OR NEW.assignment_date IS DISTINCT FROM OLD.assignment_date
    OR NEW.meter_reader_id IS DISTINCT FROM OLD.meter_reader_id
    OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
    OR NEW.resident_id IS DISTINCT FROM OLD.resident_id
    OR NEW.account_id IS DISTINCT FROM OLD.account_id
    OR NEW.meter_id IS DISTINCT FROM OLD.meter_id
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
    OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
  ) THEN
    RAISE EXCEPTION 'Meter readers cannot change assignment-level fields.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_meter_reading_reader_guard ON public.meter_readings;
CREATE TRIGGER on_meter_reading_reader_guard
  BEFORE UPDATE ON public.meter_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_meter_reading_reader_update();

-- 27c. Seed sample resident accounts so staff can assign readings out of the
--      box. Creates one account per resident profile, cycling through the
--      seeded meters. Re-running is safe (unique account_number).
WITH resident_rows AS (
  SELECT
    p.id,
    p.created_at,
    row_number() OVER (ORDER BY p.created_at) - 1 AS rn
  FROM public.profiles p
  JOIN public.roles r ON r.id = p.role_id
  WHERE r.name = 'resident'
),
meter_rows AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at) - 1 AS meter_idx,
    count(*) OVER () AS meter_count
  FROM public.meters
)
INSERT INTO public.resident_accounts (resident_id, account_number, meter_id, service_address, connection_status)
SELECT
  rr.id,
  'ACC-' || lpad((rr.rn + 1)::text, 4, '0'),
  mr.id,
  'Purok ' || (rr.rn % 8 + 1) || ', Barangay Kalunasan',
  'active'
FROM resident_rows rr
JOIN meter_rows mr ON mr.meter_idx = (rr.rn % mr.meter_count)
ON CONFLICT (account_number) DO NOTHING;

-- ============================================================
-- AFTER RUNNING: Assign roles to your users
-- ============================================================
-- 1. Go to Authentication > Users in Supabase dashboard
-- 2. Create users with email + password
-- 3. The trigger auto-creates a profile with 'resident' role
-- 4. Update the role for desktop access:
--
--    UPDATE public.profiles
--    SET role_id = (SELECT id FROM public.roles WHERE name = 'staff')
--    WHERE id = '<user-uuid>';
--
--    UPDATE public.profiles
--    SET role_id = (SELECT id FROM public.roles WHERE name = 'super_admin')
--    WHERE id = '<user-uuid>';
-- ============================================================
