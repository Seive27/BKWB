import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { getMyTickets, type ReaderTicket } from '@/services/ticketService';

interface UseReaderTicketsResult {
  tickets: ReaderTicket[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the meter reader's assigned tickets and keeps them in sync via a
 * realtime subscription on the tickets table (staff assignments appear
 * without a manual refresh).
 */
export function useReaderTickets(): UseReaderTicketsResult {
  const [tickets, setTickets] = useState<ReaderTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setTickets(await getMyTickets());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your tickets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Supabase channels are singletons keyed by name; a unique name per mount
    // avoids "cannot add callbacks after subscribe()" on remounts.
    const channel = supabase
      .channel(`reader-tickets-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        load(true);
      })
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { tickets, loading, refreshing, error, refresh };
}
