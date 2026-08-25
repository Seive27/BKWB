import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketCard } from '@/components/tickets/TicketCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { useReaderTickets } from '@/hooks/useReaderTickets';
import {
  resolveMyTicket,
  startTicketWork,
  type ReaderTicket,
} from '@/services/ticketService';

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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<ReaderTicket | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const filtered = tickets.filter((t) =>
    filter === 'active'
      ? ['assigned', 'scheduled', 'in_progress'].includes(t.status)
      : t.status === 'resolved' || t.status === 'closed'
  );

  const handleStartWork = async (ticket: ReaderTicket) => {
    setBusyId(ticket.id);
    try {
      await startTicketWork(ticket.id);
      await refresh();
    } catch (err) {
      Alert.alert(
        'Could not start work',
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = async () => {
    if (!resolving) return;
    if (!resolutionText.trim()) {
      Alert.alert('Resolution required', 'Please describe what was done to resolve the ticket.');
      return;
    }
    setBusyId(resolving.id);
    try {
      await resolveMyTicket(resolving.id, resolutionText);
      setResolving(null);
      setResolutionText('');
      await refresh();
    } catch (err) {
      Alert.alert(
        'Could not resolve',
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setBusyId(null);
    }
  };

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
                busy={busyId === ticket.id}
                onStartWork={() => handleStartWork(ticket)}
                onResolve={() => {
                  setResolving(ticket);
                  setResolutionText('');
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />

      {/* Resolution input modal */}
      {resolving && (
        <View className="absolute inset-0 justify-end bg-black/50">
          <Pressable className="flex-1" onPress={() => setResolving(null)} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <View className="items-center pt-1">
              <View className="h-1.5 w-12 rounded-full bg-slate-200" />
            </View>
            <Text className="mt-3 text-lg font-bold text-slate-800">Resolve Ticket</Text>
            <Text className="mt-1 text-sm text-slate-400">
              {resolving.ticket_number} · {resolving.subject}
            </Text>
            <TextInput
              value={resolutionText}
              onChangeText={setResolutionText}
              placeholder="Describe the corrective action taken…"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              className="mt-4 min-h-[110px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-800"
              textAlignVertical="top"
            />
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => setResolving(null)}
                className="flex-1 items-center rounded-xl border border-slate-200 py-3.5 active:bg-slate-50"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-slate-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleResolve}
                disabled={busyId === resolving.id}
                className="flex-1 items-center rounded-xl bg-emerald-600 py-3.5 active:opacity-85 disabled:opacity-50"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-white">
                  {busyId === resolving.id ? 'Saving…' : 'Mark Resolved'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
