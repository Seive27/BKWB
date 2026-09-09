import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { PaymentJourney } from '@/components/payments/PaymentJourney';
import { type ResidentPayment } from '@/services/paymentService';
import { type ResidentBill } from '@/services/billService';

/**
 * Bottom-sheet wrapper around PaymentJourney, used by the bill cards
 * (CurrentBill / BillDetailModal) so residents can pay without leaving the
 * screen they're on. The Payments tab screen renders PaymentJourney inline
 * instead.
 */
export function PaymentFlowModal({
  visible,
  onClose,
  bill,
  onConfirmed,
}: {
  visible: boolean;
  onClose: () => void;
  bill: ResidentBill | null;
  onConfirmed?: (payment: ResidentPayment | null) => void;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const scrollMaxHeight = Math.round(windowHeight * 0.88) - 220;

  if (!bill) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close payment"
        />

        <View className="max-h-[88%] rounded-t-3xl bg-slate-50" accessibilityLiveRegion="polite">
          <View className="items-center pt-3">
            <View className="h-1.5 w-12 rounded-full bg-slate-200" />
          </View>

          <View className="px-5 pb-3 pt-3">
            <Text className="text-xl font-bold leading-7 text-slate-800">
              Pay Your Water Bill
            </Text>
            <Text className="mt-1 text-sm text-slate-400">
              {bill.bill_number}
              {bill.account?.account_number ? ` · Account ${bill.account.account_number}` : ''}
            </Text>
          </View>

          <View
            className="flex-1 px-5"
            style={{ maxHeight: Math.max(160, scrollMaxHeight) }}
          >
            <PaymentJourney
              bill={bill}
              onClose={onClose}
              onConfirmed={onConfirmed}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}