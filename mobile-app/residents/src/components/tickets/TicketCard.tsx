import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { PriorityBadge } from '@/components/tickets/PriorityBadge';
import { StatusBadge } from '@/components/tickets/StatusBadge';
import { TICKET_CATEGORY_LABELS, type Ticket } from '@/types/tickets';

type TicketCardProps = {
  ticket: Ticket;
  onPress?: (ticket: Ticket) => void;
};

const STATUS_ACCENT: Record<Ticket['status'], string> = {
  open: 'bg-blue-400',
  acknowledged: 'bg-sky-400',
  assigned: 'bg-violet-400',
  scheduled: 'bg-purple-400',
  in_progress: 'bg-amber-400',
  work_completed: 'bg-teal-400',
  resolved: 'bg-emerald-500',
  closed: 'bg-slate-400',
};

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TicketCard({ ticket, onPress }: TicketCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(ticket)}
      className="active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`${ticket.subject}, ${ticket.status}`}
    >
      <View
        className="overflow-hidden rounded-2xl bg-white"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View className="flex-row">
          <View className={`w-1.5 ${STATUS_ACCENT[ticket.status]}`} />
          <View className="flex-1 px-4 py-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {ticket.ticket_number}
              </Text>
              <Text className="text-xs text-slate-400">{formatShortDate(ticket.created_at)}</Text>
            </View>

            <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
              {ticket.subject}
            </Text>
            <Text className="mt-1 text-sm text-slate-500" numberOfLines={2}>
              {ticket.description}
            </Text>

            <View className="mt-3 flex-row items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <View className="flex-1" />
              <View className="rounded-full bg-slate-100 px-2.5 py-1">
                <Text className="text-xs font-semibold text-slate-600">
                  {TICKET_CATEGORY_LABELS[ticket.category]}
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-end">
              <Text className="text-sm font-semibold text-brand">View Details</Text>
              <Image
                source={require('../../../assets/Arrow/RightArrow.png')}
                style={{ width: 14, height: 14, marginLeft: 4 }}
                contentFit="contain"
              />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
