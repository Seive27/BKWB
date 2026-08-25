import { supabase } from '@/lib/supabase';

/** Ticket statuses relevant to the meter reader workflow. */
export type ReaderTicketStatus =
  | 'open'
  | 'acknowledged'
  | 'assigned'
  | 'scheduled'
  | 'in_progress'
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
}

export const READER_TICKET_STATUS_LABELS: Record<ReaderTicketStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

function mapRow(row: ReaderTicket): ReaderTicket {
  return { ...row, resident: row.resident ?? null };
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

  return ((data ?? []) as unknown as ReaderTicket[]).map(mapRow);
}

/** Move an assigned/scheduled ticket into progress. */
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

  await recordTimeline(ticketId, 'status_change', 'Meter reader started work');
  return mapRow(data as unknown as ReaderTicket);
}

/**
 * Complete the corrective action: mark the ticket resolved with a short
 * resolution note. The resident's ticket view updates automatically via RLS
 * and a notification is emitted by a database trigger.
 */
export async function resolveMyTicket(
  ticketId: string,
  resolution: string
): Promise<ReaderTicket> {
  const trimmed = resolution.trim();
  if (!trimmed) {
    throw new Error('Please describe what was done to resolve the ticket.');
  }

  const { data, error } = await supabase
    .from('tickets')
    .update({
      status: 'resolved',
      resolution: trimmed,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .in('status', ['scheduled', 'in_progress'])
    .select(SELECT)
    .single();

  if (error) {
    throw new Error(
      error.message.includes('Invalid ticket status')
        ? error.message
        : error.message || 'Could not resolve this ticket.'
    );
  }

  await recordTimeline(ticketId, 'status_change', `Resolved: ${trimmed}`.slice(0, 300));
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
