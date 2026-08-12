import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StartReadingModal } from '@/components/modals/StartReadingModal';
import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { CloudStatusIcon } from '@/components/ui/CloudStatusIcon';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { useAssignments } from '@/hooks/useAssignments';
import { useNotifications } from '@/hooks/useNotifications';
import { useReadingHistory } from '@/hooks/useReadingHistory';
import {
  getCurrentReaderProfile,
  submitReadingByMeterNumber,
} from '@/services/meterReadingService';

type DashboardProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  /** Open the full announcements screen. */
  onOpenAnnouncements?: () => void;
  /** Open the notifications screen. */
  onOpenNotifications?: () => void;
};

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

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
  onOpenAnnouncements,
  onOpenNotifications,
}: DashboardProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);

  const { assignments, sitioRoutes, refreshing, refresh } = useAssignments();
  const { readings: history } = useReadingHistory();

  const [readerName, setReaderName] = useState('Reader');
  const [showStartReading, setShowStartReading] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentReaderProfile().then((profile) => {
      if (active && profile?.first_name) {
        setReaderName(profile.first_name);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Android may destroy the activity after the camera closes, which closes the
  // Start Reading sheet. Re-open it when a pending camera result exists.
  useEffect(() => {
    let active = true;
    void ImagePicker.getPendingResultAsync().then((pending) => {
      if (!active || !pending || !('assets' in pending) || !pending.assets?.[0]) {
        return;
      }
      setShowStartReading(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const totalAssigned = assignments.length;
  const readingsCompleted = history.filter(
    (r) => r.status === 'approved' || r.status === 'billed',
  ).length;
  const pendingReview = history.filter((r) => r.status === 'pending_review').length;
  const pendingReadings = assignments.length + pendingReview;
  const routeProgress =
    sitioRoutes.length > 0
      ? Math.round(
          (sitioRoutes.reduce((sum, r) => sum + r.completed, 0) /
            Math.max(
              1,
              sitioRoutes.reduce((sum, r) => sum + r.total, 0),
            )) *
            100,
        )
      : totalAssigned + readingsCompleted > 0
        ? Math.round((readingsCompleted / (totalAssigned + readingsCompleted)) * 100)
        : 0;
  const assignedSitioLabel =
    sitioRoutes.length > 0
      ? sitioRoutes.map((r) => r.sitio).join(', ')
      : null;

  const todayLabel = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

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
              {refreshing ? 'Syncing…' : 'Live'}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-bold text-navy">{todayLabel}</Text>
            <CloudStatusIcon />
            <NotificationBell onPress={onOpenNotifications} />
          </View>
        </View>

        <Text className="mb-3.5 text-[28px] font-bold text-navy">
          {getGreeting()}, {readerName}
        </Text>
        <Text className="mb-1 text-[11px] font-semibold tracking-wider text-navy-soft">
          ASSIGNED ROUTE
        </Text>
        <Text className="mb-5 text-[15px] text-navy-muted">
          {totalAssigned > 0
            ? assignedSitioLabel
              ? `${assignedSitioLabel} · ${totalAssigned} reading${totalAssigned === 1 ? '' : 's'} to complete`
              : `${totalAssigned} assigned reading${totalAssigned === 1 ? '' : 's'} to complete`
            : 'No active assignments'}
        </Text>

        <Pressable
          onPress={() => setShowStartReading(true)}
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
          onPress={() => refresh()}
          className="mb-5 flex-row items-center justify-center gap-2.5 rounded-2xl bg-sync py-4 active:opacity-85"
          accessibilityRole="button"
          accessibilityLabel="Refresh Assignments"
        >
          <Image
            source={require('../../assets/icons/synch.png')}
            style={{ width: 20, height: 20, tintColor: '#1A4A6A' }}
            contentFit="contain"
          />
          <Text className="text-base font-semibold text-sync-text">Refresh</Text>
        </Pressable>

        <View className="mb-3 rounded-[18px] bg-white p-[18px]" style={cardShadow}>
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="mb-1.5 text-[11px] font-semibold tracking-wide text-navy-muted">
                TOTAL ASSIGNED
              </Text>
              <Text className="text-[40px] font-bold leading-[46px] text-navy">
                {totalAssigned}
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
            <Text className="text-[13px] text-navy-muted">Readings to complete</Text>
          </View>
        </View>

        <View className="mb-6 flex-row gap-3">
          <View className="flex-1 rounded-[18px] bg-white p-[18px]" style={cardShadow}>
            <View className="mb-2 flex-row items-start justify-between">
              <Text className="mr-1.5 flex-1 text-[11px] font-semibold tracking-wide text-navy-muted">
                APPROVED
              </Text>
              <CompletedIcon />
            </View>
            <Text className="text-[36px] font-bold text-navy">
              {readingsCompleted}
            </Text>
          </View>

          <View className="flex-1 rounded-[18px] bg-white p-[18px]" style={cardShadow}>
            <View className="mb-2 flex-row items-start justify-between">
              <Text className="mr-1.5 flex-1 text-[11px] font-semibold tracking-wide text-navy-muted">
                PENDING
              </Text>
              <PendingIcon />
            </View>
            <Text className="text-[36px] font-bold text-pending">
              {pendingReadings}
            </Text>
          </View>
        </View>

        <View className="gap-2.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-[15px] font-semibold text-navy">Route Progress</Text>
            <Text className="text-[15px] font-bold text-navy">{routeProgress}%</Text>
          </View>
          <View className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <View
              className="h-full rounded-full bg-brand"
              style={{ width: `${routeProgress}%` }}
            />
          </View>
        </View>

        {/* Announcements card */}
        <View className="mt-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[15px] font-semibold text-navy">Announcements</Text>
            <Pressable
              onPress={onOpenAnnouncements}
              className="rounded-lg px-2 py-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="View all announcements"
            >
              <Text className="text-[13px] font-semibold text-brand">View All ›</Text>
            </Pressable>
          </View>
          <AnnouncementList filter="all" limit={4} />
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />

      <StartReadingModal
        visible={showStartReading}
        onClose={() => setShowStartReading(false)}
        onConfirm={async (payload) => {
          const current = Number(payload.currentReading.replace(/,/g, ''));
          if (!Number.isFinite(current)) {
            throw new Error('Please enter a valid current reading.');
          }

          const submitted = await submitReadingByMeterNumber({
            meterNumber: payload.meterNumber,
            sitio: payload.sitio,
            currentReading: current,
            remarks: payload.notes,
            photoUri: payload.photoUri,
            photoBase64: payload.photoBase64,
          });

          await refresh();

          const residentName = submitted.resident
            ? `${submitted.resident.first_name} ${submitted.resident.last_name}`.trim()
            : submitted.account?.account_number ?? 'the matched account';

          Alert.alert(
            'Submitted',
            `Matched ${payload.meterNumber} to ${residentName}. The reading is pending review.`,
          );
        }}
      />
    </View>
  );
}

/** Header bell with a live unread badge that opens the notifications screen. */
function NotificationBell({ onPress }: { onPress?: () => void }) {
  const { unreadCount } = useNotifications({ limit: 20 });

  return (
    <Pressable
      onPress={onPress}
      className="relative h-9 w-9 items-center justify-center rounded-full bg-white active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={"Notifications" + (unreadCount > 0 ? ', ' + unreadCount + ' unread' : '')}
    >
      <Text className="text-lg leading-none text-navy">🔔</Text>
      {unreadCount > 0 ? (
        <View className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5">
          <Text className="text-center text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
