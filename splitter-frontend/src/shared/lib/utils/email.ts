/** Email helpers shared by every auth form. */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trim, drop inner whitespace and lowercase. */
export function normalizeEmail(value: string): string {
  return (value || '').replace(/\s+/g, '').toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(normalizeEmail(value));
}

/** Domains we offer as "Did you mean…?" targets. */
const KNOWN_DOMAINS = [
  'gmail.com',
  'mail.ru',
  'yandex.ru',
  'yandex.com',
  'icloud.com',
  'outlook.com',
  'yahoo.com',
];

/** Valid domains that merely look similar to a known one; never "fix" these. */
const LEGIT_LOOKALIKES = new Set([
  'mail.com',
  'ya.ru',
  'inbox.ru',
  'list.ru',
  'bk.ru',
  'me.com',
  'live.com',
  'msn.com',
  'yahoo.co.jp',
  'yahoo.co.uk',
  'outlook.jp',
  'ymail.com',
  'gmx.com',
]);

/** Hand-picked frequent typos (checked before fuzzy matching). */
const COMMON_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'mail.ry': 'mail.ru',
  'mail.tu': 'mail.ru',
  'mial.ru': 'mail.ru',
  'yandex.ry': 'yandex.ru',
  'yandx.ru': 'yandex.ru',
  'yadex.ru': 'yandex.ru',
  'icloud.co': 'icloud.com',
  'iclod.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outloo.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
};

function levenshtein(a: string, b: string): number {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

/**
 * Returns a corrected full address ("name@gmail.com") when the domain looks like a typo of a
 * popular provider, otherwise null.
 */
export function suggestEmail(value: string): string | null {
  const email = normalizeEmail(value);
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain.includes('.')) return null;
  if (KNOWN_DOMAINS.includes(domain) || LEGIT_LOOKALIKES.has(domain)) return null;

  const direct = COMMON_TYPOS[domain];
  if (direct) return `${local}@${direct}`;

  if (domain.length < 6) return null;
  let best: { d: string; dist: number } | null = null;
  for (const known of KNOWN_DOMAINS) {
    const dist = levenshtein(domain, known);
    if (dist <= 2 && (!best || dist < best.dist)) best = { d: known, dist };
  }
  return best ? `${local}@${best.d}` : null;
}
