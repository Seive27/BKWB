import { useCallback, useEffect, useRef, useState } from 'react';

import type { Ticket, TicketTimelineEvent } from '@/types/tickets';
import {
  getTicketById,
  getTicketTimeline,
  subscribeToTicket,
} from '@/services/ticketService';

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
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [timeline, setTimeline] = useState<TicketTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const ticketIdRef = useRef(ticketId);
  ticketIdRef.current = ticketId;

  const loadTicket = useCallback(async () => {
    const id = ticketIdRef.current;
    if (!id) return;
    try {
      const data = await getTicketById(id);
      if (ticketIdRef.current !== id) return;
      if (data) {
        setTicket(data);
      } else {
        setTicket(null);
        setError('Ticket not found. It may have been removed.');
      }
    } catch (err) {
      if (ticketIdRef.current !== id) return;
      setError(err instanceof Error ? err.message : 'Failed to load ticket.');
    }
  }, []);

  const loadTimeline = useCallback(async () => {
    const id = ticketIdRef.current;
    if (!id) return;

    setLoadingTimeline(true);
    try {
      const events = await getTicketTimeline(id);
      if (ticketIdRef.current === id) setTimeline(events);
    } catch (err) {
      console.error(err);
    } finally {
      if (ticketIdRef.current === id) setLoadingTimeline(false);
    }
  }, []);

  const load = useCallback(async () => {
    const id = ticketIdRef.current;
    if (!id) {
      setTicket(null);
      setTimeline([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    await loadTicket();
    await loadTimeline();
    if (ticketIdRef.current === id) setLoading(false);
  }, [loadTicket, loadTimeline]);

  useEffect(() => {
    setSearchQuery('');
    load();
  }, [ticketId, load]);

  useEffect(() => {
    const id = ticketId;
    if (!id) return;
    const unsubscribe = subscribeToTicket(id, () => {
      loadTicket();
      loadTimeline();
    });
    return () => {
      unsubscribe();
    };
  }, [ticketId, loadTicket, loadTimeline]);

  const refresh = useCallback(() => load(), [load]);

  return {
    ticket,
    timeline,
    loading,
    loadingTimeline,
    error,
    refresh,
    searchQuery,
    setSearchQuery,
  };
}
