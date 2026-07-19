import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HistoryReadingCard } from '@/components/history/HistoryReadingCard';
import { SyncDataBanner } from '@/components/history/SyncDataBanner';
import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { CloudStatusIcon } from '@/components/ui/CloudStatusIcon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { MOCK_HISTORY_META, MOCK_HISTORY_READINGS } from '@/data/mockHistory';

type HistoryProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

function HeaderSyncButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel="Sync"
    >
      <Image
        source={require('../../assets/icons/synch.png')}
        style={{ width: 16, height: 16, tintColor: '#5A6F82' }}
        contentFit="contain"
      />
    </Pressable>
  );
}

export default function History({
  activeTab = 'history',
  onTabPress,
}: HistoryProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: navbarHeight + 24,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Reading History"
          subtitle={`Last synced: ${MOCK_HISTORY_META.lastSyncedRelative}`}
          left={<HeaderSyncButton />}
          right={<CloudStatusIcon />}
        />

        <SyncDataBanner
          unsyncedCount={MOCK_HISTORY_META.unsyncedCount}
          lastSyncedAt={MOCK_HISTORY_META.lastSyncedAt}
        />

        {MOCK_HISTORY_READINGS.map((reading) => (
          <HistoryReadingCard key={reading.id} reading={reading} />
        ))}
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
