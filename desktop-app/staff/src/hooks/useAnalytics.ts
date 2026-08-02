import { useCallback, useEffect, useState } from 'react';
import type { AnalyticsData } from '../types';
import { getAnalyticsData } from '../services/analyticsService';
import { useAuth } from './useAuth';

interface UseAnalyticsResult {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Loads the analytics dashboard data for the given lookback window. */
export function useAnalytics(days = 30): UseAnalyticsResult {
  const { isAuthenticated } = useAuth();
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
    // Dashboard stays mounted behind the login overlay; wait for a session
    // so role lookups don't run anonymously and fall back to empty UUIDs.
    if (!isAuthenticated) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, isAuthenticated]);

  const refresh = useCallback(() => load(), [load]);

  return { data, loading, error, refresh };
}
