import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { useReaderTickets } from '@/hooks/useReaderTickets';
import {
  markWorkCompleted,
  READER_TICKET_STATUS_LABELS,
  startTicketWork,
  type ReaderTicket,
} from '@/services/ticketService';

type TicketDetailsProps = {
  ticketId: string;
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack?: () => void;
};

const STATUS_STYLES: Record<ReaderTicket['status'], string> = {
  open: 'bg-amber-100 text-amber-700',
  acknowledged: 'bg-slate-100 text-slate-500',
  assigned: 'bg-brand-100 text-brand-700',
  scheduled: 'bg-brand-100 text-brand-700',
  in_progress: 'bg-brand-100 text-brand-700',
  work_completed: 'bg-emerald-100 text-emerald-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-400',
};

const PRIORITY_STYLES: Record<ReaderTicket['priority'], string> = {
  low: 'bg-slate-100 text-slate-500',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-600',
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

/**
 * Full-screen ticket details for meter readers — same page pattern as the
 * residents Ticket Details screen (no popup modal).
 */
export default function TicketDetails({
  ticketId,
  activeTab = 'tickets',
  onTabPress,
  onBack,
}: TicketDetailsProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);
  const { tickets, loading, refreshing, error, refresh } = useReaderTickets();
  const [busy, setBusy] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionText, setCompletionText] = useState('');

  const ticket = useMemo(
    () => tickets.find((t) => t.id === ticketId) ?? null,
    [tickets, ticketId]
  );

  const canStart = ticket?.status === 'assigned' || ticket?.status === 'scheduled';
  const canComplete = ticket?.status === 'scheduled' || ticket?.status === 'in_progress';
  const awaitingResident = ticket?.status === 'work_completed';
  const residentName = ticket?.resident
    ? `${ticket.resident.first_name} ${ticket.resident.last_name}`.trim()
    : null;

  const handleStartWork = async () => {
    if (!ticket) return;
    setBusy(true);
    try {
      await startTicketWork(ticket.id);
      await refresh();
    } catch (err) {
      Alert.alert(
        'Could not start work',
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleMarkWorkCompleted = async () => {
    if (!ticket) return;
    if (!completionText.trim()) {
      Alert.alert('Details required', 'Please describe what work was completed.');
      return;
    }
    setBusy(true);
    try {
      await markWorkCompleted(ticket.id, completionText);
      setCompleting(false);
      setCompletionText('');
      await refresh();
    } catch (err) {
      Alert.alert(
        'Could not update',
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
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
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh()} />}
      >
        <View className="px-4 pt-5">
          {loading && !ticket ? (
            <Text className="mt-6 text-center text-sm text-navy-muted">Loading ticket…</Text>
          ) : error && !ticket ? (
            <View className="mt-10 items-center rounded-[18px] bg-white px-6 py-10">
              <Text className="text-base font-bold text-navy">Unable to load ticket</Text>
              <Text className="mt-2 text-center text-sm text-navy-soft">{error}</Text>
              <Pressable
                onPress={() => refresh()}
                className="mt-5 items-center rounded-xl bg-brand px-8 py-3 active:opacity-85"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-white">Try Again</Text>
              </Pressable>
            </View>
          ) : !ticket ? (
            <View className="mt-10 items-center rounded-[18px] bg-white px-6 py-10">
              <Text className="text-base font-bold text-navy">Ticket not found</Text>
              <Text className="mt-2 text-center text-sm text-navy-soft">
                This ticket may have been reassigned or removed.
              </Text>
              <Pressable
                onPress={onBack}
                className="mt-5 items-center rounded-xl bg-brand px-8 py-3 active:opacity-85"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-white">Back to Tickets</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-4">
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
                <View className="flex-row flex-wrap items-center gap-2">
                  <View className={`rounded-full px-2.5 py-1 ${STATUS_STYLES[ticket.status]}`}>
                    <Text className="text-[10px] font-bold uppercase">
                      {READER_TICKET_STATUS_LABELS[ticket.status]}
                    </Text>
                  </View>
                  <View className={`rounded-full px-2.5 py-1 ${PRIORITY_STYLES[ticket.priority]}`}>
                    <Text className="text-[10px] font-bold uppercase">{ticket.priority}</Text>
                  </View>
                  <View className="rounded-full bg-slate-100 px-3 py-1.5">
                    <Text className="text-xs font-semibold capitalize text-slate-600">
                      {ticket.category.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                <Text className="mt-4 text-lg font-bold leading-6 text-navy">{ticket.subject}</Text>
                <Text className="mt-1 text-xs text-navy-muted">
                  {residentName ? `${residentName} · ` : ''}
                  Submitted {formatDate(ticket.created_at)}
                </Text>

                <View className="mt-4 border-t border-slate-100 pt-4">
                  <Text className="text-[13px] font-semibold text-navy-muted">Description</Text>
                  <Text className="mt-1 text-[15px] leading-6 text-navy">{ticket.description}</Text>
                </View>

                {ticket.resolution ? (
                  <View className="mt-4 rounded-xl bg-emerald-50 px-4 py-3">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      {awaitingResident ? 'Work Reported Done' : 'Work Done'}
                    </Text>
                    <Text className="mt-0.5 text-sm leading-5 text-emerald-800">
                      {ticket.resolution}
                    </Text>
                  </View>
                ) : null}
              </View>

              {ticket.resident_not_yet_reason ? (
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
                  <Text className="text-base font-bold text-navy">Resident Feedback</Text>
                  <Text className="mt-1 text-sm leading-5 text-navy-muted">
                    The resident said the work is not completed yet.
                  </Text>
                  <View className="mt-3 overflow-hidden rounded-xl bg-amber-50">
                    <ScrollView
                      style={{ maxHeight: 180 }}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      bounces={false}
                    >
                      <View className="px-3 py-3">
                        <Text className="text-[14px] leading-5 text-amber-900">
                          {ticket.resident_not_yet_reason}
                        </Text>
                      </View>
                    </ScrollView>
                  </View>
                </View>
              ) : null}

              {awaitingResident ? (
                <View className="rounded-xl bg-emerald-50 px-4 py-3">
                  <Text className="text-[13px] leading-5 text-emerald-800">
                    Waiting for the resident to confirm that the work is completed.
                  </Text>
                </View>
              ) : null}

              {(canStart || canComplete) && (
                <View className="flex-row gap-3">
                  {canStart ? (
                    <Pressable
                      onPress={handleStartWork}
                      disabled={busy}
                      className="flex-1 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark disabled:opacity-50"
                      accessibilityRole="button"
                    >
                      <Text className="text-base font-semibold text-white">
                        {busy ? 'Saving…' : 'Ongoing'}
                      </Text>
                    </Pressable>
                  ) : null}
                  {canComplete ? (
                    <Pressable
                      onPress={() => {
                        setCompletionText('');
                        setCompleting(true);
                      }}
                      disabled={busy}
                      className="flex-1 items-center rounded-xl bg-emerald-600 py-3.5 active:opacity-85 disabled:opacity-50"
                      accessibilityRole="button"
                    >
                      <Text className="text-base font-semibold text-white">Work Completed</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />

      {completing && ticket ? (
        <View className="absolute inset-0 justify-end bg-black/50">
          <Pressable
            className="flex-1"
            onPress={() => {
              if (!busy) setCompleting(false);
            }}
          />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              className="rounded-t-3xl bg-white px-5 pt-4"
              style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
            >
              <View className="items-center pt-1">
                <View className="h-1.5 w-12 rounded-full bg-slate-200" />
              </View>
              <Text className="mt-3 text-lg font-bold text-slate-800">Work Completed</Text>
              <Text className="mt-1 text-sm text-slate-400">
                {ticket.ticket_number} · {ticket.subject}
              </Text>
              <Text className="mt-2 text-sm leading-5 text-slate-500">
                The resident will be asked to confirm that the work is completed before this ticket
                is resolved.
              </Text>
              <TextInput
                value={completionText}
                onChangeText={setCompletionText}
                placeholder="Describe the work that was completed…"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                className="mt-4 min-h-[110px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-800"
                textAlignVertical="top"
                editable={!busy}
              />
              <View className="mt-4 flex-row gap-3">
                <Pressable
                  onPress={() => setCompleting(false)}
                  disabled={busy}
                  className="flex-1 items-center rounded-xl border border-slate-200 py-3.5 active:bg-slate-50 disabled:opacity-50"
                  accessibilityRole="button"
                >
                  <Text className="text-base font-semibold text-slate-600">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleMarkWorkCompleted}
                  disabled={busy}
                  className="flex-1 items-center rounded-xl bg-emerald-600 py-3.5 active:opacity-85 disabled:opacity-50"
                  accessibilityRole="button"
                >
                  <Text className="text-base font-semibold text-white">
                    {busy ? 'Saving…' : 'Submit'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : null}
    </View>
  );
}
