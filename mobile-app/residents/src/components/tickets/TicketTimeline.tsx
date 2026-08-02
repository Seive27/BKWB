import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { TicketTimelineEvent, TicketTimelineEventType } from '@/types/tickets';

const DOT_COLORS: Record<TicketTimelineEventType, string> = {
  created: '#1E5B8C',
  assigned: '#7C3AED',
  status_change: '#F59E0B',
};

/** Resolved/Closed transitions get a distinct emerald dot. */
function dotColor(event: TicketTimelineEvent): string {
  if (event.event_type === 'status_change') {
    const desc = event.description?.toLowerCase() ?? '';
    if (desc.includes('resolved')) return '#10B981';
    if (desc.includes('closed')) return '#94A3B8';
  }
  return DOT_COLORS[event.event_type];
}

function CheckIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TimelineDot({ event }: { event: TicketTimelineEvent }) {
  const color = dotColor(event);

  if (event.event_type === 'status_change' && (event.description?.toLowerCase().includes('resolved') ?? false)) {
    return (
      <View
        className="h-6 w-6 items-center justify-center rounded-full"
        style={{ backgroundColor: color }}
      >
        <CheckIcon />
      </View>
    );
  }

  return (
    <View className="h-6 w-6 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: color }}>
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
    </View>
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dateLabel} · ${timeLabel}`;
}

function eventTitle(event: TicketTimelineEvent): string {
  switch (event.event_type) {
    case 'created':
      return 'Request Submitted';
    case 'assigned':
      return 'Ticket Assigned';
    case 'status_change': {
      const desc = event.description?.toLowerCase() ?? '';
      if (desc.includes('resolved')) return 'Ticket Resolved';
      if (desc.includes('closed')) return 'Ticket Closed';
      return 'Status Updated';
    }
  }
}

function eventAuthor(event: TicketTimelineEvent): string {
  const performer = event.performer;
  if (performer) {
    return `${performer.first_name} ${performer.last_name}`.trim() || 'BKWB Staff';
  }
  return 'BKWB Staff';
}

type TicketTimelineProps = {
  events: TicketTimelineEvent[];
};

/**
 * Chronological ticket history rendered as dots with connecting lines.
 * Backed by the ticket_timeline table (created / assigned / status_change).
 */
export function TicketTimeline({ events }: TicketTimelineProps) {
  if (events.length === 0) {
    return (
      <View className="py-4">
        <Text className="text-sm text-slate-400">No activity recorded yet.</Text>
      </View>
    );
  }

  return (
    <View>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;

        return (
          <View key={event.id} className="flex-row">
            {/* Dot column with connecting line below each dot (except the last) */}
            <View className="w-8 items-center">
              <View className="h-6 items-center justify-center">
                <TimelineDot event={event} />
              </View>
              {!isLast ? <View className="w-0.5 flex-1 bg-slate-200" /> : null}
            </View>

            {/* Event content */}
            <View className={`flex-1 pl-3 ${isLast ? 'pb-0' : 'pb-6'}`}>
              <Text className="text-sm font-bold text-slate-800">
                {eventTitle(event)}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-1.5">
                <Text className="text-xs font-semibold text-brand">
                  {eventAuthor(event)}
                </Text>
                <View className="h-0.5 w-0.5 rounded-full bg-slate-300" />
                <Text className="text-xs text-slate-400">{formatTimestamp(event.created_at)}</Text>
              </View>
              {event.description ? (
                <View className="mt-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <Text className="text-sm leading-5 text-slate-600">{event.description}</Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
