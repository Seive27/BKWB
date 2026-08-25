-- ============================================================
-- BKWB — Billing, Sitio Assignment & Ticket Lifecycle Migration
-- ------------------------------------------------------------
-- Run in the Supabase SQL Editor AFTER supabase-migration.sql and
-- import-masterlist-schema.sql. Safe to re-run (idempotent).
--
-- Adds:
--   * public.bills (generated from approved meter readings)
--   * generate_bill_for_reading() RPC (rate from system_settings)
--   * account reading-snapshot sync on approval
--   * public.sitio_assignments (meter reader coverage areas)
--   * Ticket lifecycle: acknowledged/scheduled statuses,
--     transition enforcement, meter reader access policies
--   * Tightened resident_accounts read policies (sitio-scoped)
-- ============================================================

-- ============================================================
-- 1. BILLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT UNIQUE,
  account_id UUID NOT NULL REFERENCES public.resident_accounts(id),
  resident_id UUID NOT NULL REFERENCES public.profiles(id),
  reading_id UUID REFERENCES public.meter_readings(id),
  billing_period TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  previous_reading NUMERIC,
  current_reading NUMERIC CHECK (current_reading IS NULL OR current_reading >= 0),
  consumption NUMERIC CHECK (consumption IS NULL OR consumption >= 0),
  water_rate NUMERIC NOT NULL DEFAULT 0 CHECK (water_rate >= 0),
  extra_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  amount_due NUMERIC NOT NULL DEFAULT 0 CHECK (amount_due >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'void')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  generated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Self-heal columns for schemas created by an earlier draft.
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS bill_number TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.resident_accounts(id);
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS reading_id UUID REFERENCES public.meter_readings(id);
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS billing_period TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS previous_reading NUMERIC;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS current_reading NUMERIC;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS consumption NUMERIC;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS water_rate NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS extra_components JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS amount_due NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS generated_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Self-heal data and foreign keys for legacy schemas
DO $$
BEGIN
  -- If legacy schema had 'amount' instead of 'amount_due', copy values across
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bills' AND column_name = 'amount'
  ) THEN
    UPDATE public.bills SET amount_due = amount WHERE (amount_due IS NULL OR amount_due = 0) AND amount IS NOT NULL;
  END IF;

  -- Ensure FK bills_resident_id_fkey points to profiles(id)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bills_resident_id_fkey'
      AND conrelid = 'public.bills'::regclass
  ) THEN
    ALTER TABLE public.bills DROP CONSTRAINT bills_resident_id_fkey;
  END IF;
  ALTER TABLE public.bills
    ADD CONSTRAINT bills_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.profiles(id);

  -- Ensure FK bills_account_id_fkey points to resident_accounts(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bills_account_id_fkey'
      AND conrelid = 'public.bills'::regclass
  ) THEN
    ALTER TABLE public.bills
      ADD CONSTRAINT bills_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES public.resident_accounts(id);
  END IF;

  -- Ensure FK bills_reading_id_fkey points to meter_readings(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bills_reading_id_fkey'
      AND conrelid = 'public.bills'::regclass
  ) THEN
    ALTER TABLE public.bills
      ADD CONSTRAINT bills_reading_id_fkey
      FOREIGN KEY (reading_id) REFERENCES public.meter_readings(id);
  END IF;

  -- Ensure FK bills_generated_by_fkey points to profiles(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bills_generated_by_fkey'
      AND conrelid = 'public.bills'::regclass
  ) THEN
    ALTER TABLE public.bills
      ADD CONSTRAINT bills_generated_by_fkey
      FOREIGN KEY (generated_by) REFERENCES public.profiles(id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
DECLARE
  col_name TEXT;
BEGIN
  FOR col_name IN
    SELECT c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'bills'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.column_name NOT IN ('id', 'account_id', 'resident_id', 'billing_period', 'water_rate', 'extra_components', 'amount_due', 'status', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('ALTER TABLE public.bills ALTER COLUMN %I DROP NOT NULL', col_name);
  END LOOP;
END $$;

-- One bill per account per billing period; one bill per reading.
CREATE UNIQUE INDEX IF NOT EXISTS bills_account_period_unique
  ON public.bills (account_id, billing_period)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bills_reading_unique
  ON public.bills (reading_id)
  WHERE deleted_at IS NULL AND reading_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bills_account_id ON public.bills (account_id);
CREATE INDEX IF NOT EXISTS idx_bills_resident_id ON public.bills (resident_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills (status);
CREATE INDEX IF NOT EXISTS idx_bills_period ON public.bills (billing_period DESC);

-- Bill numbers: BILL-<YYYY>-<6 digits>
CREATE SEQUENCE IF NOT EXISTS public.bill_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_bill_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  seq_num BIGINT;
BEGIN
  seq_num := nextval('public.bill_number_seq');
  NEW.bill_number := 'BILL-' || to_char(NOW(), 'YYYY') || '-' || lpad(seq_num::text, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_bill_created ON public.bills;
CREATE TRIGGER on_bill_created
  BEFORE INSERT ON public.bills
  FOR EACH ROW
  WHEN (NEW.bill_number IS NULL)
  EXECUTE FUNCTION public.generate_bill_number();

DROP TRIGGER IF EXISTS on_bill_updated ON public.bills;
CREATE TRIGGER on_bill_updated
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security for bills
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage bills" ON public.bills;
CREATE POLICY "Staff can manage bills"
  ON public.bills
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_staff()))
  WITH CHECK ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "Admins can read bills" ON public.bills;
CREATE POLICY "Admins can read bills"
  ON public.bills
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_staff_or_admin()));

DROP POLICY IF EXISTS "Residents can read own bills" ON public.bills;
CREATE POLICY "Residents can read own bills"
  ON public.bills
  FOR SELECT
  TO authenticated
  USING (resident_id = auth.uid() AND deleted_at IS NULL);

-- Realtime for bills
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bills'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
  END IF;
END $$;

-- ============================================================
-- 1b. PAYMENTS TABLE (Recording System)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.bills(id),
  account_id UUID REFERENCES public.resident_accounts(id),
  resident_id UUID REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'gcash', 'bank')),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'pending', 'cancelled', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Self-heal columns for schemas created by an earlier draft.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES public.bills(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.resident_accounts(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Explicit named foreign keys for PostgREST resource embedding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_bill_id_fkey'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_bill_id_fkey
      FOREIGN KEY (bill_id) REFERENCES public.bills(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_account_id_fkey'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES public.resident_accounts(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_resident_id_fkey'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_resident_id_fkey
      FOREIGN KEY (resident_id) REFERENCES public.profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_recorded_by_fkey'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_recorded_by_fkey
      FOREIGN KEY (recorded_by) REFERENCES public.profiles(id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON public.payments (bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_account_id ON public.payments (account_id);
CREATE INDEX IF NOT EXISTS idx_payments_resident_id ON public.payments (resident_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments (payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);

DROP TRIGGER IF EXISTS on_payment_updated ON public.payments;
CREATE TRIGGER on_payment_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage payments" ON public.payments;
CREATE POLICY "Staff can manage payments"
  ON public.payments
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_staff()))
  WITH CHECK ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "Admins can read payments" ON public.payments;
CREATE POLICY "Admins can read payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_staff_or_admin()));

DROP POLICY IF EXISTS "Residents can read own payments" ON public.payments;
CREATE POLICY "Residents can read own payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (resident_id = auth.uid() AND deleted_at IS NULL);

-- Realtime for payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 1c. RECORD PAYMENT RPC
-- Records payment against one or more bills atomically.
-- Marks each paid bill with status = 'paid' and sets paid_at.
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
  p_bill_ids UUID[],
  p_account_id UUID,
  p_resident_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bill_id UUID;
  v_bill_amount NUMERIC;
  v_payment_ids UUID[] := ARRAY[]::UUID[];
  v_new_payment_id UUID;
  v_bill_count INTEGER := 0;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Only staff and administrators can record payments.';
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Payment amount must be non-negative.';
  END IF;

  IF p_payment_method NOT IN ('cash', 'gcash', 'bank') THEN
    RAISE EXCEPTION 'Invalid payment method: %. Expected cash, gcash, or bank.', p_payment_method;
  END IF;

  IF p_bill_ids IS NOT NULL AND array_length(p_bill_ids, 1) > 0 THEN
    FOREACH v_bill_id IN ARRAY p_bill_ids
    LOOP
      SELECT amount_due INTO v_bill_amount
      FROM public.bills
      WHERE id = v_bill_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill not found: %', v_bill_id;
      END IF;

      INSERT INTO public.payments (
        bill_id, account_id, resident_id, amount,
        payment_method, payment_date, reference_number,
        notes, recorded_by, status
      )
      VALUES (
        v_bill_id, p_account_id, p_resident_id,
        COALESCE(v_bill_amount, 0),
        p_payment_method, NOW(), p_reference_number,
        p_notes, auth.uid(), 'completed'
      )
      RETURNING id INTO v_new_payment_id;

      v_payment_ids := array_append(v_payment_ids, v_new_payment_id);
      v_bill_count := v_bill_count + 1;

      UPDATE public.bills
      SET status = 'paid',
          paid_at = NOW(),
          updated_at = NOW()
      WHERE id = v_bill_id;
    END LOOP;
  ELSE
    INSERT INTO public.payments (
      account_id, resident_id, amount,
      payment_method, payment_date, reference_number,
      notes, recorded_by, status
    )
    VALUES (
      p_account_id, p_resident_id, p_amount,
      p_payment_method, NOW(), p_reference_number,
      p_notes, auth.uid(), 'completed'
    )
    RETURNING id INTO v_new_payment_id;
    v_payment_ids := array_append(v_payment_ids, v_new_payment_id);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'payment_ids', v_payment_ids,
    'bills_paid', v_bill_count,
    'total_amount', p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment_transaction(UUID[], UUID, UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 2. BILL GENERATION RPC
-- Consumes an APPROVED meter reading and creates the matching
-- bill using the configured water rate (system_settings).
-- The rate is NEVER invented: when it is not configured the RPC
-- fails with a clear message instead of guessing a price.
-- Duplicate bills per account+period are impossible thanks to
-- the partial unique index above.
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_bill_for_reading(p_reading_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reading public.meter_readings%ROWTYPE;
  v_rate NUMERIC := 0;
  v_components JSONB := '[]'::jsonb;
  v_component_total NUMERIC := 0;
  v_grace_days INTEGER := 0;
  v_period_date DATE;
  v_period TEXT;
  v_period_start DATE;
  v_period_end DATE;
  v_due_date DATE;
  v_amount NUMERIC;
  v_new_id UUID;
  v_new_number TEXT;
  v_existing_id UUID;
  v_existing_number TEXT;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Only staff and administrators can generate bills.';
  END IF;

  SELECT * INTO v_reading
  FROM public.meter_readings
  WHERE id = p_reading_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meter reading not found.';
  END IF;

  -- A blank current reading means "not yet recorded": never billed.
  IF v_reading.current_reading IS NULL THEN
    RAISE EXCEPTION 'No current reading recorded yet. Record the reading before generating a bill.';
  END IF;

  IF v_reading.status NOT IN ('approved', 'billed') THEN
    RAISE EXCEPTION 'Only approved readings can be billed.';
  END IF;

  SELECT COALESCE((value #>> '{}')::numeric, 0) INTO v_rate
  FROM public.system_settings
  WHERE key = 'billing.water_rate';
  IF v_rate IS NULL OR v_rate <= 0 THEN
    RAISE EXCEPTION 'Water rate has not been configured yet. Set it under Configure Bills before generating bills.';
  END IF;

  SELECT COALESCE((value #>> '{}')::int, 0) INTO v_grace_days
  FROM public.system_settings
  WHERE key = 'billing.grace_period_days';

  SELECT value INTO v_components
  FROM public.system_settings
  WHERE key = 'billing.extra_components';
  IF v_components IS NULL OR jsonb_typeof(v_components) <> 'array' THEN
    v_components := '[]'::jsonb;
  END IF;
  SELECT COALESCE(sum(COALESCE(NULLIF(c->>'price', '')::numeric, 0)), 0)
    INTO v_component_total
  FROM jsonb_array_elements(v_components) AS c;

  v_period_date := COALESCE(v_reading.reading_date::date, v_reading.assignment_date);
  v_period := to_char(v_period_date, 'YYYY-MM');
  v_period_start := date_trunc('month', v_period_date)::date;
  v_period_end := (date_trunc('month', v_period_date) + INTERVAL '1 month - 1 day')::date;
  v_due_date := CASE WHEN v_grace_days > 0 THEN v_period_end + v_grace_days ELSE NULL END;

  v_amount := round((v_reading.consumption * v_rate + v_component_total)::numeric, 2);

  WITH ins AS (
    INSERT INTO public.bills (
      account_id, resident_id, reading_id, billing_period,
      period_start, period_end, previous_reading, current_reading,
      consumption, water_rate, extra_components, amount_due,
      status, due_date, generated_by
    )
    VALUES (
      v_reading.account_id, v_reading.resident_id, v_reading.id, v_period,
      v_period_start, v_period_end, v_reading.previous_reading, v_reading.current_reading,
      v_reading.consumption, v_rate, v_components, v_amount,
      'pending', v_due_date, auth.uid()
    )
    ON CONFLICT (account_id, billing_period) WHERE deleted_at IS NULL DO NOTHING
    RETURNING id, bill_number
  )
  SELECT id, bill_number INTO v_new_id, v_new_number FROM ins;

  IF v_new_id IS NOT NULL THEN
    UPDATE public.meter_readings SET status = 'billed'
    WHERE id = p_reading_id AND status <> 'billed';
    RETURN jsonb_build_object(
      'generated', TRUE,
      'bill_id', v_new_id,
      'bill_number', v_new_number,
      'billing_period', v_period,
      'amount_due', v_amount
    );
  END IF;

  -- A bill for this account+period already exists.
  SELECT id, bill_number INTO v_existing_id, v_existing_number
  FROM public.bills
  WHERE account_id = v_reading.account_id AND billing_period = v_period AND deleted_at IS NULL
  LIMIT 1;

  RETURN jsonb_build_object(
    'generated', FALSE,
    'reason', 'duplicate',
    'message', 'A bill for this billing period already exists.',
    'bill_id', v_existing_id,
    'bill_number', v_existing_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_bill_for_reading(UUID) TO authenticated;

-- ============================================================
-- 3. ACCOUNT SNAPSHOT SYNC
-- When a reading is approved, refresh the masterlist snapshot on
-- resident_accounts so the Residents page shows real workflow data.
-- Blank snapshots stay untouched until a reading is approved.
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_account_reading_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.current_reading IS NOT NULL THEN
    UPDATE public.resident_accounts
    SET previous_reading = NEW.previous_reading,
        current_reading = NEW.current_reading,
        previous_reading_date = date_trunc('month', COALESCE(NEW.reading_date, NEW.assignment_date::timestamptz))::date,
        updated_at = NOW()
    WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reading_approved_snapshot ON public.meter_readings;
CREATE TRIGGER on_reading_approved_snapshot
  AFTER UPDATE OF status ON public.meter_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_account_reading_snapshot();

-- ============================================================
-- 4. SITIO ASSIGNMENTS (meter reader coverage areas)
-- One row per sitio: the sitio is UNIQUE, so a sitio can only be
-- assigned to one meter reader at a time (no duplicate coverage).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sitio_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sitio TEXT NOT NULL,
  meter_reader_id UUID NOT NULL REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sitio_assignments_sitio_unique
  ON public.sitio_assignments (sitio);
CREATE INDEX IF NOT EXISTS idx_sitio_assignments_reader
  ON public.sitio_assignments (meter_reader_id);

DROP TRIGGER IF EXISTS on_sitio_assignment_updated ON public.sitio_assignments;
CREATE TRIGGER on_sitio_assignment_updated
  BEFORE UPDATE ON public.sitio_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.sitio_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage sitio assignments" ON public.sitio_assignments;
CREATE POLICY "Staff can manage sitio assignments"
  ON public.sitio_assignments
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_staff()))
  WITH CHECK ((SELECT public.is_staff()));

DROP POLICY IF EXISTS "Admins can read sitio assignments" ON public.sitio_assignments;
CREATE POLICY "Admins can read sitio assignments"
  ON public.sitio_assignments
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_staff_or_admin()));

DROP POLICY IF EXISTS "Meter readers can read own sitio assignment" ON public.sitio_assignments;
CREATE POLICY "Meter readers can read own sitio assignment"
  ON public.sitio_assignments
  FOR SELECT
  TO authenticated
  USING (meter_reader_id = auth.uid());

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 5. TICKET LIFECYCLE
-- Progression: open -> acknowledged -> assigned -> scheduled ->
--              in_progress -> resolved -> closed.
-- 'acknowledged' and 'scheduled' are new; existing rows keep their
-- status and remain valid. Invalid transitions are rejected by a
-- BEFORE UPDATE trigger for everyone except staff/admins.
-- ============================================================
DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    WHERE ns.nspname = 'public'
      AND cls.relname = 'tickets'
      AND con.contype = 'c'
      AND att.attname = 'status'
      AND pg_get_constraintdef(con.oid) ILIKE '%open%'
  LOOP
    EXECUTE format('ALTER TABLE public.tickets DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('open', 'acknowledged', 'assigned', 'scheduled', 'in_progress', 'resolved', 'closed'));

-- Enforce valid status transitions. Staff/super admins are also bound
-- to the map (prevents accidental skips); system triggers bypass it.
CREATE OR REPLACE FUNCTION public.enforce_ticket_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_allowed TEXT[];
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_allowed := CASE OLD.status
    WHEN 'open' THEN ARRAY['acknowledged', 'assigned', 'in_progress']::TEXT[]
    WHEN 'acknowledged' THEN ARRAY['assigned', 'in_progress']::TEXT[]
    WHEN 'assigned' THEN ARRAY['scheduled', 'in_progress']::TEXT[]
    WHEN 'scheduled' THEN ARRAY['in_progress', 'resolved']::TEXT[]
    WHEN 'in_progress' THEN ARRAY['resolved', 'closed']::TEXT[]
    WHEN 'resolved' THEN ARRAY['closed', 'in_progress']::TEXT[]
    WHEN 'closed' THEN ARRAY[]::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;

  IF NEW.status = ANY(v_allowed) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid ticket status transition from % to %.', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_status_transition ON public.tickets;
CREATE TRIGGER on_ticket_status_transition
  BEFORE UPDATE OF status ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_ticket_status_transition();

-- Meter readers manage ONLY tickets explicitly assigned to them.
DROP POLICY IF EXISTS "Meter readers can read own assigned tickets" ON public.tickets;
CREATE POLICY "Meter readers can read own assigned tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (assigned_staff_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Meter readers can update own assigned tickets" ON public.tickets;
CREATE POLICY "Meter readers can update own assigned tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    assigned_staff_id = auth.uid()
    AND status IN ('assigned', 'scheduled', 'in_progress')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    assigned_staff_id = auth.uid()
    AND deleted_at IS NULL
  );

-- Guard: a meter reader may only advance the workflow of their own
-- ticket (status forward + resolution notes). Assignment-level fields
-- stay protected even if a reader bypasses the app.
CREATE OR REPLACE FUNCTION public.guard_ticket_reader_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT public.current_user_role_name() INTO v_role;
  IF v_role IN ('staff', 'super_admin') THEN
    RETURN NEW;
  END IF;

  -- Residents may edit the content of their own ticket while it is open,
  -- but may never reassign or soft-delete it.
  IF v_role = 'resident' THEN
    IF (
      NEW.resident_id IS DISTINCT FROM OLD.resident_id
      OR NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id
      OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
      OR NEW.ticket_number IS DISTINCT FROM OLD.ticket_number
    ) THEN
      RAISE EXCEPTION 'Residents cannot change assignment-level fields.';
    END IF;
    RETURN NEW;
  END IF;

  -- Meter readers: assignment-level fields stay protected.
  IF (
    NEW.resident_id IS DISTINCT FROM OLD.resident_id
    OR NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.subject IS DISTINCT FROM OLD.subject
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.priority IS DISTINCT FROM OLD.priority
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    OR NEW.ticket_number IS DISTINCT FROM OLD.ticket_number
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Meter readers cannot change ticket assignment-level fields.';
  END IF;

  -- Readers may move their ticket forward through scheduled /
  -- in_progress / resolved but never backwards or to closed.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'assigned' AND NEW.status IN ('scheduled', 'in_progress'))
      OR (OLD.status = 'scheduled' AND NEW.status IN ('in_progress', 'resolved'))
      OR (OLD.status = 'in_progress' AND NEW.status = 'resolved')
    ) THEN
      RAISE EXCEPTION 'Meter readers cannot set the ticket to that status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.guard_ticket_reader_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF public.is_staff_or_admin() THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.resident_id IS DISTINCT FROM OLD.resident_id
    OR NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.subject IS DISTINCT FROM OLD.subject
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.priority IS DISTINCT FROM OLD.priority
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    OR NEW.ticket_number IS DISTINCT FROM OLD.ticket_number
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Meter readers cannot change ticket assignment-level fields.';
  END IF;

  -- Readers may move their ticket forward through scheduled /
  -- in_progress / resolved but never backwards or to closed.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'assigned' AND NEW.status IN ('scheduled', 'in_progress'))
      OR (OLD.status = 'scheduled' AND NEW.status IN ('in_progress', 'resolved'))
      OR (OLD.status = 'in_progress' AND NEW.status = 'resolved')
    ) THEN
      RAISE EXCEPTION 'Meter readers cannot set the ticket to that status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_reader_guard ON public.tickets;
CREATE TRIGGER on_ticket_reader_guard
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_ticket_reader_update();

-- Timeline visibility/inserts for meter readers on their own tickets.
DROP POLICY IF EXISTS "Meter readers can read timeline for own tickets" ON public.ticket_timeline;
CREATE POLICY "Meter readers can read timeline for own tickets"
  ON public.ticket_timeline
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets WHERE assigned_staff_id = auth.uid() AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Meter readers can add timeline events to own tickets" ON public.ticket_timeline;
CREATE POLICY "Meter readers can add timeline events to own tickets"
  ON public.ticket_timeline
  FOR INSERT
  TO authenticated
  WITH CHECK (
    event_type IN ('assigned', 'status_change')
    AND ticket_id IN (
      SELECT id FROM public.tickets WHERE assigned_staff_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- ============================================================
-- 6. RESIDENT_ACCOUNTS READ POLICIES (sitio-scoped)
-- Replaces the blanket "Anyone can read resident accounts" policy:
--   * staff/super admins: full access (unchanged writes via is_staff())
--   * residents: only their OWN service accounts
--   * meter readers: only accounts inside their ASSIGNED sitios,
--     plus accounts referenced by readings assigned to them
--     (keeps per-account assignments working end to end).
-- This is enforced server-side by RLS, not just hidden in the UI.
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read resident accounts" ON public.resident_accounts;

DROP POLICY IF EXISTS "Staff and admins can read resident accounts" ON public.resident_accounts;
CREATE POLICY "Staff and admins can read resident accounts"
  ON public.resident_accounts
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_staff_or_admin()));

DROP POLICY IF EXISTS "Residents can read own accounts" ON public.resident_accounts;
CREATE POLICY "Residents can read own accounts"
  ON public.resident_accounts
  FOR SELECT
  TO authenticated
  USING (resident_id = auth.uid());

DROP POLICY IF EXISTS "Meter readers can read accounts in their sitio" ON public.resident_accounts;
CREATE POLICY "Meter readers can read accounts in their sitio"
  ON public.resident_accounts
  FOR SELECT
  TO authenticated
  USING (
    sitio IN (
      SELECT sa.sitio FROM public.sitio_assignments sa WHERE sa.meter_reader_id = auth.uid()
    )
    OR id IN (
      SELECT mr.account_id FROM public.meter_readings mr
      WHERE mr.meter_reader_id = auth.uid() AND mr.deleted_at IS NULL
    )
  );

NOTIFY pgrst, 'reload schema';



-- ============================================================
-- 7. RESIDENT CSV IMPORT RPC (data migration workflow)
-- Bulk-imports consumer rows from a validated CSV upload.
--   * Caller must be staff or super admin.
--   * Existing accounts (same Cons Code) are UPDATED only on the
--     masterlist-provided fields; manually entered data such as
--     service addresses is never touched.
--   * New cons codes get an auth user + resident profile (no email,
--     no password) plus a service account — they cannot log in until
--     staff issues credentials via the resident-login edge function.
--   * Blank current_reading stays NULL ("not yet recorded") and never
--     marks anyone inactive.
--   * Per-row errors are reported; valid rows still import.
-- p_mode: 'upsert' (default) updates existing accounts,
--         'skip_existing' leaves existing cons codes untouched.
-- ============================================================
CREATE OR REPLACE FUNCTION public.import_resident_rows(p_rows JSONB, p_mode TEXT DEFAULT 'upsert')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row JSONB;
  v_idx INTEGER := 0;
  v_cons_code TEXT;
  v_last_name TEXT;
  v_first_name TEXT;
  v_middle_name TEXT;
  v_meter_serial TEXT;
  v_previous_period DATE;
  v_previous_reading NUMERIC;
  v_current_reading NUMERIC;
  v_status TEXT;
  v_sitio TEXT;
  v_errors JSONB := '[]'::jsonb;
  v_created_users INTEGER := 0;
  v_created_accounts INTEGER := 0;
  v_updated_accounts INTEGER := 0;
  v_skipped INTEGER := 0;
  v_existing UUID;
  v_new_user_id UUID;
  v_meter_id UUID;
  v_valid BOOLEAN;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Only staff and administrators can import residents.';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Expected a JSON array of rows.';
  END IF;

  IF p_mode IS NULL OR p_mode NOT IN ('upsert', 'skip_existing') THEN
    p_mode := 'upsert';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_idx := v_idx + 1;
    BEGIN
      -- Reset per-row state so one failure cannot leak into the next row.
      v_existing := NULL;
      v_new_user_id := NULL;
      v_meter_id := NULL;

      v_cons_code := NULLIF(btrim(COALESCE(v_row->>'cons_code', '')), '');
      v_last_name := NULLIF(btrim(COALESCE(v_row->>'last_name', '')), '');
      v_first_name := NULLIF(btrim(COALESCE(v_row->>'first_name', '')), '');
      v_middle_name := NULLIF(btrim(COALESCE(v_row->>'middle_name', '')), '');
      v_meter_serial := NULLIF(btrim(COALESCE(v_row->>'meter_serial', '')), '');
      v_previous_period := NULLIF(btrim(COALESCE(v_row->>'previous_period', '')), '')::DATE;
      v_previous_reading := NULLIF(btrim(COALESCE(v_row->>'previous_reading', '')), '')::NUMERIC;
      v_current_reading := NULLIF(btrim(COALESCE(v_row->>'current_reading', '')), '')::NUMERIC;
      v_status := LOWER(NULLIF(btrim(COALESCE(v_row->>'status', '')), ''));
      v_sitio := NULLIF(btrim(COALESCE(v_row->>'sitio', '')), '');

      -- Validation (mirrors the client-side preview checks).
      v_valid := TRUE;
      IF v_cons_code IS NULL THEN
        v_errors := v_errors || jsonb_build_object('row', v_idx, 'cons_code', '', 'error', 'Missing required field: cons_code.');
        v_valid := FALSE;
      END IF;
      IF v_last_name IS NULL OR v_first_name IS NULL THEN
        v_errors := v_errors || jsonb_build_object('row', v_idx, 'cons_code', COALESCE(v_cons_code, ''), 'error', 'Missing required field: last_name / first_name.');
        v_valid := FALSE;
      END IF;
      IF v_status IS NULL THEN
        v_status := 'active';
      ELSIF v_status NOT IN ('active', 'inactive', 'applicant') THEN
        v_errors := v_errors || jsonb_build_object('row', v_idx, 'cons_code', COALESCE(v_cons_code, ''), 'error', 'Invalid status "' || v_status || '" (expected active, inactive, or applicant).');
        v_valid := FALSE;
      END IF;
      IF COALESCE(v_previous_reading, 0) < 0 OR COALESCE(v_current_reading, 0) < 0 THEN
        v_errors := v_errors || jsonb_build_object('row', v_idx, 'cons_code', COALESCE(v_cons_code, ''), 'error', 'Readings must be non-negative numbers.');
        v_valid := FALSE;
      END IF;
      IF v_current_reading IS NOT NULL AND v_previous_reading IS NOT NULL AND v_current_reading < v_previous_reading THEN
        v_errors := v_errors || jsonb_build_object('row', v_idx, 'cons_code', COALESCE(v_cons_code, ''), 'error', 'Current reading is lower than the previous reading.');
        v_valid := FALSE;
      END IF;
      IF v_valid = FALSE THEN
        CONTINUE;
      END IF;

      SELECT resident_id INTO v_existing
      FROM public.resident_accounts
      WHERE account_number = v_cons_code
      LIMIT 1;

      IF v_existing IS NOT NULL AND p_mode = 'skip_existing' THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      IF v_existing IS NULL THEN
        -- New consumer: create the auth user WITHOUT email/password.
        -- handle_new_user inserts the profile automatically.
        INSERT INTO auth.users (
          id, instance_id, aud, role, email, encrypted_password,
          email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
          recovery_token, recovery_sent_at, email_change_token_new, email_change,
          email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
          is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
          phone_change, phone_change_token, phone_change_sent_at,
          reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous
        )
        VALUES (
          gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          NULL, NULL, NULL, NULL, '', NULL, '', NULL, '', '', NULL, NULL,
          '{"provider":"email","providers":["email"]}',
          jsonb_build_object('first_name', v_first_name, 'last_name', v_last_name),
          FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL, '', NULL, FALSE, NULL, FALSE
        )
        RETURNING id INTO v_new_user_id;

        UPDATE public.profiles
        SET first_name = v_first_name,
            middle_name = v_middle_name,
            last_name = v_last_name,
            date_of_birth = NULL,
            phone = NULL,
            email = NULL,
            is_active = (v_status <> 'inactive')
        WHERE id = v_new_user_id;

        v_created_users := v_created_users + 1;
        v_existing := v_new_user_id;
      END IF;

      -- Resolve or create the meter by serial number.
      IF v_meter_serial IS NOT NULL THEN
        SELECT id INTO v_meter_id FROM public.meters
        WHERE meter_number = v_meter_serial LIMIT 1;
        IF v_meter_id IS NULL THEN
          INSERT INTO public.meters (meter_number, is_active)
          VALUES (v_meter_serial, TRUE)
          RETURNING id INTO v_meter_id;
        END IF;
      END IF;

      -- Upsert the service account keyed on the Cons Code. Only the
      -- masterlist-provided fields are applied; service_address and any
      -- other manually entered data stay untouched.
      INSERT INTO public.resident_accounts (
        resident_id, account_number, meter_id, sitio,
        connection_status, previous_reading, current_reading, previous_reading_date
      )
      VALUES (
        v_existing, v_cons_code, v_meter_id, v_sitio,
        v_status, v_previous_reading, v_current_reading, v_previous_period
      )
      ON CONFLICT (account_number) DO UPDATE SET
        meter_id              = EXCLUDED.meter_id,
        sitio                 = EXCLUDED.sitio,
        connection_status     = EXCLUDED.connection_status,
        previous_reading      = EXCLUDED.previous_reading,
        current_reading       = EXCLUDED.current_reading,
        previous_reading_date = EXCLUDED.previous_reading_date;

      IF v_new_user_id IS NOT NULL THEN
        v_created_accounts := v_created_accounts + 1;
      ELSE
        v_updated_accounts := v_updated_accounts + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'row', v_idx,
        'cons_code', COALESCE(v_cons_code, ''),
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'total_rows', v_idx,
    'created_users', v_created_users,
    'created_accounts', v_created_accounts,
    'updated_accounts', v_updated_accounts,
    'skipped', v_skipped,
    'failed', jsonb_array_length(v_errors),
    'errors', v_errors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_resident_rows(JSONB, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
