import { useState } from 'react';
import { Image } from 'expo-image';
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
        className="flex-row items-center bg-brand px-5 pb-6"
        style={{ paddingTop: insets.top + 16 }}
      >
        {onBack ? (
          <Pressable
            onPress={onBack}
            className="-ml-1 mr-2 h-10 w-10 items-center justify-center active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Image
              source={require('../../assets/icons/BackArrow.png')}
              style={{ width: 22, height: 22, tintColor: '#FFFFFF' }}
              contentFit="contain"
            />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white">Announcements</Text>
          <Text className="mt-1 text-base text-white/80">Latest updates and service notices</Text>
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
