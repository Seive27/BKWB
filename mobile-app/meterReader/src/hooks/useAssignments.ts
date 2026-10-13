import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSessionUserId } from '@/hooks/useSessionUserId';
import { queryErrorMessage } from '@/lib/queryError';
import { queryKeys } from '@/lib/queryKeys';
import {
  getAssignedReadings,
  getSitioRouteProgress,
  type SitioRouteProgress,
} from '@/services/meterReadingService';
import type { MeterReading } from '@/types/readings';

interface AssignedBundle {
  assignments: MeterReading[];
  sitioRoutes: SitioRouteProgress[];
}

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
 * One shared query for assigned readings and sitio route progress, so
 * Dashboard and Assigned reuse the same cache.
 */
export function useAssignments(): UseAssignmentsResult {
  const userId = useSessionUserId();
  const query = useQuery({
    queryKey: queryKeys.readings.assigned(userId ?? ''),
    queryFn: async (): Promise<AssignedBundle> => {
      const [assignments, sitioRoutes] = await Promise.all([
        getAssignedReadings(),
        getSitioRouteProgress(),
      ]);
      return { assignments, sitioRoutes };
    },
    enabled: !!userId,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const bundle = query.data;

  return {
    assignments: bundle?.assignments ?? [],
    sitioRoutes: bundle?.sitioRoutes ?? [],
    loading: query.isLoading && !bundle,
    refreshing: query.isFetching && !query.isLoading,
    error: bundle ? null : queryErrorMessage(query.error, 'Failed to load assigned readings.'),
    refresh,
  };
}
