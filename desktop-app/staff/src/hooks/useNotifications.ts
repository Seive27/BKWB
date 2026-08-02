import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AppNotification } from '../types';
import {
  getNotifications,
  getUnreadNotificationCount,
  subscribeToNotifications,
  type NotificationQueryOptions,
} from '../services/notificationService';

interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the notification feed and keeps it in sync via realtime, including
 * the unread badge count used by the sidebar.
 */
export function useNotifications(
  options?: NotificationQueryOptions
): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getNotifications(optionsRef.current);
      setNotifications(data);
      try {
        setUnreadCount(await getUnreadNotificationCount());
      } catch {
        // Badge count is best-effort.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // The desktop apps always open at the login screen, so the hook may mount
    // before the operator signs in. Reload whenever the auth session changes
    // (login, logout, token refresh) so the badge and feed stay correct.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        load(true);
      } else if (event === 'SIGNED_OUT') {
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    load();

    const unsubscribe = subscribeToNotifications((_event, row) => {
      // A new row for a different user (admin monitoring view) still needs
      // the feed refreshed; updates re-read is_read state too.
      load(true);
      if (row && !row.is_read) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      unsubscribe();
      authListener.subscription.unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { notifications, unreadCount, loading, refreshing, error, refresh };
}
