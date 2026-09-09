export type PasswordChecks = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
};

export const PASSWORD_REQUIREMENTS = [
  { key: 'minLength' as const, label: 'At least 8 characters' },
  { key: 'uppercase' as const, label: 'At least 1 uppercase letter' },
  { key: 'lowercase' as const, label: 'At least 1 lowercase letter' },
  { key: 'number' as const, label: 'At least 1 number' },
  { key: 'special' as const, label: 'At least 1 special character' },
];

export const PASSWORD_REQUIREMENTS_MESSAGE = 'Password does not meet requirements.';

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function getPasswordStrength(checks: PasswordChecks): {
  score: number;
  label: string;
  color: string;
} {
  const score = Object.values(checks).filter(Boolean).length;

  if (score <= 2) {
    return { score, label: 'Weak password', color: '#EF4444' };
  }
  if (score <= 4) {
    return { score, label: 'Medium password', color: '#F59E0B' };
  }
  return { score, label: 'Strong password', color: '#22C55E' };
}

/** Returns an error message when the password does not meet strength rules, otherwise null. */
export function getPasswordValidationError(password: string): string | null {
  const checks = getPasswordChecks(password);
  const allMet = Object.values(checks).every(Boolean);
  return allMet ? null : PASSWORD_REQUIREMENTS_MESSAGE;
}
