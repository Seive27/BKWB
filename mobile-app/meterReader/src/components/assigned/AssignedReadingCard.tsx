import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cardShadow } from '@/components/ui/cardShadow';
import type { AssignedReading } from '@/types/readings';

type AssignedReadingCardProps = {
  reading: AssignedReading;
  onStartReading?: (reading: AssignedReading) => void;
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

export function AssignedReadingCard({
  reading,
  onStartReading,
}: AssignedReadingCardProps) {
  const isPending = reading.status === 'pending';
  const accentClass = isPending ? 'bg-pending' : 'bg-[#7EB8D4]';

  return (
    <View
      className="mb-3 overflow-hidden rounded-[18px] bg-white"
      style={cardShadow}
    >
      <View className={`absolute bottom-0 left-0 top-0 w-1 ${accentClass}`} />

      <View className="px-4 pb-4 pt-4 pl-5">
        <View className="mb-2 flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-[17px] font-bold text-navy" numberOfLines={1}>
            {reading.name}
          </Text>
          <StatusBadge status={reading.status} />
        </View>

        <Text className="mb-2 text-[13px] text-navy-muted"># {reading.accountNo}</Text>

        <MetaRow icon="📍" text={`Area/Route: ${reading.areaRoute}`} />
        <MetaRow icon="🕒" text={`Last reading: ${reading.lastReadingDate}`} />

        <View className="mt-3">
          {isPending ? (
            <PrimaryButton
              label="Start Reading"
              onPress={() => onStartReading?.(reading)}
              icon={<Text className="text-sm text-white">▶</Text>}
            />
          ) : (
            <PrimaryButton
              label="Reading Completed"
              disabled
              icon={
                <View className="h-5 w-5 items-center justify-center rounded-full border border-navy-soft">
                  <Text className="text-[10px] font-bold text-navy-soft">✓</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}
