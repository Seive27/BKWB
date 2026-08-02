import { supabase } from '../lib/supabase';
import type { AppNotification } from '../types';

export function getNotificationErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';

  if (
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    code === '42P01'
  ) {
    return 'The notifications table has not been set up yet. Please run the SQL migration to create the required tables.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to view notifications.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  console.log('Supabase notification error:', error);
  console.log(JSON.stringify(error, null, 2));
  return error.message || 'An unexpected error occurred. Please try again.';
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: AppNotification['type'];
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: string | null;
  deleted_at: string | null;
  created_at: string;
  recipient?: { id: string; first_name: string; last_name: string } | null;
}

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    reference_type: row.reference_type,
    reference_id: row.reference_id,
    is_read: row.is_read,
    read_at: row.read_at,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    recipient: row.recipient ?? null,
  };
}

const SELECT_FIELDS = '*, recipient:profiles!notifications_user_id_fkey(id, first_name, last_name)';

export interface NotificationQueryOptions {
  /** Fetch notifications for the current user only (default). */
  mineOnly?: boolean;
  /** Show only unread. */
  unreadOnly?: boolean;
  /** Maximum number of rows. */
  limit?: number;
}

/**
 * Fetch notifications. When `mineOnly` is true (default) rows are scoped to
 * the signed-in user; staff/super admins may pass `mineOnly: false` to
 * monitor all users' notifications.
 */
export async function getNotifications(
  options: NotificationQueryOptions = {}
): Promise<AppNotification[]> {
  const mineOnly = options.mineOnly ?? true;

  let query = supabase
    .from('notifications')
    .select(SELECT_FIELDS)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (mineOnly) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('You must be logged in to view notifications.');
    }
    query = query.eq('user_id', userData.user.id);
  }

  if (options.unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(getNotificationErrorMessage(error));
  }

  return (data ?? []).map(mapRow);
}

/** Count unread notifications for the current user (drives sidebar badges). */
export async function getUnreadNotificationCount(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userData.user.id)
    .eq('is_read', false)
    .is('deleted_at', null);

  if (error) {
    throw new Error(getNotificationErrorMessage(error));
  }

  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(getNotificationErrorMessage(error));
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userData.user.id)
    .eq('is_read', false)
    .is('deleted_at', null);

  if (error) {
    throw new Error(getNotificationErrorMessage(error));
  }
}

/** Soft-delete a notification (hidden from the feed). */
export async function softDeleteNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(getNotificationErrorMessage(error));
  }
}

/**
 * Subscribe to insert/update/delete events on the notifications table.
 * Realtime broadcasts respect RLS, so a client only receives events for the
 * rows it is allowed to read. Returns an unsubscribe function.
 */
export function subscribeToNotifications(
  callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', row?: AppNotification | null) => void
): () => void {
  // Supabase channels are singletons keyed by name, and components can mount
  // multiple subscriptions at once (e.g. the sidebar badge + the page). Using
  // a unique name per call avoids "cannot add callbacks after subscribe()".
  const channel = supabase
    .channel(`notifications-changes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      (payload) => {
        const event = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const row = payload.new ? mapRow(payload.new as NotificationRow) : null;
        callback(event, row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
