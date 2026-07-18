import { Pressable, Text, View } from 'react-native';

type HistoryBill = {
  id: string;
  period: string;
  amount: string;
  paidOn: string;
};

const HISTORY_BILLS: HistoryBill[] = [
  {
    id: '2026-01',
    period: 'January 2026',
    amount: '₱425.00',
    paidOn: 'January 12, 2026',
  },
  {
    id: '2025-12',
    period: 'December 2025',
    amount: '₱410.00',
    paidOn: 'December 10, 2025',
  },
  {
    id: '2025-11',
    period: 'November 2025',
    amount: '₱398.00',
    paidOn: 'November 8, 2025',
  },
  {
    id: '2025-10',
    period: 'October 2025',
    amount: '₱405.00',
    paidOn: 'October 11, 2025',
  },
];

function HistoryBillCard({ bill }: { bill: HistoryBill }) {
  return (
    <View
      className="rounded-2xl bg-white p-5"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-base font-bold text-slate-800">{bill.period}</Text>
        <View className="rounded-md bg-emerald-500 px-2.5 py-1">
          <Text className="text-xs font-bold uppercase text-white">Paid</Text>
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-slate-400">Amount:</Text>
          <Text className="text-sm font-bold text-slate-800">{bill.amount}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-slate-400">Paid on:</Text>
          <Text className="text-sm text-slate-700">{bill.paidOn}</Text>
        </View>
      </View>

      <Pressable className="mt-4 items-center rounded-xl border border-brand bg-white py-3 active:bg-slate-50">
        <Text className="text-base font-semibold text-brand">View Receipt</Text>
      </Pressable>
    </View>
  );
}

export function BillingHistory() {
  return (
    <View className="gap-4">
      {HISTORY_BILLS.map((bill) => (
        <HistoryBillCard key={bill.id} bill={bill} />
      ))}
    </View>
  );
}
