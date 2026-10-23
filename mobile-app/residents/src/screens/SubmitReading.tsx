import { useCallback, useEffect, useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDialog } from '@/components/ui/AppDialog';
import { Navbar, type NavTab } from '@/components/ui/Navbar';
import { friendlyErrorMessage } from '@/lib/errors';
import {
  billingMonthKey,
  firstAvailableAssignmentDate,
  formatBillingPeriod,
  getMyReadings,
  getReadingAccount,
  getUnavailableBillingMonths,
  parseAssignmentDate,
  READING_STATUS_LABELS,
  resubmitRejectedReading,
  submitResidentReading,
  todayAssignmentDate,
  type ResidentReading,
  type ResidentReadingAccount,
} from '@/services/readingService';

type SubmitReadingScreenProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack?: () => void;
};

function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="-ml-1 h-10 w-10 items-center justify-center active:opacity-70"
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Image
        source={require('../../assets/Arrow/BackArrow.png')}
        style={{ width: 19, height: 19 }}
        contentFit="contain"
      />
    </Pressable>
  );
}

function parseReading(value: string): number | null {
  const numeric = Number(value.replace(/,/g, ''));
  if (value.trim() === '' || Number.isNaN(numeric)) return null;
  return numeric;
}

const STATUS_STYLES: Record<
  ResidentReading['status'],
  { pill: string; text: string }
> = {
  assigned: { pill: 'bg-slate-100', text: 'text-slate-700' },
  pending_review: { pill: 'bg-amber-100', text: 'text-amber-800' },
  approved: { pill: 'bg-emerald-100', text: 'text-emerald-800' },
  billed: { pill: 'bg-emerald-100', text: 'text-emerald-800' },
  rejected: { pill: 'bg-red-100', text: 'text-red-700' },
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SubmitReadingScreen({
  activeTab = 'dashboard',
  onTabPress,
  onBack,
}: SubmitReadingScreenProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);
  const dialog = useDialog();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [account, setAccount] = useState<ResidentReadingAccount | null>(null);
  const [history, setHistory] = useState<ResidentReading[]>([]);
  /** Months (`YYYY-MM`) that already have a reading or bill — not selectable. */
  const [unavailableMonths, setUnavailableMonths] = useState<string[]>([]);

  const [currentReading, setCurrentReading] = useState('');
  const [notes, setNotes] = useState('');
  /** Billing period date — same meaning as staff Assignment Date (`YYYY-MM-DD`). */
  const [assignmentDate, setAssignmentDate] = useState(todayAssignmentDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  // False while showing the rejected reading's stored photo (kept on resubmit).
  const [photoChanged, setPhotoChanged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const assignmentDateValue = useMemo(() => {
    try {
      return parseAssignmentDate(assignmentDate);
    } catch {
      return parseAssignmentDate(todayAssignmentDate());
    }
  }, [assignmentDate]);

  const unavailableMonthSet = useMemo(
    () => new Set(unavailableMonths),
    [unavailableMonths]
  );

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const [accountInfo, readings] = await Promise.all([
        getReadingAccount(),
        getMyReadings(),
      ]);
      setAccount(accountInfo);
      setHistory(readings);

      const blocked = accountInfo
        ? await getUnavailableBillingMonths(accountInfo.id)
        : [];
      setUnavailableMonths(blocked);

      // A rejected reading can be corrected and sent again — start from it.
      // Only the latest reading counts (an older rejection is already settled).
      const rejected = readings[0]?.status === 'rejected' ? readings[0] : null;
      if (rejected) {
        setCurrentReading(
          rejected.current_reading === null ? '' : String(rejected.current_reading)
        );
        setNotes(rejected.remarks ?? '');
        setPhotoUri(rejected.photo_url ?? null);
        const rejectedDate = (rejected.assignment_date ?? '').slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(rejectedDate)) {
          setAssignmentDate(rejectedDate);
        }
      } else {
        setAssignmentDate(firstAvailableAssignmentDate(blocked));
      }
    } catch (err) {
      setLoadError(
        friendlyErrorMessage(err, 'Could not load your meter reading details.')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rejectedReading = useMemo(
    () => (history[0]?.status === 'rejected' ? history[0] : null),
    [history]
  );
  // Only a reading already awaiting review blocks a new submission. A scheduled
  // meter-reader visit does not — residents may still send their own reading.
  const pendingReading = useMemo(
    () => history.find((reading) => reading.status === 'pending_review') ?? null,
    [history]
  );
  const assignedReading = useMemo(
    () => history.find((reading) => reading.status === 'assigned') ?? null,
    [history]
  );

  const previousReading = account?.previousReading ?? 0;
  const current = parseReading(currentReading);
  const consumption =
    current !== null && current >= previousReading ? current - previousReading : null;
  const hasPhoto = Boolean(photoUri || photoBase64);
  const selectedMonthBlocked =
    !rejectedReading && unavailableMonthSet.has(billingMonthKey(assignmentDate));

  const canSubmit =
    !submitting &&
    !pendingReading &&
    Boolean(assignmentDate) &&
    !selectedMonthBlocked &&
    current !== null &&
    current >= previousReading &&
    hasPhoto;

  function toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function applyAssignmentDate(selected: Date) {
    const next = toISODate(selected);
    const monthKey = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}`;
    if (unavailableMonthSet.has(monthKey)) {
      dialog.alert(
        'Month unavailable',
        `${formatBillingPeriod(monthKey)} already has a reading or bill. Please choose another month.`,
        { tone: 'warning' }
      );
      return;
    }
    setAssignmentDate(next);
  }

  function onAssignmentDateValueChange(_event: unknown, selected: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    applyAssignmentDate(selected);
  }

  function onAssignmentDateDismiss() {
    setShowDatePicker(false);
  }

  async function pickPhoto(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          dialog.alert(
            'Camera permission needed',
            'Allow camera access so you can photograph your water meter.',
            { tone: 'warning' }
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
        const asset = result.canceled ? null : result.assets[0];
        if (asset?.uri) {
          setPhotoUri(asset.uri);
          setPhotoBase64(asset.base64 ?? null);
          setPhotoChanged(true);
        }
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        dialog.alert(
          'Photo permission needed',
          'Allow photo access so you can attach a picture of your meter.',
          { tone: 'warning' }
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (asset?.uri) {
        setPhotoUri(asset.uri);
        setPhotoBase64(asset.base64 ?? null);
        setPhotoChanged(true);
      }
    } catch (err) {
      dialog.alert(
        'Photo failed',
        friendlyErrorMessage(err, 'Could not open your camera or gallery.'),
        { tone: 'danger' }
      );
    }
  }

  function choosePhoto() {
    dialog.actionSheet({
      title: photoUri ? 'Update meter photo' : 'Add meter photo',
      message: 'Make sure the meter dial and serial number are readable.',
      options: [
        { label: 'Take a photo', onPress: () => void pickPhoto('camera') },
        { label: 'Choose from gallery', onPress: () => void pickPhoto('library') },
      ],
      cancelLabel: 'Cancel',
    });
  }

  async function handleSubmit() {
    if (!canSubmit || current === null) return;
    setSubmitting(true);
    try {
      if (rejectedReading) {
        await resubmitRejectedReading(rejectedReading.id, {
          currentReading: current,
          remarks: notes,
          // Only send a freshly picked photo; otherwise keep the stored one.
          photoUri: photoChanged ? photoUri : null,
          photoBase64: photoChanged ? photoBase64 : null,
          keepExistingPhoto: !photoChanged && Boolean(rejectedReading.photo_url),
        });
      } else {
        await submitResidentReading({
          currentReading: current,
          assignmentDate,
          remarks: notes,
          photoUri,
          photoBase64,
        });
      }

      setPhotoUri(null);
      setPhotoBase64(null);
      setPhotoChanged(false);
      setNotes('');
      setCurrentReading('');
      await load();

      dialog.alert(
        'Reading sent',
        'Staff will review your reading. You will see the result here once it is approved or returned for correction.',
        { tone: 'success' }
      );
    } catch (err) {
      dialog.alert(
        'Could not send reading',
        friendlyErrorMessage(err, 'An unexpected error occurred. Please try again.'),
        { tone: 'danger' }
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-2">
          <BackButton onPress={onBack} />
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Meter Reading</Text>
            <Text className="mt-1 text-base text-white/80">
              Send your reading and meter photo
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-4 px-4 pt-5">
          {loading ? (
            <View className="items-center rounded-2xl border border-slate-200 bg-white py-10">
              <ActivityIndicator color="#186252" />
              <Text className="mt-3 text-sm text-slate-500">Loading your account…</Text>
            </View>
          ) : loadError ? (
            <View className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
              <Text className="text-sm font-semibold text-red-700">{loadError}</Text>
              <Pressable
                onPress={() => {
                  setLoading(true);
                  void load();
                }}
                className="mt-3 self-start rounded-lg bg-brand px-4 py-2 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : !account ? (
            <View className="rounded-2xl border border-slate-200 bg-white px-4 py-6">
              <Text className="text-sm text-slate-600">
                No active service account was found for your login. Please visit the
                barangay office so staff can link your account to a meter.
              </Text>
            </View>
          ) : (
            <>
              <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Service Account
                </Text>
                <View className="mt-3 gap-2">
                  <InfoRow label="Account No." value={account.accountNumber} />
                  <InfoRow label="Meter No." value={account.meterNumber ?? 'Not assigned'} />
                  <InfoRow label="Sitio" value={account.sitio ?? '—'} />
                  <InfoRow
                    label="Previous reading"
                    value={`${previousReading.toLocaleString()} m³`}
                  />
                </View>
              </View>

              {pendingReading ? (
                <View className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <Text className="text-sm font-semibold text-amber-900">
                    {pendingReading.source === 'resident'
                      ? 'Your reading is waiting for staff review'
                      : 'A reading for this account is already waiting for review'}
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-amber-800">
                    We will show the result here once staff approve it or ask for a
                    correction.
                  </Text>
                </View>
              ) : null}

              {!pendingReading && assignedReading ? (
                <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <Text className="text-sm font-semibold text-slate-800">
                    A meter reader is also scheduled
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-slate-500">
                    If you send your reading now, staff will review it instead of waiting for
                    the visit.
                  </Text>
                </View>
              ) : null}

              {rejectedReading ? (
                <View className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                  <Text className="text-sm font-semibold text-red-800">
                    Reading returned for correction
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-red-700">
                    {rejectedReading.rejection_reason || 'Staff asked for a clearer reading.'}
                  </Text>
                </View>
              ) : null}

              {!pendingReading ? (
                <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <Text className="text-base font-bold text-slate-800">
                    {rejectedReading ? 'Correct your reading' : 'Send your reading'}
                  </Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    Choose the billing period date, photograph your meter, then type the
                    numbers on the dial. Read on is recorded automatically when you send.
                  </Text>

                  <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Billing period date
                  </Text>
                  {rejectedReading ? (
                    <View className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <Text className="text-base font-semibold text-slate-800">
                        {formatDate(rejectedReading.assignment_date)}
                      </Text>
                      <Text className="mt-0.5 text-xs text-slate-500">
                        Kept from your original submission
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      className="mt-2 flex-row items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3.5 active:border-brand"
                      accessibilityRole="button"
                      accessibilityLabel="Choose billing period date"
                    >
                      <Text className="text-base font-semibold text-slate-900">
                        {formatDate(assignmentDate)}
                      </Text>
                      <Text className="text-sm font-semibold text-brand">Change</Text>
                    </Pressable>
                  )}
                  <Text className="mt-2 text-xs leading-5 text-slate-500">
                    Months that already have a reading or bill cannot be selected. Read on
                    stays real-time when you submit.
                  </Text>
                  {selectedMonthBlocked ? (
                    <Text className="mt-1 text-xs font-semibold text-red-600">
                      {formatBillingPeriod(assignmentDate)} is unavailable. Choose another
                      month.
                    </Text>
                  ) : null}
                  {unavailableMonths.length > 0 && !rejectedReading ? (
                    <Text className="mt-1 text-xs leading-5 text-slate-400">
                      Unavailable:{' '}
                      {unavailableMonths.map((m) => formatBillingPeriod(m)).join(', ')}
                    </Text>
                  ) : null}

                  {showDatePicker && Platform.OS === 'android' ? (
                    <DateTimePicker
                      value={assignmentDateValue}
                      mode="date"
                      display="default"
                      onValueChange={onAssignmentDateValueChange}
                      onDismiss={onAssignmentDateDismiss}
                    />
                  ) : null}

                  {Platform.OS === 'ios' ? (
                    <Modal
                      visible={showDatePicker}
                      transparent
                      animationType="fade"
                      onRequestClose={() => setShowDatePicker(false)}
                    >
                      <Pressable
                        className="flex-1 justify-end bg-black/40"
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Pressable
                          className="rounded-t-2xl bg-white px-4 pb-8 pt-3"
                          onPress={(e) => e.stopPropagation()}
                        >
                          <View className="mb-2 flex-row items-center justify-between">
                            <Text className="text-base font-bold text-slate-800">
                              Billing period date
                            </Text>
                            <Pressable
                              onPress={() => setShowDatePicker(false)}
                              className="rounded-lg bg-brand px-4 py-2 active:opacity-80"
                            >
                              <Text className="text-sm font-semibold text-white">Done</Text>
                            </Pressable>
                          </View>
                          <DateTimePicker
                            value={assignmentDateValue}
                            mode="date"
                            display="spinner"
                            onValueChange={onAssignmentDateValueChange}
                            style={{ alignSelf: 'stretch' }}
                          />
                        </Pressable>
                      </Pressable>
                    </Modal>
                  ) : null}

                  <Pressable
                    onPress={choosePhoto}
                    className="mt-4 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-5 active:opacity-80"
                    accessibilityRole="button"
                    accessibilityLabel="Add meter photo"
                  >
                    {photoUri ? (
                      <Image
                        source={{ uri: photoUri }}
                        style={{ width: '100%', height: 170, borderRadius: 12 }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text className="text-sm font-semibold text-brand">
                        + Add meter photo
                      </Text>
                    )}
                    <Text className="mt-2 text-xs text-slate-500">
                      {photoUri ? 'Tap to retake or replace' : 'Camera or gallery'}
                    </Text>
                  </Pressable>

                  <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current reading (m³)
                  </Text>
                  <TextInput
                    value={currentReading}
                    onChangeText={(text) => setCurrentReading(text.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder={`At least ${previousReading.toLocaleString()}`}
                    placeholderTextColor="#94a3b8"
                    className="mt-2 rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold text-slate-900"
                  />
                  {current !== null && current < previousReading ? (
                    <Text className="mt-1 text-xs text-red-600">
                      Reading cannot be lower than {previousReading.toLocaleString()} m³.
                    </Text>
                  ) : null}

                  <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notes (optional)
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="e.g. Meter is inside the gate, dog on the premises"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    className="mt-2 rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    style={{ minHeight: 76, textAlignVertical: 'top' }}
                  />

                  <View className="mt-4 flex-row items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                    <View className="items-center">
                      <Text className="text-[10px] font-semibold uppercase text-slate-500">
                        Previous
                      </Text>
                      <Text className="text-sm font-bold text-slate-800">
                        {previousReading.toLocaleString()} m³
                      </Text>
                    </View>
                    <Text className="text-slate-400">→</Text>
                    <View className="items-center">
                      <Text className="text-[10px] font-semibold uppercase text-slate-500">
                        Current
                      </Text>
                      <Text className="text-sm font-bold text-slate-800">
                        {current !== null ? `${current.toLocaleString()} m³` : '—'}
                      </Text>
                    </View>
                    <Text className="text-slate-400">→</Text>
                    <View className="items-center">
                      <Text className="text-[10px] font-semibold uppercase text-slate-500">
                        Usage
                      </Text>
                      <Text className="text-sm font-bold text-brand">
                        {consumption !== null ? `${consumption.toLocaleString()} m³` : '—'}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => void handleSubmit()}
                    disabled={!canSubmit}
                    className={`mt-4 items-center rounded-xl py-3.5 ${
                      canSubmit ? 'bg-brand active:opacity-80' : 'bg-slate-300'
                    }`}
                    accessibilityRole="button"
                  >
                    {submitting ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="text-base font-bold text-white">
                        {rejectedReading ? 'Send corrected reading' : 'Send reading for review'}
                      </Text>
                    )}
                  </Pressable>
                  <Text className="mt-2 text-center text-xs text-slate-500">
                    A photo is required. Staff review every submission before billing.
                  </Text>
                </View>
              ) : null}

              {history.length > 0 ? (
                <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <Text className="text-base font-bold text-slate-800">Your readings</Text>
                  <View className="mt-3 gap-3">
                    {history.map((reading) => {
                      const style = STATUS_STYLES[reading.status];
                      return (
                        <View
                          key={reading.id}
                          className="flex-row items-start justify-between rounded-xl border border-slate-100 px-3 py-2.5"
                        >
                          <View className="flex-1 pr-3">
                            <Text className="text-sm font-semibold text-slate-800">
                              {reading.current_reading !== null
                                ? `${reading.current_reading.toLocaleString()} m³`
                                : 'Not read yet'}
                              {reading.consumption !== null
                                ? ` · ${reading.consumption.toLocaleString()} m³ used`
                                : ''}
                            </Text>
                            <Text className="mt-0.5 text-xs text-slate-500">
                              Assigned {formatDate(reading.assignment_date)}
                              {' · '}
                              Read on {formatDate(reading.reading_date ?? reading.created_at)}
                              {' · '}
                              {reading.source === 'resident' ? 'Sent by you' : 'Meter reader'}
                            </Text>
                          </View>
                          <View className={`rounded-full px-2.5 py-1 ${style.pill}`}>
                            <Text className={`text-[10px] font-bold ${style.text}`}>
                              {READING_STATUS_LABELS[reading.status]}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="text-sm font-semibold text-slate-800">{value}</Text>
    </View>
  );
}
