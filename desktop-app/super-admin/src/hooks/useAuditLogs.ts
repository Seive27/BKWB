import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { queryErrorMessage } from '../lib/queryError';
import { queryKeys } from '../lib/queryKeys';
import type { AuditLogEntry, AuditLogQueryOptions } from '../types';
import { getAuditLogs } from '../services/auditLogService';

interface UseAuditLogsResult {
  logs: AuditLogEntry[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Loads audit logs for the given filters. Live rows arrive through RealtimeSync. */
export function useAuditLogs(options?: AuditLogQueryOptions): UseAuditLogsResult {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.auditLogs.list(options ?? {}),
    queryFn: () => getAuditLogs(options ?? {}),
    enabled: isAuthenticated,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    logs: query.data ?? [],
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    error: queryErrorMessage(query.error, 'Failed to load audit logs.'),
    refresh,
  };
}

/** Recent audit rows for the live console. Realtime invalidation refreshes the window. */
export function useAuditLogStream(): { logs: AuditLogEntry[] } {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.auditLogs.stream(),
    queryFn: () => getAuditLogs({ limit: 100 }),
    enabled: isAuthenticated,
  });

  return { logs: query.data ?? [] };
}
