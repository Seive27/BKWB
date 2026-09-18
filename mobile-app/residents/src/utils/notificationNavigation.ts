import type { AppNotification } from '@/types/notifications';

/**
 * Destination inferred from a notification's reference / type.
 * Used when the user taps a row in the notifications feed.
 */
export type NotificationDestination =
  | { kind: 'ticket'; ticketId?: string }
  | { kind: 'announcement'; announcementId?: string }
  | { kind: 'bills' }
  | { kind: 'payments' }
  | null;

export function resolveNotificationDestination(
  notification: AppNotification
): NotificationDestination {
  const refType = notification.reference_type;
  const refId = notification.reference_id ?? undefined;

  if (refType === 'ticket') {
    return { kind: 'ticket', ticketId: refId };
  }
  if (refType === 'announcement') {
    return { kind: 'announcement', announcementId: refId };
  }
  if (refType === 'meter_reading') {
    return { kind: 'bills' };
  }

  switch (notification.type) {
    case 'ticket_created':
    case 'ticket_assigned':
    case 'ticket_status':
    case 'ticket_resolved':
      return { kind: 'ticket', ticketId: refId };
    case 'announcement':
      return { kind: 'announcement', announcementId: refId };
    case 'reading_approved':
    case 'reading_rejected':
    case 'billing':
      return { kind: 'bills' };
    case 'payment':
      return { kind: 'payments' };
    default:
      return null;
  }
}
