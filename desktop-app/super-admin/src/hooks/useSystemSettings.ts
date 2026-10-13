import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { queryErrorMessage } from '../lib/queryError';
import { queryKeys } from '../lib/queryKeys';
import type { SystemSetting } from '../types';
import { getSystemSettings } from '../services/systemSettingsService';

interface UseSystemSettingsResult {
  settings: SystemSetting[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Re-apply realtime updates to the cached list. */
  applyChange: (key: string, value: unknown) => void;
}

/** Loads system settings from the shared cache. Realtime patches one key in place. */
export function useSystemSettings(category?: string): UseSystemSettingsResult {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.systemSettings.list(category),
    queryFn: () => getSystemSettings(category),
    enabled: isAuthenticated,
  });

  const applyChange = useCallback(
    (key: string, value: unknown) => {
      queryClient.setQueriesData<SystemSetting[]>(
        { queryKey: queryKeys.systemSettings.all },
        (current) =>
          current?.map((setting) => (setting.key === key ? { ...setting, value } : setting))
      );
    },
    [queryClient]
  );

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    settings: query.data ?? [],
    loading: query.isLoading,
    error: queryErrorMessage(query.error, 'Failed to load system settings.'),
    refresh,
    applyChange,
  };
}
