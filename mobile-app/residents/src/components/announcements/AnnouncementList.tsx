import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { AnnouncementFilter } from '@/components/announcements/AnnouncementFilterTabs';

export type AnnouncementCategory = Exclude<AnnouncementFilter, 'all'>;

type Announcement = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  date: string;
  preview: string;
  accentColor: string;
  icon: 'warning' | 'calendar' | 'info';
};

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    category: 'interruption',
    title: 'Scheduled Water Interruption - Feb 10, 2026',
    date: 'February 5, 2026',
    preview:
      'Water supply will be temporarily interrupted on February 10, 2026 from 8:00 AM to 4:00 PM for...',
    accentColor: '#EF4444',
    icon: 'warning',
  },
  {
    id: '2',
    category: 'schedule',
    title: 'Water Distribution Schedule - February 2026',
    date: 'February 1, 2026',
    preview:
      'Zone 1: Daily 6:00 AM - 12:00 PM\nZone 2: Daily 12:00 PM - 6:00 PM...',
    accentColor: '#1E5B8C',
    icon: 'calendar',
  },
  {
    id: '3',
    category: 'maintenance',
    title: 'Payment Deadline Reminder',
    date: 'January 28, 2026',
    preview:
      'This is to remind all consumers to settle your water bills on or before the 15th of each month to avoid...',
    accentColor: '#14B8A6',
    icon: 'info',
  },
];

function WarningIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5L2.5 20h19L12 3.5z"
        fill="#FACC15"
        stroke="#CA8A04"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Path d="M12 10v4.5" stroke="#854D0E" strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={17.2} r={1} fill="#854D0E" />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={16} rx={2} fill="#E2E8F0" stroke="#94A3B8" strokeWidth={1.2} />
      <Path d="M3 9h18" stroke="#94A3B8" strokeWidth={1.2} />
      <Path d="M8 3.5v3M16 3.5v3" stroke="#64748B" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M7.5 14h3M13.5 14h3M7.5 17.5h3" stroke="#1E5B8C" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function InfoIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} fill="#E2E8F0" stroke="#94A3B8" strokeWidth={1.2} />
      <Path d="M12 11v5" stroke="#64748B" strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={8} r={1.1} fill="#64748B" />
    </Svg>
  );
}

function AnnouncementIcon({ type }: { type: Announcement['icon'] }) {
  return (
    <View className="h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
      {type === 'warning' ? <WarningIcon /> : null}
      {type === 'calendar' ? <CalendarIcon /> : null}
      {type === 'info' ? <InfoIcon /> : null}
    </View>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <View
      className="overflow-hidden rounded-2xl bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-row">
        <View className="w-1.5" style={{ backgroundColor: announcement.accentColor }} />
        <View className="flex-1 flex-row gap-3 px-4 py-4">
          <AnnouncementIcon type={announcement.icon} />
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-800">{announcement.title}</Text>
            <Text className="mt-1 text-sm text-slate-400">{announcement.date}</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600" numberOfLines={3}>
              {announcement.preview}
            </Text>
            <Pressable className="mt-2 self-start active:opacity-70" accessibilityRole="link">
              <Text className="text-sm font-semibold text-brand">Read more</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

type AnnouncementListProps = {
  filter?: AnnouncementFilter;
};

export function AnnouncementList({ filter = 'all' }: AnnouncementListProps) {
  const items =
    filter === 'all'
      ? ANNOUNCEMENTS
      : ANNOUNCEMENTS.filter((item) => item.category === filter);

  return (
    <View className="gap-4">
      {items.map((announcement) => (
        <AnnouncementCard key={announcement.id} announcement={announcement} />
      ))}
    </View>
  );
}
