import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BillDetailModal } from '@/components/bills/BillDetailModal';
import {
  formatBillDate,
  formatPeriod,
  formatPeso,
  getMyBills,
  type ResidentBill,
} from '@/services/billService';

function HistoryBillCard({ bill, onPress }: { bill: ResidentBill; onPress: () => void }) {
  const paid = bill.status === 'paid';
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl bg-white p-5 active:opacity-90"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open details of your ${formatPeriod(bill.billing_period)} bill`}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-base font-bold text-slate-800">
          {formatPeriod(bill.billing_period)}
        </Text>
        <View
          className={`rounded-md px-2.5 py-1 ${
            paid ? 'bg-emerald-500' : bill.status === 'overdue' ? 'bg-red-400' : 'bg-amber-400'
          }`}
        >
          <Text className="text-xs font-bold uppercase text-white">
            {paid ? 'Paid' : bill.status}
          </Text>
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-slate-400">Amount:</Text>
          <Text className="text-sm font-bold text-slate-800">{formatPeso(bill.amount_due)}</Text>
        </View>
        {bill.paid_at ? (
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-slate-400">Paid on:</Text>
            <Text className="text-sm text-slate-700">{formatBillDate(bill.paid_at)}</Text>
          </View>
        ) : null}
      </View>

      <View className="mt-4 items-center rounded-xl border border-brand bg-white py-3 active:bg-slate-50">
        <Text className="text-base font-semibold text-brand">View Bill Details</Text>
      </View>
    </Pressable>
  );
}

export function BillingHistory() {
  const [bills, setBills] = useState<ResidentBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ResidentBill | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyBills()
      .then((rows) => {
        if (!cancelled) setBills(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load billing history.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View className="rounded-2xl bg-white p-6">
        <Text className="text-center text-sm text-slate-400">Loading billing history…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-2xl bg-red-50 p-6">
        <Text className="text-center text-sm text-red-600">{error}</Text>
      </View>
    );
  }

  if (bills.length === 0) {
    return (
      <View className="rounded-2xl bg-white p-8">
        <Text className="text-center text-base font-semibold text-slate-700">
          No bills yet
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-slate-400">
          Bills appear here as soon as the barangay records and approves meter readings for
          your account.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View className="gap-4 pb-2">
        {bills.map((bill) => (
          <HistoryBillCard
            key={bill.id}
            bill={bill}
            onPress={() => setSelected(bill)}
          />
        ))}
      </View>
      <BillDetailModal
        visible={selected !== null}
        onClose={() => setSelected(null)}
        bill={selected}
      />
    </>
  );
}
