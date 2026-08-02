import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssignedReadingCard } from '@/components/assigned/AssignedReadingCard';
import { SearchBar } from '@/components/assigned/SearchBar';
import { SyncAllButton } from '@/components/assigned/SyncAllButton';
import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { CloudStatusIcon } from '@/components/ui/CloudStatusIcon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAssignments } from '@/hooks/useAssignments';
import RecordReading from '@/screens/RecordReading';
import type { MeterReading } from '@/types/readings';

type AssignedProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

function SkeletonCard() {
  return (
    <View className="mb-3 overflow-hidden rounded-[18px] bg-white p-4">
      <View className="mb-3 h-5 w-2/3 rounded bg-slate-200" />
      <View className="mb-2 h-3.5 w-1/3 rounded bg-slate-200" />
      <View className="mb-2 h-3.5 w-3/4 rounded bg-slate-200" />
      <View className="mb-2 h-3.5 w-1/2 rounded bg-slate-200" />
      <View className="mt-3 h-12 rounded-2xl bg-slate-200" />
    </View>
  );
}

export default function Assigned({
  activeTab = 'assigned',
  onTabPress,
}: AssignedProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);

  const { assignments, loading, refreshing, error, refresh } = useAssignments();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReading, setActiveReading] = useState<MeterReading | null>(null);

  const filteredReadings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return assignments;

    return assignments.filter((reading) => {
      const name = reading.resident
        ? `${reading.resident.first_name} ${reading.resident.last_name}`.toLowerCase()
        : '';
      const account = (reading.account?.account_number ?? '').toLowerCase();
      const meter = (reading.meter?.meter_number ?? '').toLowerCase();
      const address = (reading.account?.service_address ?? '').toLowerCase();
      return (
        name.includes(query) ||
        account.includes(query) ||
        meter.includes(query) ||
        address.includes(query)
      );
    });
  }, [assignments, searchQuery]);

  if (activeReading) {
    return (
      <RecordReading
        reading={activeReading}
        activeTab={activeTab}
        onTabPress={onTabPress}
        onBack={() => setActiveReading(null)}
        onSubmitted={() => setActiveReading(null)}
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => refresh()} />
        }
      >
        <ScreenHeader
          title="Assigned Readings"
          left={<SyncAllButton onPress={() => refresh()} />}
          right={<CloudStatusIcon />}
        />

        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

        {loading ? (
          <View>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : error ? (
          <View className="mt-10 items-center rounded-[18px] bg-white px-6 py-10">
            <Text className="text-base font-bold text-navy">Unable to load readings</Text>
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
              {searchQuery.trim()
                ? 'No assigned readings match your search.'
                : 'You have no assigned readings right now.'}
            </Text>
            {searchQuery.trim() ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                className="mt-3"
                accessibilityRole="button"
              >
                <Text className="text-[14px] font-semibold text-brand">Clear search</Text>
              </Pressable>
            ) : null}
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
