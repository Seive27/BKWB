import { supabase } from '../lib/supabase';
import type {
  ResidentOption,
  StaffOption,
  Ticket,
  TicketDraft,
  TicketPerson,
  TicketStatus,
  TicketTimelineEvent,
} from '../types';

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

const TICKET_SELECT =
  '*, resident:profiles!tickets_resident_id_fkey(id, first_name, last_name), assigned_staff:profiles!tickets_assigned_staff_id_fkey(id, first_name, last_name)';

const TIMELINE_SELECT =
  '*, performer:profiles!ticket_timeline_performed_by_fkey(id, first_name, last_name)';

// ── Queries ──

/**
 * Fetch all non-deleted tickets (newest first) for staff/super-admin.
 * Search/status/category/priority filtering is applied by the UI.
 */
export async function getTickets(
  options: TicketQueryOptions = {}
): Promise<Ticket[]> {
  let query = supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('deleted_at', null)
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

/** Fetch active staff profiles for the assign-ticket picker. */
export async function getStaffProfiles(): Promise<StaffOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role:roles(name)')
    .eq('is_active', true)
    .eq('role.name', 'staff')
    .order('last_name');

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
  }));
}

/** Fetch active resident profiles for the create-ticket picker. */
export async function getResidents(): Promise<ResidentOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role:roles(name)')
    .eq('is_active', true)
    .eq('role.name', 'resident')
    .order('last_name');

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
  }));
}

// ── Mutations ──

/**
 * Create a ticket on behalf of a resident (staff/super-admin flow).
 * The ticket number is generated automatically by a database trigger.
 * Also records the initial "created" timeline event.
 */
export async function createTicket(
  draft: TicketDraft,
  performedBy: string
): Promise<Ticket> {
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      resident_id: draft.resident_id,
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
      performed_by: performedBy,
    });

  if (timelineError) {
    throw new Error(getTicketErrorMessage(timelineError));
  }

  return ticket;
}

/**
 * Assign a ticket to a staff member. If the ticket is still "open",
 * the status is advanced to "assigned" as part of the workflow.
 * Records an "assigned" timeline event.
 */
export async function assignTicket(
  id: string,
  staffId: string,
  performedBy: string,
  staffName: string
): Promise<Ticket> {
  const { data: current, error: currentError } = await supabase
    .from('tickets')
    .select('status')
    .eq('id', id)
    .maybeSingle();

  if (currentError) {
    throw new Error(getTicketErrorMessage(currentError));
  }

  const nextStatus: TicketStatus =
    current?.status === 'open' ? 'assigned' : (current?.status ?? 'assigned');

  const { data, error } = await supabase
    .from('tickets')
    .update({ assigned_staff_id: staffId, status: nextStatus })
    .eq('id', id)
    .select(TICKET_SELECT)
    .single();

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }

  const { error: timelineError } = await supabase
    .from('ticket_timeline')
    .insert({
      ticket_id: id,
      event_type: 'assigned',
      description: `Assigned to ${staffName}`,
      performed_by: performedBy,
    });

  if (timelineError) {
    throw new Error(getTicketErrorMessage(timelineError));
  }

  return mapRow(data as unknown as TicketRow);
}

/**
 * Update a ticket's status. Sets resolved_at/closed_at timestamps where
 * appropriate and records a "status_change" timeline event.
 */
export async function updateStatus(
  id: string,
  status: TicketStatus,
  performedBy: string,
  resolution?: string
): Promise<Ticket> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status };

  if (status === 'resolved') {
    updates.resolved_at = now;
    if (resolution !== undefined) {
      updates.resolution = resolution;
    }
  } else if (status === 'closed') {
    updates.closed_at = now;
  } else if (status === 'open' || status === 'assigned' || status === 'in_progress') {
    // Reopening/rewinding clears closure markers.
    updates.resolved_at = null;
    updates.closed_at = null;
  }

  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select(TICKET_SELECT)
    .single();

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }

  const { error: timelineError } = await supabase
    .from('ticket_timeline')
    .insert({
      ticket_id: id,
      event_type: 'status_change',
      description: `Status changed to ${status.replace('_', ' ')}`,
      performed_by: performedBy,
    });

  if (timelineError) {
    throw new Error(getTicketErrorMessage(timelineError));
  }

  return mapRow(data as unknown as TicketRow);
}

/** Update editable staff-only fields (resolution, internal notes, etc.). */
export async function updateTicket(
  id: string,
  updates: Partial<Pick<Ticket, 'resolution' | 'internal_notes' | 'priority' | 'subject'>>
): Promise<Ticket> {
  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select(TICKET_SELECT)
    .single();

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }

  return mapRow(data as unknown as TicketRow);
}

/** Soft-delete a ticket by setting deleted_at. */
export async function deleteTicket(id: string): Promise<void> {
  const { error } = await supabase
    .from('tickets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }
}

// ── Realtime ──

/**
 * Subscribe to insert/update/delete events on the tickets table.
 * Returns an unsubscribe function.
 */
export function subscribeToTickets(
  callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', row?: Ticket | null) => void
): () => void {
  const channel = supabase
    .channel('tickets-changes')
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
 * The callback fires whenever either changes.
 */
export function subscribeToTicket(
  ticketId: string,
  callback: () => void
): () => void {
  const channel = supabase
    .channel(`ticket-${ticketId}`)
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
