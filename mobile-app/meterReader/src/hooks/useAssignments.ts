import { useCallback, useEffect, useState } from 'react';

import {
  getAssignedReadings,
  subscribeToMeterReadings,
} from '@/services/meterReadingService';
import type { MeterReading } from '@/types/readings';

interface UseAssignmentsResult {
  assignments: MeterReading[];
  /** True on the very first load. */
  loading: boolean;
  /** True while re-fetching after realtime events or manual refresh. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the reader's active (assigned, not yet submitted) meter readings and
 * keeps them in sync via a realtime channel. Subscriptions are cleaned up on
 * unmount. Mirrors the announcement hook pattern.
 */
export function useAssignments(): UseAssignmentsResult {
  const [assignments, setAssignments] = useState<MeterReading[]>([]);
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
      const data = await getAssignedReadings();
      setAssignments(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load assigned readings.'
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

  return { assignments, loading, refreshing, error, refresh };
}

