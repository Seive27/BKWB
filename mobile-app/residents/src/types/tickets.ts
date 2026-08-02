/**
 * Ticket domain types for the resident service request feature.
 * Mirrors the Supabase `tickets` and `ticket_timeline` tables.
 */

export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high';

export type TicketCategory =
  | 'water_supply'
  | 'billing'
  | 'plumbing'
  | 'water_quality'
  | 'meter_concern'
  | 'other';

export type TicketTimelineEventType = 'created' | 'assigned' | 'status_change';

/** A person joined from the profiles table (resident or staff). */
export interface TicketPerson {
  id: string;
  first_name: string;
  last_name: string;
}

/** One row of the ticket_timeline table. */
export interface TicketTimelineEvent {
  id: string;
  ticket_id: string;
  event_type: TicketTimelineEventType;
  description: string | null;
  performed_by: string | null;
  created_at: string;
  /** Joined profiles row (from performed_by) for display. */
  performer?: TicketPerson | null;
}

/** A row of the tickets table, with joined person + optional timeline. */
export interface Ticket {
  id: string;
  /** Human-readable reference, e.g. "TKT-2026-000001" (DB-generated). */
  ticket_number: string;
  resident_id: string;
  assigned_staff_id: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  resolution: string | null;
  /** Staff-only; never fetched by the resident client. */
  internal_notes?: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  deleted_at: string | null;
  /** Joined profiles row for the resident. */
  resident?: TicketPerson | null;
  /** Joined profiles row for the assigned staff member. */
  assigned_staff?: TicketPerson | null;
  /** Chronological history (ticket_timeline rows). */
  timeline?: TicketTimelineEvent[];
}

/** Data captured by the create-ticket form (resident version). */
export interface TicketDraft {
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  water_supply: 'Water Supply',
  billing: 'Billing',
  plumbing: 'Plumbing',
  water_quality: 'Water Quality',
  meter_concern: 'Meter Concern',
  other: 'Other',
};

/**
 * Standardized subjects offered per category in the create-ticket form.
 * Keeps ticket data consistent for staff reporting and filtering.
 */
export const TICKET_SUBJECTS: Record<TicketCategory, string[]> = {
  water_supply: [
    'No Water Supply',
    'Low Water Pressure',
    'Intermittent Water Supply',
    'Dirty Water',
    'Water Supply Inquiry',
  ],
  billing: [
    'Incorrect Bill',
    'Billing Inquiry',
    'Missing Payment',
    'Payment Verification',
    'Outstanding Balance',
  ],
  plumbing: [
    'Water Leak',
    'Broken Pipe',
    'Service Connection Issue',
    'Plumbing Inspection',
  ],
  water_quality: [
    'Discolored Water',
    'Unusual Odor or Taste',
    'Contamination Concern',
    'Water Quality Test Request',
  ],
  meter_concern: [
    'Faulty Water Meter',
    'Meter Reading Concern',
    'Request Meter Inspection',
    'Meter Replacement',
  ],
  other: ['General Inquiry', 'Other Concern'],
};
