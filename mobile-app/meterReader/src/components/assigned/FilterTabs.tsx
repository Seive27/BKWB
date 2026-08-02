import { Pressable, Text, View } from 'react-native';

import {
  METER_READING_STATUS_LABELS,
  type MeterReadingStatus,
} from '@/types/readings';

export type ReadingFilter = 'all' | MeterReadingStatus;

type FilterTabsProps = {
  value: ReadingFilter;
  onChange: (filter: ReadingFilter) => void;
};

const FILTERS: { key: ReadingFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'billed', label: 'Billed' },
];

export function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <View className="mb-4 flex-row flex-wrap gap-2">
      {FILTERS.map(({ key, label }) => {
        const isActive = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            className={`rounded-full px-4 py-2 ${
              isActive ? 'bg-brand' : 'border border-slate-200 bg-white'
            }`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              className={`text-[13px] font-semibold ${
                isActive ? 'text-white' : 'text-navy'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
