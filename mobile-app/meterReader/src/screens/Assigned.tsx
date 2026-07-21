import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssignedReadingCard } from '@/components/assigned/AssignedReadingCard';
import { FilterTabs, type AssignedFilter } from '@/components/assigned/FilterTabs';
import { SearchBar } from '@/components/assigned/SearchBar';
import { SyncAllButton } from '@/components/assigned/SyncAllButton';
import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { CloudStatusIcon } from '@/components/ui/CloudStatusIcon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { MOCK_ASSIGNED_READINGS } from '@/data/mockAssigned';
import RecordReading from '@/screens/RecordReading';
import type { AssignedReading } from '@/types/readings';

type AssignedProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

export default function Assigned({
  activeTab = 'assigned',
  onTabPress,
}: AssignedProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<AssignedFilter>('all');
  const [activeReading, setActiveReading] = useState<AssignedReading | null>(null);

  const filteredReadings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return MOCK_ASSIGNED_READINGS.filter((reading) => {
      const matchesFilter = filter === 'all' || reading.status === filter;
      if (!matchesFilter) return false;
      if (!query) return true;

      return (
        reading.name.toLowerCase().includes(query) ||
        reading.accountNo.toLowerCase().includes(query) ||
        reading.areaRoute.toLowerCase().includes(query)
      );
    });
  }, [filter, searchQuery]);

  if (activeReading) {
    return (
      <RecordReading
        reading={activeReading}
        activeTab={activeTab}
        onTabPress={onTabPress}
        onBack={() => setActiveReading(null)}
      />
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: navbarHeight + 24,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Assigned Readings"
          left={<SyncAllButton />}
          right={<CloudStatusIcon />}
        />

        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        <FilterTabs value={filter} onChange={setFilter} />

        {filteredReadings.length === 0 ? (
          <View className="mt-10 items-center px-6">
            <Text className="text-center text-[15px] text-navy-muted">
              No assigned readings match your search.
            </Text>
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setFilter('all'); 
              }}
              className="mt-3"
              accessibilityRole="button"
            >
              <Text className="text-[14px] font-semibold text-brand">Clear filters</Text>
            </Pressable>
          </View>
        ) : (
          filteredReadings.map((reading) => (
            <AssignedReadingCard
              key={reading.id}
              reading={reading}
              onStartReading={setActiveReading}
            />
          ))
        )}
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
