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

interface AssigneeEmbed {
  profile?: TicketPerson | null;
}

interface TicketRow extends Omit<Ticket, 'resident' | 'assigned_staff' | 'assignees'> {
  resident?: TicketPerson | null;
  assigned_staff?: TicketPerson | null;
  assignees?: AssigneeEmbed[] | null;
}

function mapRow(row: TicketRow): Ticket {
  const fromJunction = (row.assignees ?? [])
    .map((entry) => entry.profile)
    .filter((person): person is TicketPerson => Boolean(person?.id));
  const primary = row.assigned_staff ?? null;
  const others = fromJunction.filter((person) => person.id !== primary?.id);
  const assignees = primary ? [primary, ...others] : fromJunction;

  return {
    ...row,
    resident: row.resident ?? null,
    assigned_staff: assignees[0] ?? row.assigned_staff ?? null,
    assignees,
  };
}

const TICKET_SELECT =
  '*, resident:profiles!tickets_resident_id_fkey(id, first_name, last_name), assigned_staff:profiles!tickets_assigned_staff_id_fkey(id, first_name, last_name), assignees:ticket_assignees(profile:profiles!ticket_assignees_profile_id_fkey(id, first_name, last_name))';

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

/** Fetch active staff profiles for the assign-ticket picker. */
export async function getStaffProfiles(): Promise<StaffOption[]> {
  // `roles!inner` is required: filtering on an outer-joined embed does not
  // remove parent rows, so other roles would otherwise leak into the list.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role:roles!inner(name)')
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

/** Fetch active meter reader profiles for the assign-ticket picker. */
export async function getMeterReaderProfiles(): Promise<StaffOption[]> {
  // `roles!inner` is required: filtering on an outer-joined embed does not
  // remove parent rows, so other roles would otherwise leak into the list.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role:roles!inner(name)')
    .eq('is_active', true)
    .eq('role.name', 'meter_reader')
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
  // `roles!inner` is required: filtering on an outer-joined embed does not
  // remove parent rows, so staff/meter readers would otherwise leak into the list.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role:roles!inner(name)')
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
 * Replace the people assigned to a ticket. The first id is stored as
 * assigned_staff_id so existing reader access and notifications keep working.
 * Additional people are stored in ticket_assignees.
 *
 * The ticket row is updated before assignee inserts so the primary person is
 * notified once by the ticket trigger, and everyone else is notified by the
 * assignee insert trigger.
 */
export async function assignTicket(
  id: string,
  staffIds: string[],
  performedBy: string,
  staffNames: string
): Promise<Ticket> {
  const uniqueIds = [...new Set(staffIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new Error('Select at least one person to assign.');
  }

  const { data: current, error: currentError } = await supabase
    .from('tickets')
    .select('status')
    .eq('id', id)
    .maybeSingle();

  if (currentError) {
    throw new Error(getTicketErrorMessage(currentError));
  }

  const nextStatus: TicketStatus =
    current?.status === 'open' || current?.status === 'acknowledged'
      ? 'assigned'
      : current?.status ?? 'assigned';

  const { error } = await supabase
    .from('tickets')
    .update({ assigned_staff_id: uniqueIds[0], status: nextStatus })
    .eq('id', id);

  if (error) {
    throw new Error(getTicketErrorMessage(error));
  }

  await syncTicketAssignees(id, uniqueIds);

  const { error: timelineError } = await supabase
    .from('ticket_timeline')
    .insert({
      ticket_id: id,
      event_type: 'assigned',
      description: `Assigned to ${staffNames}`,
      performed_by: performedBy,
    });

  if (timelineError) {
    throw new Error(getTicketErrorMessage(timelineError));
  }

  const refreshed = await supabase.from('tickets').select(TICKET_SELECT).eq('id', id).single();
  if (refreshed.error || !refreshed.data) {
    throw new Error(
      getTicketErrorMessage(refreshed.error ?? { message: 'Failed to load the assigned ticket.' })
    );
  }
  return mapRow(refreshed.data as unknown as TicketRow);
}

/** Make ticket_assignees match the selected people without duplicating rows. */
async function syncTicketAssignees(ticketId: string, staffIds: string[]): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('ticket_assignees')
    .select('profile_id')
    .eq('ticket_id', ticketId);

  if (readError) {
    throw new Error(getTicketErrorMessage(readError));
  }

  const existingIds = new Set((existing ?? []).map((row) => row.profile_id as string));
  const nextIds = new Set(staffIds);
  const toRemove = [...existingIds].filter((profileId) => !nextIds.has(profileId));
  const toAdd = staffIds.filter((profileId) => !existingIds.has(profileId));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('ticket_assignees')
      .delete()
      .eq('ticket_id', ticketId)
      .in('profile_id', toRemove);
    if (error) {
      throw new Error(getTicketErrorMessage(error));
    }
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from('ticket_assignees').insert(
      toAdd.map((profileId) => ({
        ticket_id: ticketId,
        profile_id: profileId,
      }))
    );
    if (error) {
      throw new Error(getTicketErrorMessage(error));
    }
  }
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

export async function reworkTicket(
  id: string,
  reason: string,
  performedBy: string
): Promise<Ticket> {
  const { data, error } = await supabase
    .from('tickets')
    .update({ 
      status: 'open',
      last_status_reason: reason 
    })
    .eq('id', id)
    .select(TICKET_SELECT)
    .single();

  if (error) throw new Error(getTicketErrorMessage(error));

  const { error: timelineError } = await supabase
    .from('ticket_timeline')
    .insert({
      ticket_id: id,
      event_type: 'status_change',
      description: `Requested additional info: ${reason}`,
      performed_by: performedBy,
    });

  if (timelineError) throw new Error(getTicketErrorMessage(timelineError));

  return mapRow(data as unknown as TicketRow);
}

export async function rejectTicket(
  id: string,
  reason: string,
  performedBy: string
): Promise<Ticket> {
  const { data, error } = await supabase
    .from('tickets')
    .update({ 
      status: 'closed',
      resolution: reason,
      last_status_reason: reason,
      closed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(TICKET_SELECT)
    .single();

  if (error) throw new Error(getTicketErrorMessage(error));

  const { error: timelineError } = await supabase
    .from('ticket_timeline')
    .insert({
      ticket_id: id,
      event_type: 'status_change',
      description: `Ticket not accepted: ${reason}`,
      performed_by: performedBy,
    });

  if (timelineError) throw new Error(getTicketErrorMessage(timelineError));

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
 * The callback fires whenever either changes.
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
