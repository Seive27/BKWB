import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FilterTabs,
  type ReadingFilter,
} from '@/components/assigned/FilterTabs';
import { SearchBar } from '@/components/assigned/SearchBar';
import { HistoryReadingCard } from '@/components/history/HistoryReadingCard';
import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { CloudStatusIcon } from '@/components/ui/CloudStatusIcon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useReadingHistory } from '@/hooks/useReadingHistory';

type HistoryProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

function SkeletonCard() {
  return (
    <View className="mb-3 overflow-hidden rounded-[18px] bg-white p-4">
      <View className="mb-3 h-5 w-2/3 rounded bg-slate-200" />
      <View className="mb-3 h-14 rounded-2xl bg-slate-200" />
    </View>
  );
}

export default function History({
  activeTab = 'history',
  onTabPress,
}: HistoryProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);

  const { readings, loading, refreshing, error, refresh } = useReadingHistory();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ReadingFilter>('all');

  const filteredReadings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return readings.filter((reading) => {
      if (filter !== 'all' && reading.status !== filter) return false;
      if (!query) return true;

      const name = reading.resident
        ? `${reading.resident.first_name} ${reading.resident.last_name}`.toLowerCase()
        : '';
      const account = (reading.account?.account_number ?? '').toLowerCase();
      const meter = (reading.meter?.meter_number ?? '').toLowerCase();
      return (
        name.includes(query) ||
        account.includes(query) ||
        meter.includes(query)
      );
    });
  }, [filter, readings, searchQuery]);

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: navbarHeight + 24,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => refresh()} />
        }
      >
        <ScreenHeader
          title="Reading History"
          left={
            <Pressable
              onPress={() => refresh()}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Refresh"
            >
              <Text className="text-sm font-bold text-navy-soft">⟳</Text>
            </Pressable>
          }
          right={<CloudStatusIcon />}
        />

        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        <FilterTabs value={filter} onChange={setFilter} />

        {loading ? (
          <View>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : error ? (
          <View className="mt-6 items-center rounded-[18px] bg-white px-6 py-10">
            <Text className="text-base font-bold text-navy">Unable to load history</Text>
            <Text className="mt-2 max-w-[280px] text-center text-sm leading-5 text-navy-soft">
              {error}
            </Text>
            <Pressable
              onPress={() => refresh()}
              className="mt-5 items-center rounded-xl bg-brand px-8 py-3 active:opacity-85"
              accessibilityRole="button"
            >
              <Text className="text-base font-semibold text-white">Try Again</Text>
            </Pressable>
          </View>
        ) : filteredReadings.length === 0 ? (
          <View className="mt-10 items-center px-6">
            <Text className="text-center text-[15px] text-navy-muted">
              {filter !== 'all' || searchQuery.trim()
                ? 'No readings match your filters.'
                : 'No submitted readings yet. Your history will appear here.'}
            </Text>
            {filter !== 'all' || searchQuery.trim() ? (
              <Pressable
                onPress={() => {
                  setFilter('all');
                  setSearchQuery('');
                }}
                className="mt-3"
                accessibilityRole="button"
              >
                <Text className="text-[14px] font-semibold text-brand">Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          filteredReadings.map((reading) => (
            <HistoryReadingCard key={reading.id} reading={reading} />
          ))
        )}
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
