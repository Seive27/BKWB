import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RealtimeSync } from '@/components/RealtimeSync';
import { AppDialogProvider } from '@/components/ui/AppDialog';
import { SessionUserProvider } from '@/hooks/useSessionUserId';
import { persistOptions, queryClient } from '@/lib/queryClient';
import '@/global.css';

function RestoredApp() {
  const isRestoring = useIsRestoring();
  if (isRestoring) return null;

  return (
    <>
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
          <AppDialogProvider>
            <RestoredApp />
          </AppDialogProvider>
        </SessionUserProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
