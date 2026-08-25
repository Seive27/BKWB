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

const PAYMENT_OPTIONS = [
  'Barangay Hall (Mon-Fri, 8AM-5PM)',
  'Authorized Payment Centers',
];

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-slate-400">{label}</Text>
      <Text className="text-sm font-semibold text-slate-700">{value}</Text>
    </View>
  );
}

export function CurrentBill() {
  const [bill, setBill] = useState<ResidentBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyBills()
      .then((bills) => {
        if (cancelled) return;
        // Prefer newest unpaid bill; otherwise newest bill overall.
        const unpaid = bills.find((b) => b.status === 'pending' || b.status === 'overdue');
        setBill(unpaid ?? bills[0] ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your bill.');
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
        <Text className="text-center text-sm text-slate-400">Loading your latest bill…</Text>
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

  if (!bill) {
    return (
      <View className="rounded-2xl bg-white p-6">
        <Text className="text-center text-base font-semibold text-slate-700">
          No bill yet
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-slate-400">
          Your first bill appears here once a meter reading for your account has been
          recorded and approved by the barangay.
        </Text>
      </View>
    );
  }

  const unpaid = bill.status === 'pending' || bill.status === 'overdue';

  return (
    <View className="gap-5">
      <Pressable
        onPress={() => setShowDetails(true)}
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
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-base font-bold text-slate-800">
            {formatPeriod(bill.billing_period)}
          </Text>
          <View
            className={`rounded-md px-2.5 py-1 ${
              bill.status === 'paid'
                ? 'bg-emerald-500'
                : bill.status === 'overdue'
                  ? 'bg-red-400'
                  : 'bg-amber-400'
            }`}
          >
            <Text className="text-xs font-bold uppercase text-white">
              {bill.status === 'paid' ? 'Paid' : bill.status}
            </Text>
          </View>
        </View>

        <View className="items-center">
          <Text className="text-sm text-slate-400">Amount Due</Text>
          <Text className="mt-1 text-4xl font-bold text-brand">{formatPeso(bill.amount_due)}</Text>
        </View>

        <View className="mt-5 border-t border-slate-100 pt-2">
          <DetailRow label="Billing Period" value={formatPeriod(bill.billing_period)} />
          {bill.due_date ? (
            <DetailRow label="Due Date" value={formatBillDate(bill.due_date)} />
          ) : null}
          {bill.account?.account_number ? (
            <DetailRow label="Account Number" value={bill.account.account_number} />
          ) : null}
        </View>

        <View className="mt-5 items-center rounded-xl border-2 border-brand bg-white py-3.5 active:bg-slate-50">
          <Text className="text-base font-semibold text-brand">View / Download PDF</Text>
        </View>

        {unpaid ? (
          <Text className="mt-3 text-center text-xs leading-4 text-slate-400">
            Pay at the barangay hall or an authorized payment center. In-app payment is not
            available yet.
          </Text>
        ) : null}
      </Pressable>

      <View className="overflow-hidden rounded-2xl border border-slate-200 shadow-md bg-sky-50">
        <View className="flex-row">
          <View className="w-1.5 bg-brand" />
          <View className="flex-1 px-4 py-4">
            <Text className="mb-3 text-base font-bold text-brand">Payment Options</Text>
            <View className="gap-2.5">
              {PAYMENT_OPTIONS.map((option) => (
                <View key={option} className="flex-row items-start gap-2.5">
                  <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                  <Text className="flex-1 text-sm text-slate-600">{option}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <BillDetailModal
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        bill={bill}
      />
    </View>
  );
}
