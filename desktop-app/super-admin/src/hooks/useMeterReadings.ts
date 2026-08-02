import { useCallback, useEffect, useRef, useState } from 'react';
import type { MeterReading } from '../types';
import {
  getMeterReadings,
  subscribeToMeterReadings,
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

/**
 * Loads meter readings from Supabase and keeps them in sync via a realtime
 * channel. The subscription is cleaned up automatically on unmount.
 */
export function useMeterReadings(
  options?: MeterReadingQueryOptions
): UseMeterReadingsResult {
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep options in a ref so the load callback stays stable.
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
      const data = await getMeterReadings(optionsRef.current);
      setReadings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meter readings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Re-fetch whenever a row changes anywhere (assign/submit/review).
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

