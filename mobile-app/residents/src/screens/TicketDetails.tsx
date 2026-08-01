import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PriorityBadge } from '@/components/tickets/PriorityBadge';
import { SkeletonTicketDetails } from '@/components/tickets/Skeletons';
import { StatusBadge } from '@/components/tickets/StatusBadge';
import { TicketTimeline } from '@/components/tickets/TicketTimeline';
import { Navbar, type NavTab } from '@/components/ui/Navbar';
import { TICKET_CATEGORY_LABELS, type Ticket } from '@/types/tickets';

type TicketDetailsScreenProps = {
  ticket: Ticket;
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack?: () => void;
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

export default function TicketDetailsScreen({
  ticket,
  activeTab = 'dashboard',
  onTabPress,
  onBack,
}: TicketDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate a brief load so the details skeleton is visible.
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-2">
          <BackButton onPress={onBack} />
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Ticket Details</Text>
            <Text className="mt-1 text-base text-white/80">{ticket.reference}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-5">
          {isLoading ? (
            <SkeletonTicketDetails />
          ) : (
            <View className="gap-4">
              {/* Summary card */}
              <View
                className="rounded-2xl bg-white p-5"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View className="flex-row items-center gap-2">
                  <StatusBadge status={ticket.status} size="md" />
                  <PriorityBadge priority={ticket.priority} size="md" />
                  <View className="flex-1" />
                  <View className="rounded-full bg-slate-100 px-3 py-1.5">
                    <Text className="text-xs font-semibold text-slate-600">
                      {TICKET_CATEGORY_LABELS[ticket.category]}
                    </Text>
                  </View>
                </View>

                <Text className="mt-4 text-lg font-bold leading-6 text-slate-800">
                  {ticket.subject}
                </Text>
                <Text className="mt-1 text-xs text-slate-400">
                  Submitted {ticket.createdAt} · Updated {ticket.updatedAt}
                </Text>

                <View className="mt-4 border-t border-slate-100 pt-4">
                  <Text className="text-sm leading-5 text-slate-600">{ticket.description}</Text>
                </View>
              </View>

              {/* Timeline card */}
              <View
                className="rounded-2xl bg-white p-5"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Text className="mb-5 text-base font-bold text-slate-800">Request Timeline</Text>
                <TicketTimeline events={ticket.timeline} />
              </View>

              <View className="items-center py-2">
                <Text className="text-center text-xs leading-5 text-slate-400">
                  You will receive a notification when staff updates this request.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
