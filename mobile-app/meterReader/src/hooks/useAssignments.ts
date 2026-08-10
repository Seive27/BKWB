import { useCallback, useEffect, useState } from 'react';

import {
  getAssignedReadings,
  getSitioRouteProgress,
  subscribeToMeterReadings,
  type SitioRouteProgress,
} from '@/services/meterReadingService';
import type { MeterReading } from '@/types/readings';

interface UseAssignmentsResult {
  assignments: MeterReading[];
  /** Sitio-grouped route progress for the Assigned screen. */
  sitioRoutes: SitioRouteProgress[];
  /** True on the very first load. */
  loading: boolean;
  /** True while re-fetching after realtime events or manual refresh. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the reader's active (assigned, not yet submitted) meter readings and
 * keeps them in sync via a realtime channel. Also loads sitio route progress
 * so the Assigned screen can show completion bars per sitio.
 */
export function useAssignments(): UseAssignmentsResult {
  const [assignments, setAssignments] = useState<MeterReading[]>([]);
  const [sitioRoutes, setSitioRoutes] = useState<SitioRouteProgress[]>([]);
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
      const [assigned, routes] = await Promise.all([
        getAssignedReadings(),
        getSitioRouteProgress(),
      ]);
      setAssignments(assigned);
      setSitioRoutes(routes);
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

  return { assignments, sitioRoutes, loading, refreshing, error, refresh };
}
