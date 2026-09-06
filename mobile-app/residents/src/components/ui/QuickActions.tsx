import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

type QuickActionsProps = {
  onViewBills?: () => void;
  onWaterSchedule?: () => void;
  onTickets?: () => void;
};

function ActionCard({
  label,
  onPress,
  children,
  className = '',
}: {
  label: string;
  onPress?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`items-center rounded-2xl bg-white py-4 border border-slate-200 active:bg-slate-50 ${className}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
        {children}
      </View>
      <Text className="mt-2.5 text-center text-sm font-bold text-slate-800">{label}</Text>
    </Pressable>
  );
}

export function QuickActions({
  onViewBills,
  onWaterSchedule,
  onTickets,
}: QuickActionsProps) {
  return (
    <View>
      <Text className="mb-2 text-base font-bold text-slate-800">Quick Services</Text>

      <View className="flex-row gap-2.5">
        <ActionCard label="Bills" onPress={onViewBills} className="flex-1">
          <Image
            source={require('../../../assets/QuickActionsIcon/ViewBills.svg')}
            style={{ width: 24, height: 24 }}
            contentFit="contain"
          />
        </ActionCard>
        <ActionCard label="Schedule" onPress={onWaterSchedule} className="flex-1">
          <Image
            source={require('../../../assets/QuickActionsIcon/WaterSchedule.svg')}
            style={{ width: 24, height: 24 }}
            contentFit="contain"
          />
        </ActionCard>
        <ActionCard label="Reports" onPress={onTickets} className="flex-1">
          <Image
            source={require('../../../assets/QuickActionsIcon/Tickets.svg')}
            style={{ width: 24, height: 24 }}
            contentFit="contain"
          />
        </ActionCard>
      </View>
    </View>
  );
}
