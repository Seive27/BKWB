import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  READER_TICKET_STATUS_LABELS,
  type ReaderTicket,
} from '@/services/ticketService';

const STATUS_STYLES: Record<ReaderTicket['status'], string> = {
  open: 'bg-slate-100 text-slate-600',
  acknowledged: 'bg-sky-100 text-sky-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  scheduled: 'bg-violet-100 text-violet-700',
  in_progress: 'bg-amber-100 text-amber-700',
  work_completed: 'bg-teal-100 text-teal-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-400',
};

const PRIORITY_STYLES: Record<ReaderTicket['priority'], string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-600',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Expandable ticket card: tapping reveals the full details inline (no
 * navigation), per the shared BKWB expandable-list pattern.
 */
export function TicketCard({
  ticket,
  onStartWork,
  onMarkWorkCompleted,
  busy,
}: {
  ticket: ReaderTicket;
  onStartWork: () => void;
  onMarkWorkCompleted: () => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const canStart = ticket.status === 'assigned' || ticket.status === 'scheduled';
  const canComplete = ticket.status === 'scheduled' || ticket.status === 'in_progress';
  const awaitingResident = ticket.status === 'work_completed';

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
        onPress={() => setExpanded((v) => !v)}
        className="flex-row items-center justify-between px-4 py-4"
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ticket ${ticket.ticket_number}`}
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
        </View>
        <View className={`self-start rounded-full px-2.5 py-1 ${STATUS_STYLES[ticket.status]}`}>
          <Text className="text-[10px] font-bold uppercase">
            {READER_TICKET_STATUS_LABELS[ticket.status]}
          </Text>
        </View>
      </Pressable>

      {expanded ? (
        <View className="border-t border-slate-100 px-4 pb-4 pt-3">
          <View className="mb-2 flex-row items-center gap-2">
            <View className={`rounded-full px-2.5 py-1 ${PRIORITY_STYLES[ticket.priority]}`}>
              <Text className="text-[10px] font-bold uppercase">{ticket.priority}</Text>
            </View>
            <Text className="text-[12px] font-semibold text-navy-muted">
              {ticket.category.replace(/_/g, ' ')}
            </Text>
          </View>

          <Text className="text-[13px] leading-5 text-navy-muted">Description</Text>
          <Text className="mt-1 text-[14px] leading-5 text-navy">{ticket.description}</Text>

          {ticket.resolution ? (
            <>
              <Text className="mt-3 text-[13px] leading-5 text-navy-muted">Work Done</Text>
              <Text className="mt-1 text-[14px] leading-5 text-navy">{ticket.resolution}</Text>
            </>
          ) : null}

          {awaitingResident ? (
            <View className="mt-4 rounded-xl bg-teal-50 px-3 py-3">
              <Text className="text-[13px] leading-5 text-teal-800">
                Waiting for the resident to confirm that the work is completed.
              </Text>
            </View>
          ) : null}

          {(canStart || canComplete) && (
            <View className="mt-4 flex-row gap-3">
              {canStart ? (
                <Pressable
                  onPress={onStartWork}
                  disabled={busy}
                  className="flex-1 items-center rounded-xl bg-brand py-3 active:bg-brand-dark disabled:opacity-50"
                  accessibilityRole="button"
                >
                  <Text className="text-sm font-semibold text-white">Ongoing</Text>
                </Pressable>
              ) : null}
              {canComplete ? (
                <Pressable
                  onPress={onMarkWorkCompleted}
                  disabled={busy}
                  className="flex-1 items-center rounded-xl bg-emerald-600 py-3 active:opacity-85 disabled:opacity-50"
                  accessibilityRole="button"
                >
                  <Text className="text-sm font-semibold text-white">Work Completed</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
