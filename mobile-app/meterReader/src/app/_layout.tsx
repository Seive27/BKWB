import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useIsRestoring } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RealtimeSync } from '@/components/RealtimeSync';
import { SessionUserProvider } from '@/hooks/useSessionUserId';
import { invalidateDebounced } from '@/lib/invalidate';
import { persistOptions, queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { syncPendingReadings } from '@/services/offlineSyncService';
import '@/global.css';

function OfflineSync() {
  const client = useQueryClient();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        syncPendingReadings()
          .then(() => {
            invalidateDebounced(client, queryKeys.readings.all);
          })
          .catch(() => {});
      }
    });
    return () => unsubscribe();
  }, [client]);

  return null;
}

function RestoredApp() {
  const isRestoring = useIsRestoring();
  if (isRestoring) return null;

  return (
    <>
      <OfflineSync />
      <RealtimeSync />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <SessionUserProvider>
          <RestoredApp />
        </SessionUserProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
