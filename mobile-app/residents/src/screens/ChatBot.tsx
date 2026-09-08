import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDialog } from '@/components/ui/AppDialog';
import { ChatHeader } from '@/components/chatbot/ChatHeader';
import { ChatInputBar } from '@/components/chatbot/ChatInputBar';
import { ChatMessageBubble } from '@/components/chatbot/ChatMessageBubble';
import { RecommendedQuestions } from '@/components/chatbot/RecommendedQuestions';
import {
  askLunas,
  historyFromMessages,
  offlineLunasReply,
} from '@/services/lunasService';
import {
  FAQ_ITEMS,
  type ChatMessage,
  type FaqItem,
  type LunasAction,
  type LunasNavigateScreen,
} from '@/types/chatbot';

export type ChatBotDeepLink = 'tickets' | 'waterSchedule' | 'createTicket' | null;

type ChatBotProps = {
  onBack?: () => void;
  /** Navigate out of chat into app surfaces (bills tab, tickets, etc.). */
  onNavigate?: (screen: LunasNavigateScreen, params?: Record<string, string>) => void;
};

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChatBot({ onBack, onNavigate }: ChatBotProps) {
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
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

  const appendBotMessage = useCallback(
    (payload: {
      text: string;
      showAttachCard?: boolean;
      actions?: LunasAction[];
      suggestions?: string[];
    }) => {
      setMessages((prev) => [
        ...prev.map((m) => (m.sender === 'user' ? { ...m, seen: true } : m)),
        {
          id: createId(),
          sender: 'bot',
          text: payload.text,
          createdAt: new Date(),
          showAttachCard: payload.showAttachCard,
          actions: payload.actions,
          suggestions: payload.suggestions,
        },
      ]);
    },
    [],
  );

  const sendUserMessage = useCallback(
    async (text: string, faq?: FaqItem) => {
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
      setIsReplying(true);

      const history = historyFromMessages([...messages, userMessage]);

      try {
        const reply = await askLunas({ message: trimmed, history });
        appendBotMessage({
          text: reply.message,
          showAttachCard: faq?.showAttachCard,
          actions: reply.actions,
          suggestions: reply.suggestions,
        });
      } catch (error) {
        console.warn('[Lunas] falling back to offline FAQ:', error);
        const offline = offlineLunasReply(trimmed);
        appendBotMessage({
          text: offline.message,
          showAttachCard: faq?.showAttachCard ?? offline.actions?.some((a) => a.screen === 'CreateTicket'),
          actions: offline.actions,
          suggestions: offline.suggestions,
        });
      } finally {
        setIsReplying(false);
      }
    },
    [appendBotMessage, isReplying, messages],
  );

  const handleFaqSelect = (item: FaqItem) => {
    void sendUserMessage(item.question, item);
  };

  const handleAction = (action: LunasAction) => {
    if (action.type === 'navigate' || action.type === 'create_ticket') {
      const screen = (action.screen ??
        (action.type === 'create_ticket' ? 'CreateTicket' : undefined)) as
        | LunasNavigateScreen
        | undefined;
      if (screen && onNavigate) {
        onNavigate(screen, action.params);
        return;
      }
    }
    dialog.alert('Open in app', `Use ${action.label} from the main screens.`, { tone: 'info' });
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      dialog.alert(
        'Permission Needed',
        'Please allow photo library access to attach images.',
        { tone: 'warning' },
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const count = result.assets.length;
      void sendUserMessage(
        count === 1 ? '📷 Photo attached' : `📷 ${count} photos attached`,
      );
    }
  };

  const handleAttach = () => {
    dialog.actionSheet({
      title: 'Attach',
      message: 'Choose how to attach a file.',
      options: [
        { label: 'Photo Library', onPress: () => { void pickFromGallery(); } },
      ],
    });
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
          ListFooterComponent={
            isReplying ? (
              <View className="mb-4 flex-row items-center gap-2 px-4 pl-14">
                <ActivityIndicator size="small" color="#0ea5e9" />
                <Text className="text-sm text-slate-500">Lunas is thinking…</Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const prev = messages[index - 1];
            const showAvatar = item.sender === 'bot' && prev?.sender !== 'bot';
            return (
              <ChatMessageBubble
                message={item}
                showAvatar={showAvatar}
                onAttachPhotos={pickFromGallery}
                onAction={handleAction}
                onSuggestion={(text) => {
                  void sendUserMessage(text);
                }}
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
          <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
            Ask about your bill, tickets, or announcements.
          </Text>
        </View>
      )}

      {!hasMessages ? (
        <RecommendedQuestions items={FAQ_ITEMS} onSelect={handleFaqSelect} />
      ) : null}

      <ChatInputBar
        value={draft}
        onChangeText={setDraft}
        onSend={() => {
          void sendUserMessage(draft);
        }}
        onAttach={handleAttach}
        onGallery={pickFromGallery}
      />
    </KeyboardAvoidingView>
  );
}
