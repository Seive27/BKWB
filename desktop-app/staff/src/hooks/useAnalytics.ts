import { useCallback, useEffect, useState } from 'react';
import type { AnalyticsData } from '../types';
import { getAnalyticsData } from '../services/analyticsService';

interface UseAnalyticsResult {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Loads the analytics dashboard data for the given lookback window. */
export function useAnalytics(days = 30): UseAnalyticsResult {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAnalyticsData(days);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const refresh = useCallback(() => load(), [load]);

  return { data, loading, error, refresh };
}
