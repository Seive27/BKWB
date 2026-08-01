import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { TicketEventType, TicketTimelineEvent } from '@/types/tickets';

const DOT_COLORS: Record<TicketEventType, string> = {
  submitted: '#1E5B8C',
  staff_reply: '#F59E0B',
  status_change: '#3B82F6',
  resolved: '#10B981',
};

const TEXT_COLORS: Record<TicketEventType, string> = {
  submitted: 'text-slate-800',
  staff_reply: 'text-slate-800',
  status_change: 'text-slate-800',
  resolved: 'text-emerald-700',
};

function ResolvedCheck() {
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

function TimelineDot({ type }: { type: TicketEventType }) {
  const color = DOT_COLORS[type];

  if (type === 'resolved') {
    return (
      <View
        className="h-6 w-6 items-center justify-center rounded-full"
        style={{ backgroundColor: color }}
      >
        <ResolvedCheck />
      </View>
    );
  }

  return (
    <View className="h-6 w-6 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: color }}>
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
    </View>
  );
}

type TicketTimelineProps = {
  events: TicketTimelineEvent[];
};

/**
 * Chronological ticket history rendered as dots with connecting lines.
 * This is an event log (submitted / staff replied / resolved), not a chat.
 */
export function TicketTimeline({ events }: TicketTimelineProps) {
  return (
    <View>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;

        return (
          <View key={event.id} className="flex-row">
            {/* Dot column with connecting line below each dot (except the last) */}
            <View className="w-8 items-center">
              <View className="h-6 items-center justify-center">
                <TimelineDot type={event.type} />
              </View>
              {!isLast ? <View className="w-0.5 flex-1 bg-slate-200" /> : null}
            </View>

            {/* Event content */}
            <View className={`flex-1 pl-3 ${isLast ? 'pb-0' : 'pb-6'}`}>
              <Text className={`text-sm font-bold ${TEXT_COLORS[event.type]}`}>
                {event.title}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-1.5">
                <Text className="text-xs font-semibold text-brand">{event.author}</Text>
                <View className="h-0.5 w-0.5 rounded-full bg-slate-300" />
                <Text className="text-xs text-slate-400">{event.timestamp}</Text>
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
