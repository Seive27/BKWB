import { Text, View } from 'react-native';

import { cardShadow } from '@/components/ui/cardShadow';
import type { AssignedReading } from '@/types/readings';

type ResidentInfoCardProps = {
  reading: AssignedReading;
};

function formatCubicMeters(value: number) {
  return `${value.toLocaleString()} m³`;
}

export function ResidentInfoCard({ reading }: ResidentInfoCardProps) {
  return (
    <View className="mb-4 rounded-[18px] bg-white p-4" style={cardShadow}>
      <View className="mb-3.5 flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-200">
          <Text className="text-xl text-navy-muted">👤</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[17px] font-bold text-navy" numberOfLines={1}>
            {reading.name}
          </Text>
          <Text className="mt-0.5 text-[13px] text-navy-muted">
            Route: {reading.areaRoute}
          </Text>
        </View>
      </View>

      <View className="flex-row rounded-2xl bg-surface px-4 py-3.5">
        <View className="flex-1">
          <Text className="mb-1 text-[10px] font-semibold tracking-wide text-navy-soft">
            ACCOUNT NO.
          </Text>
          <Text className="text-[15px] font-bold text-navy">{reading.accountNo}</Text>
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-[10px] font-semibold tracking-wide text-navy-soft">
            PREVIOUS READING
          </Text>
          <Text className="text-[15px] font-bold text-brand">
            {formatCubicMeters(reading.previousReading)}
          </Text>
        </View>
      </View>
    </View>
  );
}
