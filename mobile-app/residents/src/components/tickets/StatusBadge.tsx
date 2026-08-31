import { Text, View } from 'react-native';

import { TICKET_STATUS_LABELS, type TicketStatus } from '@/types/tickets';

const STATUS_STYLES: Record<TicketStatus, { container: string; text: string }> = {
  open: { container: 'bg-blue-100', text: 'text-blue-700' },
  acknowledged: { container: 'bg-sky-100', text: 'text-sky-700' },
  assigned: { container: 'bg-violet-100', text: 'text-violet-700' },
  scheduled: { container: 'bg-purple-100', text: 'text-purple-700' },
  in_progress: { container: 'bg-amber-100', text: 'text-amber-700' },
  work_completed: { container: 'bg-teal-100', text: 'text-teal-700' },
  resolved: { container: 'bg-emerald-100', text: 'text-emerald-700' },
  closed: { container: 'bg-slate-200', text: 'text-slate-600' },
};

type StatusBadgeProps = {
  status: TicketStatus;
  size?: 'sm' | 'md';
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status];

  return (
    <View
      className={`rounded-full ${styles.container} ${
        size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'
      }`}
    >
      <Text className={`${styles.text} font-bold uppercase ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {TICKET_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}
