import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { EmptyState } from '@/components/tickets/EmptyState';
import { SkeletonTicketList } from '@/components/tickets/Skeletons';
import { TicketCard } from '@/components/tickets/TicketCard';
import { TicketFilterTabs, type TicketFilter } from '@/components/tickets/TicketFilterTabs';
import { Navbar, type NavTab } from '@/components/ui/Navbar';
import { MOCK_TICKETS } from '@/data/mockTickets';
import CreateTicketScreen from '@/screens/CreateTicket';
import TicketDetailsScreen from '@/screens/TicketDetails';
import type { Ticket } from '@/types/tickets';

type TicketsScreenProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack?: () => void;
};

type TicketView = 'list' | 'create' | 'details';

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

function CreateTicketFab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-24 right-5 z-10 h-12 w-12 items-center justify-center rounded-xl bg-brand shadow-md"
      style={{
        shadowColor: '#1E5B8C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
      }}
      accessibilityLabel="Create new ticket"
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z" fill="#FFFFFF" />
      </Svg>
    </Pressable>
  );
}

/** Generates the next reference number based on existing tickets (mock only). */
function nextReference(tickets: Ticket[]) {
  const base = 100 + tickets.length + 1;
  return `TKT-2026-${String(base).padStart(4, '0')}`;
}

export default function TicketsScreen({
  activeTab = 'dashboard',
  onTabPress,
  onBack,
}: TicketsScreenProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);

  const [view, setView] = useState<TicketView>('list');
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeFilter, setActiveFilter] = useState<TicketFilter>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate a brief initial load so the skeleton state is visible.
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const openDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setView('details');
  };

  const handleCreate = (ticket: Ticket) => {
    setTickets((prev) => [ticket, ...prev]);
    setSelectedTicket(ticket);
    setView('details');
  };

  if (view === 'create') {
    return (
      <CreateTicketScreen
        activeTab={activeTab}
        onTabPress={onTabPress}
        onBack={() => setView('list')}
        onCreate={handleCreate}
        initialReference={nextReference(tickets)}
      />
    );
  }

  if (view === 'details' && selectedTicket) {
    return (
      <TicketDetailsScreen
        ticket={selectedTicket}
        activeTab={activeTab}
        onTabPress={onTabPress}
        onBack={() => setView('list')}
      />
    );
  }

  const filtered =
    activeFilter === 'all' ? tickets : tickets.filter((ticket) => ticket.status === activeFilter);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-2">
          <BackButton onPress={onBack} />
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">My Tickets</Text>
            <Text className="mt-1 text-base text-white/80">Track your service requests</Text>
          </View>
        </View>
      </View>

      <TicketFilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-1">
          {isLoading ? (
            <SkeletonTicketList />
          ) : filtered.length === 0 ? (
            <EmptyState onAction={() => setView('create')} />
          ) : (
            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-slate-800">Service Requests</Text>
                <Text className="rounded-full bg-blue-100 px-4 py-1 text-sm font-bold text-blue-400">
                  {filtered.length} {filtered.length === 1 ? 'TICKET' : 'TICKETS'}
                </Text>
              </View>
              {filtered.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} onPress={openDetails} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <CreateTicketFab onPress={() => setView('create')} />
      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
