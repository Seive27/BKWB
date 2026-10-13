import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSessionUserId } from '@/hooks/useSessionUserId';
import { ANNOUNCEMENT_REFETCH_INTERVAL } from '@/lib/queryClient';
import { queryErrorMessage } from '@/lib/queryError';
import { queryKeys } from '@/lib/queryKeys';
import {
  getAnnouncements,
  type AnnouncementQueryOptions,
} from '@/services/announcementService';
import type { Announcement } from '@/types/announcements';

interface UseAnnouncementsResult {
  announcements: Announcement[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Shared announcements. A scheduled publish does not emit a postgres event,
 * so the list also refreshes once a minute.
 */
export function useAnnouncements(options?: AnnouncementQueryOptions): UseAnnouncementsResult {
  const userId = useSessionUserId();
  const query = useQuery({
    queryKey: queryKeys.announcements.list(options),
    queryFn: () => getAnnouncements(options),
    enabled: !!userId,
    refetchInterval: ANNOUNCEMENT_REFETCH_INTERVAL,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    announcements: query.data ?? [],
    loading: query.isLoading && !query.data,
    refreshing: query.isFetching && !query.isLoading,
    error: query.data ? null : queryErrorMessage(query.error, 'Failed to load announcements.'),
    refresh,
  };
}
