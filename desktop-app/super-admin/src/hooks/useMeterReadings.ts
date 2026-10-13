import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { queryErrorMessage } from '../lib/queryError';
import { queryKeys } from '../lib/queryKeys';
import type { MeterReading } from '../types';
import {
  getMeterReadings,
  type MeterReadingQueryOptions,
} from '../services/meterReadingService';

interface UseMeterReadingsResult {
  readings: MeterReading[];
  /** True on the very first load. */
  loading: boolean;
  /** True while re-fetching after realtime events or manual refresh. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Loads meter readings from the shared cache. Realtime invalidation lives in RealtimeSync. */
export function useMeterReadings(
  options?: MeterReadingQueryOptions
): UseMeterReadingsResult {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.meterReadings.list(options ?? {}),
    queryFn: () => getMeterReadings(options ?? {}),
    enabled: isAuthenticated,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    readings: query.data ?? [],
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    error: queryErrorMessage(query.error, 'Failed to load meter readings.'),
    refresh,
  };
}
