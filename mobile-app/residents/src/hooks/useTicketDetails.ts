import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSessionUserId } from '@/hooks/useSessionUserId';
import { queryErrorMessage } from '@/lib/queryError';
import { queryKeys } from '@/lib/queryKeys';
import { getTicketById, getTicketTimeline } from '@/services/ticketService';
import type { Ticket, TicketTimelineEvent } from '@/types/tickets';

interface UseTicketDetailsResult {
  ticket: Ticket | null;
  timeline: TicketTimelineEvent[];
  loading: boolean;
  loadingTimeline: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function useTicketDetails(ticketId: string | null): UseTicketDetailsResult {
  const userId = useSessionUserId();
  const [searchQuery, setSearchQuery] = useState('');
  const enabled = !!userId && !!ticketId;

  const ticketQuery = useQuery({
    queryKey: queryKeys.tickets.detail(userId ?? '', ticketId ?? ''),
    queryFn: () => getTicketById(ticketId ?? ''),
    enabled,
  });
  const timelineQuery = useQuery({
    queryKey: queryKeys.tickets.timeline(userId ?? '', ticketId ?? ''),
    queryFn: () => getTicketTimeline(ticketId ?? ''),
    enabled,
  });

  const refresh = useCallback(async () => {
    await Promise.all([ticketQuery.refetch(), timelineQuery.refetch()]);
  }, [ticketQuery, timelineQuery]);

  const missing =
    enabled && ticketQuery.isSuccess && !ticketQuery.data
      ? 'Ticket not found. It may have been removed.'
      : null;

  return {
    ticket: ticketQuery.data ?? null,
    timeline: timelineQuery.data ?? [],
    loading: !!ticketId && ticketQuery.isLoading && !ticketQuery.data,
    loadingTimeline: !!ticketId && timelineQuery.isFetching && !timelineQuery.data,
    error:
      missing ??
      (ticketQuery.data
        ? null
        : queryErrorMessage(ticketQuery.error, 'Failed to load ticket.')),
    refresh,
    searchQuery,
    setSearchQuery,
  };
}
