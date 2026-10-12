import { normalizeFriendCode, parseInviteFromScan, parseScannedInvite } from '../invite';

const CODE = 'abcdefgh2345';

describe('parseScannedInvite', () => {
  it('reads personal friend codes from every link form', () => {
    for (const raw of [
      `https://api.example.com/f/${CODE}`,
      `http://192.168.1.7:3001/f/${CODE.toUpperCase()}/`,
      `receipt-splitter://f/${CODE}`,
      `receipt-splitter:///f/${CODE}`,
      `exp://192.168.1.7:8081/--/f/${CODE}`,
      `  ${CODE}  `,
    ]) {
      expect(parseScannedInvite(raw)).toEqual({ kind: 'friend-code', code: CODE });
    }
  });

  it('keeps old friend token links and group links working', () => {
    expect(parseScannedInvite('https://app.example.com/friends/join?token=abc')).toEqual({ kind: 'friend', token: 'abc' });
    expect(parseScannedInvite('http://x.test/groups/join?token=t1')).toEqual({ kind: 'group', token: 't1' });
    expect(parseScannedInvite('receipt-splitter://groups/join?token=t2')).toEqual({ kind: 'group', token: 't2' });
  });

  it('rejects other QR codes', () => {
    for (const raw of [
      '',
      'hello world',
      'https://example.com/',
      'https://x.test/friends/join',
      'https://x.test/other?token=a',
      'https://x.test/f/short',
      'https://x.test/f/abcdefgh234l', // "l" is never used in codes
      'WIFI:S:home;T:WPA;P:secret;;',
      'mailto:a@b.c',
      'https://',
    ]) {
      expect(parseScannedInvite(raw)).toBeNull();
    }
  });

  it('normalizeFriendCode and the legacy token parser', () => {
    expect(normalizeFriendCode(' ABCDEFGH2345 ')).toBe(CODE);
    expect(normalizeFriendCode('abc')).toBeNull();
    expect(parseInviteFromScan(`https://x/f/${CODE}`)).toBeNull();
    expect(parseInviteFromScan('https://x/friends/join?token=a')).toEqual({ kind: 'friend', token: 'a' });
  });
});
