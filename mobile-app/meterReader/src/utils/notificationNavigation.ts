import type { AppNotification } from '@/types/notifications';
import type { NavTab } from '@/components/NavBar/Navbar';

/**
 * Destination inferred from a notification's reference / type.
 * Used when the user taps a row in the notifications feed.
 */
export type NotificationDestination =
  | { kind: 'tab'; tab: NavTab }
  | { kind: 'announcements' }
  | null;

export function resolveNotificationDestination(
  notification: AppNotification
): NotificationDestination {
  const refType = notification.reference_type;

  if (refType === 'meter_reading') {
    if (
      notification.type === 'reading_approved' ||
      notification.type === 'reading_rejected'
    ) {
      return { kind: 'tab', tab: 'history' };
    }
    return { kind: 'tab', tab: 'assigned' };
  }
  if (refType === 'announcement') {
    return { kind: 'announcements' };
  }
  if (refType === 'ticket') {
    return { kind: 'tab', tab: 'tickets' };
  }

  switch (notification.type) {
    case 'reading_assigned':
      return { kind: 'tab', tab: 'assigned' };
    case 'reading_approved':
    case 'reading_rejected':
      return { kind: 'tab', tab: 'history' };
    case 'announcement':
      return { kind: 'announcements' };
    case 'ticket_created':
    case 'ticket_assigned':
    case 'ticket_status':
    case 'ticket_resolved':
      return { kind: 'tab', tab: 'tickets' };
    default:
      return null;
  }
}
