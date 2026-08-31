import { supabase } from '@/lib/supabase';
import type {
  Ticket,
  TicketDraft,
  TicketPerson,
  TicketTimelineEvent,
} from '@/types/tickets';

// ── Query Options ──

export interface TicketQueryOptions {
  /** Maximum number of rows to return. */
  limit?: number;
}

// ── Error Handling ──

/**
 * Map Supabase/PostgREST errors to user-friendly messages.
 * Only the genuine "undefined table" error (SQLSTATE 42P01 for the tickets
 * or ticket_timeline relations) is translated to the migration hint. Every
 * other error — RLS, auth, column, network, etc. — keeps its real message so
 * the root cause is never hidden behind a generic string.
 */
export function getTicketErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';

  // Log the real Supabase/PostgREST error for debugging — full object so the
  // exact message/code/details/hint can be read in DevTools / Metro logs.
  console.error('Ticket query error:', error);
  console.error(JSON.stringify(error, null, 2));

  const isMissingTicketTable =
    code === '42P01' &&
    (msg.includes('relation "tickets" does not exist') ||
      msg.includes('relation "public.tickets" does not exist') ||
      msg.includes('relation "ticket_timeline" does not exist') ||
      msg.includes('relation "public.ticket_timeline" does not exist'));

  if (isMissingTicketTable) {
    return 'The tickets table has not been set up yet. Please run the SQL migration to create the required tables.';
  }

  // Preserve the original error message — do not replace it with a guess.
  return error.message || 'An unexpected error occurred. Please try again.';
}

// ── Row Mapping ──

interface TicketRow extends Omit<Ticket, 'resident' | 'assigned_staff'> {
  resident?: TicketPerson | null;
  assigned_staff?: TicketPerson | null;
}

function mapRow(row: TicketRow): Ticket {
  return {
    ...row,
    resident: row.resident ?? null,
    assigned_staff: row.assigned_staff ?? null,
  };
}

// NOTE: internal_notes is deliberately excluded — it must never be visible to residents.
const TICKET_SELECT =
  'id, ticket_number, resident_id, assigned_staff_id, category, subject, description, priority, status, resolution, attachment_url, created_at, updated_at, resolved_at, closed_at, deleted_at, resident:profiles!tickets_resident_id_fkey(id, first_name, last_name), assigned_staff:profiles!tickets_assigned_staff_id_fkey(id, first_name, last_name)';

const TIMELINE_SELECT =
  '*, performer:profiles!ticket_timeline_performed_by_fkey(id, first_name, last_name)';

/**
 * Returns the currently authenticated user id or throws a friendly error.
 * Prefers getSession() (local, instant) and only falls back to getUser()
 * (network round-trip) when no cached session is present, so a transient
 * network failure or slow init is never mistaken for "not logged in".
 */
async function requireUserId(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const session = sessionData?.session ?? null;
  console.log('Current session:', session);

  // A cached session is enough — no need to wait on a network call.
  if (session?.user?.id) {
    return session.user.id;
  }

  if (sessionError) {
    console.error('Session error:', sessionError);
  }

  // Fallback: validate/refresh against the server.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user ?? null;
  console.log('Current user:', user);
  if (userError) {
    console.error('getUser error:', userError);
  }

  if (user?.id) {
    return user.id;
  }

  throw new Error('You must be logged in to manage tickets.');
}

// ── Queries ──

/**
 * Fetch the logged-in resident's own non-deleted tickets (newest first).
 * Search/status/category filtering is applied by the UI on the loaded list.
 */
export async function getResidentTickets(
  options: TicketQueryOptions = {}
): Promise<Ticket[]> {
  const userId = await requireUserId();

  let query = supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('resident_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  console.log('Ticket query:', `supabase.from('tickets').select('${TICKET_SELECT}')`);
  const { data, error } = await query;
  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }

  return (data ?? []).map((row) => mapRow(row as unknown as TicketRow));
}

/** Fetch the timeline rows for a single ticket (oldest first). */
export async function getTicketTimeline(
  ticketId: string
): Promise<TicketTimelineEvent[]> {
  const { data, error } = await supabase
    .from('ticket_timeline')
    .select(TIMELINE_SELECT)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }

  return (data ?? []) as TicketTimelineEvent[];
}

/** Fetch a single ticket by id, including its timeline. */
export async function getTicketById(id: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }
  if (!data) {
    return null;
  }

  const timeline = await getTicketTimeline(id);
  return { ...mapRow(data as unknown as TicketRow), timeline };
}

// ── Mutations ──

/**
 * Create a ticket for the logged-in resident. The ticket number is
 * generated automatically by a database trigger (TKT-YYYY-000001).
 * Also records the initial "created" timeline event.
 */
export async function createTicket(draft: TicketDraft): Promise<Ticket> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      resident_id: userId,
      category: draft.category,
      subject: draft.subject,
      description: draft.description,
      priority: draft.priority,
    })
    .select(TICKET_SELECT)
    .single();

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }

  const ticket = mapRow(data as unknown as TicketRow);

  const { error: timelineError } = await supabase
    .from('ticket_timeline')
    .insert({
      ticket_id: ticket.id,
      event_type: 'created',
      description: 'Ticket created',
      performed_by: userId,
    });

  if (timelineError) {
    throw new Error(getTicketErrorMessage(timelineError));
  }

  const timeline = await getTicketTimeline(ticket.id);
  return { ...ticket, timeline };
}

/**
 * Resident confirms that work marked by the meter reader / staff is done.
 * Moves work_completed → resolved.
 */
export async function confirmWorkCompleted(ticketId: string): Promise<Ticket> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('tickets')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .eq('resident_id', userId)
    .eq('status', 'work_completed')
    .select(TICKET_SELECT)
    .single();

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }

  const { error: timelineError } = await supabase.from('ticket_timeline').insert({
    ticket_id: ticketId,
    event_type: 'status_change',
    description: 'Resident confirmed work is completed',
    performed_by: userId,
  });
  if (timelineError) {
    console.warn('[tickets] timeline insert failed:', timelineError.message);
  }

  const timeline = await getTicketTimeline(ticketId);
  return { ...mapRow(data as unknown as TicketRow), timeline };
}

/**
 * Resident reports that work is not yet done. Returns the ticket to Ongoing
 * so the assigned worker can continue.
 */
export async function rejectWorkCompleted(ticketId: string): Promise<Ticket> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('tickets')
    .update({ status: 'in_progress' })
    .eq('id', ticketId)
    .eq('resident_id', userId)
    .eq('status', 'work_completed')
    .select(TICKET_SELECT)
    .single();

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }

  const { error: timelineError } = await supabase.from('ticket_timeline').insert({
    ticket_id: ticketId,
    event_type: 'status_change',
    description: 'Resident reported that work is not yet completed',
    performed_by: userId,
  });
  if (timelineError) {
    console.warn('[tickets] timeline insert failed:', timelineError.message);
  }

  const timeline = await getTicketTimeline(ticketId);
  return { ...mapRow(data as unknown as TicketRow), timeline };
}

// ── Realtime ──

/**
 * Subscribe to insert/update/delete events on the tickets table.
 * Realtime respects RLS, so residents only receive events for their own rows.
 * Returns an unsubscribe function.
 */
export function subscribeToTickets(
  callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', row?: Ticket | null) => void
): () => void {
  // Supabase channels are singletons keyed by name, so use a unique name per
  // call to avoid "cannot add callbacks after subscribe()" when multiple
  // components subscribe at once.
  const channel = supabase
    .channel(`tickets-changes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tickets' },
      (payload) => {
        const event = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const row = payload.new ? mapRow(payload.new as TicketRow) : null;
        callback(event, row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to changes on a single ticket and its timeline rows.
 * The callback fires whenever either changes (e.g. staff updated the status).
 */
export function subscribeToTicket(
  ticketId: string,
  callback: () => void
): () => void {
  // Supabase channels are singletons keyed by name, so use a unique name per
  // call to avoid "cannot add callbacks after subscribe()".
  const channel = supabase
    .channel(`ticket-${ticketId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` },
      () => callback()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ticket_timeline', filter: `ticket_id=eq.${ticketId}` },
      () => callback()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
