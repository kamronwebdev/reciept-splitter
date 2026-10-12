jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
import { palettes, BRAND } from '../palette';
import { weightBucket, fontFace } from '../fonts';
import { TEXT_SCALE_VALUE } from '../types';

function luminance(hex: string) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}

describe('palette contrast (WCAG AA)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const p = palettes[scheme];
    it(`${scheme}: brand stays #2ECC71 and text on it is readable`, () => {
      expect(p.primary).toBe(BRAND);
      expect(contrast(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${scheme}: body text, muted text and brand text are readable on the background`, () => {
      expect(contrast(p.text, p.background)).toBeGreaterThanOrEqual(7);
      expect(contrast(p.textMuted, p.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.primaryText, p.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.text, p.surface)).toBeGreaterThanOrEqual(7);
      expect(contrast(p.textMuted, p.surface)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('fonts', () => {
  it('maps weights to the 4 loaded faces', () => {
    expect(weightBucket(undefined)).toBe(400);
    expect(weightBucket('500')).toBe(500);
    expect(weightBucket('600')).toBe(600);
    expect(weightBucket('bold')).toBe(700);
    expect(weightBucket(900)).toBe(700);
  });
  it('builds expo-google-fonts face names', () => {
    expect(fontFace('nunito', '700')).toBe('Nunito_700Bold');
    expect(fontFace('manrope', 400)).toBe('Manrope_400Regular');
    expect(fontFace('inter', 600)).toBe('Inter_600SemiBold');
  });
  it('text scales are ordered', () => {
    expect(TEXT_SCALE_VALUE.small).toBeLessThan(TEXT_SCALE_VALUE.default);
    expect(TEXT_SCALE_VALUE.default).toBeLessThan(TEXT_SCALE_VALUE.large);
  });
});
