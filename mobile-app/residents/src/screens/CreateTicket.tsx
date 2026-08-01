import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketForm } from '@/components/tickets/TicketForm';
import { Navbar, type NavTab } from '@/components/ui/Navbar';
import type { Ticket, TicketDraft } from '@/types/tickets';

type CreateTicketScreenProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack?: () => void;
  onCreate?: (ticket: Ticket) => void;
  initialReference?: string;
};

function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="-ml-1 h-10 w-10 items-center justify-center active:opacity-70"
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Image
        source={require('../../assets/Arrow/BackArrow.png')}
        style={{ width: 19, height: 19 }}
        contentFit="contain"
      />
    </Pressable>
  );
}

export default function CreateTicketScreen({
  activeTab = 'dashboard',
  onTabPress,
  onBack,
  onCreate,
  initialReference = 'TKT-2026-0001',
}: CreateTicketScreenProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);

  const handleSubmit = (draft: TicketDraft) => {
    const now = new Date();
    const dateLabel = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeLabel = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const ticket: Ticket = {
      id: `tkt-${Date.now()}`,
      reference: initialReference,
      subject: draft.subject,
      category: draft.category,
      status: 'open',
      priority: draft.priority,
      description: draft.description,
      createdAt: dateLabel,
      updatedAt: dateLabel,
      timeline: [
        {
          id: `tkt-${Date.now()}-e1`,
          type: 'submitted',
          title: 'Request Submitted',
          author: 'You',
          timestamp: `${dateLabel} · ${timeLabel}`,
          description: draft.description,
        },
      ],
    };

    onCreate?.(ticket);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-2">
          <BackButton onPress={onBack} />
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Create Ticket</Text>
            <Text className="mt-1 text-base text-white/80">Tell us how we can help</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 pt-5">
          <TicketForm onSubmit={handleSubmit} />
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
