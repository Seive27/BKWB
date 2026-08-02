import { useCallback, useEffect, useState } from 'react';

import {
  getReadingHistory,
  subscribeToMeterReadings,
} from '@/services/meterReadingService';
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

/**
 * Loads the reader's submitted readings (history) and keeps them in sync via
 * a realtime channel so approvals/rejections appear instantly. Subscriptions
 * are cleaned up on unmount.
 */
export function useReadingHistory(): UseReadingHistoryResult {
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getReadingHistory();
      setReadings(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load reading history.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();

    const unsubscribe = subscribeToMeterReadings(() => {
      load(true);
    });

    return () => {
      unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { readings, loading, refreshing, error, refresh };
}

