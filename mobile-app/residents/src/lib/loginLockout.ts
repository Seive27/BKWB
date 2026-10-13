import type { SupabaseClient } from '@supabase/supabase-js';

/** First two incorrect attempts stay immediate. The third waits 30 seconds. */
export const LOGIN_LOCKOUT_BASE_SECONDS = 30;

export class LoginLockoutError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
    super(loginLockoutMessage(seconds));
    this.name = 'LoginLockoutError';
    this.retryAfterSeconds = seconds;
  }
}

export function loginLockoutMessage(seconds: number): string {
  const unit = seconds === 1 ? 'second' : 'seconds';
  return `Too many incorrect attempts. Please wait ${seconds} ${unit} before trying again.`;
}

export function normalizeLoginIdentifier(value: string): string {
  return value.trim().toLowerCase().slice(0, 320);
}

export function isInvalidCredentialMessage(message: string | undefined): boolean {
  return /invalid login credentials|invalid account number or password|incorrect credentials/i.test(
    message ?? ''
  );
}

function retryAfterSeconds(data: unknown): number {
  const seconds = Number(
    (data as { retry_after_seconds?: unknown } | null)?.retry_after_seconds ?? 0
  );
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.ceil(seconds);
}

function isMissingLockoutFunction(message: string): boolean {
  return /login_lockout_status|register_failed_login|schema cache|does not exist|PGRST202|42883/i.test(
    message
  );
}

export async function assertLoginAllowed(
  client: SupabaseClient,
  identifier: string
): Promise<void> {
  const key = normalizeLoginIdentifier(identifier);
  if (!key) return;

  const { data, error } = await client.rpc('login_lockout_status', {
    p_identifier: key,
  });
  if (error) {
    if (isMissingLockoutFunction(error.message)) {
      console.warn('[auth] login lockout is not available:', error.message);
      return;
    }
    throw new Error('Unable to check login attempts. Please try again.');
  }

  const seconds = retryAfterSeconds(data);
  if (seconds > 0) throw new LoginLockoutError(seconds);
}

export async function recordFailedLogin(
  client: SupabaseClient,
  identifier: string
): Promise<void> {
  const key = normalizeLoginIdentifier(identifier);
  if (!key) return;

  const { data, error } = await client.rpc('register_failed_login', {
    p_identifier: key,
  });
  if (error) {
    if (isMissingLockoutFunction(error.message)) {
      console.warn('[auth] login lockout is not available:', error.message);
      return;
    }
    throw new Error('Unable to record the login attempt. Please try again.');
  }

  const seconds = retryAfterSeconds(data);
  if (seconds > 0) throw new LoginLockoutError(seconds);
}

export async function clearFailedLogins(
  client: SupabaseClient,
  identifier: string
): Promise<void> {
  const key = normalizeLoginIdentifier(identifier);
  if (!key) return;

  const { error } = await client.rpc('clear_login_lockout', { p_identifier: key });
  if (error && !isMissingLockoutFunction(error.message)) {
    console.warn('[auth] could not clear login lockout:', error.message);
  }
}
