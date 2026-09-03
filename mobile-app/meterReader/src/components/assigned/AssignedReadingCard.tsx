import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cardShadow } from '@/components/ui/cardShadow';
import type { MeterReading } from '@/types/readings';

type AssignedReadingCardProps = {
  reading: MeterReading;
  onStartReading?: (reading: MeterReading) => void;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function AssignedReadingCard({
  reading,
  onStartReading,
}: AssignedReadingCardProps) {
  const residentName = reading.resident
    ? `${reading.resident.first_name} ${reading.resident.last_name}`.trim()
    : 'Unknown Resident';
  const accountNumber = reading.account?.account_number ?? '—';
  const meterNumber = reading.meter?.meter_number ?? '—';
  const address = reading.account?.service_address ?? 'No address on file';
  const sitio = reading.account?.sitio?.trim() || 'Unassigned Sitio';

  return (
    <View
      className="mb-3 overflow-hidden rounded-2xl bg-white border border-slate-200 p-4"
      style={cardShadow}
    >
      <View className="flex-row items-start justify-between gap-2 mb-2">
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            {residentName}
          </Text>
          <Text className="text-[11px] font-mono text-slate-400">Account #{accountNumber}</Text>
        </View>
        <StatusBadge status={reading.status} />
      </View>

      <View className="my-2.5 rounded-xl bg-slate-50 border border-slate-100 p-3 flex-row items-center justify-between">
        <View>
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Meter Number
          </Text>
          <Text className="text-lg font-extrabold font-mono text-blue-600 mt-0.5">
            {meterNumber}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Sitio
          </Text>
          <View className="mt-0.5 rounded-full bg-slate-200/70 px-2.5 py-0.5">
            <Text className="text-xs font-bold text-slate-700">{sitio}</Text>
          </View>
        </View>
      </View>

      <View className="mb-3 space-y-1">
        <Text className="text-xs text-slate-500" numberOfLines={1}>
          📍 {address}
        </Text>
        <Text className="text-[11px] text-slate-400">
          🕒 Assigned: {formatDate(reading.assignment_date)}
        </Text>
      </View>

      <PrimaryButton
        label="Record Reading"
        onPress={() => onStartReading?.(reading)}
        icon={<Text className="text-sm text-white">▶</Text>}
      />
    </View>
  );
}
