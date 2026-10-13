import type { QueryClient, QueryKey } from '@tanstack/react-query';

const pending = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Leading-edge invalidation. A mutation and the realtime echo of that same
 * write collapse into one refetch.
 */
export function invalidateDebounced(
  client: QueryClient,
  queryKey: QueryKey,
  waitMs = 400
): void {
  const id = JSON.stringify(queryKey);
  if (pending.has(id)) return;
  void client.invalidateQueries({ queryKey });
  const timer = setTimeout(() => {
    pending.delete(id);
  }, waitMs);
  pending.set(id, timer);
}
