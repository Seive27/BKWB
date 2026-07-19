import { Text, View } from 'react-native';

import type { ReadingStatus } from '@/types/readings';

type StatusBadgeProps = {
  status: ReadingStatus;
};

const styles: Record<
  ReadingStatus,
  { label: string; container: string; text: string }
> = {
  pending: {
    label: 'Pending',
    container: 'bg-pending-soft',
    text: 'text-pending',
  },
  completed: {
    label: 'Completed',
    container: 'bg-completed-soft',
    text: 'text-sync-text',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = styles[status];

  return (
    <View className={`rounded-full px-2.5 py-1 ${style.container}`}>
      <Text className={`text-[11px] font-semibold ${style.text}`}>{style.label}</Text>
    </View>
  );
}
