import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import type { ChatMessage } from '@/types/chatbot';

type ChatMessageBubbleProps = {
  message: ChatMessage;
  showAvatar?: boolean;
  onAttachPhotos?: () => void;
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function ChatMessageBubble({
  message,
  showAvatar = false,
  onAttachPhotos,
}: ChatMessageBubbleProps) {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <View className="mb-4 items-end px-4">
        <View className="max-w-[80%] rounded-2xl rounded-br-md bg-brand px-4 py-3">
          <Text className="text-[15px] leading-5 text-white">{message.text}</Text>
        </View>
        <View className="mt-1.5 flex-row items-center gap-1.5 pr-1">
          <Text className="text-xs text-slate-400">{formatTime(message.createdAt)}</Text>
          {message.seen ? (
            <Text className="text-xs font-medium text-brand">
              <Text className="text-brand">✓✓ </Text>Seen
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View className="mb-4 px-4">
      <View className="flex-row items-end gap-2">
        {showAvatar ? (
          <Image
            source={require('../../../assets/icons/Lunas.png')}
            style={{ width: 32, height: 32, borderRadius: 16 }}
            contentFit="cover"
          />
        ) : (
          <View style={{ width: 32 }} />
        )}
        <View className="max-w-[78%] rounded-2xl rounded-bl-md bg-slate-200 px-4 py-3">
          <Text className="text-[15px] leading-5 text-slate-800">{message.text}</Text>
        </View>
      </View>
      <Text className="ml-10 mt-1.5 text-xs text-slate-400">{formatTime(message.createdAt)}</Text>

      {message.showAttachCard ? (
        <Pressable
          onPress={onAttachPhotos}
          className="ml-10 mt-3 max-w-[85%] flex-row items-center gap-3 rounded-2xl bg-white p-3.5 active:bg-slate-50"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 2,
          }}
          accessibilityRole="button"
          accessibilityLabel="Tap to attach photos"
        >
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-sky-100">
            <Image
              source={require('../../../assets/icons/Gallery_ic.svg')}
              style={{ width: 26, height: 26 }}
              contentFit="contain"
            />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-slate-800">Tap to attach photos</Text>
            <Text className="mt-0.5 text-sm text-slate-500">
              Clear shots of the leak help us prioritize.
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
