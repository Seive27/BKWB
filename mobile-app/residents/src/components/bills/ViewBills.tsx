import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { BillFilter } from '@/components/bills/BillFilterTabs';

type BillStatus = 'paid' | 'unpaid';

type PaymentBill = {
  id: string;
  period: string;
  amount: number;
  status: BillStatus;
};

const PAYMENT_BILLS: PaymentBill[] = [
  {
    id: '2026-02',
    period: 'February 2026',
    amount: 450,
    status: 'unpaid',
  },
  {
    id: '2026-01',
    period: 'January 2026',
    amount: 425.5,
    status: 'unpaid',
  },
  {
    id: '2025-12',
    period: 'December 2025',
    amount: 450,
    status: 'unpaid',
  },
  {
    id: '2025-11',
    period: 'November 2025',
    amount: 450,
    status: 'paid',
  },
  {
    id: '2025-10',
    period: 'October 2025',
    amount: 410,
    status: 'paid',
  },
];

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function PaymentBillCard({ bill }: { bill: PaymentBill }) {
  const isUnpaid = bill.status === 'unpaid';

  return (
    <View
      className="overflow-hidden rounded-2xl bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-row">
        <View className={`w-1.5 ${isUnpaid ? 'bg-red-500' : 'bg-emerald-500'}`} />
        <View className="flex-1 px-4 py-4">
          <View className="mb-3 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Billing Period
              </Text>
              <Text className="mt-1 text-lg font-bold text-slate-800">{bill.period}</Text>
            </View>
            <View
              className={`rounded-full px-2.5 py-1 ${
                isUnpaid ? 'bg-red-100' : 'bg-emerald-100'
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase ${
                  isUnpaid ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {isUnpaid ? 'Unpaid' : 'Paid'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-sm text-slate-400">
                {isUnpaid ? 'Amount Due' : 'Amount Paid'}
              </Text>
              <Text className="mt-0.5 text-xl font-bold text-brand">
                {formatCurrency(bill.amount)}
              </Text>
            </View>
            <Pressable
              className="flex-row items-center gap-1 active:opacity-70"
              accessibilityRole="link"
            >
              <Text className="text-sm font-semibold text-brand">View Details</Text>
              <Image
                source={require('../../../assets/Arrow/RightArrow.png')}
                style={{ width: 14, height: 14 }}
                contentFit="contain"
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
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
        <Text className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(amount)}</Text>
      </View>
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
        Showing results from the last 6 months
      </Text>
    </View>
  );
}

type ViewBillsProps = {
  filter?: BillFilter;
};

export function ViewBills({ filter = 'all' }: ViewBillsProps) {
  const items =
    filter === 'all' ? PAYMENT_BILLS : PAYMENT_BILLS.filter((bill) => bill.status === filter);

  const recordLabel = items.length === 1 ? '1 RECORD' : `${items.length} RECORDS`;
  const totalOutstanding = PAYMENT_BILLS.filter((bill) => bill.status === 'unpaid').reduce(
    (sum, bill) => sum + bill.amount,
    0,
  );
  const showPaymentHistory = filter !== 'unpaid';

  return (
    <View className="gap-4">
      {filter === 'unpaid' ? <TotalOutstanding amount={totalOutstanding} /> : null}

      {showPaymentHistory ? (
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-slate-800">Payment History</Text>
          <Text className="rounded-full bg-blue-100 px-4 py-1 text-sm font-bold text-blue-400">
            {recordLabel}
          </Text>
        </View>
      ) : null}

      {items.map((bill) => (
        <PaymentBillCard key={bill.id} bill={bill} />
      ))}
      <HistoryFooter />
    </View>
  );
}
