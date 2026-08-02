import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PriorityBadge } from '@/components/tickets/PriorityBadge';
import { SkeletonTicketDetails } from '@/components/tickets/Skeletons';
import { StatusBadge } from '@/components/tickets/StatusBadge';
import { TicketTimeline } from '@/components/tickets/TicketTimeline';
import { Navbar, type NavTab } from '@/components/ui/Navbar';
import { useTicketDetails } from '@/hooks/useTicketDetails';
import { TICKET_CATEGORY_LABELS } from '@/types/tickets';

type TicketDetailsScreenProps = {
  ticketId: string;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function staffName(ticket: { assigned_staff?: { first_name: string; last_name: string } | null }): string {
  const s = ticket.assigned_staff;
  if (s) {
    return `${s.first_name} ${s.last_name}`.trim();
  }
  return '';
}

export default function TicketDetailsScreen({
  ticketId,
  activeTab = 'dashboard',
  onTabPress,
  onBack,
}: TicketDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);
  const { ticket, timeline, loading, error, refresh } = useTicketDetails(ticketId);
  // Skeleton only on the very first load — background realtime refreshes
  // (loading flips true while ticket already exists) must not flash it.
  const showSkeleton = loading && !ticket;

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-2">
          <BackButton onPress={onBack} />
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Ticket Details</Text>
            <Text className="mt-1 text-base text-white/80">
              {ticket ? ticket.ticket_number : 'Loading…'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-5">
          {showSkeleton ? (
            <SkeletonTicketDetails />
          ) : error && !ticket ? (
            <View className="items-center px-6 py-14">
              <Text className="text-lg font-bold text-slate-800">Couldn't load ticket</Text>
              <Text className="mt-2 max-w-[280px] text-center text-sm leading-5 text-slate-500">
                {error}
              </Text>
              <Pressable
                onPress={refresh}
                className="mt-6 items-center rounded-xl bg-brand px-8 py-3.5 active:bg-brand-dark"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-white">Try Again</Text>
              </Pressable>
            </View>
          ) : ticket ? (
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
                  Submitted {formatDate(ticket.created_at)} · Updated {formatDate(ticket.updated_at)}
                </Text>

                <View className="mt-4 border-t border-slate-100 pt-4">
                  <Text className="text-sm leading-5 text-slate-600">{ticket.description}</Text>
                </View>

                {staffName(ticket) ? (
                  <View className="mt-4 rounded-xl bg-violet-50 px-4 py-3">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-violet-500">
                      Assigned Staff
                    </Text>
                    <Text className="mt-0.5 text-sm font-semibold text-violet-800">
                      {staffName(ticket)}
                    </Text>
                  </View>
                ) : null}

                {ticket.resolution ? (
                  <View className="mt-4 rounded-xl bg-emerald-50 px-4 py-3">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      Resolution
                    </Text>
                    <Text className="mt-0.5 text-sm leading-5 text-emerald-800">
                      {ticket.resolution}
                    </Text>
                  </View>
                ) : null}
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
                <TicketTimeline events={timeline} />
              </View>

              <View className="items-center py-2">
                <Text className="text-center text-xs leading-5 text-slate-400">
                  You will see updates here automatically when staff respond to this request.
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
