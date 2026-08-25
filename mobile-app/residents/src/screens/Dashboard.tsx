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
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Barangay Kalunasan</Text>
            <Text className="mt-1 text-base text-white/80">Good day, {residentName}</Text>
          </View>
          <NotificationBell onPress={() => setQuickActionScreen('notifications')} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6 px-4 pt-5">
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
            onNotifications={() => setQuickActionScreen('notifications')}
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
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function statusBadge(status: ResidentBill['status']): { label: string; className: string } {
  if (status === 'paid') return { label: 'Paid', className: 'bg-emerald-500' };
  if (status === 'overdue') return { label: 'Overdue', className: 'bg-red-400' };
  if (status === 'void') return { label: 'Void', className: 'bg-slate-400' };
  return { label: 'Unpaid', className: 'bg-amber-400' };
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
        <Text className="text-base font-bold text-slate-800">Current Water Bill</Text>
        <Text className="mt-3 text-sm text-slate-400">Loading your latest bill…</Text>
      </View>
    );
  }

  if (!bill) {
    return (
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
        <Text className="text-base font-bold text-slate-800">Current Water Bill</Text>
        <Text className="mt-3 text-sm leading-5 text-slate-400">
          No bill yet. Your first bill appears here once a meter reading for your account has
          been recorded and approved.
        </Text>
      </View>
    );
  }

  const badge = statusBadge(bill.status);
  const unpaid = bill.status === 'pending' || bill.status === 'overdue';

  return (
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
        <View className={`rounded-md px-2.5 py-1 ${badge.className}`}>
          <Text className="text-xs font-semibold text-white">{badge.label}</Text>
        </View>
      </View>

      <Text className="text-sm text-slate-400">{formatPeriod(bill.billing_period)}</Text>
      <Text className="mt-1 text-3xl font-bold text-brand">{formatPeso(bill.amount_due)}</Text>
      {bill.due_date ? (
        <Text className="mt-1 text-sm text-slate-400">Due: {formatBillDate(bill.due_date)}</Text>
      ) : null}

      <View className="mt-5 gap-2.5">
        <Pressable
          onPress={onViewBill}
          className="items-center rounded-xl border-2 border-brand bg-white py-3.5 active:bg-slate-50"
          accessibilityRole="button"
          accessibilityLabel={unpaid ? 'View current bill' : 'View bill details'}
        >
          <Text className="text-base font-semibold text-brand">
            {unpaid ? 'View Bill' : 'View Details'}
          </Text>
        </Pressable>

        {unpaid ? (
          <Pressable
            onPress={onPayNow}
            className="items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark"
            accessibilityRole="button"
            accessibilityLabel="Pay now"
          >
            <Text className="text-base font-semibold text-white">Pay Now</Text>
          </Pressable>
        ) : null}
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
      className="relative h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
      accessibilityRole="button"
      accessibilityLabel={"Notifications" + (unreadCount > 0 ? ', ' + unreadCount + ' unread' : '')}
    >
      <Image
        source={require('../../assets/QuickActionsIcon/Notifications.svg')}
        style={{ width: 22, height: 22 }}
        contentFit="contain"
      />
      {unreadCount > 0 ? (
        <View className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5">
          <Text className="text-center text-[10px] font-bold text-white">
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
        <Text className="text-base font-bold text-slate-800">Service Announcements</Text>
        {announcements.length > 0 && (
          <Pressable onPress={onViewAll} className="active:opacity-70" accessibilityRole="button">
            <Text className="text-sm font-semibold text-brand">View all</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => setSelected(latest ?? null)}
        disabled={!latest}
        className="overflow-hidden rounded-2xl bg-white active:opacity-90"
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
