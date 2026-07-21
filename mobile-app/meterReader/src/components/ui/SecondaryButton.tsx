import { Pressable, Text } from 'react-native';

type SecondaryButtonProps = {
  label: string;
  onPress?: () => void;
};

export function SecondaryButton({ label, onPress }: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="items-center justify-center rounded-2xl border border-slate-200 bg-white py-4 active:opacity-85"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text className="text-base font-semibold text-navy">{label}</Text>
    </Pressable>
  );
}
