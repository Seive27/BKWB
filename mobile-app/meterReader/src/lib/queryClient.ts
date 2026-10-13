import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';

const DAY_MS = 24 * 60 * 60 * 1000;

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
  });
});

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (status) => {
    handleFocus(status === 'active');
  });
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: DAY_MS,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
});

export const ANNOUNCEMENT_REFETCH_INTERVAL = 60_000;

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'bkwb-meter-reader-query-cache',
});

export const persistOptions = {
  persister,
  maxAge: DAY_MS,
  buster: 'v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { state: { status: string }; meta?: Record<string, unknown> }) =>
      query.state.status === 'success' && query.meta?.persist !== false,
  },
};

export async function clearPersistedQueryCache(): Promise<void> {
  queryClient.clear();
  await persister.removeClient();
}
