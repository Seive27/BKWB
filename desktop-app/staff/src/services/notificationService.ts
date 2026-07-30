export interface NotificationPayload {
  title: string;
  message: string;
  userId?: string;
  type?: 'payment' | 'announcement' | 'ticket' | 'system';
}

export async function sendNotification(_notification: NotificationPayload): Promise<void> {
  // TODO: Implement with Supabase or push notification service
}

export async function getNotifications(_userId: string): Promise<NotificationPayload[]> {
  return [];
}
