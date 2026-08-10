import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cardShadow } from '@/components/ui/cardShadow';
import type { MeterReading } from '@/types/readings';

type AssignedReadingCardProps = {
  reading: MeterReading;
  onStartReading?: (reading: MeterReading) => void;
};

function MetaRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="mb-1.5 flex-row items-center gap-1.5">
      <Text className="text-[13px] text-navy-soft">{icon}</Text>
      <Text className="flex-1 text-[13px] text-navy-muted" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

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

  return (
    <View
      className="mb-3 overflow-hidden rounded-[18px] bg-white"
      style={cardShadow}
    >
      <View className="absolute bottom-0 left-0 top-0 w-1 bg-[#7EB8D4]" />

      <View className="px-4 pb-4 pt-4 pl-5">
        <View className="mb-2 flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-[17px] font-bold text-navy" numberOfLines={1}>
            {residentName}
          </Text>
          <StatusBadge status={reading.status} />
        </View>

        <Text className="mb-2 text-[13px] text-navy-muted"># {accountNumber}</Text>

        <MetaRow icon="🔢" text={`Meter: ${meterNumber}`} />
        <MetaRow
          icon="🏘️"
          text={`Sitio: ${reading.account?.sitio?.trim() || 'Unassigned'}`}
        />
        <MetaRow icon="📍" text={address} />
        <MetaRow icon="🕒" text={`Assigned: ${formatDate(reading.assignment_date)}`} />

        <View className="mt-3">
          <PrimaryButton
            label="Start Reading"
            onPress={() => onStartReading?.(reading)}
            icon={<Text className="text-sm text-white">▶</Text>}
          />
        </View>
      </View>
    </View>
  );
}
