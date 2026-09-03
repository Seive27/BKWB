import { Text, View } from 'react-native';

import { TICKET_STATUS_LABELS, type TicketStatus } from '@/types/tickets';

const STATUS_STYLES: Record<TicketStatus, { container: string; text: string; border: string }> = {
  open: { container: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  acknowledged: { container: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  assigned: { container: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  scheduled: { container: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  in_progress: { container: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  work_completed: { container: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  resolved: { container: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  closed: { container: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

type StatusBadgeProps = {
  status: TicketStatus;
  size?: 'sm' | 'md';
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status];

  return (
    <View
      className={`rounded-full border ${styles.container} ${styles.border} ${
        size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
      }`}
    >
      <Text className={`${styles.text} font-bold uppercase ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
        {TICKET_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}
