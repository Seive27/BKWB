import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSessionUserId } from '@/hooks/useSessionUserId';
import { queryKeys } from '@/lib/queryKeys';
import { getCurrentProfile } from '@/services/authService';

export function useCurrentProfile() {
  const userId = useSessionUserId();
  const query = useQuery({
    queryKey: queryKeys.profile.detail(userId ?? ''),
    queryFn: getCurrentProfile,
    enabled: !!userId,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    profile: query.data ?? null,
    loading: !userId || (query.isPending && query.data === undefined),
    error: query.error,
    refresh,
  };
}
