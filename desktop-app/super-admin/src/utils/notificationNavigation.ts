import type { AppNotification } from '../types';

/**
 * Destination inferred from a notification's reference / type.
 * Used when the user clicks a row in the notifications feed.
 */
export type NotificationDestination = {
  page: string;
  selectedId?: string;
} | null;

export function resolveNotificationDestination(
  notification: AppNotification
): NotificationDestination {
  const refType = notification.reference_type;
  const refId = notification.reference_id ?? undefined;

  if (refType === 'ticket') {
    return { page: 'ticket-management', selectedId: refId };
  }
  if (refType === 'announcement') {
    return { page: 'announcements', selectedId: refId };
  }
  if (refType === 'meter_reading') {
    return { page: 'meter-readings', selectedId: refId };
  }

  switch (notification.type) {
    case 'ticket_created':
    case 'ticket_assigned':
    case 'ticket_status':
    case 'ticket_resolved':
      return { page: 'ticket-management', selectedId: refId };
    case 'announcement':
      return { page: 'announcements', selectedId: refId };
    case 'reading_assigned':
    case 'reading_approved':
    case 'reading_rejected':
      return { page: 'meter-readings', selectedId: refId };
    case 'billing':
      return { page: 'bills', selectedId: refId };
    case 'payment':
      return { page: 'payments', selectedId: refId };
    default:
      return null;
  }
}
