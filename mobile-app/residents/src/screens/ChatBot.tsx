import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatHeader } from '@/components/chatbot/ChatHeader';
import { ChatInputBar } from '@/components/chatbot/ChatInputBar';
import { ChatMessageBubble } from '@/components/chatbot/ChatMessageBubble';
import { RecommendedQuestions } from '@/components/chatbot/RecommendedQuestions';
import {
  DEFAULT_BOT_REPLY,
  FAQ_ITEMS,
  type ChatMessage,
  type FaqItem,
} from '@/types/chatbot';

type ChatBotProps = {
  onBack?: () => void;
};

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function findFaqMatch(text: string): FaqItem | undefined {
  const normalized = text.trim().toLowerCase();
  return FAQ_ITEMS.find(
    (item) =>
      item.question.toLowerCase() === normalized ||
      normalized.includes(item.question.toLowerCase().replace('?', ''))
  );
}

export default function ChatBot({ onBack }: ChatBotProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (!hasMessages) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages, hasMessages]);

  const appendBotReply = useCallback((text: string, showAttachCard?: boolean) => {
    setIsReplying(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev.map((m) => (m.sender === 'user' ? { ...m, seen: true } : m)),
        {
          id: createId(),
          sender: 'bot',
          text,
          createdAt: new Date(),
          showAttachCard,
        },
      ]);
      setIsReplying(false);
    }, 600);
  }, []);

  const sendUserMessage = useCallback(
    (text: string, faq?: FaqItem) => {
      const trimmed = text.trim();
      if (!trimmed || isReplying) return;

      const userMessage: ChatMessage = {
        id: createId(),
        sender: 'user',
        text: trimmed,
        createdAt: new Date(),
        seen: false,
      };

      setMessages((prev) => [...prev, userMessage]);
      setDraft('');

      const matched = faq ?? findFaqMatch(trimmed);
      appendBotReply(matched?.answer ?? DEFAULT_BOT_REPLY, matched?.showAttachCard);
    },
    [appendBotReply, isReplying]
  );

  const handleFaqSelect = (item: FaqItem) => {
    sendUserMessage(item.question, item);
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const count = result.assets.length;
      sendUserMessage(
        count === 1 ? '📷 Photo attached' : `📷 ${count} photos attached`
      );
    }
  };

  const handleAttach = () => {
    Alert.alert('Attach', 'Choose how to attach a file', [
      { text: 'Photo Library', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ChatHeader onBack={onBack} paddingTop={insets.top + 12} />

      {hasMessages ? (
        <FlatList
          ref={listRef}
          className="flex-1"
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View className="mb-5 items-center">
              <View className="rounded-full bg-slate-200 px-4 py-1.5">
                <Text className="text-xs font-semibold tracking-wide text-slate-500">TODAY</Text>
              </View>
            </View>
          }
          renderItem={({ item, index }) => {
            const prev = messages[index - 1];
            const showAvatar = item.sender === 'bot' && prev?.sender !== 'bot';
            return (
              <ChatMessageBubble
                message={item}
                showAvatar={showAvatar}
                onAttachPhotos={pickFromGallery}
              />
            );
          }}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Image
            source={require('../../assets/icons/Lunas.png')}
            style={{ width: 140, height: 140 }}
            contentFit="contain"
          />
          <Text className="mt-5 text-center text-xl font-semibold leading-7 text-slate-900">
            Hi, I am Lunas.{'\n'}How can I help you?
          </Text>
        </View>
      )}

      {!hasMessages ? (
        <RecommendedQuestions items={FAQ_ITEMS} onSelect={handleFaqSelect} />
      ) : null}

      <ChatInputBar
        value={draft}
        onChangeText={setDraft}
        onSend={() => sendUserMessage(draft)}
        onAttach={handleAttach}
        onGallery={pickFromGallery}
      />
    </KeyboardAvoidingView>
  );
}
