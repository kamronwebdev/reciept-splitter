// Mirrors the backend policy (splitter-backend/src/utils/validation.ts).
export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleKey = 'length' | 'upper' | 'lower' | 'number' | 'special';

export const PASSWORD_RULES: ReadonlyArray<{ key: PasswordRuleKey; test: (pw: string) => boolean }> = [
  { key: 'length', test: (pw) => pw.length >= PASSWORD_MIN_LENGTH },
  { key: 'upper', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lower', test: (pw) => /[a-z]/.test(pw) },
  { key: 'number', test: (pw) => /\d/.test(pw) },
  { key: 'special', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function passwordChecks(pw: string): Record<PasswordRuleKey, boolean> {
  const out = {} as Record<PasswordRuleKey, boolean>;
  for (const r of PASSWORD_RULES) out[r.key] = r.test(pw || '');
  return out;
}

export function isStrongPassword(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw || ''));
}

export const PASSWORD_POLICY_HINT =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
