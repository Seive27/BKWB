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
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useTicketDetails(ticketId: string | null): UseTicketDetailsResult {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [timeline, setTimeline] = useState<TicketTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 10;

  const ticketIdRef = useRef(ticketId);
  ticketIdRef.current = ticketId;
  const searchRef = useRef(searchQuery);
  searchRef.current = searchQuery;

  const loadTicket = useCallback(async () => {
    const id = ticketIdRef.current;
    if (!id) return;
    try {
      const data = await getTicketById(id);
      if (data) {
        setTicket(data);
      } else {
        setTicket(null);
        setError('Ticket not found. It may have been removed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket.');
    }
  }, []);

  const loadTimeline = useCallback(async (reset = false) => {
    const id = ticketIdRef.current;
    if (!id) return;
    
    setLoadingTimeline(true);
    try {
      const currentPage = reset ? 1 : page;
      const offset = (currentPage - 1) * limit;
      
      const events = await getTicketTimeline(id, {
        limit: limit + 1,
        offset,
        search: searchRef.current,
      });

      const hasNext = events.length > limit;
      const results = hasNext ? events.slice(0, limit) : events;

      setHasMore(hasNext);
      
      if (reset) {
        setTimeline(results);
        setPage(2);
      } else {
        setTimeline((prev) => {
          // ensure no duplicates
          const newEvents = results.filter((e) => !prev.some((p) => p.id === e.id));
          return [...prev, ...newEvents];
        });
        setPage(currentPage + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTimeline(false);
    }
  }, [page]);

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
    await loadTimeline(true);
    setLoading(false);
  }, [loadTicket, loadTimeline]);

  useEffect(() => {
    load();
  }, [ticketId, loadTicket]); // intentionally not adding loadTimeline to avoid loop, we rely on load()

  // Handle search changes with a debounce inside the effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadTimeline(true);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, loadTimeline]);

  useEffect(() => {
    const id = ticketId;
    if (!id) return;
    const unsubscribe = subscribeToTicket(id, () => {
      loadTicket();
      loadTimeline(true);
    });
    return () => {
      unsubscribe();
    };
  }, [ticketId, loadTicket, loadTimeline]);

  const refresh = useCallback(() => load(), [load]);
  const loadMore = useCallback(async () => {
    if (!loadingTimeline && hasMore) {
      await loadTimeline(false);
    }
  }, [loadingTimeline, hasMore, loadTimeline]);

  return { ticket, timeline, loading, loadingTimeline, error, refresh, searchQuery, setSearchQuery, loadMore, hasMore };
}
