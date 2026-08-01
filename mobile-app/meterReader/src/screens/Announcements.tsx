import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AnnouncementFilterTabs,
  type AnnouncementFilter,
} from '@/components/announcements/AnnouncementFilterTabs';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';

type AnnouncementsProps = {
  onBack?: () => void;
};

export default function Announcements({ onBack }: AnnouncementsProps) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<AnnouncementFilter>('all');

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
          <Text className="text-xl font-bold text-white">Announcements</Text>
        </View>
      </View>

      <AnnouncementFilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-1">
          <AnnouncementList filter={activeFilter} />
        </View>
      </ScrollView>
    </View>
  );
}
