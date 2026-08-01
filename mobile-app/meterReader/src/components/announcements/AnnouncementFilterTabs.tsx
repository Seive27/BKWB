import { Pressable, ScrollView, Text } from 'react-native';

import type { AnnouncementCategory } from '@/types/announcements';

export type AnnouncementFilter = 'all' | AnnouncementCategory;

const FILTERS: { id: AnnouncementFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'schedule', label: 'Water Schedule' },
  { id: 'interruption', label: 'Interruptions' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'billing', label: 'Billing' },
  { id: 'general', label: 'General' },
  { id: 'emergency', label: 'Emergency' },
];

type AnnouncementFilterTabsProps = {
  activeFilter: AnnouncementFilter;
  onFilterChange: (filter: AnnouncementFilter) => void;
};

export function AnnouncementFilterTabs({
  activeFilter,
  onFilterChange,
}: AnnouncementFilterTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0 bg-surface"
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
            <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-navy-muted'}`}>
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
