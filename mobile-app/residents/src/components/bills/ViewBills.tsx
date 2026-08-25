import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { BillFilter } from '@/components/bills/BillFilterTabs';
import { BillDetailModal } from '@/components/bills/BillDetailModal';
import {
  formatPeriod,
  formatPeso,
  getMyBills,
  type ResidentBill,
} from '@/services/billService';

function isUnpaidStatus(status: ResidentBill['status']): boolean {
  return status === 'pending' || status === 'overdue';
}

function PaymentBillCard({
  bill,
  onPress,
}: {
  bill: ResidentBill;
  onPress: () => void;
}) {
  const unpaid = isUnpaidStatus(bill.status);

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-2xl bg-white active:opacity-90"
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
      <View className="flex-row">
        <View className={`w-1.5 ${unpaid ? 'bg-red-500' : bill.status === 'paid' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        <View className="flex-1 px-4 py-4">
          <View className="mb-3 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Billing Period
              </Text>
              <Text className="mt-1 text-lg font-bold text-slate-800">
                {formatPeriod(bill.billing_period)}
              </Text>
            </View>
            <View
              className={`rounded-full px-2.5 py-1 ${
                unpaid ? 'bg-red-100' : bill.status === 'paid' ? 'bg-emerald-100' : 'bg-slate-100'
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase ${
                  unpaid
                    ? 'text-red-600'
                    : bill.status === 'paid'
                      ? 'text-emerald-700'
                      : 'text-slate-500'
                }`}
              >
                {bill.status === 'paid' ? 'Paid' : unpaid ? 'Unpaid' : bill.status}
              </Text>
            </View>
          </View>

          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-sm text-slate-400">
                {unpaid ? 'Amount Due' : 'Amount'}
              </Text>
              <Text className="mt-0.5 text-xl font-bold text-brand">
                {formatPeso(bill.amount_due)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-sm font-semibold text-brand">View Details</Text>
              <Image
                source={require('../../../assets/Arrow/RightArrow.png')}
                style={{ width: 14, height: 14 }}
                contentFit="contain"
              />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function TotalOutstanding({ amount }: { amount: number }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-red-50 px-4 py-4">
      <Image
        source={require('../../../assets/Signs/Warning.png')}
        style={{ width: 44, height: 44 }}
        contentFit="contain"
      />
      <View className="flex-1">
        <Text className="text-xs font-bold uppercase tracking-wide text-red-600">
          Total Outstanding
        </Text>
        <Text className="mt-1 text-2xl font-bold text-slate-900">{formatPeso(amount)}</Text>
      </View>
    </View>
  );
}

function MonthFilter({
  periods,
  selected,
  onSelect,
}: {
  periods: string[];
  selected: string | 'all';
  onSelect: (period: string | 'all') => void;
}) {
  if (periods.length === 0) return null;

  return (
    <View>
      <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        View by month
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <Pressable
          onPress={() => onSelect('all')}
          className={`rounded-full px-4 py-2 ${selected === 'all' ? 'bg-brand' : 'bg-slate-200'}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: selected === 'all' }}
        >
          <Text
            className={`text-sm font-semibold ${selected === 'all' ? 'text-white' : 'text-slate-700'}`}
          >
            All months
          </Text>
        </Pressable>
        {periods.map((period) => {
          const active = selected === period;
          return (
            <Pressable
              key={period}
              onPress={() => onSelect(period)}
              className={`rounded-full px-4 py-2 ${active ? 'bg-brand' : 'bg-slate-200'}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text
                className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-700'}`}
              >
                {formatPeriod(period)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function HistoryFooter() {
  return (
    <View className="items-center gap-2 py-6">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-200">
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={8.5} stroke="#94A3B8" strokeWidth={1.6} />
          <Path
            d="M12 8v4.2l2.5 1.5"
            stroke="#94A3B8"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M7.2 9.2A6.5 6.5 0 015.5 12"
            stroke="#94A3B8"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <Text className="text-center text-sm text-slate-400">
        Bills appear here after the barangay approves your meter reading
      </Text>
    </View>
  );
}

type ViewBillsProps = {
  filter?: BillFilter;
};

export function ViewBills({ filter = 'all' }: ViewBillsProps) {
  const [bills, setBills] = useState<ResidentBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string | 'all'>('all');
  const [selected, setSelected] = useState<ResidentBill | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMyBills()
      .then((rows) => {
        if (!cancelled) {
          setBills(rows);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your bills.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset month when paid/unpaid filter changes so chips stay in sync.
  useEffect(() => {
    setMonthFilter('all');
  }, [filter]);

  const periods = useMemo(
    () => [...new Set(bills.map((b) => b.billing_period))],
    [bills]
  );

  const filtered = useMemo(() => {
    return bills.filter((bill) => {
      if (filter === 'paid' && bill.status !== 'paid') return false;
      if (filter === 'unpaid' && !isUnpaidStatus(bill.status)) return false;
      if (monthFilter !== 'all' && bill.billing_period !== monthFilter) return false;
      return true;
    });
  }, [bills, filter, monthFilter]);

  const totalOutstanding = useMemo(
    () =>
      bills
        .filter((b) => isUnpaidStatus(b.status))
        .reduce((sum, b) => sum + (Number(b.amount_due) || 0), 0),
    [bills]
  );

  if (loading) {
    return (
      <View className="rounded-2xl bg-white p-6">
        <Text className="text-center text-sm text-slate-400">Loading your bills…</Text>
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
        <Text className="text-center text-base font-semibold text-slate-700">No bills yet</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-slate-400">
          When staff approve a meter reading and generate your bill, it shows up here by month.
        </Text>
      </View>
    );
  }

  const recordLabel = filtered.length === 1 ? '1 RECORD' : `${filtered.length} RECORDS`;
  const showPaymentHistory = filter !== 'unpaid';

  return (
    <>
      <View className="gap-4">
        <MonthFilter periods={periods} selected={monthFilter} onSelect={setMonthFilter} />

        {filter === 'unpaid' ? <TotalOutstanding amount={totalOutstanding} /> : null}

        {showPaymentHistory ? (
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-slate-800">
              {monthFilter === 'all' ? 'Bills' : formatPeriod(monthFilter)}
            </Text>
            <Text className="rounded-full bg-blue-100 px-4 py-1 text-sm font-bold text-blue-400">
              {recordLabel}
            </Text>
          </View>
        ) : null}

        {filtered.length === 0 ? (
          <View className="rounded-2xl bg-white p-6">
            <Text className="text-center text-sm text-slate-400">
              No bills match this filter.
            </Text>
          </View>
        ) : (
          filtered.map((bill) => (
            <PaymentBillCard
              key={bill.id}
              bill={bill}
              onPress={() => setSelected(bill)}
            />
          ))
        )}
        <HistoryFooter />
      </View>

      <BillDetailModal
        visible={selected !== null}
        onClose={() => setSelected(null)}
        bill={selected}
      />
    </>
  );
}
