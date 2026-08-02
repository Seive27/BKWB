import { useCallback, useEffect, useState } from 'react';
import type { AuditLogEntry, AuditLogQueryOptions } from '../types';
import {
  getAuditLogs,
  subscribeToAuditLogs,
} from '../services/auditLogService';

interface UseAuditLogsResult {
  logs: AuditLogEntry[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Loads audit logs with the given filters and prepends live entries. */
export function useAuditLogs(
  options?: AuditLogQueryOptions
): UseAuditLogsResult {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
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
      const data = await getAuditLogs(options);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [options]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  return { logs, loading, refreshing, error, refresh: () => load(true) };
}

/** Subscribe to new audit log rows (used by the live console). */
export function useAuditLogStream(): { logs: AuditLogEntry[] } {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    getAuditLogs({ limit: 100 }).then((data) => {
      if (!cancelled) setLogs(data);
    }).catch(() => {
      // Console shows live entries only if the initial load fails.
    });

    const unsubscribe = subscribeToAuditLogs((_event, row) => {
      setLogs((prev) => [row, ...prev].slice(0, 200));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { logs };
}
