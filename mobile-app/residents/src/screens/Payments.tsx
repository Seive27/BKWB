import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaymentJourney } from '@/components/payments/PaymentJourney';
import { Navbar, type NavTab } from '@/components/ui/Navbar';
import { type ResidentBill } from '@/services/billService';

type PaymentsScreenProps = {
  bill: ResidentBill;
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack?: () => void;
  /** Called once the webhook/database confirms the payment. */
  onBillPaid?: () => void;
};

function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="-ml-1 h-10 w-10 items-center justify-center active:opacity-70"
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Image
        source={require('../../assets/Arrow/BackArrow.png')}
        style={{ width: 19, height: 19 }}
        contentFit="contain"
      />
    </Pressable>
  );
}

export default function PaymentsScreen({
  bill,
  activeTab = 'dashboard',
  onTabPress,
  onBack,
  onBillPaid,
}: PaymentsScreenProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-2">
          <BackButton onPress={onBack} />
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Payments</Text>
            <Text className="mt-1 text-base text-white/80">Pay your water bill securely online</Text>
          </View>
        </View>
      </View>

      <View className="flex-1" style={{ paddingBottom: navbarHeight }}>
        <View className="flex-1 px-4 pt-5">
          <PaymentJourney
            bill={bill}
            onClose={onBack}
            onBillPaid={onBillPaid}
          />
        </View>
      </View>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}