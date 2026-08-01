/**
 * Ticket domain types for the resident service request feature.
 *
 * These types mirror the future Supabase schema (tickets + ticket_timeline)
 * so the UI can be wired to the backend with minimal changes later.
 */

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export type TicketPriority = 'low' | 'medium' | 'high';

export type TicketCategory = 'water' | 'billing' | 'meter' | 'account' | 'plumbing' | 'other';

export type TicketEventType = 'submitted' | 'staff_reply' | 'status_change' | 'resolved';

export type TicketTimelineEvent = {
  id: string;
  type: TicketEventType;
  title: string;
  /** Optional message body. For staff replies this is the reply text. */
  description?: string;
  /** Who created the event: the resident ("You") or staff ("BKWB Staff"). */
  author: string;
  timestamp: string;
};

export type Ticket = {
  id: string;
  /** Human-readable reference, e.g. "TKT-2026-0102". */
  reference: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  description: string;
  createdAt: string;
  updatedAt: string;
  /** Chronological history shown in the timeline. */
  timeline: TicketTimelineEvent[];
};

/** Data captured by the create-ticket form. */
export type TicketDraft = {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  water: 'Water Supply',
  billing: 'Billing',
  meter: 'Meter',
  account: 'Account',
  plumbing: 'Plumbing',
  other: 'Other',
};

/**
 * Standardized subjects offered per category in the create-ticket form.
 * Keeps ticket data consistent for staff reporting and filtering.
 */
export const TICKET_SUBJECTS: Record<TicketCategory, string[]> = {
  water: [
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
  meter: [
    'Faulty Water Meter',
    'Meter Reading Concern',
    'Request Meter Inspection',
    'Meter Replacement',
  ],
  account: [
    'Update Personal Information',
    'Change Contact Number',
    'Account Ownership Transfer',
    'Account Inquiry',
  ],
  plumbing: [
    'Water Leak',
    'Broken Pipe',
    'Service Connection Issue',
    'Plumbing Inspection',
  ],
  other: ['General Inquiry', 'Other Concern'],
};
