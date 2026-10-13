import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useSessionUserId } from '@/hooks/useSessionUserId';
import { invalidateDebounced } from '@/lib/invalidate';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { subscribeToAnnouncements } from '@/services/announcementService';
import { subscribeToMeterReadings } from '@/services/meterReadingService';
import { subscribeToNotifications } from '@/services/notificationService';

/** One subscriber for the signed-in meter reader. */
export function RealtimeSync() {
  const userId = useSessionUserId();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const tickets = supabase
      .channel(`reader-tickets-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        invalidateDebounced(queryClient, queryKeys.tickets.all);
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_timeline' },
        () => {
          invalidateDebounced(queryClient, queryKeys.tickets.all);
        }
      )
      .subscribe();

    const unsubscribers = [
      subscribeToMeterReadings(() => {
        invalidateDebounced(queryClient, queryKeys.readings.all);
      }),
      subscribeToAnnouncements(() => {
        invalidateDebounced(queryClient, queryKeys.announcements.all);
      }),
      subscribeToNotifications(() => {
        invalidateDebounced(queryClient, queryKeys.notifications.all);
      }),
      () => {
        void supabase.removeChannel(tickets);
      },
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [queryClient, userId]);

  return null;
}
