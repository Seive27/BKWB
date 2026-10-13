import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { ANALYTICS_STALE_TIME } from '../lib/queryClient';
import { queryErrorMessage } from '../lib/queryError';
import { queryKeys } from '../lib/queryKeys';
import type { AnalyticsData } from '../types';
import {
  getAnalyticsData,
  type TrendGranularity,
} from '../services/analyticsService';

interface UseAnalyticsResult {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Loads the analytics dashboard for the given lookback window. */
export function useAnalytics(
  days = 30,
  granularity: TrendGranularity = 'day'
): UseAnalyticsResult {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.analytics.detail(days, granularity),
    queryFn: () => getAnalyticsData(days, granularity),
    enabled: isAuthenticated,
    staleTime: ANALYTICS_STALE_TIME,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: queryErrorMessage(query.error, 'Failed to load analytics data.'),
    refresh,
  };
}
