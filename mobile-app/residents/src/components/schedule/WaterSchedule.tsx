import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAnnouncements } from '@/hooks/useAnnouncements';
import { AnnouncementDetailModal } from '@/components/announcements/AnnouncementDetailModal';
import type { Announcement, AnnouncementCategory } from '@/types/announcements';

type ScheduleStatus = 'available' | 'interruption-pink' | 'interruption-amber';

/** Categories that make up the water schedule feed. */
const SCHEDULE_CATEGORIES = ['schedule', 'interruption', 'maintenance'] as const;

function toStatus(announcement: Announcement): ScheduleStatus {
  if (announcement.category === 'schedule') return 'available';
  if (announcement.category === 'maintenance') return 'interruption-amber';
  // interruption + emergency
  return 'interruption-pink';
}

function formatScheduleDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatScheduleTime(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `Posted ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${time}`;
}

function LocationIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-5.33 7-11a7 7 0 10-14 0c0 5.67 7 11 7 11z"
        stroke="#94A3B8"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={2.5} stroke="#94A3B8" strokeWidth={1.8} />
    </Svg>
  );
}

function AvailableIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke="#1E5B8C" strokeWidth={1.8} />
      <Path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="#1E5B8C"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function InterruptionWaveIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12c1.5-2 3-3 4.5-3s3 1 4.5 3 3 3 4.5 3 3-1 4.5-3"
        stroke="#DC2626"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M3 17c1.5-2 3-3 4.5-3s3 1 4.5 3 3 3 4.5 3 3-1 4.5-3"
        stroke="#DC2626"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function InterruptionWarningIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4L3 20h18L12 4z"
        stroke="#B45309"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M12 10v5" stroke="#B45309" strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={17.5} r={1} fill="#B45309" />
    </Svg>
  );
}

function StatusBadge({ status }: { status: ScheduleStatus }) {
  if (status === 'available') {
    return (
      <View className="flex-row items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1">
        <AvailableIcon />
        <Text className="text-xs font-semibold text-brand">Schedule</Text>
      </View>
    );
  }

  if (status === 'interruption-pink') {
    return (
      <View className="flex-row items-center gap-1 rounded-full bg-red-100 px-2.5 py-1">
        <InterruptionWaveIcon />
        <Text className="text-xs font-semibold text-red-600">Interruption</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1">
      <InterruptionWarningIcon />
      <Text className="text-xs font-semibold text-amber-700">Maintenance</Text>
    </View>
  );
}

function accentColor(status: ScheduleStatus) {
  if (status === 'interruption-pink') return 'bg-red-400';
  if (status === 'interruption-amber') return 'bg-amber-500';
  return 'bg-brand';
}

function AnnouncementCard({
  announcement,
  onPress,
}: { announcement: Announcement; onPress: () => void }) {
  const status = toStatus(announcement);
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-2xl bg-white active:opacity-90"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-row">
        <View className={`w-1.5 ${accentColor(status)}`} />
        <View className="flex-1 px-4 py-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-lg font-bold text-brand">{announcement.title}</Text>
              <Text className="mt-1 text-sm text-slate-500">
                {formatScheduleDate(announcement.created_at)}
              </Text>
            </View>
            <StatusBadge status={status} />
          </View>

          {announcement.content ? (
            <Text className="mt-2 text-sm leading-5 text-slate-600">{announcement.content}</Text>
          ) : null}

          <View className="mt-3 flex-row items-center gap-1.5">
            <LocationIcon />
            <Text className="text-sm text-slate-400">{formatScheduleTime(announcement.created_at)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function HouseWatermark() {
  return (
    <View className="absolute bottom-0 right-0 opacity-20" pointerEvents="none">
      <Svg width={120} height={110} viewBox="0 0 120 110" fill="none">
        <Path
          d="M20 48L60 16l40 32v46H20V48z"
          stroke="#FFFFFF"
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <Path
          d="M60 42c-8 10-12 16-12 22a12 12 0 0024 0c0-6-4-12-12-22z"
          fill="#FFFFFF"
        />
      </Svg>
    </View>
  );
}

function WeekendMaintenance() {
  return (
    <View className="overflow-hidden rounded-2xl bg-brand px-5 py-5">
      <HouseWatermark />
      <Text className="text-lg font-bold text-white">How to use this schedule</Text>
      <Text className="mt-2 text-sm leading-5 text-white/85">
        This feed shows the latest water schedule, interruptions, and maintenance
        announcements published by the Barangay. New updates appear here in real
        time as they are posted.
      </Text>
    </View>
  );
}

export function WaterSchedule() {
  const { announcements, loading, error } = useAnnouncements({ audience: 'residents', limit: 20 });
  const [items, setItems] = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);

  // Filter to schedule-related categories, keeping the newest first.
  useEffect(() => {
    setItems(
      announcements.filter((a) =>
        (SCHEDULE_CATEGORIES as readonly string[]).includes(a.category)
      )
    );
  }, [announcements]);

  if (loading && items.length === 0) {
    return (
      <View className="rounded-2xl bg-white px-5 py-10">
        <Text className="text-center text-sm text-slate-400">Loading schedule…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-2xl bg-red-50 px-5 py-10">
        <Text className="text-center text-sm font-medium text-red-600">{error}</Text>
      </View>
    );
  }

  return (
    <>
    <View className="gap-4">
      {items.length === 0 ? (
        <View className="rounded-2xl bg-white px-5 py-10">
          <Text className="text-center text-sm text-slate-400">
            No schedule announcements posted yet. Check back soon.
          </Text>
        </View>
      ) : (
        items.map((announcement) => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            onPress={() => setSelected(announcement)}
          />
        ))
      )}
      <WeekendMaintenance />
    </View>
      <AnnouncementDetailModal
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ''}
        category={(selected?.category ?? 'schedule') as AnnouncementCategory}
        date={selected?.created_at ?? new Date().toISOString()}
        content={selected?.content ?? ''}
        createdBy={
          selected?.creator
            ? `${selected.creator.first_name} ${selected.creator.last_name}`
            : null
        }
      />
    </>
  );
}
