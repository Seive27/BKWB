import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Navbar, type NavTab } from '@/components/ui/Navbar';
import { QuickActions } from '@/components/ui/QuickActions';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import NotificationsScreen from '@/screens/Notifications';
import TicketsScreen from '@/screens/Tickets';
import ViewBillsScreen from '@/screens/ViewBills';
import WaterScheduleScreen from '@/screens/WaterSchedule';

type DashboardProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

type QuickActionScreen =
  | 'viewBills'
  | 'waterSchedule'
  | 'tickets'
  | 'notifications'
  | null;

export default function Dashboard({ activeTab = 'dashboard', onTabPress }: DashboardProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);
  const [quickActionScreen, setQuickActionScreen] = useState<QuickActionScreen>(null);

  if (quickActionScreen === 'viewBills') {
    return (
      <ViewBillsScreen
        activeTab={activeTab}
        onTabPress={(tab) => {
          setQuickActionScreen(null);
          onTabPress?.(tab);
        }}
        onBack={() => setQuickActionScreen(null)}
      />
    );
  }

  if (quickActionScreen === 'waterSchedule') {
    return (
      <WaterScheduleScreen
        activeTab={activeTab}
        onTabPress={(tab) => {
          setQuickActionScreen(null);
          onTabPress?.(tab);
        }}
        onBack={() => setQuickActionScreen(null)}
      />
    );
  }

  if (quickActionScreen === 'tickets') {
    return (
      <TicketsScreen
        activeTab={activeTab}
        onTabPress={(tab) => {
          setQuickActionScreen(null);
          onTabPress?.(tab);
        }}
        onBack={() => setQuickActionScreen(null)}
      />
    );
  }

  if (quickActionScreen === 'notifications') {
    return (
      <NotificationsScreen
        activeTab={activeTab}
        onTabPress={(tab) => {
          setQuickActionScreen(null);
          onTabPress?.(tab);
        }}
        onBack={() => setQuickActionScreen(null)}
      />
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
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

          <QuickActions
            onViewBills={() => setQuickActionScreen('viewBills')}
            onWaterSchedule={() => setQuickActionScreen('waterSchedule')}
            onTickets={() => setQuickActionScreen('tickets')}
            onNotifications={() => setQuickActionScreen('notifications')}
          />

          <AnnouncementsPreview onViewAll={() => onTabPress?.('announcements')} />
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}

function formatDateShort(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function AnnouncementsPreview({ onViewAll }: { onViewAll?: () => void }) {
  const { announcements, loading } = useAnnouncements({ audience: 'residents', limit: 2 });
  const latest = announcements[0];

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-bold text-slate-800">Service Announcements</Text>
        {announcements.length > 0 && (
          <Pressable onPress={onViewAll} className="active:opacity-70" accessibilityRole="button">
            <Text className="text-sm font-semibold text-brand">View all</Text>
          </Pressable>
        )}
      </View>

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
        {loading ? (
          <View className="px-4 py-5">
            <Text className="text-sm text-slate-400">Loading announcements…</Text>
          </View>
        ) : latest ? (
          <View className="flex-row">
            <View className="w-1.5 bg-brand" />
            <View className="flex-1 px-4 py-4">
              <Text className="text-sm text-slate-400">{formatDateShort(latest.created_at)}</Text>
              <Text className="mt-1 text-base font-bold text-slate-800">{latest.title}</Text>
            </View>
          </View>
        ) : (
          <View className="px-4 py-5">
            <Text className="text-sm text-slate-400">No announcements right now.</Text>
          </View>
        )}
      </View>
    </View>
  );
}
