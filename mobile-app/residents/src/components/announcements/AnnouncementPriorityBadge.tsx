import { Text, View } from 'react-native';

import {
  ANNOUNCEMENT_PRIORITY_LABELS,
  type AnnouncementPriority,
} from '@/types/announcements';

const PRIORITY_STYLES: Record<
  AnnouncementPriority,
  { container: string; text: string; dot: string }
> = {
  normal: { container: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-700' },
  important: { container: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-700' },
  emergency: { container: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-600' },
};

type AnnouncementPriorityBadgeProps = {
  priority: AnnouncementPriority;
  size?: 'sm' | 'md';
};

export function AnnouncementPriorityBadge({
  priority,
  size = 'sm',
}: AnnouncementPriorityBadgeProps) {
  const styles = PRIORITY_STYLES[priority];

  return (
    <View
      className={`flex-row items-center gap-1 rounded-full ${styles.container} ${
        size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'
      }`}
    >
      <View className={`rounded-full ${styles.dot} ${size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'}`} />
      <Text
        className={`${styles.text} font-bold uppercase ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
      >
        {ANNOUNCEMENT_PRIORITY_LABELS[priority]}
      </Text>
    </View>
  );
}
