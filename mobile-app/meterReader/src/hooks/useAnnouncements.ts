import { useCallback, useEffect, useRef, useState } from 'react';

import type { Announcement } from '@/types/announcements';
import {
  getAnnouncements,
  subscribeToAnnouncements,
  type AnnouncementQueryOptions,
} from '@/services/announcementService';

interface UseAnnouncementsResult {
  announcements: Announcement[];
  /** True on the very first load. */
  loading: boolean;
  /** True while re-fetching after realtime events or manual refresh. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads announcements from Supabase and keeps them in sync via a realtime
 * channel. The subscription is cleaned up automatically on unmount.
 */
export function useAnnouncements(
  options?: AnnouncementQueryOptions
): UseAnnouncementsResult {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep options in a ref so the load callback stays stable.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getAnnouncements(optionsRef.current);
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();

    const unsubscribe = subscribeToAnnouncements(() => {
      load(true);
    });

    return () => {
      unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { announcements, loading, refreshing, error, refresh };
}
