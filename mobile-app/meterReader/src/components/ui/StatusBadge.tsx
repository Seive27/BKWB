import { Text, View } from 'react-native';

import { METER_READING_STATUS_LABELS, type MeterReadingStatus } from '@/types/readings';

type StatusBadgeProps = {
  status: MeterReadingStatus;
};

const styles: Record<MeterReadingStatus, { container: string; text: string }> = {
  assigned: {
    container: 'bg-slate-100',
    text: 'text-navy-soft',
  },
  pending_review: {
    container: 'bg-pending-soft',
    text: 'text-pending',
  },
  approved: {
    container: 'bg-completed-soft',
    text: 'text-sync-text',
  },
  rejected: {
    container: 'bg-alert-soft',
    text: 'text-alert',
  },
  billed: {
    container: 'bg-brand-soft',
    text: 'text-brand',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = styles[status] ?? styles.assigned;

  return (
    <View className={`rounded-full px-2.5 py-1 ${style.container}`}>
      <Text className={`text-[11px] font-semibold ${style.text}`}>
        {METER_READING_STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
}
