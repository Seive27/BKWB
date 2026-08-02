import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { NotificationFilter } from '@/components/notifications/NotificationFilterTabs';
import type { AppNotification, NotificationType } from '@/types/notifications';
import { NOTIFICATION_TYPE_LABELS } from '@/types/notifications';

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

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// ── Icon variants keyed by notification type ──

type IconVariant = 'megaphone' | 'ticket' | 'check' | 'drop' | 'alert' | 'info';

function typeVariant(type: NotificationType): IconVariant {
  if (type === 'announcement') return 'megaphone';
  if (type === 'ticket_created' || type === 'ticket_assigned' || type === 'ticket_status' || type === 'ticket_resolved') return 'ticket';
  if (type === 'reading_approved' || type === 'payment') return 'check';
  if (type === 'reading_assigned' || type === 'billing') return 'drop';
  if (type === 'reading_rejected') return 'alert';
  return 'info';
}

const VARIANT_BG: Record<IconVariant, string> = {
  megaphone: 'bg-blue-100',
  ticket: 'bg-purple-100',
  check: 'bg-emerald-100',
  drop: 'bg-orange-100',
  alert: 'bg-red-100',
  info: 'bg-slate-100',
};

function MegaphoneIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11l14-6v14L3 13v-2z" fill="#BFDBFE" stroke="#1E5B8C" strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M17 8a4 4 0 010 8" stroke="#1E5B8C" strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

function TicketIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={14} rx={3} fill="#DDD6FE" />
      <Path d="M15 5v14M3 10h12" stroke="#5B21B6" strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={18} cy={12} r={1.2} fill="#5B21B6" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} fill="#A7F3D0" />
      <Path d="M8 12.5l2.5 2.5L16 9.5" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DropIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.5C12 3.5 6.5 10.2 6.5 14a5.5 5.5 0 0011 0c0-3.8-5.5-10.5-5.5-10.5z" fill="#FDBA74" stroke="#EA580C" strokeWidth={1.2} strokeLinejoin="round" />
    </Svg>
  );
}

function AlertIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3L2 20h20L12 3z" fill="#FECACA" stroke="#DC2626" strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M12 9v5M12 17v.5" stroke="#DC2626" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function InfoIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} fill="#E2E8F0" />
      <Path d="M12 11v5M12 7.5v.5" stroke="#475569" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function NotificationTypeIcon({ type }: { type: NotificationType }) {
  const variant = typeVariant(type);
  return (
    <View className={`h-11 w-11 items-center justify-center rounded-xl ${VARIANT_BG[variant]}`}>
      {variant === 'megaphone' ? <MegaphoneIcon /> : null}
      {variant === 'ticket' ? <TicketIcon /> : null}
      {variant === 'check' ? <CheckIcon /> : null}
      {variant === 'drop' ? <DropIcon /> : null}
      {variant === 'alert' ? <AlertIcon /> : null}
      {variant === 'info' ? <InfoIcon /> : null}
    </View>
  );
}

function NotificationCard({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress?: (item: AppNotification) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress?.(item)}
      className="rounded-2xl bg-white px-4 py-4 active:opacity-80"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
      accessibilityRole="button"
    >
      <View className="flex-row gap-3">
        <NotificationTypeIcon type={item.type} />
        <View className="flex-1">
          <View className="flex-row items-start gap-2">
            <Text className="flex-1 text-base font-bold text-slate-800">{item.title}</Text>
            {!item.is_read ? <View className="mt-1.5 h-2 w-2 rounded-full bg-brand" /> : null}
          </View>
          <Text className="mt-1.5 text-sm leading-5 text-slate-500">{item.message}</Text>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="rounded-full bg-slate-100 px-2.5 py-1">
              <Text className="text-xs font-bold uppercase text-slate-500">
                {NOTIFICATION_TYPE_LABELS[item.type]}
              </Text>
            </View>
            <Text className="text-xs text-slate-400">{formatRelativeTime(item.created_at)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

type NotificationListProps = {
  items: AppNotification[];
  filter?: NotificationFilter;
  onMarkAllRead?: () => void;
  onPressItem?: (item: AppNotification) => void;
};

export function NotificationList({
  items,
  filter = 'all',
  onMarkAllRead,
  onPressItem,
}: NotificationListProps) {
  const visible = filter === 'unread' ? items.filter((i) => !i.is_read) : items;
  const today = visible.filter((i) => isToday(i.created_at));
  const earlier = visible.filter((i) => !isToday(i.created_at));

  const groups: { key: string; label: string; items: AppNotification[] }[] = [
    { key: 'today', label: 'TODAY', items: today },
    { key: 'earlier', label: 'EARLIER', items: earlier },
  ];

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold text-slate-800">Recent Updates</Text>
        <Pressable onPress={onMarkAllRead} className="active:opacity-70" accessibilityRole="button">
          <Text className="text-sm font-semibold text-brand">Mark all as read</Text>
        </Pressable>
      </View>

      {visible.length === 0 ? (
        <View className="rounded-2xl bg-white px-6 py-10 items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <InfoIcon />
          </View>
          <Text className="mt-3 text-base font-semibold text-slate-700">No notifications</Text>
          <Text className="mt-1 text-sm text-slate-400">
            {filter === 'unread' ? 'You are all caught up.' : 'New updates will appear here.'}
          </Text>
        </View>
      ) : (
        groups.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <View key={group.key} className="gap-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </Text>
              {group.items.map((item) => (
                <NotificationCard key={item.id} item={item} onPress={onPressItem} />
              ))}
            </View>
          );
        })
      )}
    </View>
  );
}
