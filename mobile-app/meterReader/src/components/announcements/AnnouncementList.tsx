import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, type DimensionValue } from 'react-native';

import { AnnouncementPriorityBadge } from '@/components/announcements/AnnouncementPriorityBadge';
import type { AnnouncementFilter } from '@/components/announcements/AnnouncementFilterTabs';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  type AnnouncementCategory,
} from '@/types/announcements';

const CATEGORY_ACCENTS: Record<AnnouncementCategory, string> = {
  schedule: '#1E5B8C',
  interruption: '#EF4444',
  maintenance: '#F59E0B',
  billing: '#8B5CF6',
  general: '#64748B',
  emergency: '#DC2626',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Skeleton ──

function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: { width?: DimensionValue; height?: number; borderRadius?: number };
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View className={`bg-slate-200 ${className ?? ''}`} style={[{ opacity }, style]} />;
}

function SkeletonAnnouncementCard() {
  return (
    <View
      className="overflow-hidden rounded-[18px] bg-white p-5"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center gap-2">
        <SkeletonBlock className="rounded-full" style={{ width: 80, height: 24 }} />
        <SkeletonBlock className="rounded-full" style={{ width: 70, height: 24 }} />
      </View>
      <SkeletonBlock className="mt-4 rounded" style={{ width: '85%', height: 18 }} />
      <SkeletonBlock className="mt-3 rounded" style={{ width: '100%', height: 14 }} />
      <SkeletonBlock className="mt-2 rounded" style={{ width: '70%', height: 14 }} />
    </View>
  );
}

// ── Card ──

type AnnouncementCardProps = {
  title: string;
  category: AnnouncementCategory;
  priority: 'normal' | 'important' | 'emergency';
  date: string;
  content: string;
  createdBy?: string | null;
};

function AnnouncementCard({ title, category, priority, date, content, createdBy }: AnnouncementCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      className="overflow-hidden rounded-[18px] bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="flex-row">
        <View className="w-1.5" style={{ backgroundColor: CATEGORY_ACCENTS[category] }} />
        <View className="flex-1 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <AnnouncementPriorityBadge priority={priority} size="sm" />
            <Text className="text-xs font-semibold text-navy-muted">
              {ANNOUNCEMENT_CATEGORY_LABELS[category]}
            </Text>
          </View>
          <Text className="mt-2.5 text-base font-bold leading-5 text-navy">{title}</Text>
          <Text className="mt-1 text-sm text-navy-muted">{formatDate(date)}</Text>
          <Text
            className="mt-2 text-sm leading-5 text-navy-soft"
            numberOfLines={expanded ? undefined : 3}
          >
            {content}
          </Text>
          {content.length > 160 && (
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              className="mt-2 self-start active:opacity-70"
              accessibilityRole="button"
            >
              <Text className="text-sm font-semibold text-brand">
                {expanded ? 'Show less' : 'Read more'}
              </Text>
            </Pressable>
          )}
          {createdBy ? (
            <Text className="mt-3 text-xs text-navy-muted">Posted by {createdBy}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ── List ──

type AnnouncementListProps = {
  filter?: AnnouncementFilter;
  limit?: number;
};

export function AnnouncementList({ filter = 'all', limit }: AnnouncementListProps) {
  const { announcements, loading, refreshing, error, refresh } = useAnnouncements({
    audience: 'meter_readers',
  });

  const items = announcements.filter(
    (item) => filter === 'all' || item.category === filter,
  );
  const visibleItems = limit ? items.slice(0, limit) : items;

  if (loading) {
    return (
      <View className="gap-4">
        <SkeletonAnnouncementCard />
        <SkeletonAnnouncementCard />
        <SkeletonAnnouncementCard />
      </View>
    );
  }

  if (error) {
    return (
      <View className="items-center rounded-[18px] bg-white px-6 py-10">
        <Text className="text-base font-bold text-navy">Unable to load announcements</Text>
        <Text className="mt-2 max-w-[280px] text-center text-sm leading-5 text-navy-soft">{error}</Text>
        <Pressable
          onPress={() => refresh()}
          className="mt-5 items-center rounded-xl bg-brand px-8 py-3 active:opacity-85"
          accessibilityRole="button"
        >
          <Text className="text-base font-semibold text-white">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <View className="items-center rounded-[18px] bg-white px-6 py-12">
        <Text className="text-xl font-bold text-navy">No announcements yet</Text>
        <Text className="mt-2 max-w-[280px] text-center text-sm leading-5 text-navy-soft">
          {filter === 'all'
            ? 'There are no announcements right now. Check back later for updates.'
            : 'There are no announcements in this category right now.'}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4 pb-2">
      {visibleItems.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          title={announcement.title}
          category={announcement.category}
          priority={announcement.priority}
          date={announcement.created_at}
          content={announcement.content}
          createdBy={
            announcement.creator
              ? `${announcement.creator.first_name} ${announcement.creator.last_name}`
              : null
          }
        />
      ))}
      {refreshing && <Text className="py-2 text-center text-xs text-navy-soft">Refreshing…</Text>}
    </View>
  );
}
