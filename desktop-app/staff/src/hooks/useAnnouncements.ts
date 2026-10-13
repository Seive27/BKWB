import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { ANNOUNCEMENT_REFETCH_INTERVAL } from '../lib/queryClient';
import { queryErrorMessage } from '../lib/queryError';
import { queryKeys } from '../lib/queryKeys';
import type { Announcement } from '../types';
import {
  getAnnouncements,
  type AnnouncementQueryOptions,
} from '../services/announcementService';

interface UseAnnouncementsResult {
  announcements: Announcement[];
  /** True on the very first load. */
  loading: boolean;
  /** True while re-fetching after realtime events or manual refresh. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads announcements from the shared cache. A scheduled publish does not
 * emit a postgres event, so the list also refreshes once a minute.
 */
export function useAnnouncements(
  options?: AnnouncementQueryOptions
): UseAnnouncementsResult {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.announcements.list(options ?? {}),
    queryFn: () => getAnnouncements(options ?? {}),
    enabled: isAuthenticated,
    refetchInterval: ANNOUNCEMENT_REFETCH_INTERVAL,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    announcements: query.data ?? [],
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    error: queryErrorMessage(query.error, 'Failed to load announcements.'),
    refresh,
  };
}
