import { Pressable, Text, View } from 'react-native';

import {
  READER_TICKET_STATUS_LABELS,
  type ReaderTicket,
} from '@/services/ticketService';

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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Compact ticket summary card. Tapping opens the full Ticket Details page
 * (same pattern as the residents app).
 */
export function TicketCard({
  ticket,
  onPress,
}: {
  ticket: ReaderTicket;
  onPress: () => void;
}) {
  return (
    <View
      className="rounded-[18px] bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-between px-4 py-4"
        accessibilityRole="button"
        accessibilityLabel={`Open ticket ${ticket.ticket_number}`}
      >
        <View className="flex-1 pr-3">
          <Text className="text-[11px] font-semibold tracking-wider text-navy-soft">
            {ticket.ticket_number}
          </Text>
          <Text className="mt-0.5 text-[15px] font-bold text-navy" numberOfLines={2}>
            {ticket.subject}
          </Text>
          {ticket.resident ? (
            <Text className="mt-0.5 text-[12px] text-navy-muted">
              {`${ticket.resident.first_name} ${ticket.resident.last_name}`.trim()} ·{' '}
              {formatDate(ticket.created_at)}
            </Text>
          ) : null}
          {ticket.resident_not_yet_reason ? (
            <Text className="mt-1 text-[12px] font-semibold text-amber-700" numberOfLines={2}>
              Resident: {ticket.resident_not_yet_reason}
            </Text>
          ) : null}
        </View>
        <View className={`self-start rounded-full px-2.5 py-1 ${STATUS_STYLES[ticket.status]}`}>
          <Text className="text-[10px] font-bold uppercase">
            {READER_TICKET_STATUS_LABELS[ticket.status]}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
