import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

type ChatHeaderProps = {
  onBack?: () => void;
  paddingTop: number;
};

export function ChatHeader({ onBack, paddingTop }: ChatHeaderProps) {
  return (
    <View className="bg-brand px-4 pb-4" style={{ paddingTop }}>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onBack}
          className="-ml-1 h-10 w-10 items-center justify-center active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Image
            source={require('../../../assets/Arrow/BackArrow.png')}
            style={{ width: 19, height: 19 }}
            contentFit="contain"
          />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-white">Brgy. Kalunasan Office</Text>
          <Text className="mt-0.5 text-sm text-white/80">Online • Customer Support</Text>
        </View>
      </View>
    </View>
  );
}
