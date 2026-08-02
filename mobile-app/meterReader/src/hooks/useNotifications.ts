import { useCallback, useEffect, useRef, useState } from 'react';

import type { AppNotification } from '@/types/notifications';
import {
  getNotifications,
  getUnreadNotificationCount,
  subscribeToNotifications,
  type NotificationQueryOptions,
} from '@/services/notificationService';

interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  /** True on the very first load. */
  loading: boolean;
  /** True while re-fetching after realtime events or manual refresh. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the signed-in user's notifications and keeps them in sync via a
 * realtime channel, including the unread badge count.
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
    load();

    const unsubscribe = subscribeToNotifications(() => {
      load(true);
    });

    return () => {
      unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { notifications, unreadCount, loading, refreshing, error, refresh };
}
