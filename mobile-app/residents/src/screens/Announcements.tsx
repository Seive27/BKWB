import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AnnouncementFilterTabs,
  type AnnouncementFilter,
} from '@/components/announcements/AnnouncementFilterTabs';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { ChatBotFab } from '@/components/ui/ChatBotFab';
import { Navbar, type NavTab } from '@/components/ui/Navbar';

type AnnouncementsProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onOpenChatBot?: () => void;
  /** Open a specific announcement (e.g. from a notification tap). */
  initialAnnouncementId?: string | null;
  onInitialAnnouncementConsumed?: () => void;
};

export default function Announcements({
  activeTab = 'announcements',
  onTabPress,
  onOpenChatBot,
  initialAnnouncementId = null,
  onInitialAnnouncementConsumed,
}: AnnouncementsProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);
  const [activeFilter, setActiveFilter] = useState<AnnouncementFilter>('all');
  const [pendingAnnouncementId, setPendingAnnouncementId] = useState<string | null>(
    initialAnnouncementId
  );

  // Capture one-shot deep link into local state, then clear the parent so
  // revisiting the tab does not keep reopening the same announcement.
  useEffect(() => {
    if (!initialAnnouncementId) return;
    setPendingAnnouncementId(initialAnnouncementId);
    onInitialAnnouncementConsumed?.();
  }, [initialAnnouncementId, onInitialAnnouncementConsumed]);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-2xl font-bold text-white">Announcements</Text>
        <Text className="mt-1 text-base text-white/80">Latest updates and service notices</Text>
      </View>

      <AnnouncementFilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-1">
          <AnnouncementList
            filter={activeFilter}
            initialAnnouncementId={pendingAnnouncementId}
          />
        </View>
      </ScrollView>

      <ChatBotFab onPress={onOpenChatBot} />
      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
