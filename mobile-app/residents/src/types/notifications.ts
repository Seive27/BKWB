/**
 * Notification domain types for the resident app.
 * Mirrors the Supabase `notifications` table.
 */

export type NotificationType =
  | 'announcement'
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status'
  | 'ticket_resolved'
  | 'reading_assigned'
  | 'reading_approved'
  | 'reading_rejected'
  | 'billing'
  | 'payment'
  | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  announcement: 'Announcement',
  ticket_created: 'Ticket Created',
  ticket_assigned: 'Ticket Assigned',
  ticket_status: 'Ticket Updated',
  ticket_resolved: 'Ticket Resolved',
  reading_assigned: 'Reading Assigned',
  reading_approved: 'Reading Approved',
  reading_rejected: 'Reading Rejected',
  billing: 'Billing',
  payment: 'Payment',
  system: 'System',
};
