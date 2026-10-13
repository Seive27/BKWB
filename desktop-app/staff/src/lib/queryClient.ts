import { QueryClient } from '@tanstack/react-query';

/** Session cache for the Tauri webview. Closing the window drops this client. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export const ANALYTICS_STALE_TIME = 2 * 60_000;
export const ANNOUNCEMENT_REFETCH_INTERVAL = 60_000;
