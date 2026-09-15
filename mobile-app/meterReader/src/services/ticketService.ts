import { supabase } from '@/lib/supabase';

/** Ticket statuses relevant to the meter reader workflow. */
export type ReaderTicketStatus =
  | 'open'
  | 'acknowledged'
  | 'assigned'
  | 'scheduled'
  | 'in_progress'
  | 'work_completed'
  | 'resolved'
  | 'closed';

/** A ticket assigned to the signed-in meter reader. */
export interface ReaderTicket {
  id: string;
  ticket_number: string;
  category: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: ReaderTicketStatus;
  resolution: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  /** Joined profiles row for the resident who filed the ticket. */
  resident?: { id: string; first_name: string; last_name: string } | null;
  /**
   * Latest resident "Not Yet" explanation from ticket_timeline, when the
   * resident rejected a work_completed confirmation. Shown while Ongoing.
   */
  resident_not_yet_reason?: string | null;
}

export const READER_TICKET_STATUS_LABELS: Record<ReaderTicketStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  scheduled: 'Scheduled',
  in_progress: 'Ongoing',
  work_completed: 'Work Completed',
  resolved: 'Resolved',
  closed: 'Closed',
};

const NOT_YET_PREFIX = 'Resident reported that work is not yet completed:';

function mapRow(row: ReaderTicket): ReaderTicket {
  return {
    ...row,
    resident: row.resident ?? null,
    resident_not_yet_reason: row.resident_not_yet_reason ?? null,
  };
}

function extractNotYetReason(description: string | null | undefined): string | null {
  if (!description) return null;
  const idx = description.indexOf(NOT_YET_PREFIX);
  if (idx >= 0) {
    const reason = description.slice(idx + NOT_YET_PREFIX.length).trim();
    return reason || null;
  }
  // Fallback for older/variant wording.
  const lower = description.toLowerCase();
  if (!lower.includes('not yet completed')) return null;
  const colon = description.indexOf(':');
  if (colon >= 0) {
    const reason = description.slice(colon + 1).trim();
    return reason || description.trim();
  }
  return description.trim();
}

/**
 * Attach the newest resident "Not Yet" reason per ticket from timeline.
 * Only surfaced for Ongoing tickets so old feedback does not linger after
 * the reader marks work completed again.
 */
async function attachResidentNotYetReasons(
  tickets: ReaderTicket[]
): Promise<ReaderTicket[]> {
  const ongoingIds = tickets.filter((t) => t.status === 'in_progress').map((t) => t.id);
  if (ongoingIds.length === 0) {
    return tickets.map((t) => ({ ...t, resident_not_yet_reason: null }));
  }

  const { data, error } = await supabase
    .from('ticket_timeline')
    .select('ticket_id, description, created_at')
    .in('ticket_id', ongoingIds)
    .eq('event_type', 'status_change')
    .ilike('description', '%not yet completed%')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[tickets] could not load resident feedback:', error.message);
    return tickets.map((t) => ({ ...t, resident_not_yet_reason: null }));
  }

  const latestByTicket = new Map<string, string>();
  for (const row of data ?? []) {
    const ticketId = row.ticket_id as string;
    if (latestByTicket.has(ticketId)) continue;
    const reason = extractNotYetReason(row.description as string | null);
    if (reason) latestByTicket.set(ticketId, reason);
  }

  return tickets.map((t) => ({
    ...t,
    resident_not_yet_reason: latestByTicket.get(t.id) ?? null,
  }));
}

const SELECT =
  '*, resident:profiles!tickets_resident_id_fkey(id, first_name, last_name)';

async function requireUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You must be logged in to view your tickets.');
  }
  return session.user.id;
}

/**
 * Tickets assigned to the signed-in meter reader (RLS limits reads to
 * assigned_staff_id = auth.uid()). Active ones first.
 */
export async function getMyTickets(): Promise<ReaderTicket[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('tickets')
    .select(SELECT)
    .eq('assigned_staff_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation')) {
      console.warn('[tickets] table not available:', error.message);
      return [];
    }
    throw new Error(error.message || 'Failed to load your tickets.');
  }

  const tickets = ((data ?? []) as unknown as ReaderTicket[]).map(mapRow);
  return attachResidentNotYetReasons(tickets);
}

/** Mark an assigned/scheduled ticket as Ongoing (in progress). */
export async function startTicketWork(ticketId: string): Promise<ReaderTicket> {
  const { data, error } = await supabase
    .from('tickets')
    .update({ status: 'in_progress' })
    .eq('id', ticketId)
    .in('status', ['assigned', 'scheduled'])
    .select(SELECT)
    .single();

  if (error) {
    throw new Error(
      error.message.includes('Invalid ticket status')
        ? error.message
        : error.message || 'Could not start work on this ticket.'
    );
  }

  await recordTimeline(ticketId, 'status_change', 'Meter reader marked ticket as Ongoing');
  return mapRow(data as unknown as ReaderTicket);
}

/**
 * Mark corrective work as done. Status becomes work_completed so the
 * resident can confirm before the ticket is resolved.
 */
export async function markWorkCompleted(
  ticketId: string,
  resolution: string
): Promise<ReaderTicket> {
  const trimmed = resolution.trim();
  if (!trimmed) {
    throw new Error('Please describe what work was completed.');
  }

  const { data, error } = await supabase
    .from('tickets')
    .update({
      status: 'work_completed',
      resolution: trimmed,
    })
    .eq('id', ticketId)
    .in('status', ['scheduled', 'in_progress'])
    .select(SELECT)
    .single();

  if (error) {
    throw new Error(
      error.message.includes('Invalid ticket status')
        ? error.message
        : error.message || 'Could not mark this ticket as work completed.'
    );
  }

  await recordTimeline(
    ticketId,
    'status_change',
    `Work completed: ${trimmed}`.slice(0, 300)
  );
  return mapRow(data as unknown as ReaderTicket);
}

async function recordTimeline(
  ticketId: string,
  eventType: 'assigned' | 'status_change',
  description: string
): Promise<void> {
  const { error } = await supabase.from('ticket_timeline').insert({
    ticket_id: ticketId,
    event_type: eventType,
    description,
    performed_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  if (error) {
    // Timeline is supplementary — never block the status change itself.
    console.warn('[tickets] timeline insert failed:', error.message);
  }
}
