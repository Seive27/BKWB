import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { queryErrorMessage } from '../lib/queryError';
import { queryKeys } from '../lib/queryKeys';
import type { Ticket } from '../types';
import { getTickets, type TicketQueryOptions } from '../services/ticketService';

interface UseTicketsResult {
  tickets: Ticket[];
  /** True on the very first load. */
  loading: boolean;
  /** True while re-fetching after realtime events or manual refresh. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Loads tickets from the shared cache. Realtime invalidation lives in RealtimeSync. */
export function useTickets(options?: TicketQueryOptions): UseTicketsResult {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.tickets.list(options ?? {}),
    queryFn: () => getTickets(options ?? {}),
    enabled: isAuthenticated,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    tickets: query.data ?? [],
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    error: queryErrorMessage(query.error, 'Failed to load tickets.'),
    refresh,
  };
}
