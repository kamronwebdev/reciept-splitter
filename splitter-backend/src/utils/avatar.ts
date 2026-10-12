import type { Request } from "express";

/**
 * Avatar URL handling.
 *
 * What we store in User.avatarUrl:
 *  - local dev storage:  a RELATIVE path like "/static/avatars/12/v1700000000/avatar.jpg"
 *                        (never "http://localhost:3001/…", which a phone can't reach)
 *  - R2/CDN storage:     the absolute CDN URL
 *  - legacy rows:        absolute "http://localhost:3001/static/…" URLs saved by older versions
 *
 * What we send to clients: always something a phone can load (see resolveAvatarUrl).
 */

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i;
const PRIVATE_IP = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/** Public origin of this server, e.g. "http://192.168.1.7:3001" (PUBLIC_BASE_URL wins, else the request). */
export function publicBaseUrl(req: Pick<Request, "protocol" | "get">): string {
  const fromEnv = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const host = req.get("host");
  return `${req.protocol}://${host}`;
}

/** Turns a stored avatar value into an absolute URL reachable by the client (or null). */
export function resolveAvatarUrl(
  stored: string | null | undefined,
  req: Pick<Request, "protocol" | "get">
): string | null {
  if (!stored) return null;
  const value = stored.trim();
  if (!value) return null;

  if (value.startsWith("/")) return `${publicBaseUrl(req)}${value}`;

  try {
    const u = new URL(value);
    // Legacy: an absolute URL pointing at a dev machine -> rebase onto the current public origin.
    if (
      u.pathname.startsWith("/static/") &&
      (LOCAL_HOST.test(u.hostname) || PRIVATE_IP.test(u.hostname))
    ) {
      return `${publicBaseUrl(req)}${u.pathname}${u.search}`;
    }
    return value;
  } catch {
    return null;
  }
}

/** Object key ("avatars/12/v1/avatar.jpg") of a stored avatar that belongs to our storage, else null. */
export function avatarKeyFromStored(stored: string | null | undefined): string | null {
  if (!stored) return null;
  let pathname = stored.trim();
  try {
    if (/^https?:\/\//i.test(pathname)) pathname = new URL(pathname).pathname;
  } catch {
    return null;
  }
  const m = pathname.match(/(?:^|\/)(avatars\/\d+\/[^/]+\/[^/]+)$/);
  return m ? m[1]! : null;
}

export interface PublicUserRow {
  id: number;
  email: string;
  username: string;
  uniqueId: string;
  avatarUrl: string | null;
}

/** The user object we return to clients (never includes password / tokenVersion). */
export function serializeUser(
  user: PublicUserRow,
  req: Pick<Request, "protocol" | "get">
) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    uniqueId: user.uniqueId,
    avatarUrl: resolveAvatarUrl(user.avatarUrl, req),
  };
}
