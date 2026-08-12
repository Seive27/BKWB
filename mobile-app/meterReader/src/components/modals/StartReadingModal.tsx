import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

import { NotesInput } from '@/components/recordReading/NotesInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SITIO_OPTIONS } from '@/constants/sitios';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.92;
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 800;
const CLOSE_DURATION_MS = 260;

export type StartReadingPayload = {
  dateOfReading: string;
  meterNumber: string;
  sitio: string;
  photoUri: string | null;
  photoBase64: string | null;
  currentReading: string;
  notes: string;
};

type StartReadingModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Pre-fill (and optionally lock) the sitio from the Assigned card. */
  defaultSitio?: string;
  lockSitio?: boolean;
  /** Called when the reader confirms a complete reading entry. */
  onConfirm?: (payload: StartReadingPayload) => void | Promise<void>;
};

function formatReadingDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function StartReadingModal({
  visible,
  onClose,
  defaultSitio,
  lockSitio = false,
  onConfirm,
}: StartReadingModalProps) {
  const [dateOfReading] = useState(() => formatReadingDate(new Date()));
  const [meterNumber, setMeterNumber] = useState('');
  const [sitio, setSitio] = useState(defaultSitio ?? '');
  const [sitioOpen, setSitioOpen] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [currentReading, setCurrentReading] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const translateY = useSharedValue(SHEET_MAX_HEIGHT);
  const dragStartY = useSharedValue(0);

  const resetForm = useCallback(() => {
    setMeterNumber('');
    setSitio(defaultSitio ?? '');
    setSitioOpen(false);
    setPhotoUri(null);
    setPhotoBase64(null);
    setCurrentReading('');
    setNotes('');
    setSubmitting(false);
  }, [defaultSitio]);

  // Only notify parent — do not snap translateY back to 0 while the modal is
  // still mounted (that caused the close distortion).
  const finishClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const animateClosed = useCallback(() => {
    translateY.value = withTiming(
      SHEET_MAX_HEIGHT,
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
  }, [finishClose, translateY]);

  useLayoutEffect(() => {
    if (visible) {
      setSitio(defaultSitio ?? '');
      setSitioOpen(false);
      translateY.value = SHEET_MAX_HEIGHT;
      translateY.value = withTiming(0, {
        duration: CLOSE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      translateY.value = SHEET_MAX_HEIGHT;
    }
  }, [visible, defaultSitio, translateY]);

  const applyPhotoAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri) return;
    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 ?? null);
  }, []);

  const takeMeterPhoto = async () => {
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
  };

  // Android can kill the activity after the camera closes. Recover the photo.
  useEffect(() => {
    if (!visible) return;

    let active = true;
    void ImagePicker.getPendingResultAsync().then((pending) => {
      if (!active || !pending || !('assets' in pending)) return;
      const asset = pending.assets?.[0];
      if (asset) applyPhotoAsset(asset);
    });

    return () => {
      active = false;
    };
  }, [visible, applyPhotoAsset]);

  const handleConfirm = async () => {
    const trimmedMeter = meterNumber.trim();
    const trimmedReading = currentReading.trim();

    if (!trimmedMeter) {
      Alert.alert('Missing meter number', 'Please enter the meter number.');
      return;
    }
    if (!sitio) {
      Alert.alert('Missing sitio', 'Please select a sitio.');
      return;
    }
    if (!photoUri) {
      Alert.alert('Missing meter photo', 'Please take a photo of the meter.');
      return;
    }
    if (!trimmedReading) {
      Alert.alert('Missing reading', 'Please enter the current reading or consumption.');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm?.({
        dateOfReading,
        meterNumber: trimmedMeter,
        sitio,
        photoUri,
        photoBase64,
        currentReading: trimmedReading,
        notes: notes.trim(),
      });
      animateClosed();
    } catch (err) {
      Alert.alert(
        'Submission failed',
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      setSubmitting(false);
    }
  };

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
          SHEET_MAX_HEIGHT,
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
      [0, SHEET_MAX_HEIGHT],
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
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={animateClosed}
              accessibilityLabel="Dismiss"
            />
          </Animated.View>

          <Animated.View style={[styles.sheet, sheetStyle]}>
            <GestureDetector gesture={panGesture}>
              <Animated.View
                style={styles.handleArea}
                accessibilityLabel="Drag down to close"
              >
                <View style={styles.handle} />
                <Text className="text-lg font-bold text-navy">Start Reading</Text>
              </Animated.View>
            </GestureDetector>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              style={styles.scroll}
            >
              <View className="mb-4">
                <Text className="mb-2 text-[13px] font-semibold text-navy-muted">
                  Date of Reading
                </Text>
                <View className="rounded-2xl bg-surface px-4 py-3.5">
                  <Text className="text-[15px] font-semibold text-navy">
                    {dateOfReading}
                  </Text>
                </View>
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-[13px] font-semibold text-navy-muted">
                  Meter Number
                </Text>
                <TextInput
                  value={meterNumber}
                  onChangeText={setMeterNumber}
                  placeholder="Enter meter number"
                  placeholderTextColor="#8FA3B5"
                  className="rounded-2xl border border-slate-200 bg-surface px-4 py-3.5 text-[15px] text-navy"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-[13px] font-semibold text-navy-muted">
                  Sitio
                </Text>
                {lockSitio ? (
                  <View className="rounded-2xl bg-surface px-4 py-3.5">
                    <Text className="text-[15px] font-semibold text-navy">
                      {sitio || defaultSitio || '—'}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Pressable
                      onPress={() => setSitioOpen((open) => !open)}
                      className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-surface px-4 py-3.5 active:opacity-85"
                      accessibilityRole="button"
                      accessibilityLabel="Select sitio"
                    >
                      <Text
                        className={`text-[15px] ${
                          sitio ? 'font-semibold text-navy' : 'text-navy-soft'
                        }`}
                      >
                        {sitio || 'Select sitio'}
                      </Text>
                      <Text className="text-base text-navy-soft">
                        {sitioOpen ? '▲' : '▼'}
                      </Text>
                    </Pressable>

                    {sitioOpen ? (
                      <ScrollView
                        className="mt-2 max-h-64 overflow-hidden rounded-2xl border border-slate-200 bg-white"
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                      >
                        {SITIO_OPTIONS.map((option, index) => {
                          const selected = option === sitio;
                          return (
                            <Pressable
                              key={option}
                              onPress={() => {
                                setSitio(option);
                                setSitioOpen(false);
                              }}
                              className={`px-4 py-3.5 active:bg-surface ${
                                index < SITIO_OPTIONS.length - 1
                                  ? 'border-b border-slate-100'
                                  : ''
                              } ${selected ? 'bg-completed-soft' : ''}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                            >
                              <Text
                                className={`text-[15px] ${
                                  selected
                                    ? 'font-semibold text-brand'
                                    : 'text-navy'
                                }`}
                              >
                                {option}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    ) : null}
                  </>
                )}
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-[13px] font-semibold text-navy-muted">
                  Meter Photo
                </Text>
                <Pressable
                  onPress={() => {
                    void takeMeterPhoto();
                  }}
                  className="items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-surface py-5 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Take meter photo"
                >
                  {photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={{
                        width: '100%',
                        height: 160,
                        borderRadius: 12,
                        marginBottom: 10,
                      }}
                      contentFit="cover"
                    />
                  ) : (
                    <Image
                      source={require('../../../assets/icons/camera.png')}
                      style={{ width: 36, height: 36, marginBottom: 8 }}
                      contentFit="contain"
                    />
                  )}
                  <Text className="text-[15px] font-semibold text-navy">
                    {photoUri ? 'Retake Photo' : 'Take Meter Photo'}
                  </Text>
                </Pressable>
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-[13px] font-semibold text-navy-muted">
                  Current Reading / Consumption
                </Text>
                <View className="flex-row items-center rounded-2xl border border-slate-200 bg-surface px-4 py-3">
                  <TextInput
                    value={currentReading}
                    onChangeText={(text) =>
                      setCurrentReading(text.replace(/[^0-9.,]/g, ''))
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#8FA3B5"
                    className="flex-1 text-center text-[28px] font-bold text-navy"
                  />
                  <Text className="ml-2 text-base font-semibold text-navy-muted">
                    m³
                  </Text>
                </View>
              </View>

              <View className="mb-6">
                <NotesInput value={notes} onChangeText={setNotes} />
              </View>

              <View className="gap-3">
                <PrimaryButton
                  label={submitting ? 'Submitting…' : 'Confirm'}
                  onPress={() => {
                    void handleConfirm();
                  }}
                  disabled={submitting}
                />
                <SecondaryButton
                  label="Cancel"
                  onPress={submitting ? undefined : animateClosed}
                />
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SHEET_MAX_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  handleArea: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 4,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  scroll: {
    flexGrow: 0,
  },
});
