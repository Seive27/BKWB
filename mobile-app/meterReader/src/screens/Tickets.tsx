import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketCard } from '@/components/tickets/TicketCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { useReaderTickets } from '@/hooks/useReaderTickets';
import {
  markWorkCompleted,
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
  const [completing, setCompleting] = useState<ReaderTicket | null>(null);
  const [completionText, setCompletionText] = useState('');

  const filtered = tickets.filter((t) =>
    filter === 'active'
      ? ['assigned', 'scheduled', 'in_progress', 'work_completed'].includes(t.status)
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

  const handleMarkWorkCompleted = async () => {
    if (!completing) return;
    if (!completionText.trim()) {
      Alert.alert('Details required', 'Please describe what work was completed.');
      return;
    }
    setBusyId(completing.id);
    try {
      await markWorkCompleted(completing.id, completionText);
      setCompleting(null);
      setCompletionText('');
      await refresh();
    } catch (err) {
      Alert.alert(
        'Could not update',
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
                onMarkWorkCompleted={() => {
                  setCompleting(ticket);
                  setCompletionText('');
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />

      {/* Work completed notes modal */}
      {completing && (
        <View className="absolute inset-0 justify-end bg-black/50">
          <Pressable className="flex-1" onPress={() => setCompleting(null)} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <View className="items-center pt-1">
              <View className="h-1.5 w-12 rounded-full bg-slate-200" />
            </View>
            <Text className="mt-3 text-lg font-bold text-slate-800">Work Completed</Text>
            <Text className="mt-1 text-sm text-slate-400">
              {completing.ticket_number} · {completing.subject}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-slate-500">
              The resident will be asked to confirm that the work is completed before this ticket
              is resolved.
            </Text>
            <TextInput
              value={completionText}
              onChangeText={setCompletionText}
              placeholder="Describe the work that was completed…"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              className="mt-4 min-h-[110px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-800"
              textAlignVertical="top"
            />
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => setCompleting(null)}
                className="flex-1 items-center rounded-xl border border-slate-200 py-3.5 active:bg-slate-50"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-slate-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleMarkWorkCompleted}
                disabled={busyId === completing.id}
                className="flex-1 items-center rounded-xl bg-emerald-600 py-3.5 active:opacity-85 disabled:opacity-50"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-white">
                  {busyId === completing.id ? 'Saving…' : 'Submit'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
