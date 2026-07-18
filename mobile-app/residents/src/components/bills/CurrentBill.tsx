import { Pressable, Text, View } from 'react-native';

const PAYMENT_OPTIONS = [
  'Barangay Hall (Mon-Fri, 8AM-5PM)',
  'Authorized Payment Centers',
  'Online Banking (GCash, PayMaya)',
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
  return (
    <View className="gap-5">
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
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-base font-bold text-slate-800">February 2026</Text>
          <View className="rounded-md bg-red-400 px-2.5 py-1">
            <Text className="text-xs font-bold uppercase text-white">Unpaid</Text>
          </View>
        </View>

        <View className="items-center">
          <Text className="text-sm text-slate-400">Amount Due</Text>
          <Text className="mt-1 text-4xl font-bold text-brand">₱450.00</Text>
        </View>

        <View className="mt-5 border-t border-slate-100 pt-2">
          <DetailRow label="Billing Period" value="February 2026" />
          <DetailRow label="Due Date" value="February 15, 2026" />
          <DetailRow label="Account Number" value="KLN-2024-1234" />
        </View>

        <Pressable className="mt-5 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark">
          <Text className="text-base font-semibold text-white">Pay Now</Text>
        </Pressable>

        <Pressable className="mt-3 items-center rounded-xl border-2 border-brand bg-white py-3.5 active:bg-slate-50">
          <Text className="text-base font-semibold text-brand">View Bill Details</Text>
        </Pressable>
      </View>

      <View className="overflow-hidden rounded-2xl bg-sky-50">
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
    </View>
  );
}
