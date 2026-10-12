import jwt from "jsonwebtoken";

export interface TokenUser {
  id: number;
  email: string;
  tokenVersion: number;
}

/** Login token. `tv` lets us invalidate every old session by bumping User.tokenVersion. */
export function signAuthToken(user: TokenUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, tv: user.tokenVersion },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(v: unknown): string | null {
  return typeof v === "string" ? v.trim().toLowerCase() : null;
}
