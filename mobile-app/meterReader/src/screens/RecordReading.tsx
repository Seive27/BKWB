import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { CaptureImageButton } from '@/components/recordReading/CaptureImageButton';
import { MeterReadingInput } from '@/components/recordReading/MeterReadingInput';
import { NotesInput } from '@/components/recordReading/NotesInput';
import { OfflineBanner } from '@/components/recordReading/OfflineBanner';
import { ResidentInfoCard } from '@/components/recordReading/ResidentInfoCard';
import { CloudStatusIcon } from '@/components/ui/CloudStatusIcon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { cardShadow } from '@/components/ui/cardShadow';
import type { AssignedReading } from '@/types/readings';

type RecordReadingProps = {
  reading: AssignedReading;
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack: () => void;
};

function getReadingError(value: string, previousReading: number): string | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return `Invalid reading: Current reading must be greater than previous (${previousReading.toLocaleString()} m³)`;
  }

  const numeric = Number(trimmed.replace(/,/g, ''));
  if (Number.isNaN(numeric)) {
    return 'Invalid reading: Enter a valid number.';
  }
  if (numeric <= previousReading) {
    return `Invalid reading: Current reading must be greater than previous (${previousReading.toLocaleString()} m³)`;
  }
  return null;
}

export default function RecordReading({
  reading,
  activeTab = 'assigned',
  onTabPress,
  onBack,
}: RecordReadingProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);

  const [currentReading, setCurrentReading] = useState('0');
  const [notes, setNotes] = useState('');

  const error = useMemo(
    () => getReadingError(currentReading, reading.previousReading),
    [currentReading, reading.previousReading],
  );

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
          right={<CloudStatusIcon variant="issue" />}
        />

        <OfflineBanner />

        <ResidentInfoCard reading={reading} />

        <View className="mb-4 rounded-[18px] bg-white p-4" style={cardShadow}>
          <CaptureImageButton />
          <MeterReadingInput
            value={currentReading}
            onChangeText={(text) => setCurrentReading(text.replace(/[^0-9.]/g, ''))}
            error={error}
          />
          <NotesInput value={notes} onChangeText={setNotes} />
        </View>

        <View className="gap-3">
          <PrimaryButton label="Submit Reading" />
          <SecondaryButton label="Save Draft" />
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
