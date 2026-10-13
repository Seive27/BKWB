import type { QueryClient, QueryKey } from '@tanstack/react-query';

const pending = new Map<string, ReturnType<typeof setTimeout>>();

/** Leading-edge invalidation so a write and its realtime echo share one refetch. */
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
