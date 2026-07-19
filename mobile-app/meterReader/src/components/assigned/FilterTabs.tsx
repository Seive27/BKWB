import { Pressable, Text, View } from 'react-native';

import type { ReadingStatus } from '@/types/readings';

export type AssignedFilter = 'all' | ReadingStatus;

type FilterTabsProps = {
  value: AssignedFilter;
  onChange: (filter: AssignedFilter) => void;
};

const FILTERS: { key: AssignedFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
];

export function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <View className="mb-4 flex-row gap-2">
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
