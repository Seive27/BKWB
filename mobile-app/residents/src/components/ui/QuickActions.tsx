import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

type QuickActionsProps = {
  onViewBills?: () => void;
  onWaterSchedule?: () => void;
  onNotifications?: () => void;
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
      className={`items-center justify-center rounded-2xl bg-white px-3 py-4 shadow-sm ${className}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {children}
      <Text className="mt-2 text-center text-sm font-semibold text-slate-700">{label}</Text>
    </Pressable>
  );
}

export function QuickActions({
  onViewBills,
  onWaterSchedule,
  onNotifications,
}: QuickActionsProps) {
  return (
    <View>
      <Text className="mb-3 text-base font-bold text-slate-800">Quick Actions</Text>

      <View className="flex-row gap-3">
        <ActionCard label="View Bills" onPress={onViewBills} className="flex-1">
          <Image
            source={require('../../../assets/QuickActionsIcon/ViewBills.svg')}
            style={{ width: 48, height: 48 }}
            contentFit="contain"
          />
        </ActionCard>
        <ActionCard label="Water Schedule" onPress={onWaterSchedule} className="flex-1">
          <Image
            source={require('../../../assets/QuickActionsIcon/WaterSchedule.svg')}
            style={{ width: 48, height: 48 }}
            contentFit="contain"
          />
        </ActionCard>
      </View>

      <ActionCard label="Notifications" onPress={onNotifications} className="mt-3 w-full">
        <Image
          source={require('../../../assets/QuickActionsIcon/Notifications.svg')}
          style={{ width: 48, height: 48 }}
          contentFit="contain"
        />
      </ActionCard>
    </View>
  );
}
