import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { invalidateDebounced } from '../lib/invalidate';

export function useInvalidatingMutation<TVariables, TData = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  keys: readonly QueryKey[]
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of keys) {
        invalidateDebounced(client, key);
      }
    },
  });
}
