import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { PaymentJourney } from '@/components/payments/PaymentJourney';
import { useSwipeableBottomSheet } from '@/hooks/useSwipeableBottomSheet';
import { type ResidentPayment } from '@/services/paymentService';
import { type ResidentBill } from '@/services/billService';

/**
 * Bottom-sheet wrapper around PaymentJourney, used by the bill cards
 * (CurrentBill / BillDetailModal) so residents can pay without leaving the
 * screen they're on. The Payments tab screen renders PaymentJourney inline
 * instead.
 *
 * Drag the handle/header down to dismiss.
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
  // The sheet needs a DEFINITE height: PaymentJourney fills its parent with
  // flex-1, and inside a content-sized (auto-height) parent a flex child
  // collapses to zero height — which made the modal look like a bare
  // "Pay Your Water Bill" reminder with no payment flow inside it.
  const sheetHeight = Math.round(windowHeight * 0.88);

  const { panGesture, sheetStyle, animateClosed } = useSwipeableBottomSheet({
    visible,
    onClose,
    sheetHeight,
  });

  if (!bill) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={animateClosed}
    >
      <GestureHandlerRootView style={styles.root}>
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={animateClosed}
          accessibilityRole="button"
          accessibilityLabel="Close payment"
        />

        <Animated.View
          style={[styles.sheet, sheetStyle, { height: sheetHeight }]}
          accessibilityLiveRegion="polite"
        >
          <GestureDetector gesture={panGesture}>
            <Animated.View accessibilityLabel="Drag down to close">
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
            </Animated.View>
          </GestureDetector>

          <View className="flex-1 px-5">
            {visible ? (
              <PaymentJourney
                bill={bill}
                onClose={animateClosed}
                onConfirmed={onConfirmed}
              />
            ) : null}
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F8FAFC',
  },
});
