import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { EmptyState } from '@/components/tickets/EmptyState';
import { SkeletonTicketList } from '@/components/tickets/Skeletons';
import { TicketCard } from '@/components/tickets/TicketCard';
import { TicketFilterTabs, type TicketFilter } from '@/components/tickets/TicketFilterTabs';
import { Navbar, type NavTab } from '@/components/ui/Navbar';
import { useTickets } from '@/hooks/useTickets';
import CreateTicketScreen from '@/screens/CreateTicket';
import TicketDetailsScreen from '@/screens/TicketDetails';
import {
  TICKET_CATEGORY_LABELS,
  type Ticket,
  type TicketCategory,
} from '@/types/tickets';

type TicketsScreenProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack?: () => void;
};

type TicketView = 'list' | 'create' | 'details';

type CategoryFilter = 'all' | TicketCategory;

const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Categories' },
  ...(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map((id) => ({
    id,
    label: TICKET_CATEGORY_LABELS[id],
  })),
];

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

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="items-center px-6 py-14">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <Text className="text-2xl">⚠️</Text>
      </View>
      <Text className="mt-4 text-lg font-bold text-slate-800">Couldn't load tickets</Text>
      <Text className="mt-2 max-w-[280px] text-center text-sm leading-5 text-slate-500">
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        className="mt-6 items-center rounded-xl bg-brand px-8 py-3.5 active:bg-brand-dark"
        accessibilityRole="button"
      >
        <Text className="text-base font-semibold text-white">Try Again</Text>
      </Pressable>
    </View>
  );
}

export default function TicketsScreen({
  activeTab = 'dashboard',
  onTabPress,
  onBack,
}: TicketsScreenProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);

  const [view, setView] = useState<TicketView>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<TicketFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const { tickets, loading, refreshing, error, refresh } = useTickets();

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesSearch =
        q.length === 0 ||
        ticket.ticket_number.toLowerCase().includes(q) ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.description.toLowerCase().includes(q);
      const matchesStatus = activeFilter === 'all' || ticket.status === activeFilter;
      const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [tickets, searchQuery, activeFilter, categoryFilter]);

  if (view === 'create') {
    return (
      <CreateTicketScreen
        activeTab={activeTab}
        onTabPress={onTabPress}
        onBack={() => setView('list')}
        onCreated={(ticket: Ticket) => {
          setSelectedId(ticket.id);
          setView('details');
        }}
      />
    );
  }

  if (view === 'details' && selectedId) {
    return (
      <TicketDetailsScreen
        ticketId={selectedId}
        activeTab={activeTab}
        onTabPress={onTabPress}
        onBack={() => setView('list')}
      />
    );
  }

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

        <View className="mt-4 flex-row items-center rounded-xl bg-white/15 px-3.5 py-2.5">
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by ticket no., subject…"
            placeholderTextColor="rgba(255,255,255,0.6)"
            className="ml-2 flex-1 py-0.5 text-[15px] text-white"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      </View>

      <TicketFilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0 bg-slate-50"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
      >
        {CATEGORY_FILTERS.map((filter, index) => {
          const selected = categoryFilter === filter.id;
          const isLast = index === CATEGORY_FILTERS.length - 1;
          return (
            <Pressable
              key={filter.id}
              onPress={() => setCategoryFilter(filter.id)}
              className={`rounded-full px-4 py-2 ${selected ? 'bg-brand' : 'bg-slate-200'}`}
              style={{ marginRight: isLast ? 0 : 8 }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1E5B8C" />
        }
      >
        <View className="px-4 pt-1">
          {loading ? (
            <SkeletonTicketList />
          ) : error ? (
            <ErrorState message={error} onRetry={refresh} />
          ) : filtered.length === 0 ? (
            tickets.length === 0 ? (
              <EmptyState onAction={() => setView('create')} />
            ) : (
              <EmptyState
                title="No Matching Tickets"
                message="No tickets match your current search or filters."
                actionLabel="Clear Filters"
                onAction={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                  setCategoryFilter('all');
                }}
              />
            )
          ) : (
            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-slate-800">Service Requests</Text>
                <Text className="rounded-full bg-blue-100 px-4 py-1 text-sm font-bold text-blue-400">
                  {filtered.length} {filtered.length === 1 ? 'TICKET' : 'TICKETS'}
                </Text>
              </View>
              {filtered.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} onPress={(t) => {
                  setSelectedId(t.id);
                  setView('details');
                }} />
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
