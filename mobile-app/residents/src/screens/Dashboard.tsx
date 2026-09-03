import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Navbar, type NavTab } from '@/components/ui/Navbar';
import { ChatBotFab } from '@/components/ui/ChatBotFab';
import { QuickActions } from '@/components/ui/QuickActions';
import type { Announcement, AnnouncementCategory } from '@/types/announcements';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { AnnouncementDetailModal } from '@/components/announcements/AnnouncementDetailModal';
import { useNotifications } from '@/hooks/useNotifications';
import { getCurrentProfile } from '@/services/authService';
import {
  formatBillDate,
  formatPeriod,
  formatPeso,
  getMyBills,
  type ResidentBill,
} from '@/services/billService';
import NotificationsScreen from '@/screens/Notifications';
import PaymentsScreen from '@/screens/Payments';
import TicketsScreen from '@/screens/Tickets';
import ViewBillsScreen from '@/screens/ViewBills';
import WaterScheduleScreen from '@/screens/WaterSchedule';

type DashboardProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onOpenChatBot?: () => void;
};

type QuickActionScreen =
  | 'viewBills'
  | 'payments'
  | 'waterSchedule'
  | 'tickets'
  | 'notifications'
  | null;

export default function Dashboard({
  activeTab = 'dashboard',
  onTabPress,
  onOpenChatBot,
}: DashboardProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);
  const [quickActionScreen, setQuickActionScreen] = useState<QuickActionScreen>(null);
  const [residentName, setResidentName] = useState('Resident');
  const [currentBill, setCurrentBill] = useState<ResidentBill | null>(null);
  const [billLoading, setBillLoading] = useState(true);

  // Greet the resident by their real first name from the profiles table.
  useEffect(() => {
    getCurrentProfile()
      .then((profile) => {
        if (profile?.first_name) setResidentName(profile.first_name);
      })
      .catch(() => {});
  }, []);

  // Mirror Bills → Current Bill: newest unpaid, else newest overall.
  useEffect(() => {
    let cancelled = false;
    getMyBills()
      .then((bills) => {
        if (cancelled) return;
        const unpaid = bills.find((b) => b.status === 'pending' || b.status === 'overdue');
        setCurrentBill(unpaid ?? bills[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setCurrentBill(null);
      })
      .finally(() => {
        if (!cancelled) setBillLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (quickActionScreen === 'payments' && currentBill) {
    return (
      <PaymentsScreen
        bill={currentBill}
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
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base text-white/80">Barangay Kalunasan</Text>
            <Text className="mt-1 text-2xl font-bold text-white">Mabuhay, {residentName}!</Text>
          </View>
          <NotificationBell onPress={() => setQuickActionScreen('notifications')} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-5 px-4 pt-5">
          <CurrentWaterBillCard
            bill={currentBill}
            loading={billLoading}
            onViewBill={() => setQuickActionScreen('viewBills')}
            onPayNow={() => setQuickActionScreen('payments')}
          />

          <QuickActions
            onViewBills={() => setQuickActionScreen('viewBills')}
            onWaterSchedule={() => setQuickActionScreen('waterSchedule')}
            onTickets={() => setQuickActionScreen('tickets')}
            onNotifications={() => onTabPress?.('announcements')}
          />

          <AnnouncementsPreview onViewAll={() => onTabPress?.('announcements')} />
        </View>
      </ScrollView>

      <ChatBotFab onPress={onOpenChatBot} />
      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}

function formatDateShort(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CurrentWaterBillCard({
  bill,
  loading,
  onViewBill,
  onPayNow,
}: {
  bill: ResidentBill | null;
  loading: boolean;
  onViewBill: () => void;
  onPayNow: () => void;
}) {
  if (loading) {
    return (
      <View className="rounded-2xl bg-white p-5 border border-slate-200">
        <Text className="text-base font-bold text-slate-800">Current Water Statement</Text>
        <Text className="mt-2 text-sm text-slate-500">Loading your latest statement…</Text>
      </View>
    );
  }

  if (!bill) {
    return (
      <View className="rounded-2xl bg-white p-5 border border-slate-200">
        <Text className="text-base font-bold text-slate-800">No Bill Due</Text>
        <Text className="mt-1 text-sm leading-relaxed text-slate-500">
          Your account has no outstanding bills. Your statement will appear here after meter reading.
        </Text>
      </View>
    );
  }

  const unpaid = bill.status === 'pending' || bill.status === 'overdue';

  return (
    <View
      className="overflow-hidden rounded-2xl bg-white border border-slate-200"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      <View className="p-5">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-semibold text-slate-500">
            {formatPeriod(bill.billing_period)} Bill
          </Text>
          <View
            className={`rounded-full px-3 py-1 border ${
              bill.status === 'paid'
                ? 'bg-emerald-50 border-emerald-200'
                : bill.status === 'overdue'
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-amber-50 border-amber-200'
            }`}
          >
            <Text
              className={`text-xs font-bold uppercase ${
                bill.status === 'paid'
                  ? 'text-emerald-700'
                  : bill.status === 'overdue'
                    ? 'text-rose-700'
                    : 'text-amber-700'
              }`}
            >
              {bill.status === 'paid' ? 'Paid' : bill.status}
            </Text>
          </View>
        </View>

        <Text className="text-3xl font-extrabold text-slate-900">
          {formatPeso(bill.amount_due)}
        </Text>

        {bill.due_date ? (
          <Text className="text-sm text-slate-500 mt-1">
            Due:{' '}
            <Text className="font-semibold text-slate-800">{formatBillDate(bill.due_date)}</Text>
          </Text>
        ) : null}

        <View className="mt-4 flex-row gap-2.5">
          {unpaid ? (
            <Pressable
              onPress={onPayNow}
              className="flex-1 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark"
              accessibilityRole="button"
              accessibilityLabel="Pay now"
            >
              <Text className="text-base font-bold text-white">Pay Now</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onViewBill}
            className={`items-center rounded-xl py-3.5 border border-slate-200 bg-slate-50 active:bg-slate-100 ${
              unpaid ? 'flex-1' : 'w-full bg-brand border-brand'
            }`}
            accessibilityRole="button"
            accessibilityLabel={unpaid ? 'View current bill' : 'View bill details'}
          >
            <Text
              className={`text-base font-semibold ${
                unpaid ? 'text-slate-800' : 'text-white'
              }`}
            >
              {unpaid ? 'View Details' : 'View Statement'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Header bell with a live unread badge that opens the notifications screen. */
function NotificationBell({ onPress }: { onPress?: () => void }) {
  const { unreadCount } = useNotifications({ limit: 20 });

  return (
    <Pressable
      onPress={onPress}
      className="relative h-9 w-9 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
      accessibilityRole="button"
      accessibilityLabel={"Notifications" + (unreadCount > 0 ? ', ' + unreadCount + ' unread' : '')}
    >
      <Image
        source={require('../../assets/QuickActionsIcon/Notifications.svg')}
        style={{ width: 20, height: 20 }}
        contentFit="contain"
      />
      {unreadCount > 0 ? (
        <View className="absolute -right-0.5 -top-0.5 min-w-[16px] h-4 rounded-full bg-rose-500 px-1 items-center justify-center">
          <Text className="text-center text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function AnnouncementsPreview({ onViewAll }: { onViewAll?: () => void }) {
  const { announcements, loading } = useAnnouncements({ audience: 'residents', limit: 2 });
  const latest = announcements[0];
  const [selected, setSelected] = useState<Announcement | null>(null);

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-bold text-slate-800">Public Advisories</Text>
        {announcements.length > 0 && (
          <Pressable onPress={onViewAll} className="active:opacity-70" accessibilityRole="button">
            <Text className="text-sm font-semibold text-brand">View all</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => setSelected(latest ?? null)}
        disabled={!latest}
        className="overflow-hidden rounded-2xl bg-white border border-slate-200 active:bg-slate-50"
      >
        {loading ? (
          <View className="p-4">
            <Text className="text-sm text-slate-500">Loading notices…</Text>
          </View>
        ) : latest ? (
          <View className="flex-row">
            <View className="w-1 bg-brand" />
            <View className="flex-1 p-4">
              <Text className="text-sm text-slate-500">{formatDateShort(latest.created_at)}</Text>
              <Text className="mt-1 text-base font-bold text-slate-900" numberOfLines={2}>
                {latest.title}
              </Text>
            </View>
          </View>
        ) : (
          <View className="p-4">
            <Text className="text-sm text-slate-500">No announcements right now.</Text>
          </View>
        )}
      </Pressable>
      <AnnouncementDetailModal
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ''}
        category={(selected?.category ?? 'general') as AnnouncementCategory}
        date={selected?.created_at ?? new Date().toISOString()}
        content={selected?.content ?? ''}
        createdBy={null}
      />
    </View>
  );
}
