import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSessionUserId } from '@/hooks/useSessionUserId';
import { queryErrorMessage } from '@/lib/queryError';
import { queryKeys } from '@/lib/queryKeys';
import { getReadingHistory } from '@/services/meterReadingService';
import type { MeterReading } from '@/types/readings';

interface UseReadingHistoryResult {
  readings: MeterReading[];
  /** True on the very first load. */
  loading: boolean;
  /** True while re-fetching after realtime events or manual refresh. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** The reader's submitted readings, shared with the dashboard counts. */
export function useReadingHistory(): UseReadingHistoryResult {
  const userId = useSessionUserId();
  const query = useQuery({
    queryKey: queryKeys.readings.history(userId ?? ''),
    queryFn: getReadingHistory,
    enabled: !!userId,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    readings: query.data ?? [],
    loading: query.isLoading && !query.data,
    refreshing: query.isFetching && !query.isLoading,
    error: query.data ? null : queryErrorMessage(query.error, 'Failed to load reading history.'),
    refresh,
  };
}
