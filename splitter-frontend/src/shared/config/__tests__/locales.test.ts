import en from '../locales/en.json';
import uz from '../locales/uz.json';
import ja from '../locales/ja.json';

function keys(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

const AUTH_NEW = [
  'auth.errors.EMAIL_IN_USE',
  'auth.errors.INVALID_CREDENTIALS',
  'auth.errors.NETWORK',
  'auth.passwordRules.length',
  'auth.logout.title',
  'auth.forgot.title',
  'auth.reset.codeTitle',
  'auth.sessionExpired',
  'common.retry',
];

describe('auth locales', () => {
  it.each([['en', en], ['uz', uz], ['ja', ja]] as const)('%s has every auth key that en has', (_l, loc) => {
    const have = new Set(keys(loc));
    const missing = keys((en as any).auth).map((k) => `auth.${k}`).filter((k) => !have.has(k));
    expect(missing).toEqual([]);
  });
  it('contains the new keys', () => {
    const have = new Set(keys(en));
    for (const k of AUTH_NEW) expect(have.has(k)).toBe(true);
  });
});
