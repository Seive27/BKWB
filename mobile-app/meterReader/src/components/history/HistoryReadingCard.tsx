import { Text, View } from 'react-native';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { cardShadow } from '@/components/ui/cardShadow';
import type { MeterReading } from '@/types/readings';

type HistoryReadingCardProps = {
  reading: MeterReading;
};

function formatCubicMeters(value: number | null) {
  return `${(value ?? 0).toLocaleString('en-US')} m³`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
  const residentName = reading.resident
    ? `${reading.resident.first_name} ${reading.resident.last_name}`.trim()
    : 'Unknown Resident';
  const isRejected = reading.status === 'rejected';

  return (
    <View className="mb-3 overflow-hidden rounded-[18px] bg-white" style={cardShadow}>
      <View
        className={`absolute bottom-0 left-0 top-0 w-1 ${
          isRejected ? 'bg-alert' : 'bg-[#7EB8D4]'
        }`}
      />

      <View className="px-4 pb-4 pt-4 pl-5">
        <View className="mb-3 flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className="text-[17px] font-bold text-navy" numberOfLines={1}>
              {residentName}
            </Text>
            <Text className="mt-0.5 text-[13px] text-navy-muted">
              {formatDate(reading.reading_date)} · {reading.account?.account_number ?? '—'}
            </Text>
          </View>
          <StatusBadge status={reading.status} />
        </View>

        <View className="flex-row items-center rounded-2xl bg-surface px-2 py-3">
          <MetricColumn
            label="PREVIOUS"
            value={formatCubicMeters(reading.previous_reading)}
            valueClassName="text-navy"
          />
          <MetricColumn
            label="CURRENT"
            value={formatCubicMeters(reading.current_reading)}
            valueClassName="text-navy"
          />
          <MetricColumn
            label="CONSUMPTION"
            value={formatCubicMeters(reading.consumption)}
            valueClassName="text-brand"
          />
        </View>

        {isRejected && reading.rejection_reason ? (
          <View className="mt-3 rounded-2xl bg-alert-soft px-4 py-3">
            <Text className="text-[12px] font-semibold text-alert">
              Rejection reason
            </Text>
            <Text className="mt-0.5 text-[13px] leading-5 text-alert-muted">
              {reading.rejection_reason}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
