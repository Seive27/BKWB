import { useCallback, useEffect, useRef, useState } from 'react';
import type { Ticket } from '../types';
import {
  getTickets,
  subscribeToTickets,
  type TicketQueryOptions,
} from '../services/ticketService';

interface UseTicketsResult {
  tickets: Ticket[];
  /** True on the very first load. */
  loading: boolean;
  /** True while re-fetching after realtime events or manual refresh. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads all tickets from Supabase and keeps them in sync via a realtime
 * channel. The subscription is cleaned up automatically on unmount.
 */
export function useTickets(
  options?: TicketQueryOptions
): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>([]);
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
      const data = await getTickets(optionsRef.current);
      setTickets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Re-fetch whenever a row changes anywhere (create/update/delete).
    const unsubscribe = subscribeToTickets(() => {
      load(true);
    });

    return () => {
      unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { tickets, loading, refreshing, error, refresh };
}

