import { rebaseAvatarUrl, initialsOf, avatarColors } from '../avatar';

const API = 'http://192.168.1.7:3001';

describe('rebaseAvatarUrl', () => {
  it('resolves relative paths', () => {
    expect(rebaseAvatarUrl('/static/avatars/1/v1/avatar.jpg', API)).toBe(`${API}/static/avatars/1/v1/avatar.jpg`);
  });
  it('rebases legacy localhost / LAN urls onto the current API base', () => {
    expect(rebaseAvatarUrl('http://localhost:3001/static/avatars/1/v1/avatar.png', API)).toBe(`${API}/static/avatars/1/v1/avatar.png`);
    expect(rebaseAvatarUrl('http://10.20.2.51:3001/static/avatars/1/v1/avatar.png?x=1', API)).toBe(`${API}/static/avatars/1/v1/avatar.png?x=1`);
  });
  it('keeps CDN urls and local previews', () => {
    expect(rebaseAvatarUrl('https://cdn.example.com/avatars/1/v1/a.webp', API)).toBe('https://cdn.example.com/avatars/1/v1/a.webp');
    expect(rebaseAvatarUrl('file:///var/mobile/tmp/a.jpg', API)).toBe('file:///var/mobile/tmp/a.jpg');
  });
  it('handles empty/invalid values', () => {
    expect(rebaseAvatarUrl(null, API)).toBeNull();
    expect(rebaseAvatarUrl('  ', API)).toBeNull();
    expect(rebaseAvatarUrl('not a url', API)).toBeNull();
  });
});

describe('initialsOf', () => {
  it('builds initials', () => {
    expect(initialsOf('Kamron Webdev')).toBe('KW');
    expect(initialsOf('ann')).toBe('A');
    expect(initialsOf('  ')).toBe('?');
    expect(initialsOf("o'g'il")).toBe('O');
  });
});

describe('avatarColors', () => {
  it('is stable per seed and differs by scheme', () => {
    expect(avatarColors('#1234', 'light')).toEqual(avatarColors('#1234', 'light'));
    expect(avatarColors('#1234', 'light').bg).not.toBe(avatarColors('#1234', 'dark').bg);
    expect(avatarColors('#1234', 'light').bg).not.toBe(avatarColors('#9999', 'light').bg);
  });
});
