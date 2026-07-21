import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${
        disabled ? 'bg-slate-200' : 'bg-brand active:opacity-85'
      }`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      {icon ? <View>{icon}</View> : null}
      <Text
        className={`text-base font-semibold ${
          disabled ? 'text-navy-soft' : 'text-white'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
