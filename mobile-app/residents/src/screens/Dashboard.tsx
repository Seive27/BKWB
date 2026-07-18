import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Navbar, type NavTab } from '@/components/ui/Navbar';
import { QuickActions } from '@/components/ui/QuickActions';

type DashboardProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

function EditFab({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-24 right-5 z-10 h-12 w-12 items-center justify-center rounded-xl bg-brand shadow-md"
      style={{
        shadowColor: '#1E5B8C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
      }}
      accessibilityLabel="Edit"
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
          fill="#FFFFFF"
        />
      </Svg>
    </Pressable>
  );
}

export default function Dashboard({ activeTab = 'dashboard', onTabPress }: DashboardProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-2xl font-bold text-white">Barangay Kalunasan</Text>
        <Text className="mt-1 text-base text-white/80">Good day, Resident</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6 px-4 pt-5">
          {/* Current Water Bill */}
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
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-bold text-slate-800">Current Water Bill</Text>
              <View className="rounded-md bg-red-400 px-2.5 py-1">
                <Text className="text-xs font-semibold text-white">Unpaid</Text>
              </View>
            </View>

            <Text className="text-sm text-slate-400">January 2026</Text>
            <Text className="mt-1 text-3xl font-bold text-brand">₱450.00</Text>
            <Text className="mt-1 text-sm text-slate-400">Due: February 15, 2026</Text>

            <Pressable className="mt-5 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark">
              <Text className="text-base font-semibold text-white">Pay Now</Text>
            </Pressable>
          </View>

          {/* Quick Actions */}
          <QuickActions />

          {/* Service Announcements */}
          <View>
            <Text className="mb-3 text-base font-bold text-slate-800">Service Announcements</Text>
            <View
              className="overflow-hidden rounded-2xl bg-white"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View className="flex-row">
                <View className="w-1.5 bg-brand" />
                <View className="flex-1 px-4 py-4">
                  <Text className="text-sm text-slate-400">February 5, 2026</Text>
                  <Text className="mt-1 text-base font-bold text-slate-800">
                    Scheduled Water Interruption
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <EditFab />
      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
