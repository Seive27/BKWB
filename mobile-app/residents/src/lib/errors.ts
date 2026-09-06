/**
 * Shared error classification for the resident app.
 *
 * Connectivity failures (Wi-Fi off, DNS failure, timeout) must never surface
 * as raw SDK text like "fetch failed: java.net.UnknownHostException: ...".
 * Everything unknown falls back to a friendly generic message.
 */

/** Detect connectivity-level failures (no internet, DNS failure, timeout). */
export function isNetworkError(message: string): boolean {
  return /unknownhost|unable to resolve host|no address associated|network request failed|failed to fetch|fetch failed|timed?\s*out|offline|err_internet|connection (refused|reset|closed)/i.test(
    message
  );
}

/** Friendly, retry-focused text for connectivity failures. */
export function networkErrorMessage(): string {
  return (
    "You're offline or the connection is unstable. " +
    'Check your Wi-Fi or mobile data, then try again.'
  );
}

/**
 * Map any thrown error to a user-appropriate message.
 * - Network failures → friendly connectivity text.
 * - Raw SDK/HTTP internals (java.net.*, okhttp, ssl, …) → generic fallback.
 * - Real business messages (wrong OTP, weak password, …) pass through.
 */
export function friendlyErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (!raw) return fallback;
  if (isNetworkError(raw)) return networkErrorMessage();
  if (/\b(fetch|http|java\.net|javax\.net|okhttp|socket|econn|ssl|tls)\b/i.test(raw)) {
    return fallback;
  }
  return raw;
}
