import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNotifications } from '@/hooks/useNotifications';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notificationService';
import type { AppNotification, NotificationType } from '@/types/notifications';
import { NOTIFICATION_TYPE_LABELS } from '@/types/notifications';

type NotificationsProps = {
  onBack?: () => void;
};

type Filter = 'all' | 'unread';

const TYPE_COLORS: Record<NotificationType, string> = {
  announcement: 'bg-sky-100',
  ticket_created: 'bg-purple-100',
  ticket_assigned: 'bg-indigo-100',
  ticket_status: 'bg-orange-100',
  ticket_resolved: 'bg-emerald-100',
  reading_assigned: 'bg-cyan-100',
  reading_approved: 'bg-emerald-100',
  reading_rejected: 'bg-red-100',
  billing: 'bg-yellow-100',
  payment: 'bg-emerald-100',
  system: 'bg-slate-200',
};

const TYPE_DOTS: Record<NotificationType, string> = {
  announcement: '#0ea5e9',
  ticket_created: '#8b5cf6',
  ticket_assigned: '#6366f1',
  ticket_status: '#f97316',
  ticket_resolved: '#10b981',
  reading_assigned: '#06b6d4',
  reading_approved: '#10b981',
  reading_rejected: '#ef4444',
  billing: '#eab308',
  payment: '#10b981',
  system: '#64748b',
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + 'd ago';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Notifications({ onBack }: NotificationsProps) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const { notifications, unreadCount, loading, refreshing, error, refresh } = useNotifications();

  const visible = activeFilter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const handlePress = async (item: AppNotification) => {
    if (item.is_read) return;
    try {
      await markNotificationRead(item.id);
      await refresh();
    } catch {
      // Best-effort.
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

  return (
    <View className="flex-1 bg-surface">
      <View
        className="flex-row items-center justify-between bg-brand px-5 pb-6 pt-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={onBack}
          className="rounded-xl bg-white/15 px-3.5 py-2 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text className="text-base font-semibold text-white">‹ Back</Text>
        </Pressable>
        <View className="flex-1 items-center pr-12">
          <Text className="text-xl font-bold text-white">Notifications</Text>
          <Text className="mt-0.5 text-xs text-white/70">
            {unreadCount > 0 ? unreadCount + ' unread' : 'All caught up'}
          </Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View className="flex-row gap-2 bg-surface px-4 pb-3 pt-3">
        {(['all', 'unread'] as Filter[]).map((f) => {
          const selected = activeFilter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setActiveFilter(f)}
              className={`rounded-full px-4 py-2 ${selected ? 'bg-brand' : 'bg-slate-200'}`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>
                {f === 'all' ? 'All' : 'Unread'}
              </Text>
            </Pressable>
          );
        })}
        <View className="flex-1" />
        <Pressable onPress={handleMarkAllRead} className="self-center active:opacity-70" accessibilityRole="button">
          <Text className="text-sm font-semibold text-brand">Mark all read</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3 px-4 pt-1">
          {loading && notifications.length === 0 ? (
            <View className="rounded-2xl bg-white px-4 py-10">
              <Text className="text-center text-sm text-slate-400">Loading notifications…</Text>
            </View>
          ) : error ? (
            <View className="rounded-2xl bg-red-50 px-4 py-6">
              <Text className="text-sm font-medium text-red-600">{error}</Text>
              <Pressable onPress={() => refresh()} className="mt-3 active:opacity-70" accessibilityRole="button">
                <Text className="text-sm font-semibold text-brand">Try again</Text>
              </Pressable>
            </View>
          ) : visible.length === 0 ? (
            <View className="rounded-2xl bg-white px-4 py-10">
              <Text className="text-center text-base font-semibold text-slate-700">No notifications</Text>
              <Text className="mt-1 text-center text-sm text-slate-400">
                {activeFilter === 'unread' ? 'You are all caught up.' : 'New updates will appear here.'}
              </Text>
            </View>
          ) : (
            visible.map((item) => {
              const unread = !item.is_read;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handlePress(item)}
                  className={`rounded-2xl bg-white px-4 py-4 active:opacity-80 ${unread ? 'border border-brand/30' : ''}`}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                  accessibilityRole="button"
                >
                  <View className="flex-row gap-3">
                    <View className={`mt-0.5 h-9 w-9 items-center justify-center rounded-xl ${TYPE_COLORS[item.type] ?? 'bg-slate-200'}`}>
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_DOTS[item.type] ?? '#64748b' }} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-start justify-between gap-2">
                        <Text className={`flex-1 text-[15px] ${unread ? 'font-bold text-navy' : 'font-semibold text-slate-700'}`}>
                          {item.title}
                        </Text>
                        {unread ? <View className="mt-1.5 h-2 w-2 rounded-full bg-brand" /> : null}
                      </View>
                      <Text className="mt-1 text-[13px] leading-5 text-slate-500">{item.message}</Text>
                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-[11px] font-semibold uppercase text-slate-400">
                          {NOTIFICATION_TYPE_LABELS[item.type]}
                        </Text>
                        <Text className="text-[11px] text-slate-400">{formatRelativeTime(item.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
          {refreshing && notifications.length > 0 ? (
            <Text className="mt-2 text-center text-xs text-slate-400">Syncing…</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
