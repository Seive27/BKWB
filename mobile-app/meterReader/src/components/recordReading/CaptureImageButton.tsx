import { Image } from 'expo-image';
import { Pressable, Text } from 'react-native';

type CaptureImageButtonProps = {
  onPress?: () => void;
  label?: string;
};

export function CaptureImageButton({
  onPress,
  label = 'Capture Meter Image',
}: CaptureImageButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-5 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-5 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Image
        source={require('../../../assets/icons/camera.png')}
        style={{ width: 28, height: 28, marginBottom: 6 }}
        contentFit="contain"
      />
      <Text className="text-[15px] font-semibold text-navy">{label}</Text>
    </Pressable>
  );
}
