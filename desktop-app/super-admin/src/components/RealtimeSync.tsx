import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { invalidateDebounced } from '../lib/invalidate';
import { emitPaymentEvent } from '../lib/paymentEvents';
import { queryKeys } from '../lib/queryKeys';
import { subscribeToAnnouncements } from '../services/announcementService';
import { subscribeToAuditLogs } from '../services/auditLogService';
import { subscribeToBills } from '../services/billService';
import { subscribeToMeterReadings } from '../services/meterReadingService';
import { subscribeToNotifications } from '../services/notificationService';
import { subscribeToPayments } from '../services/paymentService';
import { subscribeToSystemSettings } from '../services/systemSettingsService';
import { subscribeToTickets } from '../services/ticketService';
import type { SystemSetting } from '../types';

/** One channel per table for the signed-in session. Hooks do not subscribe. */
export function RealtimeSync() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribers = [
      subscribeToTickets(() => {
        invalidateDebounced(queryClient, queryKeys.tickets.all);
      }),
      subscribeToMeterReadings(() => {
        invalidateDebounced(queryClient, queryKeys.meterReadings.all);
      }),
      subscribeToAnnouncements(() => {
        invalidateDebounced(queryClient, queryKeys.announcements.all);
      }),
      subscribeToNotifications(() => {
        invalidateDebounced(queryClient, queryKeys.notifications.all);
      }),
      subscribeToBills(() => {
        invalidateDebounced(queryClient, queryKeys.bills.all);
      }),
      subscribeToPayments((event, row) => {
        emitPaymentEvent(event, row ?? null);
        invalidateDebounced(queryClient, queryKeys.payments.all);
        invalidateDebounced(queryClient, queryKeys.bills.all);
      }),
      subscribeToAuditLogs(() => {
        invalidateDebounced(queryClient, queryKeys.auditLogs.all);
      }),
      subscribeToSystemSettings((event, row) => {
        if (event === 'UPDATE' && row) {
          queryClient.setQueriesData<SystemSetting[]>(
            { queryKey: queryKeys.systemSettings.all },
            (current) =>
              current?.map((setting) =>
                setting.key === row.key ? { ...setting, value: row.value } : setting
              )
          );
          return;
        }
        invalidateDebounced(queryClient, queryKeys.systemSettings.all);
      }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [isAuthenticated, queryClient]);

  return null;
}
