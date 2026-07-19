import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { NotificationFilter } from '@/components/notifications/NotificationFilterTabs';

type NotificationStatus = 'unpaid' | 'paid' | 'info';
type NotificationIcon = 'bill' | 'check' | 'drop';
type NotificationGroup = 'today' | 'yesterday';

type NotificationItem = {
  id: string;
  group: NotificationGroup;
  title: string;
  body: string;
  status: NotificationStatus;
  statusLabel: string;
  timeAgo: string;
  unread: boolean;
  icon: NotificationIcon;
};

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    group: 'today',
    title: 'Your water bill for March is now available',
    body: 'Your current balance is ₱450.00. Please settle on or before March 15, 2026 to avoid late fees.',
    status: 'unpaid',
    statusLabel: 'UNPAID',
    timeAgo: '2 hours ago',
    unread: true,
    icon: 'bill',
  },
  {
    id: '2',
    group: 'today',
    title: 'Payment successful',
    body: "We've received your payment of ₱425.50 for February 2026. Transaction ID: TXN-99281.",
    status: 'paid',
    statusLabel: 'PAID',
    timeAgo: '5 hours ago',
    unread: false,
    icon: 'check',
  },
  {
    id: '3',
    group: 'yesterday',
    title: 'Scheduled water interruption',
    body: 'Water supply in Zone 2 will be interrupted tomorrow from 8:00 AM to 12:00 PM for pipe maintenance.',
    status: 'info',
    statusLabel: 'INFO',
    timeAgo: '1 day ago',
    unread: true,
    icon: 'drop',
  },
];

const GROUP_LABELS: Record<NotificationGroup, string> = {
  today: 'TODAY',
  yesterday: 'YESTERDAY',
};

function BillIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={3} width={14} height={18} rx={2} fill="#BFDBFE" />
      <Path d="M8 8h8M8 12h8M8 16h5" stroke="#1E5B8C" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} fill="#A7F3D0" />
      <Path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="#059669"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DropIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5C12 3.5 6.5 10.2 6.5 14a5.5 5.5 0 0011 0c0-3.8-5.5-10.5-5.5-10.5z"
        fill="#FDBA74"
        stroke="#EA580C"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function NotificationTypeIcon({ type }: { type: NotificationIcon }) {
  const bg =
    type === 'bill' ? 'bg-blue-100' : type === 'check' ? 'bg-emerald-100' : 'bg-orange-100';

  return (
    <View className={`h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
      {type === 'bill' ? <BillIcon /> : null}
      {type === 'check' ? <CheckIcon /> : null}
      {type === 'drop' ? <DropIcon /> : null}
    </View>
  );
}

function statusStyles(status: NotificationStatus) {
  if (status === 'unpaid') {
    return { container: 'bg-red-100', text: 'text-red-600' };
  }
  if (status === 'paid') {
    return { container: 'bg-emerald-100', text: 'text-emerald-700' };
  }
  return { container: 'bg-orange-100', text: 'text-orange-700' };
}

function NotificationCard({ item }: { item: NotificationItem }) {
  const badge = statusStyles(item.status);

  return (
    <View
      className="rounded-2xl bg-white px-4 py-4"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-row gap-3">
        <NotificationTypeIcon type={item.icon} />
        <View className="flex-1">
          <View className="flex-row items-start gap-2">
            <Text className="flex-1 text-base font-bold text-slate-800">{item.title}</Text>
            {item.unread ? <View className="mt-1.5 h-2 w-2 rounded-full bg-brand" /> : null}
          </View>
          <Text className="mt-1.5 text-sm leading-5 text-slate-500">{item.body}</Text>
          <View className="mt-3 flex-row items-center justify-between">
            <View className={`rounded-full px-2.5 py-1 ${badge.container}`}>
              <Text className={`text-xs font-bold uppercase ${badge.text}`}>{item.statusLabel}</Text>
            </View>
            <Text className="text-xs text-slate-400">{item.timeAgo}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

type NotificationListProps = {
  filter?: NotificationFilter;
  onMarkAllRead?: () => void;
};

export function NotificationList({ filter = 'all', onMarkAllRead }: NotificationListProps) {
  const items =
    filter === 'unread' ? NOTIFICATIONS.filter((item) => item.unread) : NOTIFICATIONS;

  const groups: NotificationGroup[] = ['today', 'yesterday'];

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold text-slate-800">Recent Updates</Text>
        <Pressable onPress={onMarkAllRead} className="active:opacity-70" accessibilityRole="button">
          <Text className="text-sm font-semibold text-brand">Mark all as read</Text>
        </Pressable>
      </View>

      {groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group);
        if (groupItems.length === 0) {
          return null;
        }

        return (
          <View key={group} className="gap-3">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {GROUP_LABELS[group]}
            </Text>
            {groupItems.map((item) => (
              <NotificationCard key={item.id} item={item} />
            ))}
          </View>
        );
      })}
    </View>
  );
}
