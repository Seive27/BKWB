import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDialogProvider } from '@/components/ui/AppDialog';
import '@/global.css';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppDialogProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AppDialogProvider>
    </SafeAreaProvider>
  );
}
