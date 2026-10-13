import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSessionUserId } from '@/hooks/useSessionUserId';
import { queryErrorMessage } from '@/lib/queryError';
import { queryKeys } from '@/lib/queryKeys';
import { getMyTickets, type ReaderTicket } from '@/services/ticketService';

interface UseReaderTicketsResult {
  tickets: ReaderTicket[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** The meter reader's assigned tickets, shared across the tickets screens. */
export function useReaderTickets(): UseReaderTicketsResult {
  const userId = useSessionUserId();
  const query = useQuery({
    queryKey: queryKeys.tickets.list(userId ?? ''),
    queryFn: getMyTickets,
    enabled: !!userId,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    tickets: query.data ?? [],
    loading: query.isLoading && !query.data,
    refreshing: query.isFetching && !query.isLoading,
    error: query.data ? null : queryErrorMessage(query.error, 'Failed to load your tickets.'),
    refresh,
  };
}
