import { parseInviteFromScan } from '../invite';

describe('parseInviteFromScan', () => {
  it('parses friend invite links', () => {
    expect(parseInviteFromScan('https://app.example.com/friends/join?token=abc')).toEqual({
      kind: 'friend',
      token: 'abc',
    });
  });

  it('parses group invite links', () => {
    expect(parseInviteFromScan('http://x.test/groups/join?token=t1')).toEqual({
      kind: 'group',
      token: 't1',
    });
  });

  it('rejects links without token or with unknown path', () => {
    expect(parseInviteFromScan('https://x.test/friends/join')).toBeNull();
    expect(parseInviteFromScan('https://x.test/other?token=a')).toBeNull();
  });

  it('rejects non-http input and garbage', () => {
    expect(parseInviteFromScan('friends/join?token=a')).toBeNull();
    expect(parseInviteFromScan('')).toBeNull();
    expect(parseInviteFromScan('https://')).toBeNull();
  });
});
