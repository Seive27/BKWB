import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSessionUserId } from '@/hooks/useSessionUserId';
import { queryErrorMessage } from '@/lib/queryError';
import { queryKeys } from '@/lib/queryKeys';
import { getMyBills, isOutstandingBillStatus, type ResidentBill } from '@/services/billService';

export function pickCurrentBill(bills: ResidentBill[]): ResidentBill | null {
  const unpaid = bills.find((bill) => isOutstandingBillStatus(bill.status));
  return unpaid ?? bills[0] ?? null;
}

/** One bill list for the dashboard, current bill, history, and view-bills screens. */
export function useMyBills() {
  const userId = useSessionUserId();
  const query = useQuery({
    queryKey: queryKeys.bills.list(userId ?? ''),
    queryFn: getMyBills,
    enabled: !!userId,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    bills: query.data ?? [],
    loading: query.isLoading && !query.data,
    error: query.data ? null : queryErrorMessage(query.error, 'Failed to load your bills.'),
    refresh,
  };
}
