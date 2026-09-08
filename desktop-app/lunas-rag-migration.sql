-- ============================================================
-- Lunas RAG migration — resident chatbot knowledge + chat history
-- ------------------------------------------------------------
-- Adds:
--   knowledge_documents / knowledge_chunks (pgvector + FTS)
--   match_knowledge_chunks() hybrid retrieval RPC
--   chat_sessions / chat_messages (optional persistence)
--   Seed FAQ / policy documents for residents
--
-- Apply via Supabase SQL editor or:
--   supabase db push / MCP apply_migration
--
-- After apply, set Edge Function secrets (see chatbot_plan.md §8):
--   LUNAS_LLM_PRIMARY_API_KEY=REPLACE_ME_...
--   LUNAS_EMBEDDING_PRIMARY_API_KEY=REPLACE_ME_...
-- then deploy lunas-chat / lunas-embed and invoke lunas-embed to fill vectors.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ── Knowledge documents ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  audience text NOT NULL DEFAULT 'resident'
    CHECK (audience IN ('resident', 'staff', 'meter_reader', 'all')),
  source_type text NOT NULL DEFAULT 'curated'
    CHECK (source_type IN ('curated', 'faq', 'policy', 'help')),
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_audience_active
  ON public.knowledge_documents (audience, is_active)
  WHERE is_active = true;

-- ── Knowledge chunks ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding extensions.vector(1536),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(content, ''))
  ) STORED,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id
  ON public.knowledge_chunks (document_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_fts
  ON public.knowledge_chunks USING gin (search_vector);

-- HNSW for semantic search (safe when few rows; rebuild after large seed+embed)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
  ON public.knowledge_chunks
  USING hnsw (embedding extensions.vector_cosine_ops);

-- ── Chat persistence (optional) ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
  ON public.chat_sessions (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content text,
  tool_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
  ON public.chat_messages (session_id, created_at);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Residents may read active resident/all knowledge (Data API + debugging).
-- Edge Function RAG primarily uses service role for retrieval orchestration.
DROP POLICY IF EXISTS "Residents can read active knowledge documents" ON public.knowledge_documents;
CREATE POLICY "Residents can read active knowledge documents"
  ON public.knowledge_documents
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND audience IN ('resident', 'all')
    AND valid_from <= now()
    AND (valid_until IS NULL OR valid_until >= now())
  );

DROP POLICY IF EXISTS "Residents can read knowledge chunks for visible docs" ON public.knowledge_chunks;
CREATE POLICY "Residents can read knowledge chunks for visible docs"
  ON public.knowledge_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.knowledge_documents d
      WHERE d.id = knowledge_chunks.document_id
        AND d.is_active = true
        AND d.audience IN ('resident', 'all')
        AND d.valid_from <= now()
        AND (d.valid_until IS NULL OR d.valid_until >= now())
    )
  );

DROP POLICY IF EXISTS "Residents manage own chat sessions" ON public.chat_sessions;
CREATE POLICY "Residents manage own chat sessions"
  ON public.chat_sessions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Residents manage own chat messages" ON public.chat_messages;
CREATE POLICY "Residents manage own chat messages"
  ON public.chat_messages
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Staff / super_admin can manage knowledge (role via profiles)
DROP POLICY IF EXISTS "Staff can manage knowledge documents" ON public.knowledge_documents;
CREATE POLICY "Staff can manage knowledge documents"
  ON public.knowledge_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = (SELECT auth.uid())
        AND r.name IN ('staff', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = (SELECT auth.uid())
        AND r.name IN ('staff', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Staff can manage knowledge chunks" ON public.knowledge_chunks;
CREATE POLICY "Staff can manage knowledge chunks"
  ON public.knowledge_chunks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = (SELECT auth.uid())
        AND r.name IN ('staff', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = (SELECT auth.uid())
        AND r.name IN ('staff', 'super_admin')
    )
  );

-- Data API grants (tables in public are not always auto-exposed)
GRANT SELECT ON public.knowledge_documents TO authenticated, anon;
GRANT SELECT ON public.knowledge_chunks TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;

-- ── Hybrid retrieval RPC ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_text text,
  query_embedding extensions.vector(1536) DEFAULT NULL,
  match_count int DEFAULT 6,
  filter_audience text DEFAULT 'resident'
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  title text,
  category text,
  content text,
  similarity double precision,
  fts_rank double precision,
  combined_score double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH filtered_docs AS (
    SELECT d.id, d.title, d.category
    FROM public.knowledge_documents d
    WHERE d.is_active = true
      AND d.audience IN (filter_audience, 'all')
      AND d.valid_from <= now()
      AND (d.valid_until IS NULL OR d.valid_until >= now())
  ),
  fts AS (
    SELECT
      c.id AS chunk_id,
      c.document_id,
      fd.title,
      fd.category,
      c.content,
      0::double precision AS similarity,
      CASE
        WHEN qo.q IS NULL THEN 0::double precision
        ELSE ts_rank_cd(c.search_vector, qo.q)::double precision
      END AS fts_rank
    FROM public.knowledge_chunks c
    JOIN filtered_docs fd ON fd.id = c.document_id
    CROSS JOIN (
      SELECT NULLIF(
        replace(plainto_tsquery('english', coalesce(query_text, ''))::text, ' & ', ' | '),
        ''
      )::tsquery AS q
    ) qo
    WHERE coalesce(query_text, '') <> ''
      AND qo.q IS NOT NULL
      AND c.search_vector @@ qo.q
  ),
  semantic AS (
    SELECT
      c.id AS chunk_id,
      c.document_id,
      fd.title,
      fd.category,
      c.content,
      (1 - (c.embedding <=> query_embedding))::double precision AS similarity,
      0::double precision AS fts_rank
    FROM public.knowledge_chunks c
    JOIN filtered_docs fd ON fd.id = c.document_id
    WHERE query_embedding IS NOT NULL
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT greatest(match_count * 3, 12)
  ),
  combined AS (
    SELECT * FROM fts
    UNION ALL
    SELECT * FROM semantic
  )
  SELECT
    chunk_id,
    document_id,
    title,
    category,
    content,
    max(similarity) AS similarity,
    max(fts_rank) AS fts_rank,
    (max(similarity) * 0.65 + max(fts_rank) * 0.35) AS combined_score
  FROM combined
  GROUP BY chunk_id, document_id, title, category, content
  ORDER BY combined_score DESC, fts_rank DESC, similarity DESC
  LIMIT greatest(match_count, 1);
$$;

GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(text, extensions.vector, int, text)
  TO authenticated, service_role;

-- ── Seed documents (idempotent by slug) ─────────────────────

INSERT INTO public.knowledge_documents (slug, title, category, audience, source_type)
VALUES
  ('how-to-pay', 'How can I pay my water bill?', 'payments', 'resident', 'faq'),
  ('ticket-statuses', 'Understanding service ticket statuses', 'tickets', 'resident', 'help'),
  ('office-hours', 'Barangay office hours', 'office', 'resident', 'faq'),
  ('high-bill', 'Why is my bill high?', 'billing', 'resident', 'help'),
  ('water-schedule-help', 'Where to find the water schedule', 'schedule', 'resident', 'faq'),
  ('account-login-help', 'Account and login help', 'account', 'resident', 'help'),
  ('file-a-concern', 'How to file a service concern', 'tickets', 'resident', 'faq')
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  updated_at = now();

-- Replace chunks for seeded docs (keeps content fresh on re-run)
DELETE FROM public.knowledge_chunks
WHERE document_id IN (
  SELECT id FROM public.knowledge_documents
  WHERE slug IN (
    'how-to-pay', 'ticket-statuses', 'office-hours', 'high-bill',
    'water-schedule-help', 'account-login-help', 'file-a-concern'
  )
);

INSERT INTO public.knowledge_chunks (document_id, chunk_index, content, metadata)
SELECT d.id, 0, v.content, jsonb_build_object('slug', d.slug)
FROM public.knowledge_documents d
JOIN (
  VALUES
    (
      'how-to-pay',
      $c$BKWB payments are recorded by authorized barangay staff.

Residents may pay using the payment methods currently accepted by Barangay Kalunasan, such as Cash, GCash, or Bank payment where available.

For GCash or Bank transactions, keep your transaction reference or receipt so barangay staff can verify and record the payment.

The Resident app displays billing and payment status. Residents do not manually mark their own bills as paid.

A bill should only be considered paid after BKWB records and confirms the payment.$c$
    ),
    (
      'ticket-statuses',
      $c$Service ticket status meanings in BKWB:

Open — the concern has been submitted.
Acknowledged — staff has seen the concern.
Assigned — staff assigned the concern for handling.
Scheduled — work has been scheduled.
Ongoing (in progress) — work is currently being handled.
Work Completed — the assigned worker indicated the work is finished and is waiting for resident confirmation when applicable.
Resolved — the issue has been confirmed resolved.
Closed — the ticket lifecycle has been completed.

Ticket numbers are generated by the system in the form TKT-YYYY-000001. Lunas never invents ticket numbers.$c$
    ),
    (
      'office-hours',
      $c$Barangay Kalunasan office hours are typically Monday to Friday, 8:00 AM to 5:00 PM, closed on weekends and public holidays unless otherwise announced.

For water service concerns outside office hours, use the Tickets / Reports feature in the Resident app.

Public office details (address, contact) may also appear under barangay information in system settings when configured by staff.$c$
    ),
    (
      'high-bill',
      $c$A higher water bill can come from increased consumption, a leak, penalty charges, or updated meter readings.

Compare your current and previous readings and consumption in Billing History inside the Resident app.

If household usage has not changed significantly, check for possible leaks or file a service concern so staff can review the account.

Lunas uses your live bill data for exact amounts — never guess bill totals from this FAQ alone.$c$
    ),
    (
      'water-schedule-help',
      $c$You can view water schedule, interruption, and maintenance notices under Quick Actions → Water Schedule on the Dashboard, and in Announcements.

Schedules may change during maintenance. Always prefer the latest published announcements and schedule entries in the app over older messages.$c$
    ),
    (
      'account-login-help',
      $c$Residents sign in with their Account Number (consumer code) and password.

If this is your first login after staff issued credentials, complete Account Setup (email verification, new password, and profile) before using the app fully.

Use Forgot Password on the login screen if you need a reset link sent to your registered email. For account number issues, contact barangay staff at the hall.$c$
    ),
    (
      'file-a-concern',
      $c$To file a service concern (leak, no water, billing question, meter issue):

1. Open Quick Actions → Reports / Tickets on the Dashboard.
2. Create a new ticket with category, subject, and description.
3. Attach clear photos when helpful (especially for leaks).

The system assigns a ticket number automatically (TKT-YYYY-000001). Track status from My Tickets. Do not invent ticket numbers in chat.$c$
    )
) AS v(slug, content) ON v.slug = d.slug;
