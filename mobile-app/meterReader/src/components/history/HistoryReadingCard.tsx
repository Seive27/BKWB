import { Text, View } from 'react-native';

import { HistoryStatusBadge } from '@/components/history/HistoryStatusBadge';
import { cardShadow } from '@/components/ui/cardShadow';
import type { HistoryReading } from '@/types/readings';

type HistoryReadingCardProps = {
  reading: HistoryReading;
};

function formatCubicMeters(value: number) {
  return `${value.toLocaleString('en-US')} m³`;
}

function MetricColumn({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <View className="flex-1 items-center">
      <Text className="mb-1 text-[10px] font-semibold tracking-wide text-navy-soft">
        {label}
      </Text>
      <Text className={`text-[14px] font-bold ${valueClassName}`}>{value}</Text>
    </View>
  );
}

export function HistoryReadingCard({ reading }: HistoryReadingCardProps) {
  const isPending = reading.syncStatus === 'pending';
  const accentClass = isPending ? 'bg-pending' : 'bg-[#7EB8D4]';

  return (
    <View className="mb-3 overflow-hidden rounded-[18px] bg-white" style={cardShadow}>
      <View className={`absolute bottom-0 left-0 top-0 w-1 ${accentClass}`} />

      <View className="px-4 pb-4 pt-4 pl-5">
        <View className="mb-3 flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className="text-[17px] font-bold text-navy" numberOfLines={1}>
              {reading.name}
            </Text>
            <Text className="mt-0.5 text-[13px] text-navy-muted">{reading.recordedAt}</Text>
          </View>
          <HistoryStatusBadge status={reading.syncStatus} />
        </View>

        <View className="flex-row items-center rounded-2xl bg-surface px-2 py-3">
          <MetricColumn
            label="PREVIOUS"
            value={formatCubicMeters(reading.previous)}
            valueClassName="text-navy"
          />
          <MetricColumn
            label="CURRENT"
            value={formatCubicMeters(reading.current)}
            valueClassName="text-navy"
          />
          <MetricColumn
            label="CONSUMPTION"
            value={formatCubicMeters(reading.consumption)}
            valueClassName="text-brand"
          />
        </View>
      </View>
    </View>
  );
}
