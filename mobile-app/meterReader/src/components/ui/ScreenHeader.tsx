import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
};

export function ScreenHeader({ title, subtitle, left, right }: ScreenHeaderProps) {
  return (
    <View className={`relative mb-5 justify-center py-1 ${subtitle ? 'min-h-[56px]' : 'min-h-[48px]'}`}>
      <View
        className="absolute left-0 right-0 items-center"
        pointerEvents="none"
      >
        <Text
          className="text-center text-[20px] font-bold leading-6 text-navy"
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-center text-[12px] text-navy-soft" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View className="z-10 flex-row items-center justify-between">
        <View className="items-start">{left}</View>
        <View className="items-end">{right}</View>
      </View>
    </View>
  );
}
