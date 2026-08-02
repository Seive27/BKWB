import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { CaptureImageButton } from '@/components/recordReading/CaptureImageButton';
import { MeterReadingInput } from '@/components/recordReading/MeterReadingInput';
import { NotesInput } from '@/components/recordReading/NotesInput';
import { ResidentInfoCard } from '@/components/recordReading/ResidentInfoCard';
import { CloudStatusIcon } from '@/components/ui/CloudStatusIcon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { cardShadow } from '@/components/ui/cardShadow';
import { submitReading } from '@/services/meterReadingService';
import type { MeterReading } from '@/types/readings';

type RecordReadingProps = {
  reading: MeterReading;
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack: () => void;
  /** Called after a successful submission so the list can refresh. */
  onSubmitted?: () => void;
};

function parseReading(value: string): number | null {
  const numeric = Number(value.replace(/,/g, ''));
  if (value.trim() === '' || Number.isNaN(numeric)) {
    return null;
  }
  return numeric;
}

export default function RecordReading({
  reading,
  activeTab = 'assigned',
  onTabPress,
  onBack,
  onSubmitted,
}: RecordReadingProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);

  const [currentReading, setCurrentReading] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const previousReading = reading.previous_reading ?? 0;

  const error = useMemo(() => {
    const current = parseReading(currentReading);
    if (current === null) {
      return `Enter a reading greater than or equal to the previous reading (${previousReading.toLocaleString()} m³).`;
    }
    if (current < previousReading) {
      return `Invalid reading: current reading must be greater than or equal to previous reading (${previousReading.toLocaleString()} m³).`;
    }
    return null;
  }, [currentReading, previousReading]);

  const consumption = useMemo(() => {
    const current = parseReading(currentReading);
    if (current === null || current < previousReading) {
      return null;
    }
    return current - previousReading;
  }, [currentReading, previousReading]);

  const current = parseReading(currentReading);
  const canSubmit = current !== null && current >= previousReading && !submitting;

  async function handleSubmit() {
    if (!canSubmit || current === null) return;
    setSubmitting(true);
    try {
      await submitReading(reading.id, current, notes);
      Alert.alert('Submitted', 'Your reading has been submitted for review.', [
        { text: 'OK', onPress: () => onSubmitted?.() },
      ]);
    } catch (err) {
      Alert.alert(
        'Submission failed',
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      setSubmitting(false);
    }
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
          title="Record Reading"
          left={
            <Pressable
              onPress={onBack}
              className="-ml-1 h-10 w-10 items-center justify-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Image
                source={require('../../assets/icons/BackArrow.png')}
                style={{ width: 22, height: 22 }}
                contentFit="contain"
              />
            </Pressable>
          }
          right={<CloudStatusIcon />}
        />

        <ResidentInfoCard reading={reading} />

        <View className="mb-4 rounded-[18px] bg-white p-4" style={cardShadow}>
          <CaptureImageButton />

          <MeterReadingInput
            value={currentReading}
            onChangeText={(text) => setCurrentReading(text.replace(/[^0-9.,]/g, ''))}
            error={error}
          />
          <NotesInput value={notes} onChangeText={setNotes} />

          {/* Live consumption preview */}
          <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-surface px-4 py-4">
            <View className="flex-1 items-center">
              <Text className="mb-1 text-[10px] font-semibold tracking-wide text-navy-soft">
                PREVIOUS
              </Text>
              <Text className="text-[15px] font-bold text-navy">
                {previousReading.toLocaleString()} m³
              </Text>
            </View>
            <Text className="px-2 text-lg text-navy-soft">↓</Text>
            <View className="flex-1 items-center">
              <Text className="mb-1 text-[10px] font-semibold tracking-wide text-navy-soft">
                CURRENT
              </Text>
              <Text className="text-[15px] font-bold text-navy">
                {consumption !== null
                  ? (consumption + previousReading).toLocaleString()
                  : '—'}{' '}
                m³
              </Text>
            </View>
            <Text className="px-2 text-lg text-navy-soft">↓</Text>
            <View className="flex-1 items-center">
              <Text className="mb-1 text-[10px] font-semibold tracking-wide text-navy-soft">
                CONSUMPTION
              </Text>
              <Text className="text-[15px] font-bold text-brand">
                {consumption !== null ? `${consumption.toLocaleString()} m³` : '—'}
              </Text>
            </View>
          </View>
        </View>

        <PrimaryButton
          label={submitting ? 'Submitting…' : 'Submit Reading'}
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
