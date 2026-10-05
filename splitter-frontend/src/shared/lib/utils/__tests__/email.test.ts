import { normalizeEmail, isValidEmail, suggestEmail } from '../email';

describe('normalizeEmail / isValidEmail', () => {
  it('trims, removes spaces and lowercases', () => {
    expect(normalizeEmail('  Foo.Bar @Gmail.COM ')).toBe('foo.bar@gmail.com');
  });
  it('validates', () => {
    expect(isValidEmail(' A@b.co ')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a@b.c')).toBe(false);
    expect(isValidEmail('no-at.com')).toBe(false);
  });
});

describe('suggestEmail', () => {
  it.each([
    ['name@gmial.com', 'name@gmail.com'],
    ['name@gmail.co', 'name@gmail.com'],
    ['name@gmai.com', 'name@gmail.com'],
    ['Name@GMAIL.CON', 'name@gmail.com'],
    ['a@mail.ry', 'a@mail.ru'],
    ['a@yandx.ru', 'a@yandex.ru'],
    ['a@icloud.co', 'a@icloud.com'],
    ['a@outlok.com', 'a@outlook.com'],
    ['a@yaho.com', 'a@yahoo.com'],
    ['a@yahooo.com', 'a@yahoo.com'],
    ['a@gmailll.com', 'a@gmail.com'],
  ])('%s -> %s', (input, expected) => {
    expect(suggestEmail(input)).toBe(expected);
  });

  it.each(['name@gmail.com', 'a@mail.ru', 'a@jdu.uz', 'a@mail.com', 'a@ya.ru', 'a@company.org', 'a@yahoo.co.jp', 'bad', 'a@b'])(
    'does not suggest for %s',
    (input) => {
      expect(suggestEmail(input)).toBeNull();
    }
  );
});
