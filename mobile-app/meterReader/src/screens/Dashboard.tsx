import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { CloudStatusIcon } from '@/components/ui/CloudStatusIcon';

type DashboardProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

const MOCK = {
  readerName: 'Juan',
  greeting: 'Good Morning',
  lastSynced: '2 mins ago',
  dateLabel: 'Aug 24, 2024',
  routeName: 'Barangay San Jose South Sector',
  totalAssigned: 42,
  readingsCompleted: 18,
  pendingReadings: 24,
  routeProgress: 43,
};

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

function CompletedIcon() {
  return (
    <View className="h-7 w-7 items-center justify-center rounded-full bg-completed-soft">
      <Text className="text-sm font-bold text-sync-text">✓</Text>
    </View>
  );
}

function PendingIcon() {
  return (
    <View className="h-7 w-7 items-center justify-center rounded-full bg-pending-soft">
      <Text className="text-sm font-bold text-pending">☰</Text>
    </View>
  );
}

export default function Dashboard({
  activeTab = 'dashboard',
  onTabPress,
}: DashboardProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: navbarHeight + 24,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5 flex-row items-center justify-between">
          <View className="shrink flex-row items-center gap-1.5">
            <Image
              source={require('../../assets/icons/synch.png')}
              style={{ width: 14, height: 14, tintColor: '#8FA3B5' }}
              contentFit="contain"
            />
            <Text className="text-xs text-navy-soft">
              Last synced: {MOCK.lastSynced}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-base font-bold text-navy">{MOCK.dateLabel}</Text>
            <CloudStatusIcon />
          </View>
        </View>

        <Text className="mb-3.5 text-[28px] font-bold text-navy">
          {MOCK.greeting}, {MOCK.readerName}
        </Text>
        <Text className="mb-1 text-[11px] font-semibold tracking-wider text-navy-soft">
          ASSIGNED ROUTE
        </Text>
        <Text className="mb-5 text-[15px] text-navy-muted">{MOCK.routeName}</Text>

        <Pressable
          className="mb-3 flex-row items-center justify-center gap-2.5 rounded-2xl bg-brand py-4 active:opacity-85"
          accessibilityRole="button"
          accessibilityLabel="Start Reading"
        >
          <Image
            source={require('../../assets/icons/reading.png')}
            style={{ width: 22, height: 22, tintColor: '#FFFFFF' }}
            contentFit="contain"
          />
          <Text className="text-base font-semibold text-white">Start Reading</Text>
        </Pressable>

        <Pressable
          className="mb-5 flex-row items-center justify-center gap-2.5 rounded-2xl bg-sync py-4 active:opacity-85"
          accessibilityRole="button"
          accessibilityLabel="Sync All Data"
        >
          <Image
            source={require('../../assets/icons/synch.png')}
            style={{ width: 20, height: 20, tintColor: '#1A4A6A' }}
            contentFit="contain"
          />
          <Text className="text-base font-semibold text-sync-text">Sync All Data</Text>
        </Pressable>

        <View className="mb-3 rounded-[18px] bg-white p-[18px]" style={cardShadow}>
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="mb-1.5 text-[11px] font-semibold tracking-wide text-navy-muted">
                TOTAL ASSIGNED
              </Text>
              <Text className="text-[40px] font-bold leading-[46px] text-navy">
                {MOCK.totalAssigned}
              </Text>
            </View>
            <Image
              source={require('../../assets/icons/totalAssigned.png')}
              style={{ width: 56, height: 56, opacity: 0.2, marginTop: -4 }}
              contentFit="contain"
            />
          </View>
          <View className="mt-2.5 flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-[#3B82C4]" />
            <Text className="text-[13px] text-navy-muted">Residents on route</Text>
          </View>
        </View>

        <View className="mb-6 flex-row gap-3">
          <View className="flex-1 rounded-[18px] bg-white p-[18px]" style={cardShadow}>
            <View className="mb-2 flex-row items-start justify-between">
              <Text className="mr-1.5 flex-1 text-[11px] font-semibold tracking-wide text-navy-muted">
                READINGS COMPLETED
              </Text>
              <CompletedIcon />
            </View>
            <Text className="text-[36px] font-bold text-navy">
              {MOCK.readingsCompleted}
            </Text>
          </View>

          <View className="flex-1 rounded-[18px] bg-white p-[18px]" style={cardShadow}>
            <View className="mb-2 flex-row items-start justify-between">
              <Text className="mr-1.5 flex-1 text-[11px] font-semibold tracking-wide text-navy-muted">
                PENDING READINGS
              </Text>
              <PendingIcon />
            </View>
            <Text className="text-[36px] font-bold text-pending">
              {MOCK.pendingReadings}
            </Text>
          </View>
        </View>

        <View className="gap-2.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-[15px] font-semibold text-navy">Route Progress</Text>
            <Text className="text-[15px] font-bold text-navy">{MOCK.routeProgress}%</Text>
          </View>
          <View className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <View
              className="h-full rounded-full bg-brand"
              style={{ width: `${MOCK.routeProgress}%` }}
            />
          </View>
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
