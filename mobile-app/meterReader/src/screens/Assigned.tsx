import { useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@/components/assigned/SearchBar';
import { SyncAllButton } from '@/components/assigned/SyncAllButton';
import { StartReadingModal } from '@/components/modals/StartReadingModal';
import { ViewConsumersModal } from '@/components/modals/ViewConsumersModal';
import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { CloudStatusIcon } from '@/components/ui/CloudStatusIcon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { cardShadow } from '@/components/ui/cardShadow';
import { getMySitioAssignments } from '@/services/sitioAssignmentService';
import { useAssignments } from '@/hooks/useAssignments';
import { submitReadingByMeterNumber } from '@/services/meterReadingService';
import type { MeterReading } from '@/types/readings';

type AssignedProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

/** Survives Android activity recreation after the camera closes. */
let lastStartedSitio: string | null = null;

type SitioGroup = {
  sitio: string;
  total: number;
  completed: number;
  remaining: number;
  percent: number;
  readings: MeterReading[];
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

function SitioProgressCard({
  group,
  onStartReading,
  onViewConsumers,
}: {
  group: SitioGroup;
  onStartReading: (sitio: string) => void;
  onViewConsumers: (sitio: string) => void;
}) {
  const canStart = group.remaining > 0;

  return (
    <View className="mb-3 rounded-[18px] bg-white p-4" style={cardShadow}>
      <View className="mb-2 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="mb-1 text-[11px] font-semibold tracking-wider text-navy-soft">
            ASSIGNED SITIO
          </Text>
          <Text className="text-[17px] font-bold text-navy" numberOfLines={1}>
            {group.sitio}
          </Text>
        </View>
        <Text className="text-[15px] font-bold text-navy">{group.percent}%</Text>
      </View>

      <View className="mb-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <View
          className="h-full rounded-full bg-brand"
          style={{ width: `${group.percent}%` }}
        />
      </View>

      <Text className="mb-3 text-[13px] text-navy-muted">
        {group.completed} of {group.total} completed · {group.remaining} remaining
      </Text>

      <PrimaryButton
        label="Start Reading"
        onPress={() => onStartReading(group.sitio)}
        disabled={!canStart}
        icon={<Text className="text-sm text-white">▶</Text>}
      />
      <View className="mt-2">
        <SecondaryButton
          label="View Consumers"
          onPress={() => onViewConsumers(group.sitio)}
        />
      </View>
    </View>
  );
}

function residentLabel(reading: MeterReading): string {
  if (reading.resident) {
    const name = `${reading.resident.first_name} ${reading.resident.last_name}`.trim();
    if (name) return name;
  }
  return reading.account?.account_number ?? 'the matched account';
}

export default function Assigned({
  activeTab = 'assigned',
  onTabPress,
}: AssignedProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);
  const cardsAnchorRef = useRef<View>(null);

  const { assignments, sitioRoutes, loading, refreshing, error, refresh } =
    useAssignments();
  const [coveredSitios, setCoveredSitios] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSitio, setActiveSitio] = useState<string | null>(null);
  const [consumersSitio, setConsumersSitio] = useState<string | null>(null);
  const [consumersSheetTop, setConsumersSheetTop] = useState(0);

  const openConsumers = (sitio: string) => {
    cardsAnchorRef.current?.measureInWindow((_x, y) => {
      setConsumersSheetTop(y);
      setConsumersSitio(sitio);
    });
  };

  useEffect(() => {
    let active = true;
    void ImagePicker.getPendingResultAsync().then((pending) => {
      if (!active || !pending || !('assets' in pending) || !pending.assets?.[0]) {
        return;
      }
      if (lastStartedSitio) {
        setActiveSitio(lastStartedSitio);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Official sitio coverage (sitio_assignments). RLS returns only this
  // reader's rows; consumers outside these sitios are hidden server-side.
  useEffect(() => {
    let active = true;
    getMySitioAssignments()
      .then((rows) => {
        if (active) setCoveredSitios(rows.map((r) => r.sitio));
      })
      .catch(() => {
        // Non-blocking: route cards still come from assigned readings.
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const baseGroups: SitioGroup[] =
      sitioRoutes.length > 0
        ? sitioRoutes.map((route) => ({
            sitio: route.sitio,
            total: route.total,
            completed: route.completed,
            remaining: route.remaining,
            percent: route.percent,
            readings: route.readings,
          }))
        : (() => {
            // Fallback when progress query is unavailable: group open assignments only.
            const map = new Map<string, MeterReading[]>();
            for (const reading of assignments) {
              const sitio =
                (reading.account?.sitio ?? '').trim() || 'Unassigned Sitio';
              const list = map.get(sitio) ?? [];
              list.push(reading);
              map.set(sitio, list);
            }
            return [...map.entries()].map(([sitio, readings]) => ({
              sitio,
              total: readings.length,
              completed: 0,
              remaining: readings.length,
              percent: 0,
              readings,
            }));
          })();

    if (!query) return baseGroups;

    return baseGroups.filter((group) => group.sitio.toLowerCase().includes(query));
  }, [assignments, searchQuery, sitioRoutes]);

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

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search assigned sitios..."
        />
        {/* Anchor: top edge of Assigned Sitio cards / consumers sheet. */}
        <View ref={cardsAnchorRef} collapsable={false} style={{ height: 0 }} />
        {coveredSitios.length > 0 ? (
          <View className="mb-3 rounded-[18px] bg-brand/10 px-4 py-3">
            <Text className="text-[11px] font-semibold tracking-wider text-navy-soft">
              YOUR ASSIGNED SITIOS
            </Text>
            <Text className="mt-1 text-[14px] font-semibold text-navy">
              {coveredSitios.join(', ')}
            </Text>
            <Text className="mt-1 text-[12px] text-navy-muted">
              Consumers outside these sitios are not visible to you.
            </Text>
          </View>
        ) : null}

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
        ) : filteredGroups.length === 0 ? (
          <View className="mt-10 items-center px-6">
            <Text className="text-center text-[15px] text-navy-muted">
              {searchQuery.trim()
                ? 'No assigned sitios match your search.'
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
          filteredGroups.map((group) => (
            <SitioProgressCard
              key={group.sitio}
              group={group}
              onStartReading={(sitio) => {
                lastStartedSitio = sitio;
                setActiveSitio(sitio);
              }}
              onViewConsumers={openConsumers}
            />
          ))
        )}
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />

      <StartReadingModal
        visible={activeSitio !== null}
        defaultSitio={activeSitio ?? undefined}
        lockSitio
        onClose={() => setActiveSitio(null)}
        onConfirm={async (payload) => {
          const current = Number(payload.currentReading.replace(/,/g, ''));
          if (!Number.isFinite(current)) {
            throw new Error('Please enter a valid current reading.');
          }

          const submitted = await submitReadingByMeterNumber({
            meterNumber: payload.meterNumber,
            sitio: payload.sitio,
            currentReading: current,
            remarks: payload.notes,
            photoUri: payload.photoUri,
            photoBase64: payload.photoBase64,
          });

          await refresh();

          Alert.alert(
            'Submitted',
            `Matched ${payload.meterNumber} to ${residentLabel(submitted)}. The reading is pending review.`,
          );
        }}
      />

      <ViewConsumersModal
        visible={consumersSitio !== null}
        sitio={consumersSitio}
        topOffset={consumersSheetTop}
        onClose={() => setConsumersSitio(null)}
      />
    </View>
  );
}
