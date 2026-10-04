/** Format a number as Philippine Peso currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Format a date string to a human-readable format */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Get the first letter of each word, max 2 characters */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/** Truncate text to a specified length */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/** Generate a unique ID (placeholder, replace with Supabase IDs) */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/** Check if a value is a plain object */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Type-safe object key existence check */
export function hasKey<T extends object>(
  obj: T,
  key: PropertyKey
): key is keyof T {
  return key in obj;
}

/** Normalize a sitio label for case-insensitive comparison. */
export function sitioKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/** True when two sitio labels refer to the same place (ignoring case/whitespace). */
export function sitiosMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const keyA = sitioKey(a);
  const keyB = sitioKey(b);
  return keyA.length > 0 && keyA === keyB;
}

/**
 * Deduplicate sitio names case-insensitively.
 * `preferred` only controls display casing and sort order for names that
 * already appear in `names` — it does not inject missing entries.
 */
export function dedupeSitios(
  names: Iterable<string>,
  preferred: readonly string[] = []
): string[] {
  const preferredDisplay = new Map<string, string>();
  for (const name of preferred) {
    const key = sitioKey(name);
    if (key) preferredDisplay.set(key, name.trim());
  }

  const displayByKey = new Map<string, string>();
  for (const name of names) {
    const trimmed = name.trim();
    const key = sitioKey(trimmed);
    if (!key || displayByKey.has(key)) continue;
    displayByKey.set(key, preferredDisplay.get(key) ?? trimmed);
  }

  if (preferred.length === 0) {
    return [...displayByKey.values()];
  }

  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const name of preferred) {
    const key = sitioKey(name);
    if (!key || seen.has(key) || !displayByKey.has(key)) continue;
    ordered.push(displayByKey.get(key)!);
    seen.add(key);
  }
  for (const [key, name] of displayByKey) {
    if (seen.has(key)) continue;
    ordered.push(name);
    seen.add(key);
  }
  return ordered;
}
