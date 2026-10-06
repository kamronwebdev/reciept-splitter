// src/shared/lib/utils/invite.ts
/**
 * Everything a Receipt Splitter QR / link can contain:
 *  - personal friend code (current):  https://<server>/f/<code>, receipt-splitter://f/<code>,
 *    Expo Go dev links (exp://…/--/f/<code>) or the bare 12-char code
 *  - old time-limited friend invite:  https://<server>/friends/join?token=…
 *  - group invite:                    https://<server>/groups/join?token=…
 */
export type ScannedInvite =
  | { kind: 'friend-code'; code: string }
  | { kind: 'friend'; token: string }
  | { kind: 'group'; token: string };

/** same alphabet / length as the backend (src/services/friendCode.ts) */
const CODE_RE = /^[23456789abcdefghjkmnpqrstuvwxyz]{12}$/;

export function normalizeFriendCode(raw: string | null | undefined): string | null {
  const code = (raw ?? '').trim().toLowerCase();
  return CODE_RE.test(code) ? code : null;
}

function fromPath(path: string, search: URLSearchParams): ScannedInvite | null {
  // Expo Go deep links put the app path after "/--/"
  const clean = path.includes('/--/') ? path.slice(path.indexOf('/--/') + 3) : path;
  const f = clean.match(/^\/*f\/([^/?#]+)\/?$/i);
  if (f) {
    const code = normalizeFriendCode(decodeURIComponent(f[1]!));
    return code ? { kind: 'friend-code', code } : null;
  }
  const token = search.get('token');
  if (!token) return null;
  if (/^\/*friends\/join\/?$/i.test(clean)) return { kind: 'friend', token };
  if (/^\/*groups\/join\/?$/i.test(clean)) return { kind: 'group', token };
  return null;
}

export function parseScannedInvite(raw: string | null | undefined): ScannedInvite | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  const bare = normalizeFriendCode(text);
  if (bare) return { kind: 'friend-code', code: bare };

  const scheme = text.match(/^([a-z][a-z0-9+.-]*):\/\/(.*)$/i);
  if (!scheme) return null;
  const protocol = scheme[1]!.toLowerCase();
  const rest = scheme[2]!;

  if (protocol === 'http' || protocol === 'https' || protocol === 'exp' || protocol === 'exps') {
    try {
      const u = new URL(protocol.startsWith('exp') ? `http://${rest}` : text);
      return fromPath(u.pathname, u.searchParams);
    } catch {
      return null;
    }
  }
  if (protocol === 'receipt-splitter') {
    // receipt-splitter://f/<code> -> "f" is parsed as the host by URL parsers: handle it as a path
    const [pathPart, query = ''] = rest.split('?');
    return fromPath(`/${pathPart}`, new URLSearchParams(query));
  }
  return null;
}

/** @deprecated kept for old callers: friend/group *token* links only */
export function parseInviteFromScan(raw: string): { kind: 'friend' | 'group'; token: string } | null {
  const parsed = parseScannedInvite(raw);
  return parsed && parsed.kind !== 'friend-code' ? parsed : null;
}

/** A friend code from a deep link opened while signed out; consumed once the tabs are shown. */
let pendingFriendCode: string | null = null;
export function setPendingFriendCode(code: string | null) {
  pendingFriendCode = code;
}
export function takePendingFriendCode(): string | null {
  const code = pendingFriendCode;
  pendingFriendCode = null;
  return code;
}
