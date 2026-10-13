import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { queryErrorMessage } from '../lib/queryError';
import { queryKeys } from '../lib/queryKeys';
import type { AppNotification } from '../types';
import {
  getNotifications,
  getUnreadNotificationCount,
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
 * Loads the notification feed from the shared cache. Header and Sidebar pass
 * the same options, so they share one request and one unread count.
 */
export function useNotifications(
  options?: NotificationQueryOptions
): UseNotificationsResult {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? '';
  const listOptions = {
    userId,
    limit: options?.limit,
    mineOnly: options?.mineOnly,
    unreadOnly: options?.unreadOnly,
  };

  const listQuery = useQuery({
    queryKey: queryKeys.notifications.list(listOptions),
    queryFn: () => getNotifications(options ?? {}),
    enabled: isAuthenticated && userId.length > 0,
  });

  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.unread(userId),
    queryFn: getUnreadNotificationCount,
    enabled: isAuthenticated && userId.length > 0,
  });

  const refresh = useCallback(async () => {
    await Promise.all([listQuery.refetch(), unreadQuery.refetch()]);
  }, [listQuery, unreadQuery]);

  return {
    notifications: listQuery.data ?? [],
    unreadCount: unreadQuery.data ?? 0,
    loading: listQuery.isLoading,
    refreshing: listQuery.isFetching && !listQuery.isLoading,
    error: queryErrorMessage(listQuery.error, 'Failed to load notifications.'),
    refresh,
  };
}
