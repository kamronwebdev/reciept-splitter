import { isStrongPassword } from '../password';

describe('isStrongPassword (matches backend policy)', () => {
  it('accepts strong passwords', () => {
    expect(isStrongPassword('Abcdef1!')).toBe(true);
  });
  it('rejects weak passwords', () => {
    expect(isStrongPassword('abcdef1!')).toBe(false); // no upper
    expect(isStrongPassword('ABCDEF1!')).toBe(false); // no lower
    expect(isStrongPassword('Abcdefg!')).toBe(false); // no digit
    expect(isStrongPassword('Abcdefg1')).toBe(false); // no special
    expect(isStrongPassword('Ab1!')).toBe(false); // too short
  });
});

import { passwordChecks } from '../password';

describe('passwordChecks', () => {
  it('reports each rule separately', () => {
    expect(passwordChecks('abc')).toEqual({ length: false, upper: false, lower: true, number: false, special: false });
    expect(passwordChecks('Abcdef1!')).toEqual({ length: true, upper: true, lower: true, number: true, special: true });
  });
});
