import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { cardShadow } from '@/components/ui/cardShadow';
import { getSitioConsumers } from '@/services/meterReadingService';
import type { MeterReading } from '@/types/readings';

type ConsumerTab = 'pending' | 'completed';

type ViewConsumersModalProps = {
  visible: boolean;
  sitio: string | null;
  /** Window Y where the sheet top should stop (below Search Assigned Sitios). */
  topOffset: number;
  onClose: () => void;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 800;
const CLOSE_DURATION_MS = 260;
const PAGE_SIZE = 10;

/** Prefer reading date when present; otherwise assignment date (pending). */
function readingMonthKey(reading: MeterReading): string {
  const raw = reading.reading_date ?? reading.assignment_date;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string): string {
  if (monthKey === 'unknown') return 'Unknown';
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function ConsumerRow({ reading }: { reading: MeterReading }) {
  const residentName = reading.resident
    ? `${reading.resident.first_name} ${reading.resident.last_name}`.trim()
    : 'Unknown Resident';
  const accountNumber = reading.account?.account_number ?? '—';
  const meterNumber = reading.meter?.meter_number ?? '—';
  const sitio = reading.account?.sitio?.trim() || 'Unassigned Sitio';

  return (
    <View
      className="mb-2.5 overflow-hidden rounded-2xl bg-white border border-slate-200 p-4"
      style={cardShadow}
    >
      <View className="flex-row items-start justify-between gap-2 mb-1.5">
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
            {residentName}
          </Text>
          <Text className="text-[11px] font-mono text-slate-400"># {accountNumber}</Text>
        </View>
        <StatusBadge status={reading.status} />
      </View>

      <View className="mt-2 pt-2 border-t border-slate-100 flex-row items-center justify-between">
        <View>
          <Text className="text-[10px] font-semibold text-slate-400 uppercase">Meter No.</Text>
          <Text className="text-base font-extrabold font-mono text-blue-600">{meterNumber}</Text>
        </View>
        <View className="rounded-full bg-slate-100 px-2.5 py-1 border border-slate-200/60">
          <Text className="text-[10px] font-semibold text-slate-700">{sitio}</Text>
        </View>
      </View>
    </View>
  );
}

export function ViewConsumersModal({
  visible,
  sitio,
  topOffset,
  onClose,
}: ViewConsumersModalProps) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ConsumerTab>('pending');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [monthOpen, setMonthOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Full-width bottom sheet that rises up to just below the search bar.
  const safeTop = Math.max(topOffset, 80);
  const sheetHeight = Math.max(280, SCREEN_HEIGHT - safeTop);

  const translateY = useSharedValue(sheetHeight);
  const dragStartY = useSharedValue(0);

  const finishClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const animateClosed = useCallback(() => {
    translateY.value = withTiming(
      sheetHeight,
      {
        duration: CLOSE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [finishClose, sheetHeight, translateY]);

  useLayoutEffect(() => {
    if (visible) {
      translateY.value = sheetHeight;
      translateY.value = withTiming(0, {
        duration: CLOSE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      translateY.value = sheetHeight;
    }
  }, [visible, sheetHeight, translateY]);

  useEffect(() => {
    if (!visible || !sitio) return;

    let active = true;
    setTab('pending');
    setMonthOpen(false);
    setPage(1);
    setLoading(true);
    setError(null);

    getSitioConsumers(sitio)
      .then((rows) => {
        if (!active) return;
        setReadings(rows);

        const keys = [
          ...new Set(rows.map(readingMonthKey).filter((k) => k !== 'unknown')),
        ].sort((a, b) => b.localeCompare(a));
        const preferred = keys.includes(currentMonthKey())
          ? currentMonthKey()
          : (keys[0] ?? currentMonthKey());
        setSelectedMonth(preferred);
      })
      .catch((err) => {
        if (!active) return;
        setReadings([]);
        setError(
          err instanceof Error ? err.message : 'Failed to load consumers.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [visible, sitio]);

  const monthOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const reading of readings) {
      keys.add(readingMonthKey(reading));
    }
    const sorted = [...keys]
      .filter((k) => k !== 'unknown')
      .sort((a, b) => b.localeCompare(a));
    if (keys.has('unknown')) sorted.push('unknown');
    if (sorted.length === 0) sorted.push(currentMonthKey());
    return sorted;
  }, [readings]);

  useEffect(() => {
    setPage(1);
  }, [tab, selectedMonth]);

  const monthFiltered = useMemo(
    () => readings.filter((r) => readingMonthKey(r) === selectedMonth),
    [readings, selectedMonth],
  );

  const pending = useMemo(
    () => monthFiltered.filter((r) => r.status === 'assigned'),
    [monthFiltered],
  );
  const completed = useMemo(
    () => monthFiltered.filter((r) => r.status !== 'assigned'),
    [monthFiltered],
  );

  const list = tab === 'pending' ? pending : completed;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, safePage]);

  const monthLabel = formatMonthLabel(selectedMonth);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = dragStartY.value + event.translationY;
      translateY.value = Math.max(0, next);
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        translateY.value = withTiming(
          sheetHeight,
          {
            duration: CLOSE_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          },
          (finished) => {
            if (finished) {
              runOnJS(finishClose)();
            }
          },
        );
        return;
      }

      translateY.value = withSpring(0, {
        damping: 28,
        stiffness: 320,
        mass: 0.85,
        overshootClamping: true,
      });
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, sheetHeight],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={animateClosed}
    >
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={animateClosed}
            accessibilityLabel="Dismiss"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={styles.handleArea}
              accessibilityLabel="Drag down to close"
            >
              <View style={styles.handle} />
              <Text className="text-lg font-bold text-navy">Consumers</Text>
              {sitio ? (
                <Text className="mt-1 text-[13px] text-navy-muted" numberOfLines={1}>
                  {sitio}
                </Text>
              ) : null}
            </Animated.View>
          </GestureDetector>

          <View className="mb-3">
            <Text className="mb-2 text-[13px] font-semibold text-navy-muted">
              Filter by month
            </Text>
            <Pressable
              onPress={() => setMonthOpen((open) => !open)}
              className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5"
              accessibilityRole="button"
              accessibilityLabel="Select month"
            >
              <Text className="text-[15px] font-semibold text-navy">{monthLabel}</Text>
              <Text className="text-[13px] text-navy-soft">{monthOpen ? '▲' : '▼'}</Text>
            </Pressable>
            {monthOpen ? (
              <View className="mt-2 max-h-28 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <FlatList
                  data={monthOptions}
                  keyExtractor={(item) => item}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item: key, index }) => {
                    const selected = key === selectedMonth;
                    return (
                      <Pressable
                        onPress={() => {
                          setSelectedMonth(key);
                          setMonthOpen(false);
                        }}
                        className={`px-4 py-3 ${
                          selected ? 'bg-brand/10' : 'bg-white'
                        } ${index > 0 ? 'border-t border-slate-100' : ''}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text
                          className={`text-[15px] font-semibold ${
                            selected ? 'text-brand' : 'text-navy'
                          }`}
                        >
                          {formatMonthLabel(key)}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
              </View>
            ) : null}
          </View>

          <View className="mb-2 flex-row gap-2">
            {(
              [
                { key: 'pending', label: 'Pending', count: pending.length },
                { key: 'completed', label: 'Completed', count: completed.length },
              ] as const
            ).map(({ key, label, count }) => {
              const selected = tab === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTab(key)}
                  className={`flex-1 items-center rounded-full py-2.5 ${
                    selected ? 'bg-brand' : 'border border-slate-200 bg-white'
                  }`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      selected ? 'text-white' : 'text-navy'
                    }`}
                  >
                    {label} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-3 text-left text-[15px] font-bold text-navy">
            Reading for the month of {monthLabel}
          </Text>

          {loading ? (
            <View className="flex-1 items-center justify-center py-10">
              <ActivityIndicator size="large" color="#0D4F5C" />
              <Text className="mt-3 text-[14px] text-navy-muted">Loading consumers…</Text>
            </View>
          ) : error ? (
            <View className="flex-1 items-center justify-center px-4 py-10">
              <Text className="text-center text-[15px] font-semibold text-navy">
                Unable to load consumers
              </Text>
              <Text className="mt-2 text-center text-[13px] text-navy-muted">{error}</Text>
            </View>
          ) : (
            <View className="min-h-0 flex-1">
              <FlatList
                data={pageItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ConsumerRow reading={item} />}
                showsVerticalScrollIndicator={false}
                style={styles.list}
                contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
                ListEmptyComponent={
                  <View className="items-center px-4 py-10">
                    <Text className="text-center text-[15px] text-navy-muted">
                      {tab === 'pending'
                        ? `No pending consumers for ${monthLabel}.`
                        : `No completed readings for ${monthLabel}.`}
                    </Text>
                  </View>
                }
              />

              {list.length > 0 ? (
                <View className="mb-2 flex-row items-center justify-between gap-3">
                  <Pressable
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className={`flex-1 items-center rounded-2xl border border-slate-200 py-2.5 ${
                      safePage <= 1
                        ? 'bg-slate-100 opacity-50'
                        : 'bg-white active:opacity-85'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel="Previous page"
                    accessibilityState={{ disabled: safePage <= 1 }}
                  >
                    <Text className="text-[13px] font-semibold text-navy">Previous</Text>
                  </Pressable>
                  <Text className="text-[13px] font-semibold text-navy-muted">
                    Page {safePage} of {totalPages}
                  </Text>
                  <Pressable
                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className={`flex-1 items-center rounded-2xl border border-slate-200 py-2.5 ${
                      safePage >= totalPages
                        ? 'bg-slate-100 opacity-50'
                        : 'bg-white active:opacity-85'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel="Next page"
                    accessibilityState={{ disabled: safePage >= totalPages }}
                  >
                    <Text className="text-[13px] font-semibold text-navy">Next</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}

          <Pressable
            onPress={animateClosed}
            className="mt-1 items-center rounded-2xl border border-slate-200 bg-white py-3.5 active:opacity-85"
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text className="text-base font-semibold text-navy">Close</Text>
          </Pressable>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F4F7FA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handleArea: {
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
});
