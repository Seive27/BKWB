import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSessionUserId } from '@/hooks/useSessionUserId';
import { queryErrorMessage } from '@/lib/queryError';
import { queryKeys } from '@/lib/queryKeys';
import {
  getNotifications,
  getUnreadNotificationCount,
  type NotificationQueryOptions,
} from '@/services/notificationService';
import type { AppNotification } from '@/types/notifications';

interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Notification feed and unread badge share one cache per user and filter. */
export function useNotifications(options?: NotificationQueryOptions): UseNotificationsResult {
  const userId = useSessionUserId();
  const enabled = !!userId;

  const listQuery = useQuery({
    queryKey: queryKeys.notifications.list(userId ?? '', options),
    queryFn: () => getNotifications(options),
    enabled,
  });
  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.unread(userId ?? ''),
    queryFn: getUnreadNotificationCount,
    enabled,
  });

  const refresh = useCallback(async () => {
    await Promise.all([listQuery.refetch(), unreadQuery.refetch()]);
  }, [listQuery, unreadQuery]);

  return {
    notifications: listQuery.data ?? [],
    unreadCount: unreadQuery.data ?? 0,
    loading: listQuery.isLoading && !listQuery.data,
    refreshing: listQuery.isFetching && !listQuery.isLoading,
    error: listQuery.data
      ? null
      : queryErrorMessage(listQuery.error, 'Failed to load notifications.'),
    refresh,
  };
}
