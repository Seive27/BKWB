import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import {
  formatPaymentDateTime,
  formatPaymentMethod,
  type OfficialReceiptSnapshot,
} from '@/services/paymentService';
import { formatPeriod, formatPeso } from '@/services/billService';

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-slate-100 py-2.5">
      <Text className="text-xs uppercase tracking-wide text-slate-400">{label}</Text>
      <Text
        className={`ml-3 flex-1 text-right text-sm font-semibold text-slate-800 ${valueClassName ?? ''}`}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Official Electronic Receipt — mirrors the staff-side Payment Successful
 * receipt card so residents see the same OR layout after staff sends it.
 */
export function OfficialReceiptModal({
  visible,
  onClose,
  receipt,
}: {
  visible: boolean;
  onClose: () => void;
  receipt: OfficialReceiptSnapshot | null;
}) {
  if (!receipt) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-4 py-8">
        <View className="max-h-[90%] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="relative items-center border-b border-slate-100 px-6 pb-5 pt-6">
              <Pressable
                onPress={onClose}
                hitSlop={12}
                className="absolute right-3 top-3 rounded-lg p-2 active:bg-slate-100"
                accessibilityRole="button"
                accessibilityLabel="Close official receipt"
              >
                <Text className="text-xl leading-none text-slate-500">×</Text>
              </Pressable>
              <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Text className="text-3xl text-emerald-600">✓</Text>
              </View>
              <Text className="text-xl font-bold text-slate-900">Official Receipt</Text>
              <Text className="mt-1 text-xs text-slate-500">Transaction recorded in system</Text>
            </View>

            <View className="px-6 pt-5">
              <View className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
                <Text className="text-center text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Total Paid
                </Text>
                <Text className="mt-1 text-center text-3xl font-extrabold text-emerald-700">
                  {formatPeso(receipt.totalPaid)}
                </Text>
              </View>

              <View className="mt-4">
                <Row label="Resident" value={receipt.residentName} />
                <Row label="Account No." value={receipt.accountNumber || '—'} />
                <Row
                  label="Official Receipt / Ref"
                  value={receipt.referenceNumber}
                  valueClassName="text-brand"
                />
                <Row label="Date & Time" value={formatPaymentDateTime(receipt.paymentDate)} />
                <Row label="Payment Method" value={formatPaymentMethod(receipt.paymentMethod)} />
                {receipt.amountReceived != null ? (
                  <Row label="Change Due" value={formatPeso(receipt.changeDue ?? 0)} />
                ) : null}
              </View>

              {receipt.bills.length > 0 ? (
                <View className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Bills Covered
                  </Text>
                  {receipt.bills.map((b) => (
                    <View key={b.id} className="flex-row items-center justify-between py-1.5">
                      <Text className="text-sm font-medium text-slate-700">
                        {formatPeriod(b.billing_period)}
                        <Text className="text-xs text-slate-400"> ({b.bill_number})</Text>
                      </Text>
                      <Text className="text-sm font-bold text-slate-900">
                        {formatPeso(b.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View className="mt-5 items-center">
                <Text className="text-xs uppercase tracking-wide text-slate-500">
                  Barangay Kalunasan Waterworks
                </Text>
                <Text className="mt-0.5 text-[11px] text-slate-400">Official Electronic Receipt</Text>
              </View>

              <Pressable
                onPress={onClose}
                className="mt-5 items-center justify-center rounded-xl bg-brand py-3 active:bg-brand-dark"
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text className="text-sm font-bold text-white">Done</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
