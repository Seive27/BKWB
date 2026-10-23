import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastTone = 'success' | 'error';

function isOnline(state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}): boolean {
  return Boolean(state.isConnected) && state.isInternetReachable !== false;
}

/**
 * App-wide toast when connectivity changes.
 * Skips the first NetInfo event so launch does not flash a toast.
 */
export function ConnectionToast() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = isOnline(state);
      const previous = previousOnlineRef.current;

      if (previous === null) {
        previousOnlineRef.current = online;
        return;
      }

      if (previous === online) return;
      previousOnlineRef.current = online;

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast(
        online
          ? { message: 'Back online. Connection restored.', tone: 'success' }
          : { message: 'No connection. Working offline.', tone: 'error' },
      );
      toastTimerRef.current = setTimeout(() => setToast(null), 2800);
    });

    return () => {
      unsubscribe();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 z-50 items-center px-4"
      style={{
        bottom: Math.max(insets.bottom, 8) + (Platform.OS === 'ios' ? 88 : 80),
      }}
    >
      <View
        className={`max-w-[90%] rounded-full px-5 py-3 ${
          toast.tone === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 6,
        }}
        accessibilityLiveRegion="polite"
      >
        <Text className="text-center text-sm font-semibold text-white">{toast.message}</Text>
      </View>
    </View>
  );
}
