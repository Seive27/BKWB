import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketForm } from '@/components/tickets/TicketForm';
import { Navbar, type NavTab } from '@/components/ui/Navbar';
import { createTicket } from '@/services/ticketService';
import type { Ticket, TicketDraft } from '@/types/tickets';

type CreateTicketScreenProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack?: () => void;
  /** Called with the created ticket (including its DB-generated number). */
  onCreated?: (ticket: Ticket) => void;
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
  onCreated,
}: CreateTicketScreenProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (draft: TicketDraft) => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket(draft);
      Alert.alert(
        'Ticket Submitted',
        `Your ticket ${ticket.ticket_number} has been received. Staff will update you on its progress.`,
        [{ text: 'View Ticket', onPress: () => onCreated?.(ticket) }]
      );
    } catch (error) {
      Alert.alert(
        'Submission failed',
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
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
          <TicketForm onSubmit={handleSubmit} submitting={submitting} />
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
