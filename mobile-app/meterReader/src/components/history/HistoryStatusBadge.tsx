import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import type { HistorySyncStatus } from '@/types/readings';

type HistoryStatusBadgeProps = {
  status: HistorySyncStatus;
};

const styles: Record<
  HistorySyncStatus,
  { label: string; container: string; text: string; tint: string; icon: number }
> = {
  pending: {
    label: 'PENDING',
    container: 'bg-pending-soft',
    text: 'text-pending',
    tint: '#C17A3A',
    icon: require('../../../assets/icons/synch-alert.png'),
  },
  synced: {
    label: 'SYNCED',
    container: 'bg-completed-soft',
    text: 'text-sync-text',
    tint: '#1A4A6A',
    icon: require('../../../assets/icons/cloud-check.png'),
  },
};

export function HistoryStatusBadge({ status }: HistoryStatusBadgeProps) {
  const style = styles[status];

  return (
    <View className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${style.container}`}>
      <Image
        source={style.icon}
        style={{ width: 12, height: 12, tintColor: style.tint }}
        contentFit="contain"
      />
      <Text className={`text-[10px] font-semibold tracking-wide ${style.text}`}>
        {style.label}
      </Text>
    </View>
  );
}
