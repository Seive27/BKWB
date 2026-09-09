import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BillDetailModal } from '@/components/bills/BillDetailModal';
import { PaymentFlowModal } from '@/components/payments/PaymentFlowModal';
import {
  formatBillDate,
  formatPeriod,
  formatPeso,
  getMyBills,
  subscribeToMyBills,
  type ResidentBill,
} from '@/services/billService';

const PAYMENT_OPTIONS = [
  'Pay online — GCash, Maya, card and more via PayMongo',
  'Barangay Kalunasan Hall (Mon–Fri, 8AM–5PM)',
  'Authorized Barangay Payment Centers',
];

export function CurrentBill() {
  const [bill, setBill] = useState<ResidentBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const loadBill = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    getMyBills()
      .then((bills) => {
        // Prefer newest unpaid bill; otherwise newest bill overall.
        const unpaid = bills.find((b) => b.status === 'pending' || b.status === 'overdue');
        setBill(unpaid ?? bills[0] ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load your bill.');
      })
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  };

  useEffect(() => {
    loadBill(true);
    const unsubscribe = subscribeToMyBills(() => {
      loadBill(false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View className="rounded-2xl bg-white p-6 border border-slate-200">
        <Text className="text-center text-sm text-slate-400">Loading your latest bill…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-2xl bg-rose-50 p-6 border border-rose-200">
        <Text className="text-center text-sm font-semibold text-rose-600">{error}</Text>
      </View>
    );
  }

  if (!bill) {
    return (
      <View className="rounded-2xl bg-white p-6 border border-slate-200">
        <Text className="text-center text-base font-bold text-slate-800">
          No Bill Due
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-slate-400">
          Your account is all caught up. New statements appear here once your monthly reading is recorded.
        </Text>
      </View>
    );
  }

  const unpaid = bill.status === 'pending' || bill.status === 'overdue';

  return (
    <View className="gap-4">
      {/* Modern Fintech Utility Card */}
      <View
        className="overflow-hidden rounded-2xl bg-white border border-slate-200"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        {/* Card Header */}
        <View className="bg-slate-900 p-5">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Current Water Statement
              </Text>
              <Text className="text-base font-bold text-white mt-0.5">
                {formatPeriod(bill.billing_period)}
              </Text>
            </View>
            <View
              className={`rounded-full px-3 py-1 ${
                bill.status === 'paid'
                  ? 'bg-emerald-500/20 border border-emerald-400/40'
                  : bill.status === 'overdue'
                    ? 'bg-rose-500/20 border border-rose-400/40'
                    : 'bg-amber-500/20 border border-amber-400/40'
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase ${
                  bill.status === 'paid'
                    ? 'text-emerald-400'
                    : bill.status === 'overdue'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                }`}
              >
                {bill.status === 'paid' ? 'Paid' : bill.status}
              </Text>
            </View>
          </View>

          <Text className="text-3xl font-extrabold text-white">
            {formatPeso(bill.amount_due)}
          </Text>

          {bill.due_date ? (
            <Text className="text-xs text-slate-400 mt-1 font-medium">
              Due Date: {formatBillDate(bill.due_date)}
            </Text>
          ) : null}
        </View>

        {/* Consumption Metrics Row */}
        <View className="grid grid-cols-3 flex-row divide-x divide-slate-100 bg-slate-50/70 border-b border-slate-100 py-3 px-2 text-center">
          <View className="flex-1 items-center">
            <Text className="text-[10px] font-semibold text-slate-400 uppercase">Usage</Text>
            <Text className="text-sm font-bold text-slate-800 mt-0.5">
              {bill.consumption !== null ? `${bill.consumption} m³` : '—'}
            </Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-[10px] font-semibold text-slate-400 uppercase">Current</Text>
            <Text className="text-sm font-bold text-slate-800 mt-0.5">
              {bill.current_reading ?? '—'}
            </Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-[10px] font-semibold text-slate-400 uppercase">Previous</Text>
            <Text className="text-sm font-bold text-slate-800 mt-0.5">
              {bill.previous_reading ?? '—'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="p-4 gap-2.5 bg-white">
          {unpaid ? (
            <Pressable
              onPress={() => setShowPay(true)}
              className="items-center justify-center rounded-xl bg-brand py-3 active:bg-brand-dark"
              accessibilityRole="button"
              accessibilityLabel="Pay this bill online"
            >
              <Text className="text-sm font-bold text-white">Pay Online</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => setShowDetails(true)}
            className="items-center rounded-xl bg-blue-600 py-3 active:bg-blue-700"
            accessibilityRole="button"
            accessibilityLabel="View bill details or breakdown"
          >
            <Text className="text-sm font-bold text-white">View Full Bill Details</Text>
          </Pressable>
          {bill.account?.account_number ? (
            <Text className="text-center text-[11px] font-mono text-slate-400">
              Account No: {bill.account.account_number}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Payment Information Card */}
      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-sm font-bold text-slate-900 mb-2">How to Pay</Text>
        <View className="gap-2">
          {PAYMENT_OPTIONS.map((option) => (
            <View key={option} className="flex-row items-start gap-2">
              <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-600" />
              <Text className="flex-1 text-xs text-slate-600 leading-relaxed">{option}</Text>
            </View>
          ))}
        </View>
      </View>

      <PaymentFlowModal
        visible={showPay}
        onClose={() => setShowPay(false)}
        bill={bill}
        onConfirmed={() => loadBill(false)}
      />

      <BillDetailModal
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        bill={bill}
      />
    </View>
  );
}