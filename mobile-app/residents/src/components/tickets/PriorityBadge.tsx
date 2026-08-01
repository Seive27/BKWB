import { Text, View } from 'react-native';

import { TICKET_PRIORITY_LABELS, type TicketPriority } from '@/types/tickets';

const PRIORITY_STYLES: Record<
  TicketPriority,
  { container: string; text: string; dot: string }
> = {
  low: { container: 'bg-slate-200', text: 'text-slate-600', dot: 'bg-slate-600' },
  medium: { container: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-700' },
  high: { container: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-600' },
};

type PriorityBadgeProps = {
  priority: TicketPriority;
  size?: 'sm' | 'md';
};

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const styles = PRIORITY_STYLES[priority];

  return (      <View className={`flex-row items-center gap-1 rounded-full ${styles.container} ${
        size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'
      }`}>
        <View className={`rounded-full ${styles.dot} ${size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'}`} />
      <Text
        className={`${styles.text} font-bold uppercase ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
      >
        {TICKET_PRIORITY_LABELS[priority]}
      </Text>
    </View>
  );
}
