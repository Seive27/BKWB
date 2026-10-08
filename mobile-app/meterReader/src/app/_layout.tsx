import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';

import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncPendingReadings } from '@/services/offlineSyncService';

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        syncPendingReadings().catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  return (
   
   <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
