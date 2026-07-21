import { Image } from 'expo-image';
import { Pressable, Text } from 'react-native';

type SyncAllButtonProps = {
  onPress?: () => void;
};

export function SyncAllButton({ onPress }: SyncAllButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="max-w-full flex-row items-center gap-1 rounded-full bg-slate-100 px-2 py-1.5 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel="Sync all"
    >
      <Image
        source={require('../../../assets/icons/synch.png')}
        style={{ width: 12, height: 12, tintColor: '#5A6F82' }}
        contentFit="contain"
      />
      <Text
        className="text-[10px] font-semibold tracking-wide text-navy-muted"
        numberOfLines={1}
      >
        SYNC ALL
      </Text>
    </Pressable>
  );
}
