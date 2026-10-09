import type { Scheme } from '@/shared/theme/palette';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i;
const PRIVATE_IP = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/;

/**
 * Makes any stored avatar value loadable on THIS device:
 *  - relative "/static/…" paths are resolved against the API base URL
 *  - old absolute URLs that point at a dev machine ("http://localhost:3001/static/…", LAN IPs)
 *    are rebased onto the current API base (so they keep working after the IP changes)
 *  - CDN / external URLs and local file URIs (optimistic previews) are returned unchanged
 */
export function rebaseAvatarUrl(uri: string | null | undefined, apiBase: string): string | null {
  if (!uri) return null;
  const value = uri.trim();
  if (!value) return null;
  const base = apiBase.replace(/\/+$/, '');

  if (value.startsWith('/')) return `${base}${value}`;
  if (/^(file|content|data|blob|ph|asset-library):/i.test(value)) return value;

  try {
    const u = new URL(value);
    if (u.pathname.startsWith('/static/') && (LOCAL_HOST.test(u.hostname) || PRIVATE_IP.test(u.hostname))) {
      return `${base}${u.pathname}${u.search}`;
    }
    return value;
  } catch {
    return null;
  }
}

/** 1-2 letter initials: "Kamron Webdev" -> "KW", "ann" -> "A" */
export function initialsOf(name: string | null | undefined): string {
  const all = (name || '').trim().split(/\s+/).filter(Boolean);
  // words that start with a letter ("Bitiruvchilari 2026" -> "TB", not "T2"); fall back to everything
  const words = all.filter((w) => /^\p{L}/u.test(w));
  const parts = words.length ? words : all;
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0]!)[0] ?? '?';
  const second = parts.length > 1 ? Array.from(parts[parts.length - 1]!)[0] : '';
  return (first + (second ?? '')).toUpperCase();
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable background/foreground for the default avatar, derived from the user's uniqueId. Readable in both themes. */
export function avatarColors(seed: string | null | undefined, scheme: Scheme): { bg: string; fg: string } {
  const hue = hash(seed || '?') % 360;
  return scheme === 'dark'
    ? { bg: `hsl(${hue}, 32%, 26%)`, fg: `hsl(${hue}, 75%, 90%)` }
    : { bg: `hsl(${hue}, 60%, 88%)`, fg: `hsl(${hue}, 55%, 24%)` };
}
