import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

/**
 * BKWB AppDialog — the app-wide replacement for native `Alert.alert`.
 *
 * One provider is mounted at the app root; screens call `useDialog()` for:
 *   - alert()    branded modal (info / success / warning / danger)
 *   - confirm()  two-button decision modal (destructive-capable)
 *   - actionSheet()  stacked-choice modal (replaces native option alerts)
 *   - toast()    auto-dismissing bottom toast (quiet confirmations)
 *
 * Every variant follows the BKWB visual language already used in
 * AccountSetup and ForgotPasswordModal: white card, rounded-2xl, emoji
 * icon chip, slate text, brand-colored primary button.
 */

export type DialogTone = 'info' | 'success' | 'warning' | 'danger';

export type DialogAction = {
  label: string;
  onPress?: () => void;
  /** `destructive` renders the brand-red button styling. */
  style?: 'default' | 'destructive' | 'cancel';
};

export type DialogActionSheetOption = {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
};

type AlertRequest = {
  title: string;
  message?: string;
  tone: DialogTone;
  actions: DialogAction[];
};

type ConfirmRequest = {
  title: string;
  message?: string;
  tone: DialogTone;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type ActionSheetRequest = {
  title: string;
  message?: string;
  options: DialogActionSheetOption[];
  cancelLabel: string;
};

type ToastTone = 'success' | 'error' | 'info';
type ToastRequest = { message: string; tone: ToastTone };

export type DialogApi = {
  alert: (title: string, message?: string, opts?: { tone?: DialogTone; actions?: DialogAction[] }) => void;
  confirm: (opts: {
    title: string;
    message?: string;
    tone?: DialogTone;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => void;
  actionSheet: (opts: {
    title: string;
    message?: string;
    options: DialogActionSheetOption[];
    cancelLabel?: string;
  }) => void;
  toast: (message: string, tone?: ToastTone) => void;
};

const DialogContext = createContext<DialogApi | null>(null);

/** Access the app-wide dialog API from any screen. */
export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used inside <AppDialogProvider>.');
  }
  return ctx;
}

const TONE_ICON: Record<DialogTone, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  danger: '🚫',
};

const TONE_CHIP_BG: Record<DialogTone, string> = {
  info: 'bg-blue-50',
  success: 'bg-emerald-50',
  warning: 'bg-amber-50',
  danger: 'bg-red-50',
};

const TOAST_BG: Record<ToastTone, string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-slate-800',
};

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [alertReq, setAlertReq] = useState<AlertRequest | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const [sheetReq, setSheetReq] = useState<ActionSheetRequest | null>(null);
  const [toastReq, setToastReq] = useState<ToastRequest | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const alert = useCallback<DialogApi['alert']>((title, message, opts) => {
    setAlertReq({
      title,
      message,
      tone: opts?.tone ?? 'info',
      actions: opts?.actions ?? [{ label: 'OK' }],
    });
  }, []);

  const confirm = useCallback<DialogApi['confirm']>((opts) => {
    setConfirmReq({
      title: opts.title,
      message: opts.message,
      tone: opts.tone ?? 'warning',
      confirmLabel: opts.confirmLabel,
      cancelLabel: opts.cancelLabel ?? 'Cancel',
      destructive: opts.destructive ?? false,
      onConfirm: opts.onConfirm,
      onCancel: opts.onCancel,
    });
  }, []);

  const actionSheet = useCallback<DialogApi['actionSheet']>((opts) => {
    setSheetReq({
      title: opts.title,
      message: opts.message,
      options: opts.options,
      cancelLabel: opts.cancelLabel ?? 'Cancel',
    });
  }, []);

  const toast = useCallback<DialogApi['toast']>((message, tone = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastReq({ message, tone });
    toastTimer.current = setTimeout(() => setToastReq(null), 2800);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({ alert, confirm, actionSheet, toast }),
    [alert, confirm, actionSheet, toast]
  );

  const closeAlert = () => setAlertReq(null);
  const closeConfirm = () => setConfirmReq(null);
  const closeSheet = () => setSheetReq(null);

  const isConfirmDestructive = confirmReq?.destructive ?? false;
  const confirmTone: DialogTone = confirmReq
    ? isConfirmDestructive
      ? 'danger'
      : confirmReq.tone
    : 'warning';

  return (
    <DialogContext.Provider value={api}>
      {children}

      {/* ── Alert modal ─────────────────────────────────────────── */}
      <Modal
        visible={alertReq !== null}
        transparent
        animationType="fade"
        onRequestClose={closeAlert}
        statusBarTranslucent
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6">
            <View
              className={`mx-auto mb-3 h-14 w-14 items-center justify-center rounded-full ${TONE_CHIP_BG[alertReq?.tone ?? 'info']}`}
            >
              <Text className="text-3xl">{TONE_ICON[alertReq?.tone ?? 'info']}</Text>
            </View>
            <Text className="text-center text-lg font-bold text-slate-900">
              {alertReq?.title}
            </Text>
            {alertReq?.message ? (
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
                {alertReq.message}
              </Text>
            ) : null}
            <View className="mt-5 gap-2.5">
              {(alertReq?.actions ?? []).map((action, index) => (
                <Pressable
                  key={`${action.label}-${index}`}
                  onPress={() => {
                    closeAlert();
                    action.onPress?.();
                  }}
                  className={`items-center rounded-xl py-3.5 active:opacity-85 ${
                    index === 0
                      ? action.style === 'destructive'
                        ? 'bg-red-600'
                        : 'bg-brand'
                      : 'bg-white'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <Text
                    className={`text-base font-semibold ${
                      index === 0
                        ? 'text-white'
                        : action.style === 'destructive'
                          ? 'text-red-600'
                          : 'text-slate-600'
                    }`}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Confirm modal ───────────────────────────────────────── */}
      <Modal
        visible={confirmReq !== null}
        transparent
        animationType="fade"
        onRequestClose={closeConfirm}
        statusBarTranslucent
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6">
            <View
              className={`mx-auto mb-3 h-14 w-14 items-center justify-center rounded-full ${TONE_CHIP_BG[confirmTone]}`}
            >
              <Text className="text-3xl">{TONE_ICON[confirmTone]}</Text>
            </View>
            <Text className="text-center text-lg font-bold text-slate-900">
              {confirmReq?.title}
            </Text>
            {confirmReq?.message ? (
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
                {confirmReq.message}
              </Text>
            ) : null}
            <Pressable
              onPress={() => {
                const onConfirm = confirmReq?.onConfirm;
                closeConfirm();
                onConfirm?.();
              }}
              className={`mt-5 items-center rounded-xl py-3.5 active:opacity-85 ${
                isConfirmDestructive ? 'bg-red-600' : 'bg-brand'
              }`}
              accessibilityRole="button"
              accessibilityLabel={confirmReq?.confirmLabel}
            >
              <Text className="text-base font-semibold text-white">
                {confirmReq?.confirmLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const onCancel = confirmReq?.onCancel;
                closeConfirm();
                onCancel?.();
              }}
              className="mt-3 items-center rounded-xl bg-white py-3 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={confirmReq?.cancelLabel}
            >
              <Text className="text-base font-semibold text-slate-600">
                {confirmReq?.cancelLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Action sheet modal ──────────────────────────────────── */}
      <Modal
        visible={sheetReq !== null}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6">
            <Text className="text-center text-lg font-bold text-slate-900">
              {sheetReq?.title}
            </Text>
            {sheetReq?.message ? (
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
                {sheetReq.message}
              </Text>
            ) : null}
            <View className="mt-5 gap-2.5">
              {(sheetReq?.options ?? []).map((option) => (
                <Pressable
                  key={option.label}
                  onPress={() => {
                    const onPress = option.onPress;
                    closeSheet();
                    onPress?.();
                  }}
                  className={`items-center rounded-xl py-3.5 active:opacity-85 ${
                    option.destructive ? 'bg-red-50' : 'bg-slate-100'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                >
                  <Text
                    className={`text-base font-semibold ${
                      option.destructive ? 'text-red-600' : 'text-brand'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={closeSheet}
                className="mt-1 items-center py-2 active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel={sheetReq?.cancelLabel}
              >
                <Text className="text-sm font-medium text-slate-500">
                  {sheetReq?.cancelLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Toast ───────────────────────────────────────────────── */}
      {toastReq ? (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 items-center"
          style={{
            bottom: Platform.OS === 'ios' ? 110 : 100,
          }}
        >
          <View
            className={`max-w-[85%] rounded-full px-5 py-3 ${TOAST_BG[toastReq.tone]}`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 6,
            }}
            accessibilityLiveRegion="polite"
          >
            <Text className="text-center text-sm font-semibold text-white">
              {toastReq.message}
            </Text>
          </View>
        </View>
      ) : null}
    </DialogContext.Provider>
  );
}

/** Small spinner-in-button helper shared by screens using the dialog API. */
export function BusyIndicator({ color = '#FFFFFF' }: { color?: string }) {
  return <ActivityIndicator size="small" color={color} />;
}
