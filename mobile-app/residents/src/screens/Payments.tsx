import { useState } from 'react';
import { Image } from 'expo-image';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Navbar, type NavTab } from '@/components/ui/Navbar';
import {
  formatBillDate,
  formatPeriod,
  formatPeso,
  type ResidentBill,
} from '@/services/billService';

const SERVICE_FEE = 5;

type PaymentMethodId = 'gcash' | 'maya' | 'cash';

type PaymentMethod = {
  id: PaymentMethodId;
  title: string;
  subtitle: string;
  icon: 'wallet' | 'card' | 'pin';
};

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'gcash',
    title: 'GCash',
    subtitle: 'E-Wallet Instant Payment',
    icon: 'wallet',
  },
  {
    id: 'maya',
    title: 'Maya',
    subtitle: 'Fast & Secure Digital Payment',
    icon: 'card',
  },
  {
    id: 'cash',
    title: 'Cash (Pay at Barangay)',
    subtitle: 'Walk-in payment service',
    icon: 'pin',
  },
];

type PaymentsScreenProps = {
  bill: ResidentBill;
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack?: () => void;
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

function MethodIcon({
  kind,
  selected,
}: {
  kind: PaymentMethod['icon'];
  selected: boolean;
}) {
  const color = selected ? '#1E5B8C' : '#94A3B8';
  const bg = selected ? 'bg-brand/10' : 'bg-slate-100';

  return (
    <View className={`h-11 w-11 items-center justify-center rounded-full ${bg}`}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        {kind === 'wallet' ? (
          <>
            <Path
              d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
              stroke={color}
              strokeWidth={1.8}
            />
            <Path d="M16 12.5h3.5V9.5H16a1.5 1.5 0 1 0 0 3Z" stroke={color} strokeWidth={1.8} />
          </>
        ) : null}
        {kind === 'card' ? (
          <>
            <Path
              d="M3.5 8.5A2.5 2.5 0 0 1 6 6h12a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 18H6a2.5 2.5 0 0 1-2.5-2.5v-7Z"
              stroke={color}
              strokeWidth={1.8}
            />
            <Path d="M3.5 10.5h17" stroke={color} strokeWidth={1.8} />
          </>
        ) : null}
        {kind === 'pin' ? (
          <>
            <Path
              d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
              stroke={color}
              strokeWidth={1.8}
            />
            <Circle cx={12} cy={11} r={2.2} stroke={color} strokeWidth={1.8} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

function RadioSelected() {
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full bg-brand">
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 12.5 10 17.5 19 7.5"
          stroke="#fff"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function RadioEmpty() {
  return <View className="h-6 w-6 rounded-full border-2 border-slate-300" />;
}

export default function PaymentsScreen({
  bill,
  activeTab = 'dashboard',
  onTabPress,
  onBack,
}: PaymentsScreenProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);
  const [method, setMethod] = useState<PaymentMethodId>('gcash');

  const billAmount = Number(bill.amount_due) || 0;
  const total = billAmount + SERVICE_FEE;
  const unpaid = bill.status === 'pending' || bill.status === 'overdue';

  const confirmPayment = () => {
    if (!unpaid) {
      Alert.alert('Already paid', 'This bill has already been marked as paid.');
      return;
    }

    if (method === 'cash') {
      Alert.alert(
        'Pay at Barangay Hall',
        `Bring ${formatPeso(billAmount)} for your ${formatPeriod(bill.billing_period)} bill to the Barangay Hall (Mon–Fri, 8AM–5PM) or an authorized payment center.`
      );
      return;
    }

    const label = method === 'gcash' ? 'GCash' : 'Maya';
    Alert.alert(
      `${label} payment`,
      `Online ${label} payment is not available in the app yet. Please pay at the Barangay Hall or an authorized payment center.`
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-2">
          <BackButton onPress={onBack} />
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Payments</Text>
            <Text className="mt-1 text-base text-white/80">Manage and pay your water bills</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6 px-4 pt-5">
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
            <View className="mb-3 flex-row items-start justify-between">
              <Text className="text-xs font-semibold tracking-wide text-slate-500">
                CURRENT WATER BILL
              </Text>
              <View
                className={`rounded-md px-2.5 py-1 ${
                  unpaid ? 'bg-red-100' : 'bg-emerald-100'
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase ${
                    unpaid ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {unpaid ? 'Unpaid' : bill.status}
                </Text>
              </View>
            </View>

            <Text className="text-4xl font-bold text-brand">{formatPeso(billAmount)}</Text>

            <View className="mt-5 flex-row gap-4">
              <View className="flex-1">
                <Text className="text-[11px] font-semibold tracking-wide text-slate-400">
                  BILLING MONTH
                </Text>
                <Text className="mt-1 text-sm font-bold text-slate-800">
                  {formatPeriod(bill.billing_period)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-semibold tracking-wide text-slate-400">
                  DUE DATE
                </Text>
                <Text className="mt-1 text-sm font-bold text-slate-800">
                  {bill.due_date ? formatBillDate(bill.due_date) : '—'}
                </Text>
              </View>
            </View>
          </View>

          <View>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-bold text-slate-800">Payment Methods</Text>
              <Pressable
                onPress={() =>
                  Alert.alert('Add payment method', 'Adding new payment methods is coming soon.')
                }
                className="active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel="Add new payment method"
              >
                <Text className="text-sm font-semibold text-brand">Add New</Text>
              </Pressable>
            </View>

            <View className="gap-3">
              {PAYMENT_METHODS.map((item) => {
                const selected = method === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setMethod(item.id)}
                    className={`flex-row items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3.5 active:opacity-90 ${
                      selected ? 'border-brand' : 'border-slate-200'
                    }`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={item.title}
                  >
                    <MethodIcon kind={item.icon} selected={selected} />
                    <View className="flex-1">
                      <Text className="text-base font-bold text-slate-800">{item.title}</Text>
                      <Text className="mt-0.5 text-sm text-slate-400">{item.subtitle}</Text>
                    </View>
                    {selected ? <RadioSelected /> : <RadioEmpty />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text className="mb-3 text-base font-bold text-slate-800">Summary</Text>
            <View className="rounded-2xl bg-slate-100 px-4 py-4">
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-sm text-slate-500">Bill Amount</Text>
                <Text className="text-sm font-semibold text-slate-800">
                  {formatPeso(billAmount)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-sm text-slate-500">Service Fee</Text>
                <Text className="text-sm font-semibold text-slate-800">
                  {formatPeso(SERVICE_FEE)}
                </Text>
              </View>
              <View className="my-2 border-t border-slate-200" />
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-base font-bold text-slate-800">Total</Text>
                <Text className="text-base font-bold text-brand">{formatPeso(total)}</Text>
              </View>
            </View>

            <Pressable
              onPress={confirmPayment}
              disabled={!unpaid}
              className={`mt-4 items-center rounded-xl py-3.5 ${
                unpaid ? 'bg-brand active:bg-brand-dark' : 'bg-slate-300'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Confirm payment"
            >
              <Text className="text-base font-semibold text-white">Confirm Payment</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
