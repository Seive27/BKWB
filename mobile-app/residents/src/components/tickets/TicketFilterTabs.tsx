import { Pressable, ScrollView, Text } from 'react-native';

export type TicketFilter = 'all' | 'open' | 'in_progress' | 'resolved';

const FILTERS: { id: TicketFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
];

type TicketFilterTabsProps = {
  activeFilter: TicketFilter;
  onFilterChange: (filter: TicketFilter) => void;
};

export function TicketFilterTabs({ activeFilter, onFilterChange }: TicketFilterTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0 bg-slate-50"
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14 }}
    >
      {FILTERS.map((filter, index) => {
        const selected = activeFilter === filter.id;
        const isLast = index === FILTERS.length - 1;

        return (
          <Pressable
            key={filter.id}
            onPress={() => onFilterChange(filter.id)}
            className={`rounded-full px-4 py-2 ${selected ? 'bg-brand' : 'bg-slate-200'}`}
            style={{ marginRight: isLast ? 0 : 8 }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text
              className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
