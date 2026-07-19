import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { cardShadow } from '@/components/ui/cardShadow';

type SyncDataBannerProps = {
  unsyncedCount: number;
  lastSyncedAt: string;
  onSyncPress?: () => void;
};

export function SyncDataBanner({
  unsyncedCount,
  lastSyncedAt,
  onSyncPress,
}: SyncDataBannerProps) {
  return (
    <View
      className="mb-4 flex-row items-center justify-between gap-3 rounded-[18px]px-4 py-3.5"
    >
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-bold text-navy">
          {unsyncedCount} Unsynced Records
        </Text>
        <Text className="mt-0.5 text-[12px] text-navy-muted">
          Last synced: {lastSyncedAt}
        </Text>
      </View>

      <Pressable
        onPress={onSyncPress}
        className="flex-row items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2.5 active:opacity-85"
        accessibilityRole="button"
        accessibilityLabel="Sync data"
      >
        <Image
          source={require('../../../assets/icons/synch.png')}
          style={{ width: 14, height: 14, tintColor: '#FFFFFF' }}
          contentFit="contain"
        />
        <Text className="text-[13px] font-semibold text-white">Sync Data</Text>
      </Pressable>
    </View>
  );
}
