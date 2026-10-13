import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useSessionUserId } from '@/hooks/useSessionUserId';
import { invalidateDebounced } from '@/lib/invalidate';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { subscribeToAnnouncements } from '@/services/announcementService';
import { subscribeToMyBills } from '@/services/billService';
import { subscribeToNotifications } from '@/services/notificationService';
import { subscribeToTickets } from '@/services/ticketService';

/** One channel per table for the signed-in resident. */
export function RealtimeSync() {
  const userId = useSessionUserId();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const timeline = supabase
      .channel(`resident-ticket-timeline-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_timeline' },
        () => {
          invalidateDebounced(queryClient, queryKeys.tickets.all);
        }
      )
      .subscribe();

    const unsubscribers = [
      subscribeToTickets(() => {
        invalidateDebounced(queryClient, queryKeys.tickets.all);
      }),
      subscribeToAnnouncements(() => {
        invalidateDebounced(queryClient, queryKeys.announcements.all);
      }),
      subscribeToNotifications(() => {
        invalidateDebounced(queryClient, queryKeys.notifications.all);
      }),
      subscribeToMyBills(() => {
        invalidateDebounced(queryClient, queryKeys.bills.all);
        invalidateDebounced(queryClient, queryKeys.payments.all);
      }),
      () => {
        void supabase.removeChannel(timeline);
      },
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [queryClient, userId]);

  return null;
}
