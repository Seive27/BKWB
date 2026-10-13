import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSessionUserId } from '@/hooks/useSessionUserId';
import { queryErrorMessage } from '@/lib/queryError';
import { queryKeys } from '@/lib/queryKeys';
import { getResidentTickets } from '@/services/ticketService';
import type { Ticket } from '@/types/tickets';

interface UseTicketsResult {
  tickets: Ticket[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** The signed-in resident's tickets, shared across tab switches. */
export function useTickets(): UseTicketsResult {
  const userId = useSessionUserId();
  const query = useQuery({
    queryKey: queryKeys.tickets.list(userId ?? ''),
    queryFn: () => getResidentTickets(),
    enabled: !!userId,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    tickets: query.data ?? [],
    loading: query.isLoading && !query.data,
    refreshing: query.isFetching && !query.isLoading,
    error: query.data ? null : queryErrorMessage(query.error, 'Failed to load tickets.'),
    refresh,
  };
}
