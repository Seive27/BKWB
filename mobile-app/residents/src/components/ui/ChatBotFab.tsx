import { Image } from 'expo-image';
import { Pressable } from 'react-native';

type ChatBotFabProps = {
  onPress?: () => void;
};

/** Floating chatbot button shown on main tab screens. */
export function ChatBotFab({ onPress }: ChatBotFabProps) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-24 right-5 z-10 h-12 w-12 items-center justify-center rounded-xl bg-brand shadow-md active:bg-brand-dark"
      style={{
        shadowColor: '#1E5B8C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
      }}
      accessibilityRole="button"
      accessibilityLabel="Open chatbot"
    >
      <Image
        source={require('../../../assets/icons/ChatBot_ic.svg')}
        style={{ width: 24, height: 24 }}
        contentFit="contain"
      />
    </Pressable>
  );
}
