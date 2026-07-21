import { Image } from 'expo-image';
import { View } from 'react-native';

type CloudStatusIconProps = {
  variant?: 'synced' | 'issue';
  size?: number;
};

export function CloudStatusIcon({
  variant = 'synced',
  size = 26,
}: CloudStatusIconProps) {
  const source =
    variant === 'issue'
      ? require('../../../assets/icons/synch-alert.png')
      : require('../../../assets/icons/cloud-check.png');

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Image source={source} style={{ width: size, height: size }} contentFit="contain" />
    </View>
  );
}
