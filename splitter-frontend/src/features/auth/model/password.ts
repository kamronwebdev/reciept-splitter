// Mirrors the backend policy (splitter-backend/src/utils/validation.ts).
export const PASSWORD_MIN_LENGTH = 8;

export function isStrongPassword(pw: string): boolean {
  return (
    pw.length >= PASSWORD_MIN_LENGTH &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

export const PASSWORD_POLICY_HINT =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
