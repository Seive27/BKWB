import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketCard } from '@/components/tickets/TicketCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { useReaderTickets } from '@/hooks/useReaderTickets';
import TicketDetails from '@/screens/TicketDetails';

type Filter = 'active' | 'resolved';

type TicketsProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

export default function Tickets({ activeTab = 'tickets', onTabPress }: TicketsProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);
  const { tickets, loading, refreshing, error, refresh } = useReaderTickets();
  const [filter, setFilter] = useState<Filter>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = tickets.filter((t) =>
    filter === 'active'
      ? ['assigned', 'scheduled', 'in_progress', 'work_completed'].includes(t.status)
      : t.status === 'resolved' || t.status === 'closed'
  );

  if (selectedId) {
    return (
      <TicketDetails
        ticketId={selectedId}
        activeTab={activeTab}
        onTabPress={onTabPress}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: navbarHeight + 24,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh()} />}
      >
        <ScreenHeader title="My Tickets" />

        {/* Filter tabs */}
        <View className="mb-3 flex-row rounded-[18px] bg-white p-1">
          {(['active', 'resolved'] as Filter[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              className={`flex-1 items-center rounded-2xl py-2.5 ${
                filter === key ? 'bg-brand' : ''
              }`}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === key }}
            >
              <Text
                className={`text-[12px] font-bold tracking-wide ${
                  filter === key ? 'text-white' : 'text-navy-muted'
                }`}
              >
                {key === 'active' ? 'ACTIVE' : 'RESOLVED'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <Text className="mt-6 text-center text-sm text-navy-muted">Loading tickets…</Text>
        ) : error ? (
          <View className="mt-10 items-center rounded-[18px] bg-white px-6 py-10">
            <Text className="text-base font-bold text-navy">Unable to load tickets</Text>
            <Text className="mt-2 text-center text-sm text-navy-soft">{error}</Text>
            <Pressable
              onPress={() => refresh()}
              className="mt-5 items-center rounded-xl bg-brand px-8 py-3 active:opacity-85"
              accessibilityRole="button"
            >
              <Text className="text-base font-semibold text-white">Try Again</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <Text className="mt-8 text-center text-sm text-navy-muted">
            {filter === 'active'
              ? 'No active tickets. Tickets assigned to you by staff appear here.'
              : 'No resolved tickets yet.'}
          </Text>
        ) : (
          <View className="gap-3">
            {filtered.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onPress={() => setSelectedId(ticket.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
