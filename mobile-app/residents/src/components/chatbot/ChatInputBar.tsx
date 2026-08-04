import { Image } from 'expo-image';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChatInputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  onGallery?: () => void;
};

export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  onAttach,
  onGallery,
}: ChatInputBarProps) {
  const insets = useSafeAreaInsets();
  const canSend = value.trim().length > 0;

  return (
    <View
      className="flex-row items-center gap-2 border-t border-slate-100 bg-white px-3 pt-2.5"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      <Pressable
        onPress={onAttach}
        className="h-10 w-9 items-center justify-center active:opacity-60"
        accessibilityRole="button"
        accessibilityLabel="Attach file"
      >
        <Image
          source={require('../../../assets/icons/Attachment_ic.svg')}
          style={{ width: 22, height: 26 }}
          contentFit="contain"
        />
      </Pressable>

      <Pressable
        onPress={onGallery}
        className="h-10 w-9 items-center justify-center active:opacity-60"
        accessibilityRole="button"
        accessibilityLabel="Attach photo"
      >
        <Image
          source={require('../../../assets/icons/Gallery_ic.svg')}
          style={{ width: 24, height: 24 }}
          contentFit="contain"
        />
      </Pressable>

      <View className="min-h-[42px] flex-1 justify-center rounded-full bg-slate-100 px-4">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8"
          className="py-2.5 text-base text-slate-800"
          multiline
          maxLength={1000}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={() => {
            if (canSend) onSend();
          }}
        />
      </View>

      <Pressable
        onPress={onSend}
        disabled={!canSend}
        className={`h-11 w-11 items-center justify-center rounded-full ${
          canSend ? 'bg-brand active:bg-brand-dark' : 'bg-brand/40'
        }`}
        accessibilityRole="button"
        accessibilityLabel="Send message"
      >
        <Image
          source={require('../../../assets/icons/Send_ic.svg')}
          style={{ width: 18, height: 15 }}
          contentFit="contain"
        />
      </Pressable>
    </View>
  );
}
