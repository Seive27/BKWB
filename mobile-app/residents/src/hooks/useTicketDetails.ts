import { useCallback, useEffect, useRef, useState } from 'react';

import type { Ticket, TicketTimelineEvent } from '@/types/tickets';
import {
  getTicketById,
  subscribeToTicket,
} from '@/services/ticketService';

interface UseTicketDetailsResult {
  ticket: Ticket | null;
  timeline: TicketTimelineEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads a single ticket with its timeline and subscribes to realtime
 * updates for that ticket + its timeline rows (e.g. staff status changes).
 */
export function useTicketDetails(ticketId: string | null): UseTicketDetailsResult {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [timeline, setTimeline] = useState<TicketTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep the id in a ref so the load callback stays stable across renders.
  const ticketIdRef = useRef(ticketId);
  ticketIdRef.current = ticketId;

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
    try {
      const data = await getTicketById(id);
      if (data) {
        setTicket(data);
        setTimeline(data.timeline ?? []);
      } else {
        setTicket(null);
        setTimeline([]);
        setError('Ticket not found. It may have been removed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + reload whenever the ticket id changes.
  useEffect(() => {
    load();
  }, [ticketId, load]);

  // Subscribe to realtime updates for the current ticket id.
  useEffect(() => {
    const id = ticketId;
    if (!id) {
      return;
    }
    const unsubscribe = subscribeToTicket(id, () => {
      load();
    });

    return () => {
      unsubscribe();
    };
  }, [ticketId, load]);

  const refresh = useCallback(() => load(), [load]);

  return { ticket, timeline, loading, error, refresh };
}

