import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
import { submitCorrectedReading } from '@/services/meterReadingService';
import type { MeterReading } from '@/types/readings';
import NetInfo from '@react-native-community/netinfo';
import { enqueueReading } from '@/services/offlineSyncService';

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

function editableReading(value: number | null): string {
  if (value == null || Number.isNaN(Number(value))) return '';
  return String(Number(value));
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
  const isCorrection = reading.status === 'rejected';

  const [currentReading, setCurrentReading] = useState(() =>
    isCorrection ? editableReading(reading.current_reading) : ''
  );
  const [notes, setNotes] = useState(() => (isCorrection ? reading.remarks ?? '' : ''));
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
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
  const previewUri = photoUri ?? (isCorrection ? reading.photo_url : null);

  const applyPhotoAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri) return;
    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    void ImagePicker.getPendingResultAsync().then((pending) => {
      if (!active || !pending || !('assets' in pending)) return;
      const asset = pending.assets?.[0];
      if (asset) applyPhotoAsset(asset);
    });
    return () => {
      active = false;
    };
  }, [applyPhotoAsset]);

  async function takeMeterPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow camera access to take a photo of the meter.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
      base64: true,
      cameraType: ImagePicker.CameraType.back,
    });

    if (!result.canceled && result.assets[0]) {
      applyPhotoAsset(result.assets[0]);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || current === null) return;
    setSubmitting(true);
    const queued = {
      reading_id: reading.id,
      current_reading: current,
      notes,
      photo_uri: photoUri,
      photo_base64: photoBase64,
    };
    const successTitle = isCorrection ? 'Resubmitted' : 'Submitted';
    const successMessage = isCorrection
      ? 'Your corrected reading is back in pending review.'
      : 'Your reading has been submitted for review.';
    try {
      const state = await NetInfo.fetch();
      if (state.isConnected && state.isInternetReachable !== false) {
        try {
          await submitCorrectedReading({
            id: reading.id,
            currentReading: current,
            remarks: notes,
            photoUri,
            photoBase64,
          });
          Alert.alert(successTitle, successMessage, [
            { text: 'OK', onPress: () => onSubmitted?.() },
          ]);
        } catch (err) {
          if (err instanceof Error && (err.message.includes('network') || err.message.includes('Network') || err.message.includes('fetch'))) {
            await enqueueReading(queued);
            Alert.alert('Offline Mode', 'Your reading was saved locally and will sync when connection is restored.', [
              { text: 'OK', onPress: () => onSubmitted?.() },
            ]);
          } else {
            throw err;
          }
        }
      } else {
        await enqueueReading(queued);
        Alert.alert('Offline', 'Your reading was saved locally and will sync when connection is restored.', [
          { text: 'OK', onPress: () => onSubmitted?.() },
        ]);
      }
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
          title={isCorrection ? 'Correct Reading' : 'Record Reading'}
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

        {isCorrection && reading.rejection_reason ? (
          <View className="mb-4 rounded-2xl bg-alert-soft px-4 py-3">
            <Text className="text-[12px] font-semibold text-alert">Rejection reason</Text>
            <Text className="mt-0.5 text-[13px] leading-5 text-alert-muted">
              {reading.rejection_reason}
            </Text>
          </View>
        ) : null}

        <View className="mb-4 rounded-[18px] bg-white p-4" style={cardShadow}>
          <CaptureImageButton
            onPress={() => {
              void takeMeterPhoto();
            }}
            previewUri={previewUri}
            label={previewUri ? 'Retake Photo' : 'Capture Meter Image'}
          />

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
          label={
            submitting
              ? 'Submitting…'
              : isCorrection
                ? 'Resubmit Reading'
                : 'Submit Reading'
          }
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
