import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  NotificationFilterTabs,
  type NotificationFilter,
} from '@/components/notifications/NotificationFilterTabs';
import { NotificationList } from '@/components/notifications/NotificationList';
import { Navbar, type NavTab } from '@/components/ui/Navbar';
import { useDialog } from '@/components/ui/AppDialog';
import { useNotifications } from '@/hooks/useNotifications';
import {
  markAllNotificationsRead,
  markNotificationRead,
  softDeleteAllNotifications,
  softDeleteNotification,
} from '@/services/notificationService';
import type { AppNotification } from '@/types/notifications';

type NotificationsScreenProps = {
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

export default function NotificationsScreen({
  activeTab = 'dashboard',
  onTabPress,
  onBack,
}: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const dialog = useDialog();

  const { notifications, unreadCount, loading, refreshing, error, refresh } = useNotifications();

  const handlePressItem = async (item: AppNotification) => {
    if (item.is_read) return;
    try {
      await markNotificationRead(item.id);
      await refresh();
    } catch {
      // Best-effort; the feed will re-sync on the next realtime event.
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await refresh();
    } catch {
      // Best-effort.
    }
  };

  const handleDeleteItem = (item: AppNotification) => {
    dialog.confirm({
      title: 'Delete notification?',
      message: 'This notification will be removed from your feed.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await softDeleteNotification(item.id);
          await refresh();
          dialog.toast('Notification deleted');
        } catch (err) {
          dialog.toast(
            err instanceof Error ? err.message : 'Failed to delete notification',
            'error'
          );
        }
      },
    });
  };

  const handleDeleteAll = () => {
    if (notifications.length === 0) return;
    dialog.confirm({
      title: 'Delete all notifications?',
      message: 'This will remove all of your notifications from the feed.',
      confirmLabel: 'Delete All',
      destructive: true,
      onConfirm: async () => {
        try {
          await softDeleteAllNotifications();
          await refresh();
          dialog.toast('All notifications deleted');
        } catch (err) {
          dialog.toast(
            err instanceof Error ? err.message : 'Failed to delete notifications',
            'error'
          );
        }
      },
    });
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-2">
          <BackButton onPress={onBack} />
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Notification</Text>
            <Text className="mt-1 text-base text-white/80">
              {unreadCount > 0 ? unreadCount + ' unread' : 'Stay updated on bills and service alerts'}
            </Text>
          </View>
        </View>
      </View>

      <NotificationFilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-1">
          {loading && notifications.length === 0 ? (
            <View className="gap-4">
              <View className="h-6 w-40 rounded-lg bg-slate-200" />
              <View className="rounded-2xl bg-white px-4 py-8">
                <Text className="text-sm text-slate-400">Loading notifications…</Text>
              </View>
            </View>
          ) : error ? (
            <View className="rounded-2xl bg-red-50 px-4 py-6">
              <Text className="text-sm font-medium text-red-600">{error}</Text>
              <Pressable onPress={() => refresh()} className="mt-3 active:opacity-70" accessibilityRole="button">
                <Text className="text-sm font-semibold text-brand">Try again</Text>
              </Pressable>
            </View>
          ) : (
            <NotificationList
              items={notifications}
              filter={activeFilter}
              onMarkAllRead={handleMarkAllRead}
              onDeleteAll={handleDeleteAll}
              onPressItem={handlePressItem}
              onDeleteItem={handleDeleteItem}
            />
          )}
          {refreshing && notifications.length > 0 ? (
            <Text className="mt-4 text-center text-xs text-slate-400">Syncing…</Text>
          ) : null}
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
