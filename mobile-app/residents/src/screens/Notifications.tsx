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

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-2">
          <BackButton onPress={onBack} />
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Notification</Text>
            <Text className="mt-1 text-base text-white/80">
              Stay updated on bills and service alerts
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
          <NotificationList filter={activeFilter} />
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
