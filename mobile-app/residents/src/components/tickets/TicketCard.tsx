import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { PriorityBadge } from '@/components/tickets/PriorityBadge';
import { StatusBadge } from '@/components/tickets/StatusBadge';
import { TICKET_CATEGORY_LABELS, type Ticket } from '@/types/tickets';

type TicketCardProps = {
  ticket: Ticket;
  onPress?: (ticket: Ticket) => void;
};

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
          <View className={`w-1.5 ${ticket.status === 'open' ? 'bg-blue-400' : ticket.status === 'in_progress' ? 'bg-amber-400' : 'bg-emerald-500'}`} />
          <View className="flex-1 px-4 py-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {ticket.reference}
              </Text>
              <Text className="text-xs text-slate-400">{ticket.updatedAt}</Text>
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
