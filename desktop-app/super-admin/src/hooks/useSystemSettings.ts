import { useCallback, useEffect, useState } from 'react';
import type { SystemSetting } from '../types';
import {
  getSystemSettings,
  subscribeToSystemSettings,
} from '../services/systemSettingsService';

interface UseSystemSettingsResult {
  settings: SystemSetting[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Re-apply realtime updates to the local list. */
  applyChange: (key: string, value: unknown) => void;
}

/** Loads system settings and keeps them in sync via realtime. */
export function useSystemSettings(category?: string): UseSystemSettingsResult {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSystemSettings(category);
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const applyChange = useCallback((key: string, value: unknown) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    );
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSystemSettings((event, row) => {
      if (event === 'UPDATE' && row) {
        applyChange(row.key, row.value);
      }
    });
    return unsubscribe;
  }, [applyChange]);

  const refresh = useCallback(() => load(), [load]);

  return { settings, loading, error, refresh, applyChange };
}
